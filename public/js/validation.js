// Shared Validators
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Invalid email format";
    return null;
};

const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters long";
    return null;
};

const validateFullname = (fullname) => {
    if (!fullname) return "Full name is required";
    if (fullname.trim().length < 3) return "Name must be at least 3 characters long";
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(fullname)) return "Name can only contain letters and spaces";
    return null;
};

const validateOtp = (otp) => {
    if (!otp) return "OTP is required";
    if (!/^\d{6}$/.test(otp)) return "OTP must be 6 digits";
    return null;
};

// ─── Shared Error Helpers (offer-style) ──────────────────────────────────────
function showError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const error = document.getElementById(fieldId + 'Error');
    if (input) input.classList.add('input-error');
    if (error) { error.textContent = message; error.style.display = 'block'; }
}

function clearError(fieldId) {
    const input = document.getElementById(fieldId);
    const error = document.getElementById(fieldId + 'Error');
    if (input) input.classList.remove('input-error');
    if (error) error.style.display = 'none';
}

function clearAllErrors(fieldIds) {
    fieldIds.forEach(id => clearError(id));
}

// ─── Admin Product Validation ─────────────────────────────────────────────────
const productForm = document.getElementById('productForm');
if (productForm) {
    // Live clear on input
    const productFieldMap = {
        'productName':     'productName',
        'productDesc':     'productDesc',
        'productPrice':    'productPrice',
        'productCategory': 'productCategory'
    };
    Object.keys(productFieldMap).forEach(elId => {
        const el = document.getElementById(elId);
        if (el) el.addEventListener('input', () => clearError(productFieldMap[elId]));
    });

    productForm.addEventListener('submit', function (e) {
        let isValid = true;
        clearAllErrors(['productName', 'productDesc', 'productPrice', 'productCategory']);

        const name = document.getElementById('productName').value.trim();
        if (!name || name.length < 3) {
            showError('productName', 'Product name must be at least 3 characters.');
            isValid = false;
        }

        const desc = document.getElementById('productDesc').value.trim();
        if (!desc || desc.length < 10) {
            showError('productDesc', 'Description must be at least 10 characters.');
            isValid = false;
        }

        const price = document.getElementById('productPrice').value.trim();
        if (!price || isNaN(price) || Number(price) <= 0) {
            showError('productPrice', 'Please enter a valid positive price.');
            isValid = false;
        }

        const cat = document.getElementById('productCategory').value;
        if (!cat) {
            showError('productCategory', 'Please select a category.');
            isValid = false;
        }

        if (!isValid) e.preventDefault();
    });
}


// ─── Add Category Form ────────────────────────────────────────────────────────
const addCategoryForm = document.getElementById('addCategoryForm');
if (addCategoryForm) {
    document.getElementById('categoryName')?.addEventListener('input', () => clearError('categoryName'));
    document.getElementById('categoryDescription')?.addEventListener('input', () => clearError('categoryDescription'));

    addCategoryForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        let isValid = true;
        clearAllErrors(['categoryName', 'categoryDescription']);

        const name = document.getElementById('categoryName').value.trim();
        if (!name || name.length < 2) {
            showError('categoryName', 'Category name must be at least 2 characters.');
            isValid = false;
        }

        const desc = document.getElementById('categoryDescription').value.trim();
        if (!desc || desc.length < 10) {
            showError('categoryDescription', 'Description must be at least 10 characters.');
            isValid = false;
        }

        if (!isValid) return;

        try {
            const response = await fetch('/admin/addCategory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description: desc })
            });
            const data = await response.json();
            if (response.ok) {
                Swal.fire({ icon: 'success', title: 'Success!', text: data.message, background: '#0f1420', color: '#fff', showConfirmButton: false, timer: 1500 })
                    .then(() => { window.location.href = '/admin/category'; });
            } else {
                Swal.fire({ icon: 'error', title: 'Oops...', text: data.error || 'Something went wrong.', background: '#0f1420', color: '#fff' });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to communicate with the server.', background: '#0f1420', color: '#fff' });
        }
    });
}

// ─── Edit Category Form ───────────────────────────────────────────────────────
const editCategoryForm = document.getElementById('editCategoryForm');
if (editCategoryForm) {
    document.getElementById('categoryName')?.addEventListener('input', () => clearError('categoryName'));
    document.getElementById('categoryDescription')?.addEventListener('input', () => clearError('categoryDescription'));

    editCategoryForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        let isValid = true;
        clearAllErrors(['categoryName', 'categoryDescription']);

        const name = document.getElementById('categoryName').value.trim();
        if (!name || name.length < 2) {
            showError('categoryName', 'Category name must be at least 2 characters.');
            isValid = false;
        }

        const desc = document.getElementById('categoryDescription').value.trim();
        if (!desc || desc.length < 10) {
            showError('categoryDescription', 'Description must be at least 10 characters.');
            isValid = false;
        }

        if (!isValid) return;

        const id = document.getElementById('categoryId').value;
        try {
            const response = await fetch(`/admin/editCategory/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description: desc })
            });
            const data = await response.json();
            if (response.ok) {
                Swal.fire({ icon: 'success', title: 'Updated!', text: data.message, background: '#0f1420', color: '#fff', showConfirmButton: false, timer: 1500 })
                    .then(() => { window.location.href = '/admin/category'; });
            } else {
                Swal.fire({ icon: 'error', title: 'Oops...', text: data.error || 'Something went wrong.', background: '#0f1420', color: '#fff' });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to communicate with the server.', background: '#0f1420', color: '#fff' });
        }
    });
}
