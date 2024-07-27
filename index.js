// console.log(process.env.WEB_PORT);

import express from "express";

const app = express();

app.set("view engine", "ejs");

//定義路由：1.接收的方式 2.路徑
app.get("/", (req, res) => {
  // res.send(`<h1>HEEELLLLL~~~~~</h1>`);
  res.render("home", { name: "YOYO" });
});

app.get("/try1", (req, res) => {
  res.json({ name: "Ted" });
});

//路由選擇，會以排序為優先，符合就會跳轉
// app.get("/a.html", (req, res) => {
//   res.send(`<h1>NO~~~~~</h1>`);
// });

// **** 靜態內容資料夾 ****
app.use(express.static("public"));
app.use("/bootstrap", express.static("node_modules/bootstrap/dist"));

// **** 404 page ****
// 404 要放在所有路由定義的後面
app.use((req, res) => {
  res.status(404).send(`<h1>Wrong Position</h1>`);
});

const port = process.env.WEB_PORT || 3002;
app.listen(port, () => {
  console.log(`Server啟動:${port}`);
});
