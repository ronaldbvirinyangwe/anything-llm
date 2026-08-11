const { Telemetry } = require("../../models/telemetry");
const { BackgroundService } = require("../BackgroundWorkers");
const { EncryptionManager } = require("../EncryptionManager");
const { CommunicationKey } = require("../comKey");
const setupTelemetry = require("../telemetry");
const eagerLoadContextWindows = require("./eagerLoadContextWindows");

// Testing SSL? You can make a self signed certificate and point the ENVs to that location
// make a directory in server called 'sslcert' - cd into it
// - openssl genrsa -aes256 -passout pass:gsahdg -out server.pass.key 4096
// - openssl rsa -passin pass:gsahdg -in server.pass.key -out server.key
// - rm server.pass.key
// - openssl req -new -key server.key -out server.csr
// Update .env keys with the correct values and boot. These are temporary and not real SSL certs - only use for local.
// Test with https://localhost:3001/api/ping
// build and copy frontend to server/public with correct API_BASE and start server in prod model and all should be ok
function configureServer(server) {
  server.requestTimeout =
    Number(process.env.SERVER_REQUEST_TIMEOUT_MS) || 900_000;
  server.headersTimeout =
    Number(process.env.SERVER_HEADERS_TIMEOUT_MS) || 65_000;
  server.keepAliveTimeout =
    Number(process.env.SERVER_KEEP_ALIVE_TIMEOUT_MS) || 5_000;
  return server;
}

async function initializeServices() {
  await setupTelemetry();
  new CommunicationKey(true);
  new EncryptionManager();
  new BackgroundService().boot();
  await eagerLoadContextWindows();
}

function installGracefulShutdown(server) {
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received. Closing HTTP server...`);
    const forceClose = setTimeout(() => process.exit(1), 30_000);
    forceClose.unref();
    server.close(async () => {
      await Promise.resolve(Telemetry.flush()).catch(() => {});
      clearTimeout(forceClose);
      process.exit(0);
    });
    server.closeIdleConnections?.();
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGUSR2", () => shutdown("SIGUSR2"));
}

function listen(server, port, mode) {
  configureServer(server);
  installGracefulShutdown(server);
  const host = process.env.SERVER_HOST || "0.0.0.0";
  server
    .listen(port, host, async () => {
      try {
        await initializeServices();
        console.log(
          `Primary server in ${mode} mode listening on ${host}:${port}`
        );
      } catch (error) {
        console.error(`Server initialization failed: ${error.message}`);
        server.close(() => {});
        process.exitCode = 1;
      }
    })
    .on("error", (error) => {
      console.error(`Server failed to start: ${error.message}`);
      process.exitCode = 1;
    });
  return server;
}

function bootSSL(app, port = 3001) {
  try {
    console.log(
      `\x1b[33m[SSL BOOT ENABLED]\x1b[0m Loading the certificate and key for HTTPS mode...`
    );
    const fs = require("fs");
    const https = require("https");
    const privateKey = fs.readFileSync(process.env.HTTPS_KEY_PATH);
    const certificate = fs.readFileSync(process.env.HTTPS_CERT_PATH);
    const credentials = { key: privateKey, cert: certificate };
    const server = https.createServer(credentials, app);

    require("@mintplex-labs/express-ws").default(app, server);
    listen(server, port, "HTTPS");
    return { app, server };
  } catch (e) {
    console.error(
      `\x1b[31m[SSL BOOT FAILED]\x1b[0m ${e.message} - falling back to HTTP boot.`,
      {
        ENABLE_HTTPS: process.env.ENABLE_HTTPS,
        HTTPS_KEY_PATH: process.env.HTTPS_KEY_PATH,
        HTTPS_CERT_PATH: process.env.HTTPS_CERT_PATH,
        stacktrace: e.stack,
      }
    );
    return bootHTTP(app, port);
  }
}

function bootHTTP(app, port = 3001, server = null) {
  if (!app) throw new Error('No "app" defined - crashing!');
  const httpServer = server || require("http").createServer(app);
  if (typeof app.ws !== "function")
    require("@mintplex-labs/express-ws").default(app, httpServer);
  listen(httpServer, port, "HTTP");
  return { app, server: httpServer };
}

module.exports = {
  bootHTTP,
  bootSSL,
  configureServer,
};
