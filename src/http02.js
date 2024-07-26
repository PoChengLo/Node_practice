import http from "node:http";
import fs from "node:fs/promises";

const server = http.createServer(async (req, res) => {
  const jsonStr = JSON.stringify(req.headers, null, 4);

  await fs.writeFile("./headers.txt", jsonStr);

  res
    .writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
    })
    .end(jsonStr);
});

//使用 3000 通訊埠
server.listen(3000);
