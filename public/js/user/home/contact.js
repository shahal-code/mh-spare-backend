const form = document.getElementById('contact-form');
const result = document.getElementById('form-result');
const btn = document.getElementById('submit-btn');

if (form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const object = Object.fromEntries(formData);
        
        let isValid = true;
        clearAllErrors(['name', 'email', 'message']);

        const nameError = validateFullname(object.name);
        if (nameError) { showError('name', nameError); isValid = false; }

        const emailError = validateEmail(object.email);
        if (emailError) { showError('email', emailError); isValid = false; }

        if (!object.message || object.message.trim().length < 10) {
            showError('message', 'Message must be at least 10 characters.');
            isValid = false;
        }

        if (!isValid) return;

        const json = JSON.stringify(object);

        result.innerHTML = "Sending...";
        result.classList.remove('text-red-500', 'text-emerald-500');
        result.classList.add('text-primary');
        btn.disabled = true;
        btn.style.opacity = '0.5';

        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: json
        })
        .then(async (response) => {
            let json = await response.json();
            if (response.status == 200) {
                result.innerHTML = "Message Sent Successfully!";
                result.classList.replace('text-primary', 'text-emerald-500');
                form.reset();
            } else {
                console.log(response);
                result.innerHTML = json.message;
                result.classList.replace('text-primary', 'text-red-500');
            }
        })
        .catch(error => {
            console.log(error);
            result.innerHTML = "Something went wrong!";
            result.classList.replace('text-primary', 'text-red-500');
        })
        .then(function() {
            btn.disabled = false;
            btn.style.opacity = '1';
            setTimeout(() => {
                result.innerHTML = "";
            }, 5000);
        });
    });
}
