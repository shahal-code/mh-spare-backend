
// Middleware to handle 404 Not Found errors
export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// Global error handler middleware
export const globalErrorHandler = (err, req, res, next) => {
    // Handle Multer file upload errors gracefully
    if (err.name === 'MulterError') {
        let message = err.message;
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'File size is too large. Maximum allowed limit is 15MB per file.';
        }
        console.error("Multer Error Caught:", message);
        return res.status(400).json({
            success: false,
            message
        });
    }

    const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

    console.error("Error Caught:", err.message);

    const errorResponse = {
        success: false,
        message: err.message || 'Internal Server Error'
    };
    
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
};
