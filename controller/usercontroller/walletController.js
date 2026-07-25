import * as walletService from "../../services/user/walletService.js";
import * as ProfileService from "../../services/user/profileService.js";

export const getWalletView = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;

        const walletData = await walletService.getWalletWithTransactions(userId, page, limit);

        res.json({
            success: true,
            balance: walletData.balance,
            transactions: walletData.transactions,
            totalPages: walletData.totalPages,
            currentPage: walletData.currentPage,
            total: walletData.total
        });
    } catch (error) {
        console.error("Wallet View Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getWalletBalance = async (req, res) => {
    try {
        const userId = req.user._id;
        const wallet = await walletService.getOrCreateWallet(userId);
        res.json({ success: true, balance: wallet.balance });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch wallet balance" });
    }
};
