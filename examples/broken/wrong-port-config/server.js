const http = require("node:http");

// Deliberately does NOT match the "launcher.port" configured in package.json,
// so ready detection (polling the configured port) never succeeds even though
// the server itself is healthy.
const ACTUAL_PORT = 4321;

http
  .createServer((_req, res) => res.end("ok"))
  .listen(ACTUAL_PORT, () => {
    console.log(`Local: http://localhost:${ACTUAL_PORT}`);
  });
