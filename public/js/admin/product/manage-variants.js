let removedImages = [];
let selectedFiles = [];
let currentFilesToProcess = [];
let cropper = null;

const processorModels = {
    'Intel': ['Core i3', 'Core i5', 'Core i7', 'Core i9'],
    'AMD': ['Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9'],
};

function updateProcessorModels(selectedModel = '') {
    const brand = document.getElementById('processorBrand').value;
    const modelSelect = document.getElementById('processorModel');

    modelSelect.innerHTML = '<option value="" disabled selected>Select Model</option>';

    if (processorModels[brand]) {
        processorModels[brand].forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            if (model === selectedModel) option.selected = true;
            modelSelect.appendChild(option);
        });
    }
}

function openAddVariantModal() {
    const form = document.getElementById('variantForm');
    form.reset();
    form.action = `/admin/product/${productId}/variants/add`;
    document.getElementById('modalTitle').textContent = 'Add New Variant';
    document.getElementById('submitBtn').textContent = 'Create Variant';
    document.getElementById('existingImagesContainer').classList.add('hidden');
    document.getElementById('removedImagesContainer').innerHTML = '';
    document.getElementById('variantImagePreview').innerHTML = '';
    // Pre-fill if lastVariant exists
    if (lastVariant) {
        form.processorBrand.value = lastVariant.processorBrand || '';
        updateProcessorModels(lastVariant.processor);
        form.gpu.value = lastVariant.gpu || '';
        form.size.value = lastVariant.size || '';
    } else {
        document.getElementById('processorModel').innerHTML = '<option value="" disabled selected>Select Model</option>';
    }

    removedImages = [];
    selectedFiles = [];

    document.getElementById('variantModal').classList.remove('hidden');
    document.getElementById('variantModal').classList.add('flex');
}

function openEditVariantModal(variantId) {
    const variant = productVariants.find(v => v._id === variantId);
    if (!variant) return;

    const modal = document.getElementById('variantModal');
    const form = document.getElementById('variantForm');
    const title = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('submitBtn');

    // Set mode to Edit
    title.textContent = 'Edit Variant';
    submitBtn.textContent = 'Update Variant';
    form.action = `/admin/product/${productId}/variants/edit/${variantId}`;

    // Fill fields
    form.color.value = variant.color || '';
    form.price.value = variant.price || '';
    form.stock.value = variant.stock || '';
    form.processorBrand.value = variant.processorBrand || '';
    updateProcessorModels(variant.processor);
    form.ram.value = variant.ram || '';
    form.storage.value = variant.storage || '';
    form.gpu.value = variant.gpu || '';
    form.size.value = variant.size || '';

    // Handle existing images
    removedImages = [];
    selectedFiles = [];
    const existingContainer = document.getElementById('existingImagesContainer');
    const existingPreview = document.getElementById('existingImagesPreview');
    const removedInputContainer = document.getElementById('removedImagesContainer');
    document.getElementById('variantImagePreview').innerHTML = '';

    existingPreview.innerHTML = '';
    removedInputContainer.innerHTML = '';

    if (variant.images && variant.images.length > 0) {
        existingContainer.classList.remove('hidden');
        variant.images.forEach(img => {
            const div = document.createElement('div');
            div.className = 'w-24 h-24 rounded-xl border border-white/10 relative overflow-hidden group cursor-pointer';
            div.onclick = () => toggleImageRemoval(img, div);
            div.innerHTML = `
                <img src="${img}" class="w-full h-full object-cover transition-opacity duration-300">
                <div class="absolute inset-0 bg-rose-500/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span class="material-symbols-outlined text-white">delete</span>
                </div>
            `;
            existingPreview.appendChild(div);
        });
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function toggleImageRemoval(imagePath, element) {
    const index = removedImages.indexOf(imagePath);
    const imgElement = element.querySelector('img');
    const overlay = element.querySelector('div');

    if (index === -1) {
        removedImages.push(imagePath);
        imgElement.classList.add('opacity-20');
        overlay.innerHTML = '<span class="material-symbols-outlined text-white">undo</span>';
        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');
    } else {
        removedImages.splice(index, 1);
        imgElement.classList.remove('opacity-20');
        overlay.innerHTML = '<span class="material-symbols-outlined text-white">delete</span>';
        overlay.classList.add('opacity-0');
        overlay.classList.remove('opacity-100');
    }

    const removedInputContainer = document.getElementById('removedImagesContainer');
    removedInputContainer.innerHTML = '';
    removedImages.forEach(img => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'removedImages';
        input.value = img;
        removedInputContainer.appendChild(input);
    });
}

function closeModal() {
    document.getElementById('variantModal').classList.add('hidden');
    document.getElementById('variantModal').classList.remove('flex');
    selectedFiles = [];
    removedImages = [];
    renderPreviews();
}

function previewVariantImages(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
        if (!allowedTypes.includes(file.type)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid File Type',
                text: `File "${file.name}" is not a supported image format. Please use JPG, PNG, WEBP, or AVIF.`,
                background: '#11151F',
                color: '#fff'
            });
            event.target.value = '';
            return;
        }

        if (file.size > maxSize) {
            Swal.fire({
                icon: 'error',
                title: 'File Too Large',
                text: `File "${file.name}" exceeds the 5MB size limit.`,
                background: '#11151F',
                color: '#fff'
            });
            event.target.value = '';
            return;
        }
    }

    currentFilesToProcess = files;
    event.target.value = ''; // Reset
    processNextFile();
}

