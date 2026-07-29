import { body, param } from 'express-validator';
import mongoose from 'mongoose';

// Reusable custom validator for MongoDB ObjectId
const isValidObjectId = (value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid MongoDB ObjectId format');
    }
    return true;
};

// 1. Validation for fetching, deleting, or acting on a single product by ID
export const validateProductId = [
    param('id').custom(isValidObjectId).withMessage('Invalid Product ID'),
];

// 2. Validation for product creation (POST) and updating (PUT)
export const validateProductBody = [
    body('name')
        .notEmpty().withMessage('Product name is required')
        .isString().withMessage('Product name must be a string')
        .trim(),
    
    body('description')
        .notEmpty().withMessage('Product description is required')
        .isString().withMessage('Description must be a string'),
    
    body('category_id')
        .notEmpty().withMessage('Category ID is required')
        .custom(isValidObjectId).withMessage('Invalid Category ID'),
    
    // Validate that variants exist if the frontend submits them as JSON array string or object
    // (Note: If using multipart/form-data with multer, complex objects might need custom parsing before validation,
    // but we can validate basic text fields here safely).
    body('material')
        .optional()
        .isString().withMessage('Material must be a string')
];

// 3. Validation for Variant Operations
export const validateVariantParams = [
    param('id').custom(isValidObjectId).withMessage('Invalid Product ID'),
    param('variantId').custom(isValidObjectId).withMessage('Invalid Variant ID'),
];
