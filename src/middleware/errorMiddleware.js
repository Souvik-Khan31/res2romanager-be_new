const { MulterError } = require('multer');

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // Handle Multer Errors (File Upload)
    if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'File too large. Maximum size allowed is 100KB for menu items, 250KB for cover images, and 500KB for QR codes.',
                error: err.code
            });
        }
        return res.status(400).json({
            message: `File upload error: ${err.message}`,
            error: err.code
        });
    }

    // Default Error Handling
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = { errorHandler };
