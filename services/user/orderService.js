import mongoose from "mongoose";
import Order from "../../models/ordersModel.js";
import Cart from "../../models/cartModel.js";
import Product from "../../models/productModel.js";
import CouponService from "./couponService.js";
import { applyOffers } from "./productServices.js";
import * as walletService from "./walletService.js";

class OrderService {
    async validateCartAndBuildOrder(userId, appliedCoupon = null) {
        const cart = await Cart.findOne({ userId }).populate({ path: 'items.productId', populate: { path: 'category_id' } });
        if (!cart || cart.items.length === 0) throw new Error("Your cart is empty.");

        const productsToApply = cart.items.map(item => item.productId).filter(Boolean);
        if (productsToApply.length > 0) {
            await applyOffers(productsToApply);
        }

        let subtotal = 0;
        const orderedItems = cart.items.map(item => {
            const product = item.productId;
            const category = product?.category_id;

            if (!product || product.is_blocked || product.is_unlisted || (category && category.is_blocked)) {
                throw new Error(`Product ${product ? product.name : 'Unknown'} is no longer available.`);
            }

            const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
            if (!variant || variant.is_blocked) throw new Error(`Specific variant for ${product.name} is no longer available.`);
            if (variant.stock < item.quantity) throw new Error(`Not enough stock for ${product.name}`);

            subtotal += variant.price * item.quantity;
            return {
                product: item.productId._id,
                variantId: item.variantId.toString(),
                quantity: item.quantity,
                price: variant.price
            };
        });

        const tax = subtotal * 0.18;
        let finalAmount = subtotal + tax;
        let discount = 0;

        if (appliedCoupon) {
            // SECURITY: Re-validate coupon server-side at order-placement time.
            // This blocks the "apply coupon → remove item → place order" scam.
            // reValidateCoupon throws a descriptive error if the minimum is no
            // longer met, or if the coupon has since expired / been revoked.
            const validCoupon = await CouponService.reValidateCoupon(
                appliedCoupon,
                userId,
                finalAmount
            );

            discount = CouponService.calculateDiscount(validCoupon, finalAmount);
            finalAmount = finalAmount - discount;
            if (finalAmount < 0) finalAmount = 0;
        }

        return { cart, orderedItems, subtotal, discount, finalAmount };
    }

    async reserveInventoryForItems(orderedItems) {
        const reservedItems = [];

        try {
            for (const item of orderedItems) {
                const result = await Product.updateOne(
                    {
                        _id: item.product,
                        is_blocked: { $ne: true },
                        is_unlisted: { $ne: true },
                        variants: {
                            $elemMatch: {
                                _id: new mongoose.Types.ObjectId(item.variantId),
                                is_blocked: { $ne: true },
                                stock: { $gte: item.quantity }
                            }
                        }
                    },
                    { $inc: { "variants.$.stock": -item.quantity } }
                );

                if (result.modifiedCount !== 1) {
                    throw new Error("One or more items are no longer available in the requested quantity.");
                }

                reservedItems.push(item);
            }
        } catch (error) {
            await this.releaseInventoryForItems(reservedItems);
            throw error;
        }
    }

    async releaseInventoryForItems(orderedItems) {
        for (const item of orderedItems) {
            await Product.updateOne(
                { _id: item.product, "variants._id": new mongoose.Types.ObjectId(item.variantId) },
                { $inc: { "variants.$.stock": item.quantity } }
            );
        }
    }

    async removeOrderedItemsFromCart(userId, orderedItems) {
        const cart = await Cart.findOne({ userId });
        if (!cart) return;

        for (const orderedItem of orderedItems) {
            const cartItem = cart.items.find(item =>
                item.productId.toString() === orderedItem.product.toString() &&
                item.variantId.toString() === orderedItem.variantId.toString()
            );

            if (!cartItem) continue;

            if (cartItem.quantity <= orderedItem.quantity) {
                cart.items.pull(cartItem._id);
            } else {
                cartItem.quantity -= orderedItem.quantity;
            }
        }

        await cart.save();
    }