function processNextFile() {
    if (currentFilesToProcess.length === 0) return;

    const file = currentFilesToProcess.shift();
    const reader = new FileReader();
    reader.onload = (e) => {
        const modal = document.getElementById('cropperModal');
        const image = document.getElementById('cropperImage');
        image.src = e.target.result;

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        if (cropper) cropper.destroy();
        cropper = new Cropper(image, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1
        });
    };
    reader.readAsDataURL(file);
}

function closeCropper() {
    const modal = document.getElementById('cropperModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (cropper) cropper.destroy();
    if (currentFilesToProcess.length > 0) processNextFile();
}

function cropImage() {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width: 800, height: 800 });
    if (!canvas) return;
    canvas.toBlob((blob) => {
        const file = new File([blob], `variant-${Date.now()}.jpg`, { type: 'image/jpeg' });
        selectedFiles.push(file);
        syncFileInput();
        renderPreviews();
        closeCropper();
    }, 'image/jpeg', 0.9);
}

function syncFileInput() {
    const input = document.getElementById('variantImageUpload');
    const dt = new DataTransfer();
    selectedFiles.forEach(f => dt.items.add(f));
    input.files = dt.files;
}

function renderPreviews() {
    const container = document.getElementById('variantImagePreview');
    container.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        const div = document.createElement('div');
        div.className = 'w-24 h-24 rounded-xl border border-white/10 relative overflow-hidden group';
        div.innerHTML = `
            <img src="${url}" class="w-full h-full object-cover">
            <button type="button" onclick="removeImage(${index})" class="absolute top-1 right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="material-symbols-outlined text-xs">close</span>
            </button>
        `;
        container.appendChild(div);
    });
}

function removeImage(index) {
    selectedFiles.splice(index, 1);
    syncFileInput();
    renderPreviews();
}

async function deleteVariant(variantId) {
    const res = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#fe3f40',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        background: '#11151F',
        color: '#fff'
    });

    if (res.isConfirmed) {
        try {
            const productId = window.location.pathname.split('/').pop();
            const response = await fetch(`/admin/product/${productId}/variants/delete/${variantId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                Swal.fire({
                    title: 'Deleted!',
                    text: 'Variant has been removed.',
                    icon: 'success',
                    background: '#11151F',
                    color: '#fff'
                }).then(() => {
                    window.location.reload();
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: 'Failed to delete variant.',
                icon: 'error',
                background: '#11151F',
                color: '#fff'
            });
        }
    }
}

// ─── Variant Validation Helpers (offer-style) ────────────────────────────────
function showVariantError(id, message) {
    // id is like 'color', 'price' etc. Error element id is 'color-error'
    const input = document.getElementById(id);
    const error = document.getElementById(id + '-error');
    if (input) input.classList.add('input-error');
    if (error) { error.textContent = message; error.style.display = 'block'; }
}

function clearVariantError(id) {
    const input = document.getElementById(id);
    const error = document.getElementById(id + '-error');
    if (input) input.classList.remove('input-error');
    if (error) error.style.display = 'none';
}

function clearAllVariantErrors() {
    ['color', 'price', 'stock', 'processorBrand', 'processorModel', 'ram', 'images'].forEach(clearVariantError);
}

// Form Validation
document.getElementById('variantForm').onsubmit = function (e) {
    let isValid = true;
    const form = this;

    clearAllVariantErrors();

    const color = form.color.value.trim();
    const price = form.price.value.trim();
    const stock = form.stock.value.trim();
    const processorBrand = form.processorBrand.value;
    const processorModel = form.processorModel.value;
    const ram = form.ram.value;

    if (!color) { showVariantError('color', 'Please enter a color name.'); isValid = false; }

    if (!price) {
        showVariantError('price', 'Please enter a price.'); isValid = false;
    } else if (isNaN(price) || parseFloat(price) <= 0) {
        showVariantError('price', 'Please enter a valid positive price.'); isValid = false;
    }

    if (!stock) {
        showVariantError('stock', 'Please enter stock quantity.'); isValid = false;
    } else if (isNaN(stock) || parseInt(stock) < 0) {
        showVariantError('stock', 'Stock cannot be negative.'); isValid = false;
    }

    if (!processorBrand) { showVariantError('processorBrand', 'Please select a processor brand.'); isValid = false; }
    if (!processorModel || processorModel === 'Select Model') { showVariantError('processorModel', 'Please select a processor model.'); isValid = false; }
    if (!ram) { showVariantError('ram', 'Please select RAM size.'); isValid = false; }

    // Image Validation
    const isEdit = form.action.includes('edit');
    let totalImages = selectedFiles.length;

    if (isEdit) {
        const variantId = form.action.split('/').pop();
        const variant = productVariants.find(v => v._id === variantId);
        if (variant) {
            const existingCount = variant.images.length;
            totalImages += (existingCount - removedImages.length);
        }
    }

    if (totalImages < 3) {
        showVariantError('images', `At least 3 images are required. (Current: ${totalImages})`);
        isValid = false;
    }

    if (!isValid) {
        e.preventDefault();
        const firstError = document.querySelector('.field-error[style*="block"]');
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};


// Automatically open modal if the product is brand new or has incomplete variants
window.addEventListener('load', () => {
    if (!productVariants || productVariants.length === 0) {
        openAddVariantModal();
    } else if (productVariants.length === 1 && (!productVariants[0].images || productVariants[0].images.length === 0)) {
        // It's a placeholder variant from product creation, open Edit modal for it
        openEditVariantModal(productVariants[0]._id);
    }
});
