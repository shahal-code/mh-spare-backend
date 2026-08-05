export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required";
    if (!emailRegex.test(email)) return "Invalid email format";
    if (!email.toLowerCase().trim().endsWith("@gmail.com")) {
        return "Only @gmail.com email addresses are allowed";
    }
    return null;
};

export const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters long";
    // Optional: Add more complexity checks if desired
    const complexRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
     if (!complexRegex.test(password)) return "Password must contain uppercase, lowercase, number and special character";
    return null;
};

export const validateFullname = (fullname) => {
    if (!fullname) return "Full name is required";
    if (fullname.trim().length < 3) return "Name must be at least 3 characters long";
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(fullname)) return "Name can only contain letters and spaces";
    return null;
};

export const validateOtp = (otp) => {
    if (!otp) return "OTP is required";
    if (!/^\d{6}$/.test(otp)) return "OTP must be 6 digits";
    return null;
};

export const validateSignupData = (data) => {
    const { fullname, email, password, confirmPassword } = data;
    const errors = [];

    const nameErr = validateFullname(fullname);
    if (nameErr) errors.push(nameErr);

    const emailErr = validateEmail(email);
    if (emailErr) errors.push(emailErr);

    const passErr = validatePassword(password);
    if (passErr) errors.push(passErr);

    if (password !== confirmPassword) errors.push("Passwords do not match");

    return errors.length > 0 ? errors : null;
};

export const validateLoginData = (data) => {
    const { email, password } = data;
    const errors = [];

    const emailErr = validateEmail(email);
    if (emailErr) errors.push(emailErr);

    // Only check presence — do NOT enforce complexity rules on login
    if (!password) errors.push("Password is required");

    return errors.length > 0 ? errors : null;
};

export const validateAddressData = (data) => {
    const { fullname, phone, email, line1, city, state, postal_code, address_type } = data;
    const errors = [];

    const nameErr = validateFullname(fullname);
    if (nameErr) errors.push(nameErr);

    if (!phone) errors.push("Phone number is required");
    else if (!/^\+?[\d\s-]{10,}$/.test(phone)) errors.push("Invalid phone number format");

    const emailErr = validateEmail(email);
    if (emailErr) errors.push(emailErr);

    if (!line1 || line1.trim().length < 5) errors.push("Address Line 1 must be at least 5 characters long");
    if (!city || city.trim().length < 2) errors.push("City is required");
    if (!state || state.trim().length < 2) errors.push("State is required");
    if (!postal_code || !/^\d{5,6}$/.test(postal_code)) errors.push("Invalid postal code (5-6 digits)");
    if (!address_type) errors.push("Address type is required");

    return errors.length > 0 ? errors : null;
};

export const validateChangePasswordData = (data) => {
    const { currentPassword, newPassword, confirmPassword } = data;
    const errors = [];

    if (!currentPassword) errors.push("Current password is required");
    
    const passErr = validatePassword(newPassword);
    if (passErr) errors.push(passErr);

    if (newPassword !== confirmPassword) errors.push("New passwords do not match");

    return errors.length > 0 ? errors : null;
};

// Compatibility wrappers for single-error validation
export const validateSignup = (data) => {
    const errors = validateSignupData(data);
    return errors ? errors[0] : null;
};

export const validateLogin = (data) => {
    const errors = validateLoginData(data);
    return errors ? errors[0] : null;
};
