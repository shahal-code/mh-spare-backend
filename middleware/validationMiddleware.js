import { validationResult } from 'express-validator';

export const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Extract just the error messages for a cleaner response
        const extractedErrors = errors.array().map(err => ({ [err.path]: err.msg }));
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: extractedErrors
        });
    }
    next();
};
