let selectedFiles = []; // This will hold the final cropped File objects
let cropper = null;
let filesToProcess = [];

/**
 * Handle image selection
 */
function previewImages(event) {
    const fileInput = event.target;
    const newFiles = Array.from(fileInput.files);
    
    if (newFiles.length === 0) return;

    // Add files to a queue to be cropped one by one
    filesToProcess = filesToProcess.concat(newFiles);
    
    // Reset file input so the same file can be selected again
    fileInput.value = '';

    // If we're not already cropping, start with the next file
    const modal = document.getElementById('cropperModal');
    if (modal && modal.classList.contains('hidden')) {
        processNextFile();
    }
}

/**
 * Process the next file in the queue
 */
function processNextFile() {
    if (filesToProcess.length === 0) {
        console.log("No more files to process.");
        return;
    }

    const file = filesToProcess.shift();
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const modal = document.getElementById('cropperModal');
        const image = document.getElementById('cropperImage');
        
        image.src = e.target.result;
        
        // Ensure image is loaded before initializing Cropper
        image.onload = () => {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            
            if (cropper) {
                cropper.destroy();
            }
            
            cropper = new Cropper(image, {
                aspectRatio: 1, // 1:1 for products
                viewMode: 1,
                autoCropArea: 1,
                background: false,
                responsive: true
            });
        };
    };
    reader.readAsDataURL(file);
}

/**
 * Close the cropper modal and move to next file
 */
function closeCropper() {
    const modal = document.getElementById('cropperModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    
    // Process next if any
    if (filesToProcess.length > 0) {
        processNextFile();
    } else {
        // Final sync if queue ends early (cancelled)
        syncFileInput(document.getElementById('imageUpload'));
        renderPreviews(document.getElementById('imagePreviewContainer'));
    }
}

/**
 * Perform the crop and save the result
 */
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
        
        // Add to our global list
        selectedFiles.push(croppedFile);
        
        // Update the form's file input and the preview UI immediately
        syncAndRender();

        // Close modal and destroy current cropper
        const modal = document.getElementById('cropperModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        cropper.destroy();
        cropper = null;
        
        // Continue to next file in queue
        processNextFile();
    }, 'image/jpeg', 0.9);
}

/**
 * Synchronize the hidden file input and refresh previews
 */
function syncAndRender() {
    const fileInput = document.getElementById('imageUpload');
    const container = document.getElementById('imagePreviewContainer');
    
    syncFileInput(fileInput);
    renderPreviews(container);
}

/**
 * Remove an image from the selection
 */
function removeImage(index) {
    selectedFiles.splice(index, 1);
    syncAndRender();
}

/**
 * Copy selectedFiles array into the actual file input's files list
 */
function syncFileInput(fileInput) {
    if (!fileInput) return;
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;
}

/**
 * Display selected images in the UI
 */
function renderPreviews(container) {
    if (!container) return;
    container.innerHTML = '';
    
    if (selectedFiles.length === 0) {
        container.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <span class="material-symbols-outlined text-slate-500">image_not_supported</span>
                </div>
                <div>
                    <p class="font-bold text-sm text-slate-300">Preview Mode</p>
                    <p class="text-xs text-slate-500">No images ready for upload</p>
                </div>
            </div>
        `;
        return;
    }

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'bg-input-bg rounded-2xl p-4 flex items-center justify-between gap-4 mb-2 w-full border border-white/5 flex-shrink-0';
            div.innerHTML = `
                <div class="flex items-center gap-4 overflow-hidden">
                    <div class="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img src="${e.target.result}" class="w-full h-full object-cover" />
                    </div>
                    <div class="overflow-hidden">
                        <p class="font-bold text-sm text-white truncate max-w-[150px]">${file.name}</p>
                        <p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest">${(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                </div>
                <button type="button" onclick="removeImage(${index})" class="text-rose-500 hover:text-rose-400 p-2 rounded-full hover:bg-rose-500/10 transition-colors">
                    <span class="material-symbols-outlined text-xl">close</span>
                </button>
            `;
            container.appendChild(div);
        }
        reader.readAsDataURL(file);
    });
}
