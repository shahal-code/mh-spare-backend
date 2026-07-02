let cartItems = JSON.parse(document.getElementById('cart-items-json').textContent);
const variants = JSON.parse(document.getElementById('product-variants-json').textContent);
const productOffer = JSON.parse(document.getElementById('product-offer-json').textContent);

// Find the first in-stock variant, fall back to variants[0] if all are out of stock
const defaultVariant = variants.find(v => v.stock > 0) || variants[0];

let selectedFilters = {
    ram: defaultVariant?.ram,
    storage: defaultVariant?.storage,
    size: defaultVariant?.size,
    color: defaultVariant?.color
};
let currentVariant = defaultVariant;
let currentQty = 1;

function updateSelection(type, value) {
    console.log(`--- Variant Selection: ${type} = ${value} ---`);
    selectedFilters[type] = value;

    // 1. Find all variants that match the attribute the user just clicked
    const matches = variants.filter(v => String(v[type]) === String(value));
    console.log(`Found ${matches.length} matches for ${type}=${value}`);

    if (matches.length === 0) return;

    // 2. From those matches, pick the one that matches the MOST of our other current filters
    let bestMatch = matches[0];
    let maxScore = -1;

    matches.forEach(v => {
        let score = 0;
        // Check matching with other filters (excluding the one we just clicked)
        if (type !== 'ram' && String(v.ram) === String(selectedFilters.ram)) score++;
        if (type !== 'storage' && String(v.storage) === String(selectedFilters.storage)) score++;
        if (type !== 'size' && String(v.size) === String(selectedFilters.size)) score++;
        if (type !== 'color' && String(v.color) === String(selectedFilters.color)) score++;

        console.log(`Variant ${v.sku}: Score ${score} (${v.ram}, ${v.storage}, ${v.color})`);

        if (score > maxScore) {
            maxScore = score;
            bestMatch = v;
        }
    });

    const variant = bestMatch;
    console.log(`Best match found: ${variant.sku}`);

    if (variant) {
        currentVariant = variant;
        
        // Sync ALL filters to the found variant so the UI stays consistent
        selectedFilters.ram = variant.ram;
        selectedFilters.storage = variant.storage;
        selectedFilters.size = variant.size;
        selectedFilters.color = variant.color;
        
        updateUI();
        updateButtonStyles();
    }
}

function updateButtonStyles() {
    // Update all button styles based on current selectedFilters
    document.querySelectorAll('.option-btn').forEach(btn => {
        const type = btn.getAttribute('data-type');
        const value = btn.getAttribute('data-value');
        
        if (selectedFilters[type] === value) {
            btn.classList.add('border-[#3b82f6]', 'bg-[#3b82f6]/10', 'text-white');
            btn.classList.remove('border-white/10', 'text-slate-500');
        } else {
            btn.classList.remove('border-[#3b82f6]', 'bg-[#3b82f6]/10', 'text-white');
            btn.classList.add('border-white/10', 'text-slate-500');
        }
    });
}

