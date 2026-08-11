const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function securityMiddleware(app) {
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

  const commonOptions = {
    windowMs: 15 * 60 * 1000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (request) => request.method === "OPTIONS",
  };
  const authenticationLimiter = rateLimit({
    ...commonOptions,
    limit: positiveInteger(process.env.AUTH_RATE_LIMIT, 10),
    message: {
      success: false,
      error: "Too many authentication attempts. Please try again later.",
    },
  });
  const apiLimiter = rateLimit({
    ...commonOptions,
    limit: positiveInteger(process.env.API_RATE_LIMIT, 600),
    message: {
      success: false,
      error: "Too many requests. Please try again later.",
    },
  });

  app.use(
    [
      "/api/request-token",
      "/api/system/register",
      "/api/system/reset-password",
    ],
    authenticationLimiter
  );
  app.use("/api", apiLimiter);
}

module.exports = { positiveInteger, securityMiddleware };