    async createOrder(userId, address, paymentMethod, paymentFailed = false, appliedCoupon = null, expectedTotal = null) {
        const { orderedItems, subtotal, discount, finalAmount } = await this.validateCartAndBuildOrder(userId, appliedCoupon);

        if (expectedTotal !== null) {
            const expected = Math.round(Number(expectedTotal));
            const final = Math.round(Number(finalAmount));
            if (expected !== final) {
                if (final < expected) {
                    throw new Error("Great news! A new offer was just applied to your cart, reducing your total. Please refresh the checkout page to place your order at the new lower price!");
                } else {
                    throw new Error("The order total has changed due to expired offers or price updates. Please refresh the checkout page to see the new total.");
                }
            }
        }

        let paymentStatus = paymentMethod === 'COD' ? 'Pending' : 'Paid';
        if (paymentFailed) {
            paymentStatus = 'Failed';
        }
        const inventoryProcessed = !paymentFailed;

        // Wallet Balance Check
        if (paymentMethod === 'Wallet' && !paymentFailed) {
            const wallet = await walletService.getOrCreateWallet(userId);
            if (wallet.balance < finalAmount) {
                throw new Error("Insufficient wallet balance.");
            }
        }

        //  Save Order
        const order = new Order({
            userId,
            orderId: `ORD-${Date.now().toString().slice(-8)}`, // Simple unique ID
            orderedItems,
            totalPrice: subtotal,
            discount,
            finalAmount,
            shippingAddress: {
                fullname: address.fullname,
                phone: address.phone,
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                state: address.state,
                postal_code: address.postal_code
            },
            paymentMethod,
            status: 'Pending',
            paymentStatus,
            inventoryProcessed
        });

        let inventoryReserved = false;

        try {
            await order.save();

            if (inventoryProcessed) {
                await this.reserveInventoryForItems(orderedItems);
                inventoryReserved = true;
            }

            if (paymentMethod === 'Wallet' && !paymentFailed) {
                await walletService.debitWallet(
                    userId,
                    finalAmount,
                    `Payment for order ${order.orderId}`,
                    order.orderId
                );
            }
        } catch (error) {
            if (inventoryReserved) {
                await this.releaseInventoryForItems(orderedItems);
            }

            if (order._id) {
                await Order.deleteOne({ _id: order._id });
            }

            throw error;
        }

        if (appliedCoupon && !paymentFailed) {
            try {
                await CouponService.markCouponAsUsed(appliedCoupon._id, userId);
            } catch (error) {
                console.error(`Failed to mark coupon ${appliedCoupon._id} as used for order ${order.orderId}:`, error);
            }
        }

        if (inventoryProcessed) {
            try {
                await this.removeOrderedItemsFromCart(userId, orderedItems);
            } catch (error) {
                console.error(`Failed to reconcile cart for order ${order.orderId}:`, error);
            }
        }

        return order;
    }

    async getOrders(userId, queryParams = {}, page = 1, limit = 10) {
        const { search } = queryParams;
        const skip = (page - 1) * limit;

        let query = { userId };

        if (search) {
            // Find product IDs that match the search name
            const matchingProducts = await Product.find({
                name: { $regex: search, $options: "i" }
            }).select('_id');
            const productIds = matchingProducts.map(p => p._id);

            query.$or = [
                { orderId: { $regex: search, $options: "i" } },
                { "orderedItems.product": { $in: productIds } }
            ];
        }

        const orders = await Order.find(query)
            .populate('orderedItems.product')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        return { orders, totalPages, totalOrders };
    }

    async getOrderById(orderId, userId) {
        return await Order.findOne({ _id: orderId, userId }).populate('orderedItems.product');
    }

    async getOrderByDisplayId(displayId, userId) {
        return await Order.findOne({ orderId: displayId, userId }).populate('orderedItems.product');
    }

    async updatePaymentStatus(displayId, userId, status) {
        const order = await Order.findOne({ orderId: displayId, userId });
        if (!order) throw new Error("Order not found");
        order.paymentStatus = status;
        await order.save();
        return order;
    }

    async finalizeFailedOrderPayment(displayId, userId) {
        const order = await Order.findOne({ orderId: displayId, userId });
        if (!order) throw new Error("Order not found");
        if (order.status !== 'Pending') {
            throw new Error("Only pending failed orders can be retried.");
        }
        if (order.paymentStatus === 'Paid' && order.inventoryProcessed !== false) {
            return order;
        }
        if (order.paymentStatus !== 'Failed' && !(order.paymentStatus === 'Pending' && order.inventoryProcessed === false)) {
            throw new Error("This order is not eligible for payment retry.");
        }

        await this.reserveInventoryForItems(order.orderedItems);

        try {
            order.paymentStatus = 'Paid';
            order.inventoryProcessed = true;
            await order.save();
        } catch (error) {
            await this.releaseInventoryForItems(order.orderedItems);
            throw error;
        }

        try {
            await this.removeOrderedItemsFromCart(userId, order.orderedItems);
        } catch (error) {
            console.error(`Failed to reconcile cart after payment retry for order ${order.orderId}:`, error);
        }

        return order;
    }

    async cancelOrder(orderId, userId, reason) {
        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) throw new Error("Order not found.");

        const allowedStatus = ['Pending'];
        if (!allowedStatus.includes(order.status)) {
            throw new Error(`Order cannot be cancelled. Current status: ${order.status}`);
        }

