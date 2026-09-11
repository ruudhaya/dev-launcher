// Never reached in practice: Node 99.99.99 doesn't exist, so version resolution
// should fail before this script ever runs.
const http = require("node:http");

http.createServer((_req, res) => res.end("ok")).listen(4322, () => {
  console.log("Local: http://localhost:4322");
});