function updateUI() {
    if (!currentVariant) return;

    // Price
    const priceEl = document.getElementById('displayPrice');
    const oldPriceEl = document.getElementById('displayOldPrice');
    const discountBadge = document.getElementById('discount-badge');

    if (priceEl) priceEl.textContent = `₹${currentVariant.price}`;

    // Show original price if this variant has been discounted by an offer
    const originalPrice = currentVariant.originalPrice || currentVariant.oldPrice;
    if (originalPrice && originalPrice > currentVariant.price) {
        if (oldPriceEl) {
            oldPriceEl.textContent = `₹${originalPrice}`;
            oldPriceEl.classList.remove('hidden');
        }
        // Show offer name + discount text in badge
        if (discountBadge) {
            if (productOffer) {
                // Build the badge HTML: offer name on top, discount text below
                let discountText = '';
                if (productOffer.discountType === 'percentage') {
                    discountText = `Save ${productOffer.discountValue}%`;
                    if (productOffer.maxDiscountAmount) {
                        discountText += ` (upto ₹${productOffer.maxDiscountAmount})`;
                    }
                } else {
                    discountText = `Flat ₹${productOffer.discountValue} Off`;
                }
                discountBadge.innerHTML = `
                    <span style="display:block;color:#6ee7b7;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;">${productOffer.name}</span>
                    <span style="display:block;color:#34d399;font-size:9px;font-weight:700;">${discountText}</span>
                `;
                discountBadge.style.display = 'flex';
                discountBadge.style.flexDirection = 'column';
                discountBadge.style.alignItems = 'flex-start';
                discountBadge.style.lineHeight = '1.3';
            } else {
                // Fallback: just show percentage saved
                const percent = Math.round(((originalPrice - currentVariant.price) / originalPrice) * 100);
                discountBadge.textContent = `Save ${percent}%`;
            }
            discountBadge.classList.remove('hidden');
        }
    } else {
        if (oldPriceEl) oldPriceEl.classList.add('hidden');
        if (discountBadge) discountBadge.classList.add('hidden');
    }

    // Stock Calculation (accounting for cart)
    const currentVariantId = String(currentVariant._id.$oid || currentVariant._id);
    const cartItem = cartItems.find(item => {
        const itemVarId = String(item.variantId.$oid || item.variantId);
        return itemVarId === currentVariantId;
    });

    const inCartQty = cartItem ? cartItem.quantity : 0;
    const availableToBuy = Math.max(0, currentVariant.stock);

    const stockDot = document.getElementById('stock-dot');
    const stockStatus = document.getElementById('stock-status');
    const addToCartBtn = document.getElementById('mainAddToCartBtn');
    const qtySelector = document.getElementById('qty-selector-container');

    const updateBtnState = (isAvailable, text) => {
        if (!addToCartBtn) return;
        addToCartBtn.disabled = !isAvailable;
        addToCartBtn.textContent = text;
        if (isAvailable) {
            addToCartBtn.classList.add('bg-primary', 'text-white', 'hover:bg-blue-600', 'shadow-[0_0_30px_rgba(59,130,246,0.3)]');
            addToCartBtn.classList.remove('bg-white/10', 'text-gray-500', 'cursor-not-allowed', 'opacity-50');
        } else {
            addToCartBtn.classList.remove('bg-primary', 'text-white', 'hover:bg-blue-600', 'shadow-[0_0_30px_rgba(59,130,246,0.3)]');
            addToCartBtn.classList.add('bg-white/10', 'text-gray-500', 'cursor-not-allowed', 'opacity-50');
        }
    };

    if (stockDot && stockStatus) {
        if (currentVariant.stock > 10) {
            stockDot.className = 'w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse';
            stockStatus.textContent = 'In Stock';
            stockStatus.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500';
            updateBtnState(availableToBuy > 0, availableToBuy > 0 ? 'Add to Cart' : 'Max in Cart');
            if (qtySelector) qtySelector.style.display = availableToBuy > 0 ? 'flex' : 'none';
        } else if (currentVariant.stock > 0) {
            stockDot.className = 'w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse';
            stockStatus.textContent = `Only ${currentVariant.stock} Left`;
            stockStatus.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500';
            updateBtnState(availableToBuy > 0, availableToBuy > 0 ? 'Add to Cart' : 'Max in Cart');
            if (qtySelector) qtySelector.style.display = availableToBuy > 0 ? 'flex' : 'none';
        } else {
            stockDot.className = 'w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-pulse';
            stockStatus.textContent = 'Out of Stock';
            stockStatus.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500';
            updateBtnState(false, 'Out of Stock');
            if (qtySelector) qtySelector.style.display = 'none';
        }
    }

    // Meta Badges
    const gpuMeta = document.getElementById('badge-gpu-meta');
    const ramMeta = document.getElementById('badge-ram-meta');
    const storageMeta = document.getElementById('badge-storage-meta');
    if (gpuMeta) gpuMeta.textContent = currentVariant.gpu;
    if (ramMeta) ramMeta.textContent = currentVariant.ram;
    if (storageMeta) storageMeta.textContent = currentVariant.storage;

    // Spec Cards
    const specProc = document.getElementById('spec-processor');
    const specGpu = document.getElementById('spec-gpu');
    if (specProc) specProc.textContent = currentVariant.processor;
    if (specGpu) specGpu.textContent = currentVariant.gpu;

    // Gallery
    if (currentVariant.images && currentVariant.images.length > 0) {
        const mainImg = document.getElementById('mainImage');
        if (mainImg) mainImg.src = currentVariant.images[0];
        const thumbGrid = document.querySelector('.grid.grid-cols-4.gap-4');
        if (thumbGrid) {
            thumbGrid.innerHTML = '';
            currentVariant.images.forEach((img, i) => {
                const div = document.createElement('div');
                div.className = `glass-card aspect-square rounded-2xl overflow-hidden cursor-pointer hover:border-primary transition-all duration-300 thumbnails border-2 ${i === 0 ? 'border-primary' : 'border-transparent'}`;
                div.onclick = () => changeImage(img, div);
                div.innerHTML = `<img src="${img}" class="w-full h-full object-cover">`;
                thumbGrid.appendChild(div);
            });
        }
    }

    // Update quantity display
    updateQty(0);
}

