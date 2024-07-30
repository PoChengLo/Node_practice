// console.log(process.env.WEB_PORT);

import express from "express";
import multer from "multer";
import session from "express-session";
import moment from "moment-timezone";
import mysql_session from "express-mysql-session";
import upload from "./utils/upload-imgs.js";
import admin2Router from "./routes/admin2.js";
import db from "./utils/connect-mysql.js";
import cors from "cors";

const app = express();
// const upload = multer({dest: "tmp_uploads/"});

//存放 session在資料庫
const MysqlStore = mysql_session(session);
const sessionStore = new MysqlStore({}, db);

app.set("view engine", "ejs");

// Top-level MiddleWare
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: "030[]sdlsldmcijaqopkdqjo2=;",
    store: sessionStore,
    // cookie: {
    //   maxAge: 1_800_000, // 30 分鐘 ， _ 沒有意義
    // },
  })
);

// Top-level MiddleWare 自訂
app.use((req, res, next) => {
  res.locals.title = "YOYO's Page"; // 預設網站名稱
  res.locals.pageName = "";
  next(); // 往下走
});

//定義路由：1.接收的方式 2.路徑
app.get("/", (req, res) => {
  res.locals.title = "Home " + res.locals.title; // 預設網站名稱
  res.locals.pageName = "home";
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
  res.locals.title = "Form " + res.locals.title;
  res.locals.pageName = "form";
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
app.use("/admins", admin2Router);

// 測試表單送出
app.post("/try-post-form2", upload.none(), (req, res) => {
  res.json(req.body);
});

// session 方式儲存
app.get("/try-sess", (req, res) => {
  req.session.my_var ||= 0;
  // req.session.my_var = req.session.my_var || 0;
  req.session.my_var++;

  res.json(req.session);
});

//res.render("json-sales", { sales });
app.get("/try-moment", (req, res) => {
  const fm = "YYYY-MM-DD HH:mm:ss";
  const m1 = moment();
  const m2 = moment("2024-02-29");
  const m3 = moment("2023-02-29");

  res.json({
    // 取得當下時間的 moment 物件
    m1: m1.format(fm),
    m2: m2.format(fm),
    m3: m3.format(fm),
    m1v: m1.isValid(),
    m2v: m2.isValid(),
    m3v: m3.isValid(),
    m1z: m1.tz("Europe/London").format(fm),
    m2z: m2.tz("Europe/London").format(fm),
  });
});

app.get("/try-db", async (req, res) => {
  const sql = "SELECT * FROM PRODLIST LIMIT 3";

  const [rows, fields] = await db.query(sql);
  // rows 讀取的資料
  // fields 表的欄位定義相關資料
  res.json({ rows, fields });
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
