const prisma = require("../prisma");
const { SystemSettings } = require("../../models/systemSettings");
const { User } = require("../../models/user");
const { EncryptionManager } = require("../EncryptionManager");
const { decodeJWT } = require("../http");
const EncryptionMgr = new EncryptionManager();

async function validatedRequest(request, response, next) {
  const multiUserMode = await SystemSettings.isMultiUserMode();
  response.locals.multiUserMode = multiUserMode;
  if (multiUserMode)
    return await validateMultiUserRequest(request, response, next);

  // When in development passthrough auth token for ease of development.
  if (
    process.env.NODE_ENV === "development" ||
    !process.env.AUTH_TOKEN ||
    !process.env.JWT_SECRET
  ) {
    next();
    return;
  }

  if (!process.env.AUTH_TOKEN) {
    return response.status(401).json({
      error: "You need to set an AUTH_TOKEN environment variable.",
    });
  }

  const auth = request.header("Authorization");
  const token = auth ? auth.split(" ")[1] : null;
  if (!token) {
    return response.status(401).json({ error: "No auth token found." });
  }

  const bcrypt = require("bcrypt");
  const { p } = decodeJWT(token);

  if (p === null || !/\w{32}:\w{32}/.test(p)) {
    return response.status(401).json({ error: "Token expired or failed validation." });
  }

  if (
    !bcrypt.compareSync(
      EncryptionMgr.decrypt(p),
      bcrypt.hashSync(process.env.AUTH_TOKEN, 10)
    )
  ) {
    return response.status(401).json({ error: "Invalid auth credentials." });
  }

  next();
}

async function validateMultiUserRequest(request, response, next) {
  const auth = request.header("Authorization");
  const token = auth ? auth.split(" ")[1] : null;

  if (!token) {
    return response.status(401).json({ error: "No auth token found." });
  }

  const valid = decodeJWT(token);
  if (!valid || !valid.id) {
    return response.status(401).json({ error: "Invalid auth token." });
  }

  const user = await User.get({ id: valid.id });
  if (!user) {
    return response.status(401).json({ error: "Invalid auth for user." });
  }

  if (user.suspended) {
    return response.status(401).json({ error: "User is suspended from system" });
  }

  // ✅ Merge academic profile info
  let profile = null;
  if (user.role === "student") {
    profile = await prisma.students.findFirst({ where: { user_id: user.id } });
  } else if (user.role === "teacher") {
    profile = await prisma.teachers.findFirst({ where: { user_id: user.id } });
  } else if (user.role === "parent") {
    profile = await prisma.parents.findFirst({ where: { user_id: user.id } });
  }

  // ✅ Attach merged user
  response.locals.user = { ...user, ...profile };

  next();
}

module.exports = { validatedRequest };