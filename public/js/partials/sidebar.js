window.toggleSecurityMenu = function() {
    const submenu = document.getElementById('securitySubmenu');
    const chevron = document.getElementById('securityChevron');

    if (submenu && chevron) {
        if (submenu.classList.contains('hidden')) {
            submenu.classList.remove('hidden');
            chevron.classList.add('rotate-180');
        } else {
            submenu.classList.add('hidden');
            chevron.classList.remove('rotate-180');
        }
    }
};
