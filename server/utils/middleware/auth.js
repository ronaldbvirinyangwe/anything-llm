// middleware/auth.js

const { userFromSession } = require("../../utils/http");

async function authenticateToken(req, res, next) {
  try {
    const user = await userFromSession(req, res);
    if (!user?.id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = { authenticateToken };