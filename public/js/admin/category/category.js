const modal = document.getElementById('addCategoryModal');

// Function to handle Edit Category Modal
function editCategory(id, name, description) {
    document.getElementById('modalTitle').innerText = 'Edit Category';
    document.getElementById('categoryId').value = id;
    document.getElementById('categoryName').value = name;
    document.getElementById('categoryDescription').value = description;
    
    openAddCategoryModal();
}

// Reset modal for "Add" mode when opening via "Add Category" button
function openAddCategoryModal() {
    document.getElementById('modalTitle').innerText = 'Add New Category';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    
    modal.classList.remove('hidden');
    setTimeout(() => { 
        modal.classList.remove('opacity-0'); 
        modal.children[0].classList.remove('scale-95'); 
    }, 10);
}

function closeModal() {
    modal.classList.add('opacity-0'); 
    modal.children[0].classList.add('scale-95');
    setTimeout(() => { 
        modal.classList.add('hidden'); 
    }, 300);
}

// Function to toggle List/Unlist (Block/Unblock)
async function toggleList(id, isBlocked) {
    const action = isBlocked === 'true' ? 'Unblock' : 'Block';
    const color = isBlocked === 'true' ? '#10b981' : '#f43f5e';

    try {
        const result = await Swal.fire({
            title: `<span class="text-white">${action} Category?</span>`,
            text: `Are you sure you want to ${action.toLowerCase()} this category?`,
            icon: 'warning',
            background: '#111827',
            color: '#fff',
            showCancelButton: true,
            confirmButtonColor: color,
            cancelButtonColor: '#374151',
            confirmButtonText: `YES, ${action.toUpperCase()}!`,
            customClass: {
                popup: 'glass-morphism rounded-3xl',
                confirmButton: 'rounded-xl font-bold uppercase tracking-widest text-[10px] px-6 py-3',
                cancelButton: 'rounded-xl font-bold uppercase tracking-widest text-[10px] px-6 py-3'
            }
        });

        if (result.isConfirmed) {
            const response = await fetch(`/admin/toggleCategory/${id}`, {
                method: 'GET'
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    text: data.message,
                    background: '#111827',
                    color: '#fff',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.error || 'Failed to update status',
                    background: '#111827',
                    color: '#fff'
                });
            }
        }
    } catch (error) {
        console.error("Toggle Error:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred',
            background: '#111827',
            color: '#fff'
        });
    }
}


// Handle Form Submission (Add or Edit)
document.getElementById('categoryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value;
    const description = document.getElementById('categoryDescription').value;

    const url = id ? `/admin/editCategory/${id}` : '/admin/addCategory';
    const method = 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });

        const data = await response.json();

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: data.message,
                background: '#111827',
                color: '#fff',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                location.reload();
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: data.error || 'Something went wrong',
                background: '#111827',
                color: '#fff'
            });
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while saving the category',
            background: '#111827',
            color: '#fff'
        });
    }
});

// Function to delete Category
async function deleteCategory(id) {
    try {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            background: '#111827',
            color: '#fff',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            cancelButtonColor: '#374151',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            const response = await fetch(`/admin/deleteCategory/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: data.message,
                    background: '#111827',
                    color: '#fff',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.error || 'Failed to delete category',
                    background: '#111827',
                    color: '#fff'
                });
            }
        }
    } catch (error) {
        console.error("Delete Error:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred',
            background: '#111827',
            color: '#fff'
        });
    }
}
