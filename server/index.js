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
const { workspaceParsedFilesEndpoints } = require("./endpoints/workspacesParsedFiles");
const { educationEndpoints } = require("./endpoints/education");
const { httpLogger } = require("./middleware/httpLogger");
require('./cron/Weeklydigestcron'); // registers the Sunday 7am CAT job

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

const corsOptions = {
  origin: [
    "https://chikoro-ai.com",
    "https://www.chikoro-ai.com",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],
  credentials: true,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.set("trust proxy", 1);
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

app.use('/api/system/parent', require('./utils/parentNotificationSettings'));
app.use('/api/system/courses', require('./endpoints/courses'));

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
  const { MetaGenerator } = require("./utils/boot/MetaGenerator");
  const IndexPage = new MetaGenerator();

  app.use(
    express.static(path.resolve(__dirname, "public"), {
      extensions: ["js"],
      setHeaders: (res) => {
        res.removeHeader("X-Powered-By");
        res.setHeader("X-Frame-Options", "DENY");
      },
    })
  );

  app.use("/", function (_, response) {
    IndexPage.generate(response);
    return;
  });

  app.get("/robots.txt", function (_, response) {
    response.type("text/plain");
    response.send("User-agent: *\nDisallow: /").end();
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
