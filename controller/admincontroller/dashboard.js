import * as DashboardService from "../../services/admin/dashboardService.js";

export const loadDashboard = async (req, res) => {
  try {
    const stats = await DashboardService.getDashboardStats();
    res.render("admin/dashboard/dashboard", stats);
  } catch (error) {
    console.error("Error loading dashboard:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

export const getChartData = async (req, res) => {
  try {
    const filter = req.query.filter || 'monthly';
    const chartData = await DashboardService.getChartData(filter);
    res.status(200).json(chartData);
  } catch (error) {
    console.error("Error fetching chart data:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
