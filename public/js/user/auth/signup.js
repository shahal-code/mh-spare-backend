window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        window.location.reload();
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('signupForm');
    
    if (form) {
        form.addEventListener('submit', function (e) {
            let isValid = true;

            // Helper function to show error
            const showError = (inputId, message) => {
                const input = document.getElementById(inputId);
                const errorEl = document.getElementById(`${inputId}-error`);
                
                input.classList.add('input-error');
                errorEl.textContent = message;
                errorEl.classList.remove('hidden');
                isValid = false;
            };

            // Helper function to clear error
            const clearError = (inputId) => {
                const input = document.getElementById(inputId);
                const errorEl = document.getElementById(`${inputId}-error`);
                
                input.classList.remove('input-error');
                errorEl.classList.add('hidden');
                errorEl.textContent = '';
            };

            // Clear all previous errors
            ['fullname', 'email', 'password', 'confirmPassword'].forEach(clearError);

            // Validate Full Name
            const fullname = document.getElementById('fullname').value.trim();
            if (!fullname) {
                showError('fullname', 'Full name is required');
            }

            // Validate Email
            const email = document.getElementById('email').value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email) {
                showError('email', 'Email is required');
            } else if (!emailRegex.test(email)) {
                showError('email', 'Please enter a valid email address');
            }

            // Validate Password
            const password = document.getElementById('password').value;
            if (!password) {
                showError('password', 'Password is required');
            } else if (password.length < 6) {
                showError('password', 'Password must be at least 6 characters long');
            }

            // Validate Confirm Password
            const confirmPassword = document.getElementById('confirmPassword').value;
            if (!confirmPassword) {
                showError('confirmPassword', 'Please confirm your password');
            } else if (password !== confirmPassword) {
                showError('confirmPassword', 'Passwords do not match');
            }

            // Prevent form submission if validation fails
            if (!isValid) {
                e.preventDefault();
            }
        });

        // Add real-time validation clearance on input
        ['fullname', 'email', 'password', 'confirmPassword'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    if (input.classList.contains('input-error')) {
                        const errorEl = document.getElementById(`${id}-error`);
                        input.classList.remove('input-error');
                        errorEl.classList.add('hidden');
                        errorEl.textContent = '';
                    }
                });
            }
        });
    }
});
