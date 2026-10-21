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

/**
 * Checks whether an incoming HTTP request originates from a Cashier role.
 * Inspects 'x-user-role' header, 'role' query parameter, req.user, or JWT bearer token.
 */
export const isCashierRequest = (req) => {
  if (!req) return false;

  const checkIsCashier = (roleOrUsername) => {
    if (!roleOrUsername) return false;
    const str = String(roleOrUsername).toLowerCase().trim();
    const isAdmin = str.includes('admin');
    return !isAdmin && str.includes('cashier');
  };

  if (checkIsCashier(req.headers?.['x-user-role'])) return true;
  if (checkIsCashier(req.query?.role)) return true;
  if (checkIsCashier(req.user?.role) || checkIsCashier(req.user?.username)) return true;

  let token = null;
  if (
    req.headers?.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers?.['x-auth-token']) {
    token = req.headers['x-auth-token'];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      if (checkIsCashier(decoded?.role) || checkIsCashier(decoded?.username)) {
        return true;
      }
    } catch {
      // Ignore token decode failure in passive check
    }
  }

  return false;
};

