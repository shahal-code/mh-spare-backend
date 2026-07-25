import Wallet from "../../models/walletModel.js";

// Get or create wallet for a user
export const getOrCreateWallet = async (userId) => {
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
    }
    return wallet;
};

// Credit amount to wallet
export const creditWallet = async (userId, amount, description, orderId = null) => {
    const wallet = await getOrCreateWallet(userId);
    wallet.balance += amount;
    wallet.transactions.push({
        type: "credit",
        amount,
        description,
        orderId,
        status: "success"
    });
    await wallet.save();
    return wallet;
};

// Debit amount from wallet
export const debitWallet = async (userId, amount, description, orderId = null) => {
    const wallet = await getOrCreateWallet(userId);
    if (wallet.balance < amount) {
        throw new Error("Insufficient wallet balance");
    }
    wallet.balance -= amount;
    wallet.transactions.push({
        type: "debit",
        amount,
        description,
        orderId,
        status: "success"
    });
    await wallet.save();
    return wallet;
};

// Get wallet with paginated transactions
export const getWalletWithTransactions = async (userId, page = 1, limit = 5) => {
    const wallet = await getOrCreateWallet(userId);
    const allTransactions = [...wallet.transactions].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const total = allTransactions.length;
    const paginated = allTransactions.slice((page - 1) * limit, page * limit);
    return {
        balance: wallet.balance,
        transactions: paginated,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
    };
};
