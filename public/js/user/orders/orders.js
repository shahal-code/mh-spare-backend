async function cancelOrder(orderId) {
    const { value: reason } = await Swal.fire({
        title: 'Cancel Order?',
        text: "Please provide a reason for cancellation (optional):",
        input: 'textarea',
        inputPlaceholder: 'Type your reason here...',
        showCancelButton: true,
        confirmButtonColor: '#0657f9',
        cancelButtonColor: '#f43f5e',
        confirmButtonText: 'Yes, Cancel it',
        background: '#161b22',
        color: '#fff',
        inputAttributes: {
            'class': 'bg-white/5 border-white/10 text-white rounded-xl'
        }
    });

    if (reason !== undefined) {
        try {
            const response = await fetch(`/user/orders/${orderId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const result = await response.json();
            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Cancelled!',
                    text: 'Your order has been cancelled.',
                    background: '#161b22',
                    color: '#fff',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => window.location.reload());
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#161b22', color: '#fff' });
        }
    }
}

async function returnOrder(orderId) {
    const { value: reason } = await Swal.fire({
        title: 'Return Order',
        text: "Please provide a reason for return (mandatory):",
        input: 'textarea',
        inputPlaceholder: 'Reason for return...',
        inputValidator: (value) => {
            if (!value) return 'You need to write something!'
        },
        showCancelButton: true,
        confirmButtonColor: '#0657f9',
        cancelButtonColor: '#f43f5e',
        confirmButtonText: 'Submit Return Request',
        background: '#161b22',
        color: '#fff',
    });

    if (reason) {
        try {
            const response = await fetch(`/user/orders/${orderId}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            const result = await response.json();
            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Request Sent!',
                    text: 'Your return request has been submitted.',
                    background: '#161b22',
                    color: '#fff',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => window.location.reload());
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#161b22', color: '#fff' });
        }
    }
}
