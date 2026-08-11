process.env.NODE_ENV === "development"
  ? require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
  : require("dotenv").config();

require("./utils/logger")();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const http = require("http"); // Fixed import
const { reqBody } = require("./utils/http");
const { systemEndpoints } = require("./endpoints/system");
const { workspaceEndpoints } = require("./endpoints/workspaces");
const { chatEndpoints } = require("./endpoints/chat");
const { embeddedEndpoints } = require("./endpoints/embed");
const { embedManagementEndpoints } = require("./endpoints/embedManagement");
const { getVectorDbClass } = require("./utils/helpers");
const { adminEndpoints } = require("./endpoints/admin");
const { inviteEndpoints } = require("./endpoints/invite");
const { utilEndpoints } = require("./endpoints/utils");
const { developerEndpoints } = require("./endpoints/api");
const { extensionEndpoints } = require("./endpoints/extensions");
const { bootHTTP, bootSSL } = require("./utils/boot");
const { workspaceThreadEndpoints } = require("./endpoints/workspaceThreads");
const { documentEndpoints } = require("./endpoints/document");
const { agentWebsocket } = require("./endpoints/agentWebsocket");
const { experimentalEndpoints } = require("./endpoints/experimental");
const { browserExtensionEndpoints } = require("./endpoints/browserExtension");
const { communityHubEndpoints } = require("./endpoints/communityHub");
const { agentFlowEndpoints } = require("./endpoints/agentFlows");
const { mcpServersEndpoints } = require("./endpoints/mcpServers");
const { mobileEndpoints } = require("./endpoints/mobile");
const {
  workspaceParsedFilesEndpoints,
} = require("./endpoints/workspacesParsedFiles");
const { educationEndpoints } = require("./endpoints/education");
const { httpLogger } = require("./middleware/httpLogger");
const { securityMiddleware } = require("./utils/security");
require("./cron/Weeklydigestcron"); // registers the Sunday 7am CAT job

const app = express();
const apiRouter = express.Router();
const BODY_LIMIT = process.env.SERVER_BODY_LIMIT || "10mb";
const {
  connectedClients,
  authenticatedWebSocketUser,
} = require("./utils/websocket");
const serverPort = process.env.SERVER_PORT || 3001;
const educationHierarchyEnabled =
  process.env.NODE_ENV === "development" ||
  process.env.ENABLE_EDUCATION_HIERARCHY === "true";

// Create the HTTP server instance
const server = http.createServer(app);
securityMiddleware(app);

// Only log HTTP requests in development mode
if (
  process.env.NODE_ENV === "development" &&
  !!process.env.ENABLE_HTTP_LOGGER
) {
  app.use(
    httpLogger({
      enableTimestamps: !!process.env.ENABLE_HTTP_LOGGER_TIMESTAMPS,
    })
  );
}

const configuredCorsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedCorsOrigins = new Set([
  "https://chikoro-ai.com",
  "https://www.chikoro-ai.com",
  ...configuredCorsOrigins,
]);
const corsOptions = {
  origin(origin, callback) {
    const localDevelopmentOrigin =
      process.env.NODE_ENV !== "production" &&
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");
    callback(
      null,
      !origin || allowedCorsOrigins.has(origin) || localDevelopmentOrigin
    );
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(bodyParser.text({ limit: BODY_LIMIT }));
app.use(bodyParser.json({ limit: BODY_LIMIT }));
app.use(
  bodyParser.urlencoded({
    limit: BODY_LIMIT,
    extended: true,
  })
);
app.use((error, _request, response, next) => {
  if (error?.type === "entity.too.large")
    return response.status(413).json({
      success: false,
      error: `Request body exceeds the ${BODY_LIMIT} limit.`,
    });
  next(error);
});

// SSL vs Non-SSL Booting
if (!!process.env.ENABLE_HTTPS) {
  bootSSL(app, serverPort);
} else {
  require("@mintplex-labs/express-ws").default(app, server);
}

// WebSocket endpoint for notifications
app.ws("/ws/notifications", async (ws, req) => {
  const user = await authenticatedWebSocketUser(req);
  if (!user) return ws.close(1008, "Unauthorized");

  const userId = Number(user.id);
  connectedClients.get(userId)?.close(1000, "Replaced by a newer connection");
  connectedClients.set(userId, ws);

  ws.on("close", () => {
    if (connectedClients.get(userId) === ws) connectedClients.delete(userId);
  });
});

app.use("/api/system/parent", require("./utils/parentNotificationSettings"));
app.use("/api/system/courses", require("./endpoints/courses"));
app.use("/api/system/diagnostics", require("./endpoints/diagnostics"));
app.use("/api/system/assignments", require("./endpoints/assignments"));
app.use("/api/system/student", require("./endpoints/studentToday"));
app.use("/api/system/review", require("./endpoints/review"));

app.use("/api", apiRouter);

// Register Endpoints
systemEndpoints(apiRouter);
extensionEndpoints(apiRouter);
workspaceEndpoints(apiRouter);
workspaceThreadEndpoints(apiRouter);
chatEndpoints(apiRouter);
adminEndpoints(apiRouter);
inviteEndpoints(apiRouter);
embedManagementEndpoints(apiRouter);
utilEndpoints(apiRouter);
documentEndpoints(apiRouter);
workspaceParsedFilesEndpoints(apiRouter);
agentWebsocket(apiRouter);
experimentalEndpoints(apiRouter);
developerEndpoints(app, apiRouter);
communityHubEndpoints(apiRouter);
agentFlowEndpoints(apiRouter);
mcpServersEndpoints(apiRouter);
mobileEndpoints(apiRouter);
if (educationHierarchyEnabled) educationEndpoints(apiRouter);
embeddedEndpoints(apiRouter);
browserExtensionEndpoints(apiRouter);

// Serve Frontend in Production
if (process.env.NODE_ENV !== "development") {
  const publicDirectory = path.resolve(__dirname, "public");
  const indexPage = path.join(publicDirectory, "index.html");
  const notFoundPage = path.join(publicDirectory, "404.html");
  const fs = require("fs");
  const seoPageRoutes = [
    "/",
    "/about",
    "/pricing",
    "/blog",
    "/blog/chikoro-ai-august-2026-update",
    "/blog/chikoro-ai-features-guide",
    "/blog/chikoro-ai-for-students-zimbabwe",
    "/blog/chikoro-ai-for-teachers-zimbabwe",
    "/blog/chikoro-ai-for-parents-zimbabwe",
    "/blog/chikoro-ai-for-schools-zimbabwe",
    "/blog/best-ai-tools-homework-help-zimbabwe-2026",
    "/blog/how-to-pass-zimsec-o-level-maths",
    "/blog/chikoro-ai-apk-available-on-apk-pure",
    "/blog/the-power-of-home-language-learning",
    "/privacy-policy",
    "/terms-of-service",
  ];

  app.use((_, response, next) => {
    response.removeHeader("X-Powered-By");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.use((request, response, next) => {
    if (
      request.method === "GET" &&
      request.path.length > 1 &&
      request.path.endsWith("/")
    ) {
      const query = request.originalUrl.slice(request.path.length);
      return response.redirect(
        301,
        `${request.path.replace(/\/+$/, "")}${query}`
      );
    }
    next();
  });

  app.get(seoPageRoutes, (request, response, next) => {
    const pagePath =
      request.path === "/"
        ? indexPage
        : path.join(
            publicDirectory,
            ...request.path.slice(1).split("/"),
            "index.html"
          );
    if (!fs.existsSync(pagePath)) return next();

    response.setHeader("Cache-Control", "no-cache");
    return response.sendFile(pagePath);
  });

  app.use(
    express.static(publicDirectory, {
      setHeaders: (response, filePath) => {
        const relativePath = path.relative(publicDirectory, filePath);
        const isHashedAsset =
          relativePath.startsWith(`assets${path.sep}`) &&
          /-[A-Za-z0-9_-]{8,}\.[^.]+$/.test(relativePath);

        if (relativePath === "service-worker.js") {
          response.setHeader(
            "Cache-Control",
            "no-cache, no-store, must-revalidate"
          );
        } else if (relativePath === "manifest.webmanifest") {
          response.setHeader("Cache-Control", "public, max-age=3600");
        } else if (isHashedAsset) {
          response.setHeader(
            "Cache-Control",
            "public, max-age=31536000, immutable"
          );
        }
      },
    })
  );

  app.get(/^\/blog(?:\/.*)?$/, function (_, response) {
    if (fs.existsSync(notFoundPage)) {
      return response.status(404).sendFile(notFoundPage);
    }
    return response.sendStatus(404);
  });

  const spaRoutePatterns = [
    /^\/$/,
    /^\/(about|pricing|privacy-policy|terms-of-service)\/?$/,
    /^\/(login|register|enrol|payment|quiz|delete-account)\/?$/,
    /^\/test(?:\/.*)?$/,
    /^\/(sso|reports|teacher-tools|teacher|student|payments|parent|join)(\/.*)?$/,
    /^\/(teacher-dashboard|link-student|link-parent|upload-exam)\/?$/,
    /^\/(courses|education|workspace|settings|onboarding|accept-invite)(\/.*)?$/,
  ];

  app.get("*", function (request, response) {
    const isKnownSpaRoute = spaRoutePatterns.some((pattern) =>
      pattern.test(request.path)
    );
    if (!isKnownSpaRoute) {
      if (fs.existsSync(notFoundPage)) {
        return response.status(404).sendFile(notFoundPage);
      }
      return response.sendStatus(404);
    }

    response.setHeader("Cache-Control", "no-cache");
    return response.sendFile(indexPage);
  });
} else {
  // Debug route for Vector DB command testing
  apiRouter.post("/v/:command", async (request, response) => {
    try {
      const VectorDb = getVectorDbClass();
      const { command } = request.params;
      if (!Object.getOwnPropertyNames(VectorDb).includes(command)) {
        return response.status(500).json({
          message: "invalid interface command",
          commands: Object.getOwnPropertyNames(VectorDb),
        });
      }

      const body = reqBody(request);
      const resBody = await VectorDb[command](body);
      response.status(200).json({ ...resBody });
    } catch (e) {
      console.error("Vector Debug Error:", e.message);
      response.status(500).json({ error: e.message });
    }
  });
}

// Catch-all 404
app.all("*", function (_, response) {
  response.sendStatus(404);
});

if (!process.env.ENABLE_HTTPS) {
  bootHTTP(app, serverPort, server);
}
