import http from "node:http";

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
  });
  res.end(`<h2>Hello YOYO<h2>
        <p>${req.url}</p>
    `);
});

//使用 3000 通訊埠
server.listen(3000);
