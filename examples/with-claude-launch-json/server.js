const http = require("node:http");

const PORT = 4173; // matches .claude/launch.json's "port"

http
  .createServer((_req, res) => res.end("ok"))
  .listen(PORT, () => {
    console.log(`Local: http://localhost:${PORT}`);
  });
