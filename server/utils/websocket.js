const connectedClients = new Map();
const { decodeJWT } = require("./http");
const { User } = require("../models/user");

async function authenticatedWebSocketUser(request) {
  const authorization = request.headers?.authorization;
  const headerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const token = request.query?.token || headerToken;
  if (!token) return null;
  const payload = decodeJWT(token);
  if (!payload?.id) return null;
  const user = await User.get({ id: Number(payload.id) });
  return user && !user.suspended ? user : null;
}

module.exports = { connectedClients, authenticatedWebSocketUser };
