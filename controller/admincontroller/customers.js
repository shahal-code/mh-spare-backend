import User from "../../models/userModel.js";
import * as CustomerService from "../../services/admin/customerService.js";

export const getUsers = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const query = {
      $or: [
        { fullname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };

    const { users, totalUsers, totalPages } = await CustomerService.getAllUsers(query, page, limit);

    const stats = await CustomerService.getCustomerStats();
    res.render("admin/customers/users", {
      users,
      page,
      totalPages,
      totalUsers,
      limit,
      stats,
      search,
      activePage: "customers",
      pageTitle: "Customer CRM",
      pageSubtitle: "Manage your global customer base",
      blockedUsers: stats.blockedUsers,
      activeUsers: stats.activeUsers
    });
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

export const blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    await CustomerService.toggleBlockStatus(id);
    res.redirect("/admin/users");
  } catch (error) {
    console.error("Error toggling block status:", error.message);
    res.status(error.message === "User not found" ? 404 : 500).send("Internal Server Error");
  }
};
