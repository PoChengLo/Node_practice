// console.log(process.env.WEB_PORT);

import express from "express";
import multer from "multer";
import session from "express-session";
import moment from "moment-timezone";
import bcrypt from "bcrypt";
import cors from "cors";
import mysql_session from "express-mysql-session";
import upload from "./utils/upload-imgs.js";
import admin2Router from "./routes/admin2.js";
import abRouter from "./routes/address-book.js";
import db from "./utils/connect-mysql.js";
import jwt from "jsonwebtoken";

// const upload = multer({ dest: "tmp_uploads/" });
const MysqlStore = mysql_session(session);
const sessionStore = new MysqlStore({}, db);

const app = express();

app.set("view engine", "ejs");

// ************* Top-level middlewares ******************
const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    // console.log({ origin });
    callback(null, true);
  },
};
app.use(cors(corsOptions));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: "dgkjKHK498579ld*&&*",
    store: sessionStore,
    // cookie: {
    //   maxAge: 1_800_000, // 30 分鐘
    // },
  })
);

// ************* 自訂 Top-level middlewares ******************
app.use((req, res, next) => {
  res.locals.title = "小新的網站"; // 預設網站名稱
  res.locals.pageName = ""; // 預設頁面名稱
  res.locals.session = req.session; // session 傳給 ejs
  res.locals.originalUrl = req.originalUrl; // 讓每個頁面都可以拿到 originalUrl

  // 處理 JWT
  const auth = req.get("Authorization");
  if (auth && auth.indexOf("Bearer") === 0) {
    const token = auth.slice(7);

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (ex) {}
  }

  // 測試用
  const { method, url } = req;
  console.log({ method, url });

  next(); // 往下走
});

// 定義路由: 1. 接收的方式, 2. 路徑
app.get("/", (req, res) => {
  res.locals.title = "首頁 - " + res.locals.title;
  res.locals.pageName = "home";

  res.render("home", { name: "小新" });
});

