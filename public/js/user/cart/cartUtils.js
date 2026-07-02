// Shared AJAX utilities for Cart and Wishlist

window.showAuthToast = (message) => {
    Swal.fire({
        icon: 'warning',
        title: 'Authentication Required',
        text: message || 'Please login to continue',
        background: '#0D0D0D',
        color: '#fff'
    });
};

window.addToCart = async function(productId, variantId, quantity = 1, event = null, options = { showSuccessModal: true }) {
    if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }
    try {
        const response = await fetch('/user/cart/add', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ productId, variantId, quantity })
        });

        if (response.status === 401) {
            window.showAuthToast();
            return { success: false, unauthenticated: true };
        }

        const result = await response.json();
        if (result.success) {
            if (options.showSuccessModal) {
                Swal.fire({
                    icon: 'success',
                    title: 'Added to Cart',
                    text: 'Product added to your cart!',
                    showCancelButton: true,
                    confirmButtonText: 'View Cart',
                    confirmButtonColor: '#0055FF',
                    background: '#0D0D0D',
                    color: '#fff'
                }).then((res) => {
                    if (res.isConfirmed) {
                        window.location.href = '/user/cart';
                    }
                });
            }

            // Update cart badge if exists
            const badge = document.getElementById('cart-badge');
            if (badge) {
                const newTotal = result.cart.items.reduce((total, item) => total + item.quantity, 0);
                badge.textContent = newTotal;
                badge.classList.remove('hidden');
            }
        } else {
            if (result.redirect) {
                window.location.href = result.redirect;
            } else {
                // Check if product is unavailable/blocked
                const isUnavailable = result.message && (
                    result.message.toLowerCase().includes('unavailable') ||
                    result.message.toLowerCase().includes('blocked')
                );
                Swal.fire({
                    icon: isUnavailable ? 'warning' : 'error',
                    title: isUnavailable ? 'Product Unavailable' : 'Error',
                    text: result.message || 'Failed to add item',
                    background: '#0D0D0D',
                    color: '#fff'
                });
                // Update product page UI if on product details page
                if (isUnavailable && typeof window.markProductUnavailable === 'function') {
                    window.markProductUnavailable(result.message);
                }
            }
        }
        return result;
    } catch (error) {
        console.error('Error adding to cart:', error);
        return { success: false, message: error.message };
    }
};

window.toggleWishlist = async function(event, productId, variantId) {
    if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }

    try {
        const response = await fetch('/user/wishlist/add', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ productId, variantId })
        });

        if (response.status === 401) {
            window.showAuthToast();
            return;
        }

        const data = await response.json();
        if (data.success) {
            // Visual toggle of the heart icon
            const btn = event?.currentTarget;
            if (btn) {
                const heartIcon = btn.querySelector('.material-symbols-outlined');
                if (heartIcon) {
                    heartIcon.style.fontVariationSettings = data.action === 'added' ? "'FILL' 1" : "'FILL' 0";
                }
            }

            Swal.fire({
                icon: data.action === 'added' ? 'success' : 'info',
                title: 'Wishlist Updated',
                text: data.message,
                background: '#0D0D0D',
                color: '#fff',
                timer: 1500,
                showConfirmButton: false
            });

            // Update wishlist badge
            const badge = document.getElementById('wishlist-badge');
            if (badge && typeof data.wishlistCount !== 'undefined') {
                badge.textContent = data.wishlistCount;
                if (data.wishlistCount > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        } else {
            // Check if product is unavailable/blocked
            const isUnavailable = data.message && (
                data.message.toLowerCase().includes('unavailable') ||
                data.message.toLowerCase().includes('blocked')
            );
            Swal.fire({
                icon: isUnavailable ? 'warning' : 'error',
                title: isUnavailable ? 'Product Unavailable' : 'Error',
                text: data.message || 'Something went wrong',
                background: '#0D0D0D',
                color: '#fff'
            });
            // Update product page UI if on product details page
            if (isUnavailable && typeof window.markProductUnavailable === 'function') {
                window.markProductUnavailable(data.message);
            }
        }
    } catch (error) {
        console.error('Wishlist error:', error);
    }
};
