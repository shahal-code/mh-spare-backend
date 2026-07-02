function handleQuantityChange(btn) {
    const itemId = btn.getAttribute('data-id');
    const qtyInput = document.getElementById(`qty-input-${itemId}`);
    const currentQuantity = parseInt(qtyInput.value);
    const delta = parseInt(btn.getAttribute('data-delta'));
    const newQuantity = currentQuantity + delta;

    if (newQuantity >= 1) {
        updateCartItem(itemId, newQuantity);
    }
}

async function updateCartItem(itemId, newQuantity) {
    try {
        const response = await fetch('/user/cart/update', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ itemId, quantity: newQuantity })
        });

        const result = await response.json();
        if (result.success) {
            // Update individual item quantity and buttons
            const qtyInput = document.getElementById(`qty-input-${itemId}`);
            const minusBtn = document.getElementById(`minus-${itemId}`);

            qtyInput.value = newQuantity;
            minusBtn.disabled = newQuantity <= 1;

            // Update summary
            updateCartSummary(result.cart);

            // Update badge if exists
            if (typeof window.addToCart === 'function') {
                const badge = document.getElementById('cart-badge');
                if (badge) {
                    const totalQty = result.cart.items.reduce((total, item) => total + item.quantity, 0);
                    badge.textContent = totalQty;
                    badge.classList.toggle('hidden', totalQty === 0);
                }
            }

            // SECURITY: Warn user if coupon was auto-removed due to cart total drop
            if (result.couponRemoved) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Coupon Removed',
                    text: result.couponWarning || 'Your coupon was removed because the cart total dropped below the minimum required.',
                    background: '#0D0D0D',
                    color: '#fff',
                    confirmButtonColor: '#0055ff'
                });
            }
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: result.message || 'Failed to update quantity',
                background: '#0D0D0D',
                color: '#fff'
            });
        }
    } catch (error) {
        console.error('Error updating cart:', error);
    }
}

async function removeCartItem(itemId) {
    const confirmResult = await Swal.fire({
        title: 'Remove Item?',
        text: "Are you sure you want to remove this item from your cart?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0055ff',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Yes, remove it',
        background: '#0D0D0D',
        color: '#fff'
    });

    if (!confirmResult.isConfirmed) return;

    try {
        const response = await fetch('/user/cart/remove', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ itemId })
        });

        const result = await response.json();
        if (result.success) {
            const itemRow = document.getElementById(`cart-item-${itemId}`);
            if (itemRow) {
                itemRow.style.opacity = '0';
                itemRow.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    itemRow.remove();
                    if (result.cart.items.length === 0) {
                        window.location.reload();
                    } else {
                        updateCartSummary(result.cart);
                    }
                }, 300);
            }

            // SECURITY: Warn user if coupon was auto-removed due to cart total drop
            if (result.couponRemoved) {
                // Small delay so the removal animation plays first
                setTimeout(() => {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Coupon Removed',
                        text: result.couponWarning || 'Your coupon was removed because the cart total dropped below the minimum required.',
                        background: '#0D0D0D',
                        color: '#fff',
                        confirmButtonColor: '#0055ff'
                    });
                }, 350);
            }
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Removal Failed',
                text: result.message || 'Failed to remove item',
                background: '#0D0D0D',
                color: '#fff'
            });
        }
    } catch (error) {
        console.error('Error removing item:', error);
    }
}

function updateCartSummary(cart) {
    // Recalculate subtotal using prices from the DOM since the server only sends IDs
    let subtotal = 0;
    let hasUnavailable = false;
    
    cart.items.forEach(item => {
        const itemRow = document.getElementById(`cart-item-${item._id}`);
        if (itemRow && itemRow.querySelector('.text-red-500.bg-red-500\\/10')) {
            hasUnavailable = true;
        }

        const priceSpan = document.getElementById(`price-${item._id}`);
        if (priceSpan) {
            const price = parseFloat(priceSpan.textContent);
            subtotal += price * item.quantity;
        }
    });

    const tax = subtotal * 0.18; // 18% tax matching controller logic
    const total = subtotal + tax;

    document.getElementById('summary-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('summary-tax').textContent = `₹${tax.toFixed(2)}`;
    document.getElementById('summary-total').textContent = `₹${total.toFixed(2)}`;

    // Update checkout button state
    const checkoutBtn = document.querySelector('a[href="javascript:void(0)"]');
    // Find the warning paragraph which is placed next to the checkout button in EJS
    const warningText = checkoutBtn ? checkoutBtn.nextElementSibling : null;

    if (checkoutBtn) {
        if (cart.items.length === 0) {
            checkoutBtn.setAttribute('onclick', 'return showEmptyCartWarning()');
            checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else if (hasUnavailable) {
            checkoutBtn.setAttribute('onclick', 'return showUnavailableWarning()');
            checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
            if (warningText && warningText.tagName === 'P') {
                warningText.style.display = 'block';
            }
        } else {
            checkoutBtn.setAttribute('onclick', `return validateAndProceedToCheckout(${total.toFixed(2)})`);
            checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            if (warningText && warningText.tagName === 'P' && warningText.textContent.includes('unavailable')) {
                warningText.style.display = 'none';
            }
        }
    }
}

function showEmptyCartWarning() {
    Swal.fire({
        icon: 'info',
        title: 'Cart is Empty',
        text: 'Please add some premium tech to your cart before checking out!',
        background: '#0D0D0D',
        color: '#fff',
        confirmButtonColor: '#0055ff'
    });
    return false;
}

function showUnavailableWarning() {
    Swal.fire({
        icon: 'warning',
        title: 'Items Unavailable',
        text: 'Some items in your cart are no longer available. Please remove them to proceed.',
        background: '#0D0D0D',
        color: '#fff',
        confirmButtonColor: '#0055ff'
    });
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'checkout_blocked') {
        Swal.fire({
            icon: 'error',
            title: 'Items Removed',
            text: 'Some items in your cart became unavailable and were automatically removed before checkout.',
            background: '#0D0D0D',
            color: '#fff',
            confirmButtonColor: '#0055ff'
        });
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        const checkoutBtn = document.querySelector('a[href="javascript:void(0)"]');
        if (checkoutBtn && checkoutBtn.getAttribute('onclick') && checkoutBtn.getAttribute('onclick').includes('showUnavailableWarning')) {
            Swal.fire({
                icon: 'warning',
                title: 'Action Required',
                text: 'Some products in your cart are currently unavailable. Please remove them to proceed.',
                background: '#0D0D0D',
                color: '#fff',
                confirmButtonColor: '#0055ff'
            });
        }
    }
});

async function validateAndProceedToCheckout(expectedTotal) {
    try {
        const response = await fetch('/user/cart/validate-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ expectedTotal })
        });

        const result = await response.json();

        if (result.success) {
            window.location.href = '/user/checkout';
        } else {
            Swal.fire({
                icon: result.icon || 'warning',
                title: result.title || 'Price Updated',
                text: result.message || 'An offer has expired or prices have changed. The cart will be updated.',
                background: '#0D0D0D',
                color: '#fff',
                confirmButtonColor: '#0055ff'
            }).then(() => {
                window.location.reload();
            });
        }
    } catch (error) {
        console.error('Checkout validation error:', error);
        window.location.href = '/user/checkout';
    }
    return false;
}
