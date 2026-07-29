
// Middleware to handle 404 Not Found errors
export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// Global error handler middleware
export const globalErrorHandler = (err, req, res, next) => {
    // Always render the 404 page instead of a 500 error
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
