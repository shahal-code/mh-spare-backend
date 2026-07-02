async function confirmDelete(id) {
    const result = await Swal.fire({
        title: '<span class="text-white">Delete Product?</span>',
        text: "This action cannot be undone!",
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

    if (result.isConfirmed) {
        try {
            const response = await fetch('/admin/product/delete/' + id, { method: 'DELETE' });
            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Product has been removed.',
                    background: '#111827',
                    color: '#fff',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => window.location.reload());
            }
        } catch (err) {
            console.error('Error:', err);
        }
    }
}

async function toggleProductStatus(id, isBlocked) {
    const action = isBlocked === 'true' ? 'Unblock' : 'Block';
    const color = isBlocked === 'true' ? '#10b981' : '#f43f5e';

    const result = await Swal.fire({
        title: `<span class="text-white">${action} Product?</span>`,
        text: `Are you sure you want to ${action.toLowerCase()} this product?`,
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

    if (result.isConfirmed) {
        try {
            const response = await fetch('/admin/product/toggle-status/' + id, { method: 'POST' });
            const data = await response.json();
            
            if (data.message) {
                Swal.fire({
                    icon: 'success',
                    title: 'Status Updated',
                    text: data.message,
                    background: '#111827',
                    color: '#fff',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => window.location.reload());
            }
        } catch (err) {
            console.error('Error:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred',
                background: '#111827',
                color: '#fff'
            });
        }
    }
}
