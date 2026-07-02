// Prevent back-button access from memory (bfcache)
window.addEventListener('pageshow', function (event) {
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        window.location.reload();
    }
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'Copied!',
            text: 'Referral code copied to clipboard.',
            background: '#1a1a1a',
            color: '#ffffff',
            showConfirmButton: false,
            timer: 2000
        });
    }).catch(err => {
        console.error('Failed to copy: ', err);
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Failed to copy referral code.',
            background: '#1a1a1a',
            color: '#ffffff',
            confirmButtonColor: '#0055ff'
        });
    });
}

// Flash Message Handling
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    
    if (message) {
        const container = document.getElementById('flash-message-container');
        const flashEL = document.getElementById('flash-message');
        const textEl = document.getElementById('flash-text');
        const iconEl = document.getElementById('flash-icon');
        
        // Determine if error or success based on keywords (simple heuristic)
        const isError = message.toLowerCase().includes('expired') || 
                        message.toLowerCase().includes('invalid') || 
                        message.toLowerCase().includes('error');
                        
        if (isError) {
            flashEL.className += ' bg-red-500/10 border-red-500/20 text-red-500';
            iconEl.textContent = 'error';
        } else {
            flashEL.className += ' bg-green-500/10 border-green-500/20 text-green-500';
            iconEl.textContent = 'check_circle';
        }
        
        textEl.textContent = message;
        container.classList.remove('hidden');
        
        // Animate in
        setTimeout(() => {
            flashEL.classList.remove('translate-y-[-1rem]', 'opacity-0');
            flashEL.classList.add('translate-y-0', 'opacity-100');
        }, 50);
        
        // Auto close after 5 seconds
        setTimeout(closeFlashMessage, 5000);
        
        // Clean up URL without reloading
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path:newUrl}, '', newUrl);
    }
});

function closeFlashMessage() {
    const flashEL = document.getElementById('flash-message');
    if (!flashEL) return;
    flashEL.classList.remove('translate-y-0', 'opacity-100');
    flashEL.classList.add('translate-y-[-1rem]', 'opacity-0');
    
    setTimeout(() => {
        const container = document.getElementById('flash-message-container');
        if (container) container.classList.add('hidden');
    }, 300); // Wait for transition
}
