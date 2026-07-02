async function handleCancelOrder(orderId) {
    const { value: reason } = await Swal.fire({
        title: 'Cancel Order',
        input: 'textarea',
        inputLabel: 'Please tell us why you are cancelling',
        inputPlaceholder: 'Reason for cancellation...',
        inputAttributes: { 'aria-label': 'Reason for cancellation' },
        showCancelButton: true,
        confirmButtonColor: '#f43f5e',
        confirmButtonText: 'Confirm Cancellation',
        background: '#0D0D0D',
        color: '#fff',
        inputValidator: (value) => {
            if (!value) return 'You need to provide a reason!';
        }
    });

    if (reason) {
        try {
            const response = await fetch(`/user/orders/${orderId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const data = await response.json();
            if (data.success) {
                await Swal.fire({ icon: 'success', title: 'Cancelled', text: data.message, background: '#0D0D0D', color: '#fff' });
                window.location.reload();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#0D0D0D', color: '#fff' });
        }
    }
}

async function handleReturnOrder(orderId) {
    const { value: reason } = await Swal.fire({
        title: 'Return Order',
        input: 'textarea',
        inputLabel: 'Reason for Return',
        inputPlaceholder: 'Please explain why you want to return this product...',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Submit Return Request',
        background: '#0D0D0D',
        color: '#fff',
        inputValidator: (value) => {
            if (!value) return 'A reason is mandatory for returns!';
        }
    });

    if (reason) {
        try {
            const response = await fetch(`/user/orders/${orderId}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const data = await response.json();
            if (data.success) {
                await Swal.fire({ icon: 'success', title: 'Submitted', text: 'Your return request has been submitted.', background: '#0D0D0D', color: '#fff' });
                window.location.reload();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#0D0D0D', color: '#fff' });
        }
    }
}

async function handleCancelItem(orderId, itemId) {
    const { value: reason } = await Swal.fire({
        title: 'Cancel Item',
        input: 'textarea',
        inputLabel: 'Reason for cancellation',
        inputPlaceholder: 'Why are you cancelling this item?',
        showCancelButton: true,
        confirmButtonColor: '#f43f5e',
        confirmButtonText: 'Confirm Cancellation',
        background: '#0D0D0D',
        color: '#fff',
        inputValidator: (value) => {
            if (!value) return 'A reason is required!';
        }
    });

    if (reason) {
        try {
            const response = await fetch(`/user/orders/${orderId}/items/${itemId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const data = await response.json();
            if (data.success) {
                await Swal.fire({ icon: 'success', title: 'Cancelled', text: data.message, background: '#0D0D0D', color: '#fff' });
                window.location.reload();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            if (error.message.includes("cancel the entire order")) {
                Swal.fire({
                    icon: 'error',
                    title: 'Action Blocked',
                    text: error.message,
                    background: '#0D0D0D',
                    color: '#fff',
                    showCancelButton: true,
                    confirmButtonText: 'Cancel Entire Order',
                    confirmButtonColor: '#f43f5e',
                    cancelButtonText: 'Close'
                }).then((result) => {
                    if (result.isConfirmed) {
                        handleCancelOrder(orderId);
                    }
                });
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#0D0D0D', color: '#fff' });
            }
        }
    }
}

async function handleReturnItem(orderId, itemId) {
    const { value: reason } = await Swal.fire({
        title: 'Return Item',
        input: 'textarea',
        inputLabel: 'Reason for Return',
        inputPlaceholder: 'Why do you want to return this item?',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Submit Return Request',
        background: '#0D0D0D',
        color: '#fff',
        inputValidator: (value) => {
            if (!value) return 'A reason is required!';
        }
    });

    if (reason) {
        try {
            const response = await fetch(`/user/orders/${orderId}/items/${itemId}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const data = await response.json();
            if (data.success) {
                await Swal.fire({ icon: 'success', title: 'Submitted', text: 'Return request submitted.', background: '#0D0D0D', color: '#fff' });
                window.location.reload();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#0D0D0D', color: '#fff' });
        }
    }
}

function downloadInvoice(orderId) {
    Swal.fire({
        title: 'Generating Invoice...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });
    window.location.href = `/user/orders/${orderId}/invoice`;
    setTimeout(() => Swal.close(), 2000);
}
