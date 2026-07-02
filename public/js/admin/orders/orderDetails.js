const ITEM_PROGRESS_STATUSES = ['Pending', 'Shipped', 'Out for Delivery', 'Delivered'];

function getItemStatusOptions(currentStatus) {
    if (currentStatus === 'Return Request') {
        return {
            'Delivered': 'Delivered',
            'Returned': 'Returned'
        };
    }

    if (['Cancelled', 'Returned'].includes(currentStatus)) {
        return {
            [currentStatus]: currentStatus
        };
    }

    const currentIndex = ITEM_PROGRESS_STATUSES.indexOf(currentStatus);
    const availableStatuses = ITEM_PROGRESS_STATUSES.slice(Math.max(currentIndex, 0));

    if (currentStatus !== 'Delivered') {
        availableStatuses.push('Cancelled');
    }

    return availableStatuses.reduce((options, status) => {
        options[status] = status;
        return options;
    }, {});
}

async function updateItemStatus(orderId, itemId, currentStatus) {
    const { value: status } = await Swal.fire({
        title: 'Update Item Status',
        input: 'select',
        inputOptions: getItemStatusOptions(currentStatus),
        inputValue: currentStatus,
        showCancelButton: true,
        background: '#0d0d0d',
        color: '#fff',
        confirmButtonColor: '#0055ff',
        customClass: {
            input: 'swal-custom-select'
        }
    });

    if (status && status !== currentStatus) {
        try {
            const response = await fetch('/admin/orders/update-item-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, itemId, status })
            });
            const data = await response.json();
            if (data.success) {
                await Swal.fire({ icon: 'success', title: 'Updated', text: data.message, background: '#0d0d0d', color: '#fff' });
                window.location.reload();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#0d0d0d', color: '#fff' });
        }
    }
}

function downloadInvoice(orderId) {
    Swal.fire({
        title: 'Generating Invoice...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });
    window.location.href = `/admin/orders/${orderId}/invoice`;
    setTimeout(() => Swal.close(), 2000);
}
