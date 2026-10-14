/**
 * Centralized API error handling middleware
 */
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.url} - ${statusCode}: ${message}`);
  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}

/**
 * 404 Route Not Found middleware
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    },
  });
}
