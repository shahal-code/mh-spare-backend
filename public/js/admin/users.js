window.confirmBlock = function(userId, isBlocked) {
    const action = isBlocked === 'true' ? 'Unblock' : 'Block';
    const color = isBlocked === 'true' ? '#10b981' : '#f43f5e';

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: `<span class="text-white">${action} User?</span>`,
            text: `Are you sure you want to ${action.toLowerCase()} this customer?`,
            icon: 'warning',
            background: '#111827',
            color: '#fff',
            showCancelButton: true,
            confirmButtonColor: color,
            cancelButtonColor: '#374151',
            confirmButtonText: `Yes, ${action}!`,
            customClass: {
                popup: 'glass-morphism rounded-3xl',
                confirmButton: 'rounded-xl font-bold uppercase tracking-widest text-[10px] px-6 py-3',
                cancelButton: 'rounded-xl font-bold uppercase tracking-widest text-[10px] px-6 py-3'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`/admin/users/${userId}/block`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(response => {
                    if (response.ok) {
                        window.location.reload();
                    }
                });
            }
        });
    }
};

window.viewUser = function(user) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: `<span class="text-white">Customer Profile</span>`,
            html: `
                <div class="text-left space-y-4 text-sm mt-4">
                    <div class="flex justify-between border-b border-white/5 pb-2">
                        <span class="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Full Name</span>
                        <span class="text-white font-medium">${user.fullname}</span>
                    </div>
                    <div class="flex justify-between border-b border-white/5 pb-2">
                        <span class="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Email</span>
                        <span class="text-white font-medium">${user.email}</span>
                    </div>
                    <div class="flex justify-between border-b border-white/5 pb-2">
                        <span class="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Phone</span>
                        <span class="text-white font-medium">${user.phone}</span>
                    </div>
                    <div class="flex justify-between border-b border-white/5 pb-2">
                        <span class="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Referral Code</span>
                        <span class="text-primary font-bold">${user.referralCode}</span>
                    </div>
                    <div class="flex justify-between border-b border-white/5 pb-2">
                        <span class="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Status</span>
                        <span class="status-badge ${user.isBlocked ? 'status-blocked' : 'status-active'}">${user.isBlocked ? 'Blocked' : 'Active'}</span>
                    </div>
                    <div class="flex justify-between pb-2">
                        <span class="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Joined Date</span>
                        <span class="text-slate-300 font-medium">${user.createdAt}</span>
                    </div>
                </div>
            `,
            confirmButtonColor: '#0055ff',
            confirmButtonText: 'CLOSE',
            background: '#111827',
            color: '#fff',
            customClass: {
                popup: 'glass-morphism rounded-3xl',
                confirmButton: 'rounded-xl font-bold uppercase tracking-widest text-[10px] px-8 py-3'
            }
        });
    }
};
