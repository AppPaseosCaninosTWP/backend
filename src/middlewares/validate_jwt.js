const jwt = require("jsonwebtoken");

/**
 * Middleware to validate JWT token.
 */
const validate_jwt = async (req, res, next) => {
  try {
    const header = req.headers["authorization"];
    const token = header && header.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: true,
        msg: "Authentication token not provided",
      });
    }

    const { user_id, role_id } = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { user_id, role_id };

    next();
  } catch (error) {
    console.error("Error validating token:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: true,
        msg: "Token expired",
      });
    }
    return res.status(401).json({
      error: true,
      msg: "Invalid token",
    });
  }
};

module.exports = validate_jwt;
