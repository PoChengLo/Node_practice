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

app.get("/json-sales", (req, res) => {
  const sales = [
    {
      name: "Bill",
      age: 28,
      id: "A001",
    },
    {
      name: "Peter",
      age: 32,
      id: "A002",
    },
    {
      name: "Carl",
      age: 29,
      id: "A003",
    },
  ];
  res.render("json-sales", { sales });
});
//路由選擇，會以排序為優先，符合就會跳轉
// app.get("/a.html", (req, res) => {
//   res.send(`<h1>NO~~~~~</h1>`);
// });

app.get("/try-qs", (req, res) => {
  res.json(req.query);
});

app.get("/try-post-form", (req, res) => {
  res.render("try-post-form");
});

// middleware 中介軟體，中介函式
const urlencodedParser = express.urlencoded({ extends: true });

app.post("/try-post-form", [urlencodedParser] ,(req, res) => {
  res.json(req.body);
});

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