app.post("/api/embeddings", async (req, res) => {
  let output = false;
  try {
    const r = await fetch(`http://127.0.0.1:11434/api/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    console.log(data);
    output = data;
  } catch (ex) {
    console.log("embeddings error:");
    console.log(ex);
  }

  res.json(output);
});

app.get("/try1", (req, res) => {
  // 回應 JSON 的格式
  res.json({ name: "bill" });
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

app.get("/try-qs", (req, res) => {
  res.json(req.query);
});

app.get("/try-post-form", (req, res) => {
  res.locals.title = "測試表單 - " + res.locals.title;
  res.locals.pageName = "try-post-form";
  res.render("try-post-form");
});

/*
// middleware 中介軟體, 中介函式
const urlencodedParser = express.urlencoded({ extended: true });
app.post("/try-post-form", [urlencodedParser],  (req, res) => {
  res.json(req.body);
});
*/
app.post("/try-post-form", (req, res) => {
  // res.json(req.body);
  res.render("try-post-form", req.body);
});

app.post("/try-post", (req, res) => {
  res.json(req.body);
});

app.post("/try-upload", upload.single("avatar"), (req, res) => {
  res.json({
    file: req.file,
    body: req.body,
  });
});
app.post("/try-uploads", upload.array("photos", 3), (req, res) => {
  res.json(req.files);
});

// 比較明確的路由, 定義在前面
app.get("/my-params1/my-test", (req, res) => {
  res.json({ myTest: 1 });
});
// 路徑參數
app.get("/my-params1/:action?/:product_id?", (req, res) => {
  res.json(req.params);
});

// 路徑可以使用 RegExp, 輸入手機號碼
app.get(/^\/m\/09\d{2}-?\d{3}-?\d{3}$/i, (req, res) => {
  let u = req.url.slice(3); // 前面三個字元不要
  u = u.split("?")[0]; // ? 後面的不要 (query string 忽略)
  u = u.split("-").join(""); // 去掉 - (減號)

  res.json({ u });
});

// 使用某一個 router, 基本上是 middleware 的用法
app.use("/admins", admin2Router);
app.use("/address-book", abRouter);
/*
app.get("/a.html", (req, res) => {
  res.send(`<h1>假的 a.html</h1>`);
});
*/

app.post("/try-post-form2", upload.none(), (req, res) => {
  res.json(req.body);
});

app.get("/try-sess", (req, res) => {
  req.session.my_var ||= 0;
  // req.session.my_var = req.session.my_var || 0;
  req.session.my_var++;

  res.json(req.session);
});

app.get("/try-moment", (req, res) => {
  const fm = "YYYY-MM-DD HH:mm:ss";
  const m1 = moment(); // 當下時間
  const m2 = moment("2024-02-29");
  const m3 = moment("2023-02-29");

  res.json({
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
  const sql = "SELECT * FROM address_book LIMIT 3";

  const [rows, fields] = await db.query(sql);
  // rows 讀取的資料
  // fields 表的欄位定義相關資料
  res.json({ rows, fields });
});

app.get("/login", async (req, res) => {
  res.locals.title = "登入 - " + res.locals.title;
  res.locals.pageName = "login";
  res.render("login");
});
app.post("/login", async (req, res) => {
  const output = {
    success: false,
    code: 0,
  };
  if (!req.body.email || !req.body.password) {
    return res.json(output); // 欄位資料不足
  }
  // 1. 先判斷 email 是對的
  const sql = `SELECT * FROM members WHERE email=? `;
  const [rows] = await db.query(sql, [req.body.email]);
  if (!rows.length) {
    output.code = 400; // email 是錯的
    return res.json(output);
  }
  const r = rows[0];
  // 2. 再判斷 password 是對的
  output.success = await bcrypt.compare(req.body.password, r.password_hash);
  if (output.success) {
    // 登入的狀態記錄在 session
    req.session.admin = {
      member_id: r.member_id,
      email: r.email,
      nickname: r.nickname,
    };
  } else {
    output.code = 410;
  }

  res.json(output);
});
app.get("/logout", (req, res) => {
  delete req.session.admin;
  req.session.save((error) => {
    if (req.query.u) {
      // 如果有指示登出後要前往的頁面
      res.redirect(req.query.u);
    } else {
      res.redirect("/");
    }
  });
});

app.get("/cate1", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM categories");

  const level1 = [];
  for (let i of rows) {
    if (!i.parent_id) {
      // 第一層的分類
      level1.push(i);
    }
  }

  for (let lv1 of level1) {
    for (let i of rows) {
      if (lv1.category_id === i.parent_id) {
        lv1.children = lv1.children || []; // 如果沒有值就設定陣列給它
        lv1.children.push(i);
      }
    }
  }

  res.json(level1);
});
app.get("/cate2", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM categories");

  const dict = {}; // 當字典使用
  for (let i of rows) {
    dict[i.category_id] = i;
  }

  const data = [];
  for (let i of rows) {
    if (!i.parent_id) {
      // 第一層的項目
      data.push(i);
    } else {
      // 不是第一層的項目
      const parent = dict[i.parent_id]; // 目前項目 i 的上一層
      parent.children ||= []; // 確保 parent.children 是陣列
      parent.children.push(i); // 加到上一層的 children 底下
    }
  }
  res.json(data);
});

app.post("/login-jwt", async (req, res) => {
  const output = {
    success: false,
    error: "",
    code: 0,
    data: {
      account: "",
      nickname: "",
      token: "",
    },
  };
  let { account, password } = req.body || {};
  account = account.trim(); // 去頭尾空白
  password = password.trim(); // 去頭尾空白
  // 先判斷有沒有資料
  if (!account || !password) {
    output.error = "資料欄位不足";
    return res.json(output);
  }

  const sql = "SELECT * FROM members WHERE email=?";
  const [rows] = await db.query(sql, [account]);
  // 沒有這個帳號
  if (!rows.length) {
    output.error = "帳號或密碼錯誤";
    output.code = 400;
    return res.json(output);
  }
  const row = rows[0];
  // 比對密碼

  const result = await bcrypt.compare(password, row.password_hash);
  if (result) {
    // 帳密都對
    const data = {
      id: row.member_id,
      account: row.email,
    };
    const token = jwt.sign(data, process.env.JWT_SECRET);
    output.data = {
      id: row.member_id,
      account: row.email,
      nickname: row.nickname,
      token,
    };
    output.success = true;
  } else {
    // 密碼是錯的
    output.error = "帳號或密碼錯誤";
    output.code = 450;
  }
  res.json(output);
});

// ****** 靜態內容資料夾 ******
app.use(express.static("public"));
app.use("/bootstrap", express.static("node_modules/bootstrap/dist"));

app.use(express.static("build"));
app.get("*", (req, res) => {
  res.send(
    `<!doctype html><html lang="zh"><head><meta charset="utf-8"/><link rel="icon" href="/favicon.ico"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#000000"/><meta name="description" content="Shinder react hooks"/><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css"/><title>Shinder react hooks</title><script defer="defer" src="/static/js/main.6a205622.js"></script></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div></body></html>`
  );
});

// ****** 404 頁面 ******
// 404 要放在所有路由定義的後面
app.use((req, res) => {
  res.status(404).send(`<h1>走錯路了</h1>`);
});

const port = process.env.WEB_PORT || 3002;
app.listen(port, () => {
  console.log(`Server 啟動: ${port}`);
});
