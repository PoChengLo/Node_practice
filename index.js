// console.log(process.env.WEB_PORT);

import express from "express";
import multer from "multer";
import upload from "./utils/upload-imgs.js";
import admin2Router from "./routes/admin2.js";

const app = express();
// const upload = multer({dest: "tmp_uploads/"});

app.set("view engine", "ejs");

// Top-level MiddleWare
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
// const urlencodedParser = express.urlencoded({ extends: true });
// app.post("/try-post-form", [urlencodedParser] ,(req, res) => {
//   res.json(req.body);
// });

app.post("/try-post-form", (req, res) => {
  // res.json(req.body);
  res.render("try-post-form", req.body);
});
app.post("/try-post", (req, res) => {
  res.json(req.body);
});

// 單一檔案
app.post("/try-upload", upload.single("avatar"), (req, res) => {
  res.json({
    file: req.file,
    body: req.body,
  });
});

// 複數檔案
app.post("/try-uploads", upload.array("photos", 12), (req, res) => {
  res.json(req.files);
});

// 路徑參數較小的放前面
app.get("/my-params1/my-test", (req, res) => {
  res.json({ myTest: 1 });
});
// 路徑參數
app.get("/my-params1/:action/:id", (req, res) => {
  res.json(req.params);
});

app.get(/^\/m\/09\d{2}-?\d{3}-?\d{3}$/i, (req, res) => {
  let u = req.url.slice(3); // 前面三個字元不要
  u = u.split("?")[0]; // ? 後面的不要(query string 忽略)
  u.split("-").join(""); //去掉dash
  res.send({ u });
});

// 使用某一個router，基本上是middleware 的做法
app.use("/admins",admin2Router);

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
