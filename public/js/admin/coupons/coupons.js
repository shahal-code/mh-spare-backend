// --- Toggle Status ---
async function toggleCouponStatus(id, isActive, code) {
    const action = isActive ? 'Deactivate' : 'Activate';
    const color = isActive ? '#f43f5e' : '#10b981';

    const result = await Swal.fire({
        title: `<span class="text-white">${action} Coupon?</span>`,
        text: `Are you sure you want to ${action.toLowerCase()} coupon "${code}"?`,
        icon: 'warning',
        background: '#111827',
        color: '#fff',
        showCancelButton: true,
        confirmButtonColor: color,
        cancelButtonColor: '#374151',
        confirmButtonText: `YES, ${action.toUpperCase()}!`,
        customClass: {
            popup: 'glass-morphism rounded-3xl',
            confirmButton: 'rounded-xl font-bold uppercase tracking-widest text-[10px] px-6 py-3',
            cancelButton: 'rounded-xl font-bold uppercase tracking-widest text-[10px] px-6 py-3'
        }
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch(`/admin/coupons/toggle/${id}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Updated!',
                text: data.message || `Coupon has been ${action.toLowerCase()}d.`,
                background: '#111827',
                color: '#fff',
                showConfirmButton: false,
                timer: 1500
            }).then(() => location.reload());
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message, background: '#111827', color: '#fff' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'An error occurred.', background: '#111827', color: '#fff' });
    }
}


// --- Delete ---
async function deleteCoupon(id) {
    const result = await Swal.fire({
        title: '<span class="text-white">Delete Coupon?</span>',
        text: "You won't be able to revert this!",
        icon: 'warning',
        background: '#111827',
        color: '#fff',
        showCancelButton: true,
        confirmButtonColor: '#f43f5e',
        cancelButtonColor: '#374151',
        confirmButtonText: 'YES, DELETE!',
        customClass: {
            popup: 'glass-morphism rounded-3xl',
            confirmButton: 'rounded-xl font-bold uppercase tracking-widest text-[10px] px-6 py-3',
            cancelButton: 'rounded-xl font-bold uppercase tracking-widest text-[10px] px-6 py-3'
        }
    });
    if (!result.isConfirmed) return;
    try {
        const res = await fetch(`/admin/coupons/delete/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            Swal.fire({
                icon: 'success', title: 'Deleted!', text: data.message || 'Coupon has been deleted.',
                background: '#111827', color: '#fff', showConfirmButton: false, timer: 1500
            }).then(() => location.reload());
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message, background: '#111827', color: '#fff' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'An error occurred.', background: '#111827', color: '#fff' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- Live Search ---
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const val = this.value.toLowerCase();
            document.querySelectorAll('#couponsTableBody tr').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(val) ? '' : 'none';
            });
        });
    }
});
