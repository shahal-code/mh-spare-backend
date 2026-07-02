document.addEventListener('DOMContentLoaded', () => {
    const addressForm = document.getElementById('addressForm');
    if (addressForm) {
        addressForm.addEventListener('submit', function(e) {
            let isValid = true;
            clearAllErrors(['fullname', 'phone', 'email', 'line1', 'city', 'state', 'postal_code', 'address_type']);

            const fullname = document.getElementById('fullname').value.trim();
            if (!fullname) { showError('fullname', 'Full name is required'); isValid = false; }
            else if (fullname.length < 3) { showError('fullname', 'Name must be at least 3 characters long'); isValid = false; }
            else if (!/^[a-zA-Z\s]+$/.test(fullname)) { showError('fullname', 'Name can only contain letters and spaces'); isValid = false; }

            const phone = document.getElementById('phone').value.trim();
            if (!phone) { showError('phone', 'Phone number is required'); isValid = false; }
            else if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) { showError('phone', 'Phone number must be 10 digits'); isValid = false; }

            const email = document.getElementById('email').value.trim();
            if (!email) { showError('email', 'Email is required'); isValid = false; }
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('email', 'Invalid email format'); isValid = false; }

            const line1 = document.getElementById('line1').value.trim();
            if (!line1) { showError('line1', 'Address Line 1 is required'); isValid = false; }
            else if (line1.length < 5) { showError('line1', 'Address Line 1 must be at least 5 characters long'); isValid = false; }

            if (!document.getElementById('city').value.trim()) { showError('city', 'City is required'); isValid = false; }
            if (!document.getElementById('state').value.trim()) { showError('state', 'State is required'); isValid = false; }

            const postal_code = document.getElementById('postal_code').value.trim();
            if (!postal_code) { showError('postal_code', 'Postal code is required'); isValid = false; }
            else if (!/^\d{5,6}$/.test(postal_code)) { showError('postal_code', 'Invalid postal code (5-6 digits)'); isValid = false; }

            const address_type = document.getElementById('address_type').value;
            if (!address_type) { showError('address_type', 'Address type is required'); isValid = false; }

            if (!isValid) {
                e.preventDefault();
                const firstError = document.querySelector('.field-error[style*="block"]');
                if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }
});
