import jwt from 'jsonwebtoken';

const getJwtSecret = () => process.env.JWT_SECRET || 'spicehub_pos_jwt_super_secret_key_2026_rms_auth';

export const protect = (req, res, next) => {
  let token = null;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. No authentication token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token. Please sign in again.',
      error: err.message,
    });
  }
};
