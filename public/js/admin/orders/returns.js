async function handleReturnAction(orderId, itemId, action) {
    const status = action === 'approve' ? 'Returned' : 'Delivered';
    const confirmText = action === 'approve' ? 'approve this return' : 'reject this return';
    
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to ${confirmText}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: action === 'approve' ? '#10b981' : '#ef4444',
        cancelButtonColor: 'rgba(255,255,255,0.05)',
        background: '#0d0d0d',
        color: '#fff'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch('/admin/orders/update-item-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, itemId, status })
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: action === 'approve' ? 'Approved' : 'Rejected',
                    text: data.message,
                    background: '#0d0d0d',
                    color: '#fff',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => window.location.reload());
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
                background: '#0d0d0d',
                color: '#fff'
            });
        }
    }
}
