/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    status: 500
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = {
      code: 'VALIDATION_ERROR',
      message: err.message,
      status: 400,
      details: err.details || null
    };
  } else if (err.name === 'UnauthorizedError') {
    error = {
      code: 'AUTH_TOKEN_INVALID',
      message: 'Invalid or expired token',
      status: 401
    };
  } else if (err.name === 'ForbiddenError') {
    error = {
      code: 'AUTH_INSUFFICIENT_PERMISSIONS',
      message: 'Insufficient permissions',
      status: 403
    };
  } else if (err.name === 'NotFoundError') {
    error = {
      code: 'RESOURCE_NOT_FOUND',
      message: err.message || 'Resource not found',
      status: 404
    };
  } else if (err.name === 'ConflictError') {
    error = {
      code: 'RESOURCE_CONFLICT',
      message: err.message || 'Resource conflict',
      status: 409
    };
  } else if (err.status || err.statusCode) {
    error = {
      code: err.code || 'ERROR',
      message: err.message || 'An error occurred',
      status: err.status || err.statusCode
    };
  }

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', {
      stack: err.stack,
      originalError: err
    });
  }

  res.status(error.status).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = { errorHandler };
