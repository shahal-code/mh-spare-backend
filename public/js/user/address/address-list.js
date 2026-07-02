// BFcache handling
window.addEventListener('pageshow', function (event) {
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        window.location.reload();
    }
});

// Delete Confirmation Modal Logic
const modal = document.getElementById('deleteModal');
const modalContent = document.getElementById('modalContent');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
let addressIdToDelete = null;

window.confirmDelete = function(addressId) {
    addressIdToDelete = addressId;
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            if (modalContent) {
                modalContent.classList.remove('scale-95', 'opacity-0');
                modalContent.classList.add('scale-100', 'opacity-100');
            }
        }, 10);
    }
};

window.hideDeleteModal = function() {
    if (modalContent) {
        modalContent.classList.add('scale-95', 'opacity-0');
        modalContent.classList.remove('scale-100', 'opacity-100');
    }
    setTimeout(() => {
        if (modal) {
            modal.classList.add('hidden');
        }
        addressIdToDelete = null;
    }, 300);
};

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
        if (addressIdToDelete) {
            window.location.href = `/user/address/delete/${addressIdToDelete}`;
        }
    });
}

// Close modal on click outside
if (modal) {
    modal.addEventListener('click', (e) => {
        const backdrop = modal.querySelector('.absolute');
        if (e.target === backdrop) {
            hideDeleteModal();
        }
    });
}
