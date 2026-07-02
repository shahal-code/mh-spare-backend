document.addEventListener('DOMContentLoaded', () => {
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const messageContainer = document.getElementById('messageContainer');

    function showMessage(message, type) {
        messageContainer.classList.remove('hidden', 'bg-red-500/10', 'text-red-500', 'border-red-500/20', 'bg-green-500/10', 'text-green-500', 'border-green-500/20');
        messageContainer.classList.add('border');
        
        if (type === 'success') {
            messageContainer.classList.add('bg-green-500/10', 'text-green-500', 'border-green-500/20');
            messageContainer.innerHTML = `<span class="material-symbols-outlined align-middle mr-2">check_circle</span> ${message}`;
        } else {
            messageContainer.classList.add('bg-red-500/10', 'text-red-500', 'border-red-500/20');
            messageContainer.innerHTML = `<span class="material-symbols-outlined align-middle mr-2">error</span> ${message}`;
        }
    }

    // Common fetch wrapper
    async function handleFormSubmit(form, url, successCallback) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Processing...';
        submitBtn.disabled = true;
        messageContainer.classList.add('hidden');

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showMessage(result.message, 'success');
                if (successCallback) successCallback(result);
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('An unexpected error occurred. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // Step 1: Request OTP
    document.getElementById('step1Form').addEventListener('submit', function(e) {
        e.preventDefault();
        handleFormSubmit(this, '/user/profile/change-email/request-otp', () => {
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
        });
    });

    // Step 2: Verify OTP
    document.getElementById('step2Form').addEventListener('submit', function(e) {
        e.preventDefault();
        handleFormSubmit(this, '/user/profile/change-email/verify-otp', () => {
            step2.classList.add('hidden');
            step3.classList.remove('hidden');
        });
    });

    // Step 3: Send Verification Link
    document.getElementById('step3Form').addEventListener('submit', function(e) {
        e.preventDefault();
        handleFormSubmit(this, '/user/profile/change-email', () => {
            this.reset();
        });
    });
});
