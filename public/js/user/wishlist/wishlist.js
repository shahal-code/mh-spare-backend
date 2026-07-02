async function removeFromWishlist(productId, variantId) {
    const result = await Swal.fire({
        title: 'Remove from wishlist?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0055ff',
        cancelButtonColor: '#334155',
        confirmButtonText: 'Yes, remove',
        background: '#0D0D0D',
        color: '#fff'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch('/user/wishlist/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, variantId })
        });
        const data = await response.json();
        if (data.success) {
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

            const itemRow = document.querySelector(`[data-product-id="${productId}"][data-variant-id="${variantId}"]`);
            if (itemRow) {
                itemRow.style.opacity = '0';
                itemRow.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    itemRow.remove();
                    if (document.querySelectorAll('.glass-card.group.rounded-3xl').length === 0) {
                        window.location.reload();
                    }
                }, 500);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function moveToCart(productId, variantId) {
    if (typeof addToCart === 'function') {
        const result = await addToCart(productId, variantId, 1);
        if (result && result.success) {
            // Remove item from DOM
            const itemRow = document.querySelector(`[data-product-id="${productId}"][data-variant-id="${variantId}"]`);
            if (itemRow) {
                itemRow.style.opacity = '0';
                itemRow.style.transform = 'translateX(50px)';
                setTimeout(() => {
                    itemRow.remove();
                    if (document.querySelectorAll('.glass-card.group.rounded-3xl').length === 0) {
                        window.location.reload();
                    }
                }, 500);
            }

            // Also remove from wishlist on the server and update badge
            try {
                const wishlistRes = await fetch('/user/wishlist/remove', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, variantId })
                });
                const wishlistData = await wishlistRes.json();
                if (wishlistData.success) {
                    const badge = document.getElementById('wishlist-badge');
                    if (badge && typeof wishlistData.wishlistCount !== 'undefined') {
                        badge.textContent = wishlistData.wishlistCount;
                        if (wishlistData.wishlistCount > 0) {
                            badge.classList.remove('hidden');
                        } else {
                            badge.classList.add('hidden');
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to remove from wishlist after move to cart:', err);
            }
        }
    } else {
        console.error("Global addToCart function not found!");
    }
}