        // Calculate refund
        if (order.paymentMethod !== 'COD' && (order.paymentStatus === 'Paid' || order.paymentStatus === 'Partially Refunded')) {
            let refundAmount = 0;
            const allActive = order.orderedItems.every(i => i.status !== 'Cancelled' && i.status !== 'Returned');
            
            if (allActive) {
                // Cancelling the entire untouched order — refund the exact amount paid
                refundAmount = order.finalAmount;
            } else {
                // SECURITY: Proportional refund for remaining active items.
                // Using raw item prices here would let a scammer profit from the discount
                // by cancelling only the "padding" items they added to meet the coupon minimum.
                //
                // Formula: each item's refund = (item_subtotal / order_subtotal) * finalAmount
                // This distributes the discount + tax proportionally, so the scam yields nothing.
                const activeItemsSubtotal = order.orderedItems
                    .filter(i => i.status !== 'Cancelled' && i.status !== 'Returned')
                    .reduce((sum, i) => sum + (i.price * i.quantity), 0);

                if (order.totalPrice > 0) {
                    refundAmount = (activeItemsSubtotal / order.totalPrice) * order.finalAmount;
                } else {
                    refundAmount = activeItemsSubtotal;
                }
            }

            if (refundAmount > 0) {
                await walletService.creditWallet(
                    userId,
                    refundAmount,
                    `Refund for cancelled order ${order.orderId}`,
                    order.orderId
                );
            }
            order.paymentStatus = 'Refunded';
        }

        order.status = 'Cancelled';
        order.cancellationReason = reason;

        // Revert Stock and mark items
        for (const item of order.orderedItems) {
            if (item.status !== 'Cancelled' && item.status !== 'Returned') {
                item.status = 'Cancelled';
                item.cancellationReason = reason;
                if (order.inventoryProcessed !== false) {
                    await Product.updateOne(
                        { _id: item.product, "variants._id": new mongoose.Types.ObjectId(item.variantId) },
                        { $inc: { "variants.$.stock": item.quantity } }
                    );
                }
            }
        }

        await order.save();
        return order;
    }

    async returnOrder(orderId, userId, reason) {
        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) throw new Error("Order not found.");

        if (order.status !== 'Delivered') {
            throw new Error("Only delivered orders can be returned.");
        }

        order.status = 'Return Request';
        order.returnReason = reason;

        // Also update all individual items that are delivered
        order.orderedItems.forEach(item => {
            if (item.status === 'Delivered') {
                item.status = 'Return Request';
                item.returnReason = reason;
            }
        });

        await order.save();
        return order;
    }

    async cancelOrderItem(orderId, itemId, userId, reason) {
        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) throw new Error("Order not found.");

        const item = order.orderedItems.id(itemId);
        if (!item) throw new Error("Item not found in order.");

        const allowedStatus = ['Pending'];
        if (!allowedStatus.includes(item.status)) {
            throw new Error(`Item cannot be cancelled. Current status: ${item.status}`);
        }

        // SECURITY: Block individual item cancellation when a coupon discount was applied.
        //
        // Why: If a user placed an order with 2 items to meet the coupon minimum, then
        // cancels 1 item after receiving the discount, they exploit the coupon for free.
        //
        // Policy: Orders with a coupon discount must be cancelled in full.
        // The user receives back exactly what they paid (order.finalAmount) to their wallet.
        if (order.discount > 0) {
            throw new Error(
                "This order was placed with a coupon discount. " +
                "Individual item cancellation is not allowed. " +
                "Please cancel the entire order to receive a full refund of your paid amount."
            );
        }

        item.status = 'Cancelled';
        item.cancellationReason = reason;

        if (order.paymentMethod !== 'COD' && (order.paymentStatus === 'Paid' || order.paymentStatus === 'Partially Refunded')) {
            // No coupon discount — safe to refund at face value + tax
            const refundAmount = item.price * item.quantity * 1.18;
            await walletService.creditWallet(
                userId,
                refundAmount,
                `Refund for cancelled item in order ${order.orderId}`,
                order.orderId
            );
            order.paymentStatus = 'Partially Refunded';
        }

        // Adjust order totals so invoice and UI reflect the correct remaining balance
        const itemSubtotal = item.price * item.quantity;
        order.totalPrice -= itemSubtotal;
        order.finalAmount -= (itemSubtotal * 1.18);
        if (order.totalPrice < 0) order.totalPrice = 0;
        if (order.finalAmount < 0) order.finalAmount = 0;

        // Revert Stock
        if (order.inventoryProcessed !== false) {
            await Product.updateOne(
                { _id: item.product, "variants._id": new mongoose.Types.ObjectId(item.variantId) },
                { $inc: { "variants.$.stock": item.quantity } }
            );
        }

        // Update overall order status if all items are cancelled
        const allCancelled = order.orderedItems.every(i => i.status === 'Cancelled');
        if (allCancelled) {
            order.status = 'Cancelled';
            if (order.paymentStatus === 'Partially Refunded') {
                order.paymentStatus = 'Refunded';
            }
        }

        await order.save();
        return order;
    }

    async returnOrderItem(orderId, itemId, userId, reason) {
        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) throw new Error("Order not found.");

        const item = order.orderedItems.id(itemId);
        if (!item) throw new Error("Item not found in order.");

        if (item.status !== 'Delivered') {
            throw new Error("Only delivered items can be returned.");
        }

        item.status = 'Return Request';
        item.returnReason = reason;

        // Update overall order status if all items are returned
        const allReturned = order.orderedItems.every(i => i.status === 'Return Request' || i.status === 'Returned' || i.status === 'Cancelled');
        if (allReturned) {
            order.status = 'Return Request';
        }

        await order.save();
        return order;
    }
}

export default new OrderService();