function updateQty(delta) {
    if (!currentVariant) return;

    const currentVariantId = String(currentVariant._id.$oid || currentVariant._id);
    const cartItem = cartItems.find(item => {
        const itemVarId = String(item.variantId.$oid || item.variantId);
        return itemVarId === currentVariantId;
    });

    const inCartQty = cartItem ? cartItem.quantity : 0;
    const availableToBuy = Math.max(0, currentVariant.stock - inCartQty);

    const maxQty = Math.min(availableToBuy, 5);
    if (maxQty <= 0) {
        currentQty = 0;
    } else {
        currentQty = Math.min(maxQty, Math.max(1, currentQty + delta));
    }

    const qtyEl = document.getElementById('quantity');
    if (qtyEl) qtyEl.textContent = currentQty;
}

function changeImage(src, thumb) {
    document.getElementById('mainImage').src = src;
    document.querySelectorAll('.thumbnails').forEach(t => {
        t.classList.remove('border-primary');
        t.classList.add('border-transparent');
    });
    thumb.classList.add('border-primary');
    thumb.classList.remove('border-transparent');
}

// Modern Image Zoom Logic
function setupZoom() {
    const container = document.getElementById('mainImageContainer');
    const img = document.getElementById('mainImage');
    if (!container || !img) return;
    container.addEventListener('mousemove', (e) => {
        const { left, top, width, height } = container.getBoundingClientRect();
        const x = ((e.pageX - left - window.pageXOffset) / width) * 100;
        const y = ((e.pageY - top - window.pageYOffset) / height) * 100;
        img.style.transformOrigin = `${x}% ${y}%`;
    });
    container.addEventListener('mouseleave', () => {
        img.style.transformOrigin = 'center center';
    });
}

// Initialize after window loads
window.addEventListener('load', () => {
    setupZoom();
    updateUI();
});

/**
 * Called by cartUtils.js when server returns a blocked/unavailable product error.
 * Updates the product page UI to reflect the unavailable state without a page reload.
 */
window.markProductUnavailable = function(message) {
    // 1. Update stock indicator
    const stockDot = document.getElementById('stock-dot');
    const stockStatus = document.getElementById('stock-status');
    if (stockDot) {
        stockDot.className = 'w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-pulse';
    }
    if (stockStatus) {
        stockStatus.textContent = 'Unavailable';
        stockStatus.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500';
    }

    // 2. Disable Add to Cart button
    const addToCartBtn = document.getElementById('mainAddToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = 'Currently Unavailable';
        addToCartBtn.classList.remove('bg-primary', 'text-white', 'hover:bg-blue-600', 'shadow-[0_0_30px_rgba(59,130,246,0.3)]');
        addToCartBtn.classList.add('bg-white/10', 'text-gray-500', 'cursor-not-allowed', 'opacity-50');
    }

    // 3. Hide quantity selector
    const qtySelector = document.getElementById('qty-selector-container');
    if (qtySelector) qtySelector.style.display = 'none';

    // 4. Disable wishlist button
    document.querySelectorAll('button[onclick*="toggleWishlist"]').forEach(btn => {
        btn.disabled = true;
        btn.classList.add('opacity-40', 'cursor-not-allowed');
        btn.onclick = null;
    });

    // 5. Insert unavailable banner if not already present
    const existingBanner = document.getElementById('unavailable-banner');
    if (!existingBanner) {
        const productTitle = document.querySelector('h1.text-6xl');
        if (productTitle) {
            const banner = document.createElement('div');
            banner.id = 'unavailable-banner';
            banner.className = 'mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3';
            banner.innerHTML = `
                <span class="material-symbols-outlined text-rose-500">block</span>
                <div>
                    <h3 class="text-rose-500 font-bold tracking-widest uppercase text-sm">Currently Unavailable</h3>
                    <p class="text-rose-400/80 text-xs mt-1">${message || 'This product is currently unavailable.'}</p>
                </div>
            `;
            productTitle.parentNode.insertBefore(banner, productTitle);
        }
    }
};

