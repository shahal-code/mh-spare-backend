window.toggleMobileMenu = function() {
    const menu = document.getElementById('mobileMenu');
    if (menu) {
        menu.classList.toggle('hidden');
        document.body.classList.toggle('overflow-hidden');
    }
};

// Navbar scroll effect
document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('mainHeader');
    if (header) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 50) {
                header.classList.remove('bg-transparent', 'border-white/0', 'py-4');
                header.classList.add('bg-[#0D0D0D]/90', 'backdrop-blur-xl', 'border-white/10', 'py-3', 'shadow-2xl');
            } else {
                header.classList.add('bg-transparent', 'border-white/0', 'py-4');
                header.classList.remove('bg-[#0D0D0D]/90', 'backdrop-blur-xl', 'border-white/10', 'py-3', 'shadow-2xl');
            }
        });
        // Run once on load to set initial state
        window.dispatchEvent(new Event('scroll'));
    }
});
