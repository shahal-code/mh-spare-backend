const avatarInput = document.getElementById("avatarInput");
if (avatarInput) {
    avatarInput.addEventListener("change", function () {
        const file = this.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            let previewImg = document.getElementById("previewImg");
            if (previewImg) {
                previewImg.src = url;
            } else {
                // Find the container and replace initials with image
                const container = document.querySelector('label[for="avatarInput"] .size-full.rounded-full.overflow-hidden');
                if (container) {
                    container.innerHTML = '<img id="previewImg" src="' + url + '" class="w-full h-full object-cover">';
                }
            }
        }
    });
}

const editProfileForm = document.getElementById('editProfileForm');
if (editProfileForm) {
    editProfileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Saving...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData(this);
            const response = await fetch(this.action, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                window.location.href = data.redirect || '/user/profile';
            } else {
                alert(data.message || 'Error updating profile');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while saving the profile.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}
