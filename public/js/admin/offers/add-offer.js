function updateValueLabel() {
    const type = document.getElementById('discountType').value;
    document.getElementById('valueLabel').textContent = type === 'percentage' ? 'Discount Value (%)' : 'Discount Value (\u20b9)';
    const maxDiscountContainer = document.getElementById('maxDiscountContainer');
    if(type === 'flat') {
        maxDiscountContainer.style.display = 'none';
        document.getElementById('maxDiscountAmount').value = '';
    } else {
        maxDiscountContainer.style.display = 'block';
    }
}

function toggleApplicableFields() {
    const type = document.getElementById('offerType').value;
    const container = document.getElementById('applicableToContainer');
    
    const optgroupProduct = document.getElementById('optgroup-product');
    const optgroupCategory = document.getElementById('optgroup-category');

    document.getElementById('applicableTo').value = '';

    container.classList.remove('hidden');

    if (type === 'product' && optgroupProduct) {
        optgroupProduct.classList.remove('hidden');
        if(optgroupCategory) optgroupCategory.classList.add('hidden');
        document.getElementById('applicableToLabel').textContent = 'Applicable Product';
    } else if (type === 'category' && optgroupCategory) {
        optgroupCategory.classList.remove('hidden');
        if(optgroupProduct) optgroupProduct.classList.add('hidden');
        document.getElementById('applicableToLabel').textContent = 'Applicable Category';
    }
}

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

function validateForm() {
    let valid = true;
    const name = document.getElementById('name').value.trim();
    const discountValue = document.getElementById('discountValue').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    ['name', 'discountValue', 'startDate', 'endDate', 'applicableTo'].forEach(clearError);

    if (!name) { showError('name', 'Offer name is required.'); valid = false; }
    if (!discountValue || parseFloat(discountValue) <= 0) { showError('discountValue', 'Please enter a valid discount value.'); valid = false; }
    if (!startDate) { showError('startDate', 'Start date is required.'); valid = false; }
    if (!endDate) { showError('endDate', 'End date is required.'); valid = false; }
    
    if (new Date(startDate) > new Date(endDate)) {
        showError('endDate', 'End date must be after start date.');
        valid = false;
    }

    const applicableTo = document.getElementById('applicableTo').value;
    if (!applicableTo) { showError('applicableTo', 'Please select an item.'); valid = false; }

    return valid;
}

async function submitOffer() {
    if (!validateForm()) return;

    const name = document.getElementById('name').value.trim();
    const description = document.getElementById('description').value.trim();
    const offerType = document.getElementById('offerType').value;
    const discountType = document.getElementById('discountType').value;
    const discountValue = parseFloat(document.getElementById('discountValue').value);
    const maxDiscountAmount = parseFloat(document.getElementById('maxDiscountAmount').value) || null;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    const payload = { name, description, offerType, discountType, discountValue, maxDiscountAmount, startDate, endDate };

    payload.applicableTo = document.getElementById('applicableTo').value;

    try {
        const res = await fetch('/admin/offers/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            Swal.fire({ icon: 'success', title: 'Created!', text: data.message, background: '#0f1420', color: '#fff', timer: 1500, showConfirmButton: false })
                .then(() => window.location.href = '/admin/offers');
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message, background: '#0f1420', color: '#fff' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Something went wrong.', background: '#0f1420', color: '#fff' });
    }
}

// Initialize display logic
document.addEventListener('DOMContentLoaded', () => {
    toggleApplicableFields();
    updateValueLabel();
});
