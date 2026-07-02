const retryBtn = document.getElementById('retry-btn');

if (retryBtn && window.paymentFailureData?.orderId && window.paymentFailureData?.orderAmount) {
retryBtn.addEventListener('click', async function() {
    const btn = this;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="relative z-10 flex items-center gap-3"><span class="material-symbols-outlined animate-spin">sync</span> PROCESSING...</span>';
    btn.disabled = true;

    try {
        // Create Razorpay order
        const response = await fetch('/user/payment/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                amount: window.paymentFailureData.orderAmount,
                orderId: window.paymentFailureData.orderId
            })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        const options = {
            key: window.paymentFailureData.razorpayKey,
            amount: result.order.amount,
            currency: result.order.currency,
            order_id: result.order.id,
            name: "TechKart",
            description: "Retry Order Payment",
            prefill: {
                name: window.paymentFailureData.userName,
                email: window.paymentFailureData.userEmail,
                contact: window.paymentFailureData.userPhone
            },
            handler: async function (paymentResponse) {
                try {
                    const retryResponse = await fetch('/user/checkout/retry-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify({
                            orderId: window.paymentFailureData.orderId,
                            razorpay_order_id: paymentResponse.razorpay_order_id,
                            razorpay_payment_id: paymentResponse.razorpay_payment_id,
                            razorpay_signature: paymentResponse.razorpay_signature
                        })
                    });
                    const retryResult = await retryResponse.json();
                    if (retryResult.success) {
                        window.location.href = retryResult.redirectUrl;
                    } else {
                        throw new Error(retryResult.message);
                    }
                } catch(err) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Payment Failed',
                        text: err.message,
                        background: '#161b22',
                        color: '#fff',
                        confirmButtonColor: '#f43f5e'
                    });
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            },
            modal: {
                ondismiss: function() {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            }
        };
        const razorpay = new Razorpay(options);
        razorpay.on('payment.failed', function (response) {
            Swal.fire({
                icon: 'error',
                title: 'Payment Failed',
                text: response.error.description || 'Payment was unsuccessful. Please try again.',
                background: '#161b22',
                color: '#fff',
                confirmButtonColor: '#f43f5e'
            });
        });
        razorpay.open();
    } catch(error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            background: '#161b22',
            color: '#fff',
            confirmButtonColor: '#f43f5e'
        });
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});
}
