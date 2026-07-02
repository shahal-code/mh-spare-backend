import { validateLogin } from "../../utils/validation.js";

/**
 * Renders the admin login page
 */
export const loadLogin = (req, res) => {
  const message = req.query.message || null;
  const email = req.query.email || null;
  res.render("admin/auth/login", { message, email });
};

/**
 * Handles admin login POST request
 */
export const login = (req, res) => {
  const { email, password } = req.body;

  const validationError = validateLogin(req.body);
  if (validationError) {
    return res.redirect(303, `/admin/login?message=${encodeURIComponent(validationError)}&email=${encodeURIComponent(email)}`);
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "12345";

  if (email === adminEmail && password === adminPassword) {
    req.session.admin = true;
    return req.session.save((err) => {
      if (err) console.log("Admin session save error:", err);
      res.redirect(303, "/admin/dashboard");
    });
  }

  res.redirect(303, `/admin/login?message=${encodeURIComponent("Invalid login credentials")}&email=${encodeURIComponent(email)}`);
};

/**
 * Handles admin logout
 */
export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("Logout error:", err);
    }
    res.clearCookie("admin.sid");
    res.redirect("/admin/login");
  });
};
