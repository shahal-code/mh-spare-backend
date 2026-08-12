export const apiAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validKey = process.env.API_KEY || "esparehub_public_key_2024";

    if (!apiKey || (apiKey !== validKey && apiKey !== "mhspare_public_key_2024")) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Missing or invalid API key"
        });
    }

    next();
};
