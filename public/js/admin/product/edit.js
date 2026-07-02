let selectedFiles = []; 
let cropper = null;
let filesToProcess = [];
let removedImages = []; // Track existing images to be removed

/**
 * Handle new image uploads
 */
function previewImages(event) {
    const fileInput = event.target;
    const newFiles = Array.from(fileInput.files);
    
    if (newFiles.length === 0) return;

    filesToProcess = filesToProcess.concat(newFiles);
    fileInput.value = '';

    const modal = document.getElementById('cropperModal');
    if (modal && modal.classList.contains('hidden')) {
        processNextFile();
    }
}

/**
 * Handle cropping of an EXISTING image
 */
async function startCroppingExisting(url, index) {
    try {
        console.log("Fetching existing image for cropping:", url);
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], `existing-${index}.jpg`, { type: blob.type });
        
        // Add to queue
        filesToProcess.push(file);
        
        // Mark original for deletion (it will be replaced by the cropped version)
        // We'll only actually add it to removedImages after the crop is successful
        // to avoid losing the image if the user cancels the crop.
        window.pendingRemovalIndex = index;
        window.pendingRemovalUrl = url;

        const modal = document.getElementById('cropperModal');
        if (modal && modal.classList.contains('hidden')) {
            processNextFile();
        }
    } catch (err) {
        console.error("Error fetching existing image:", err);
        Swal.fire('Error', 'Could not load image for cropping. External images might have CORS restrictions.', 'error');
    }
}

/**
 * Delete an existing image
 */
function deleteExistingImage(url, index) {
    if (removedImages.includes(url)) return;
    
    removedImages.push(url);
    
    // Hide the element
    const el = document.getElementById(`existing-img-${index}`);
    if (el && el.parentElement) {
        el.parentElement.style.display = 'none';
    }
    
    // Update hidden inputs for the form
    syncRemovedImages();
    
    // Update global count for validation
    window.existingImageCount = Math.max(0, window.existingImageCount - 1);
}

/**
 * Sync removed images to hidden inputs in the form
 */
function syncRemovedImages() {
    const form = document.getElementById('productForm');
    // Remove old hidden inputs
    const oldInputs = form.querySelectorAll('input[name="removedImages"]');
    oldInputs.forEach(el => el.remove());
    
    // Add new ones
    removedImages.forEach(url => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'removedImages';
        input.value = url;
        form.appendChild(input);
    });
}

function processNextFile() {
    if (filesToProcess.length === 0) return;

    const file = filesToProcess.shift();
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const modal = document.getElementById('cropperModal');
        const image = document.getElementById('cropperImage');
        
        image.src = e.target.result;
        
        image.onload = () => {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            
            if (cropper) {
                cropper.destroy();
            }
            
            cropper = new Cropper(image, {
                aspectRatio: 1,
                viewMode: 1,
                autoCropArea: 1,
                background: false,
                responsive: true
            });
        };
    };
    reader.readAsDataURL(file);
}

function closeCropper() {
    const modal = document.getElementById('cropperModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    
    // Reset pending removal if cancelled
    window.pendingRemovalIndex = null;
    window.pendingRemovalUrl = null;

    if (filesToProcess.length > 0) {
        processNextFile();
    } else {
        syncAndRender();
    }
}

function cropImage() {
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas({
        width: 800,
        height: 800
    });

    if (!canvas) return;

    canvas.toBlob((blob) => {
        const fileName = `product-${Date.now()}.jpg`;
        const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });
        
        selectedFiles.push(croppedFile);
        
        // If this was an update to an existing image, finalize the removal
        if (window.pendingRemovalUrl) {
            deleteExistingImage(window.pendingRemovalUrl, window.pendingRemovalIndex);
            window.pendingRemovalUrl = null;
            window.pendingRemovalIndex = null;
        }

        syncAndRender();

        const modal = document.getElementById('cropperModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        cropper.destroy();
        cropper = null;
        
        processNextFile();
    }, 'image/jpeg', 0.9);
}

function syncAndRender() {
    const fileInput = document.getElementById('imageUpload');
    const container = document.getElementById('imagePreviewContainer');
    
    syncFileInput(fileInput);
    renderPreviews(container);
}

function removeImage(index) {
    selectedFiles.splice(index, 1);
    syncAndRender();
}

function syncFileInput(fileInput) {
    if (!fileInput) return;
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;
}

function renderPreviews(container) {
    if (!container) return;
    container.innerHTML = '<p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest text-center px-4 py-2">New Selection Preview</p>';
    
    if (selectedFiles.length === 0) return;

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'bg-[#151923] rounded-2xl p-4 flex items-center justify-between gap-4 mb-2 w-full border border-white/5 flex-shrink-0';
            div.innerHTML = `
                <div class="flex items-center gap-4 overflow-hidden">
                    <div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img src="${e.target.result}" class="w-full h-full object-cover" />
                    </div>
                    <div class="overflow-hidden">
                        <p class="font-bold text-[11px] text-white truncate max-w-[100px]">${file.name}</p>
                    </div>
                </div>
                <button type="button" onclick="removeImage(${index})" class="text-rose-500 hover:text-rose-400 p-1.5 rounded-full hover:bg-rose-500/10 transition-colors">
                    <span class="material-symbols-outlined text-lg">close</span>
                </button>
            `;
            container.appendChild(div);
        }
        reader.readAsDataURL(file);
    });
}
