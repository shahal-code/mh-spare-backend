window.toggleSidebar = function() {
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) {
        sidebar.classList.toggle('-translate-x-full');
    }
};