// Add to Cart Logic
async function handleAddToCart(productId, event = null) {
    if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }
    if (!currentVariant) {
        Swal.fire({
            icon: 'info',
            title: 'Selection Required',
            text: 'Please select product options before adding to cart.',
            background: '#0D0D0D',
            color: '#fff'
        });
        return;
    }

    // Call the global function from cartUtils.js
    if (typeof addToCart === 'function') {
        const result = await addToCart(productId, currentVariant._id, currentQty, event);
        if (result && result.success && result.cart) {
            cartItems = result.cart.items;
            updateUI();
        }
    } else {
        console.error("Global addToCart function not found!");
    }
}

async function openReviewModal() {
    const productId = window.location.pathname.split('/').pop();
    
    const { value: formValues } = await Swal.fire({
        title: 'Write a Review',
        html: `
            <div class="space-y-4 text-left mt-4">
                <div>
                    <label class="block text-sm font-bold text-slate-300 mb-2">Rating (1-5)</label>
                    <input id="swal-rating" type="number" min="1" max="5" value="5" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all">
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-300 mb-2">Comment</label>
                    <textarea id="swal-comment" rows="4" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all" placeholder="Share your experience..."></textarea>
                </div>
            </div>
        `,
        focusConfirm: false,
        background: '#0D0D0D',
        color: '#fff',
        showCancelButton: true,
        confirmButtonText: 'Submit Review',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#ef4444',
        preConfirm: () => {
            const rating = document.getElementById('swal-rating').value;
            const comment = document.getElementById('swal-comment').value;
            
            if (!rating || !comment) {
                Swal.showValidationMessage('Please provide both a rating and a comment');
            }
            if (rating < 1 || rating > 5) {
                Swal.showValidationMessage('Rating must be between 1 and 5');
            }
            return { rating, comment };
        }
    });

    if (formValues) {
        try {
            const response = await fetch(`/user/product/${productId}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formValues)
            });
            const data = await response.json();
            
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Review Submitted!',
                    text: data.message,
                    background: '#0D0D0D',
                    color: '#fff',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    window.location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: data.message || 'Failed to submit review.',
                    background: '#0D0D0D',
                    color: '#fff'
                });
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            Swal.fire({
                icon: 'error',
                title: 'Server Error',
                text: 'An error occurred while submitting your review.',
                background: '#0D0D0D',
                color: '#fff'
            });
        }
    }
}

async function deleteReview(reviewId) {
    const productId = window.location.pathname.split('/').pop();

    const result = await Swal.fire({
        title: 'Delete Review?',
        text: "Are you sure you want to delete your review? This cannot be undone.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#3b82f6',
        confirmButtonText: 'Yes, delete it!',
        background: '#0D0D0D',
        color: '#fff'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/user/product/${productId}/review/${reviewId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();

            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: data.message,
                    background: '#0D0D0D',
                    color: '#fff',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    window.location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed',
                    text: data.message || 'Could not delete the review.',
                    background: '#0D0D0D',
                    color: '#fff'
                });
            }
        } catch (error) {
            console.error('Error deleting review:', error);
            Swal.fire({
                icon: 'error',
                title: 'Server Error',
                text: 'An error occurred while deleting your review.',
                background: '#0D0D0D',
                color: '#fff'
            });
        }
    }
}
