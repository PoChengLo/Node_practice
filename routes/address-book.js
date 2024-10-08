import express from "express";
import moment from "moment-timezone";
import { z } from "zod";
import db from "./../utils/connect-mysql.js";
import upload from "./../utils/upload-imgs.js";

const router = express.Router();

// router 的 top-level middleware

/*
// ***** 模擬網路延遲的狀況
router.use((req, res, next) => {
  const ms = 100 + Math.floor(Math.random()*2000);
  setTimeout(() => {
    next();
  }, ms);
});
*/

/*
router.use((req, res, next) => {
  const path = req.url.split("?")[0];
  // 讓部份的路徑通過
  const whiteList = ["/", "/api"]; // 設定白名單
  if (whiteList.includes(path)) {
    return next();
  }

  // 如果沒有登入 admin 就直接跳走
  if (!req.session.admin) {
    // 跳轉到登入頁, 給參數提示是從哪個頁面跳過去的
    return res.redirect(`/login?u=${req.originalUrl}`);
  }
  next();
});
*/

const getListData = async (req) => {
  /*
SELECT ab.*, l.like_id FROM `address_book` ab
LEFT JOIN (
  SELECT * FROM ab_likes WHERE member_id=3
) l ON ab.ab_id=l.ab_id
ORDER BY ab.ab_id DESC
  */
  const perPage = 20; // 每頁最多有幾筆
  let redirect = ""; // 若有設定值, 就要跳轉頁面
  let success = false; // 有沒有成功取得資料
  // 用戶要看第幾頁
  let page = parseInt(req.query.page) || 1;
  if (page < 1) {
    redirect = "?page=1";
    return { success, redirect };
  }

  let where = " WHERE 1 ";
  // 關鍵字查尋
  let keyword = req.query.keyword || "";
  if (keyword) {
    const keyword_ = db.escape("%" + keyword + "%");
    where += ` AND (ab.name LIKE ${keyword_} OR ab.mobile LIKE ${keyword_}) `;
  }

  // 在這個日期之後出生的
  let birth_begin = req.query.birth_begin || "";
  if (birth_begin) {
    const b = moment(birth_begin);
    if (b.isValid()) {
      const b2 = b.format("YYYY-MM-DD");
      where += ` AND ab.birthday >= '${b2}' `;
    }
  }

  // 在這個日期之前出生的
  let birth_end = req.query.birth_end || "";
  if (birth_end) {
    const b = moment(birth_end);
    if (b.isValid()) {
      const b2 = b.format("YYYY-MM-DD");
      where += ` AND ab.birthday <= '${b2}' `;
    }
  }

  // 取得資料的總筆數
  const t_sql = `SELECT COUNT(1) totalRows FROM address_book ab ${where}`;

  const [[{ totalRows }]] = await db.query(t_sql);

  // 先給預設值
  let totalPages = 0;
  let rows = [];
  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      redirect = `?page=${totalPages}`;
      return { success, redirect };
    }

    // 取得分頁資料
    // req.session.admin?.member_id
    let sql;
    if (req.session.admin) {
      sql = `SELECT ab.*, l.like_id FROM address_book ab 
        LEFT JOIN (
          SELECT * FROM ab_likes WHERE member_id=${req.session.admin.member_id}
        ) l ON ab.ab_id=l.ab_id
        ${where} 
        ORDER BY ab.ab_id DESC
          LIMIT ${(page - 1) * perPage}, ${perPage}`;
    } else {
      sql = `SELECT ab.* FROM address_book ab 
        ${where} 
        ORDER BY ab.ab_id DESC
          LIMIT ${(page - 1) * perPage}, ${perPage}`;
    }

    [rows] = await db.query(sql);

    rows.forEach((r) => {
      // 轉換 JS Date 類型成我要的日期格式
      const b = moment(r.birthday);
      r.birthday = b.isValid() ? b.format("YYYY-MM-DD") : "";
    });
  }
  /* ***** 處理頁碼 begin ****** */
  const prevNum = 5; // 當頁按鈕前面最多幾個按鈕
  let beginPage, endPage; // 起始的頁碼, 結束的頁碼
  if (totalPages <= prevNum * 2 + 1) {
    beginPage = 1;
    endPage = totalPages;
  } else if (page - 1 < prevNum) {
    beginPage = 1;
    endPage = prevNum * 2 + 1;
  } else if (totalPages - page < prevNum) {
    beginPage = totalPages - (prevNum * 2 + 1);
    endPage = totalPages;
  } else {
    beginPage = page - prevNum;
    endPage = page + prevNum;
  }

  /* ***** 處理頁碼 end ****** */
  success = true;
  return {
    totalRows,
    totalPages,
    perPage,
    page,
    success,
    beginPage,
    endPage,
    rows,
    query: req.query,
  };
};

// 路由處理器
router.get("/", async (req, res) => {
  res.locals.title = "通訊錄列表 - " + res.locals.title;
  res.locals.pageName = "ab-list";
  const data = await getListData(req);
  if (!data.success && data.redirect) {
    return res.redirect(data.redirect);
  }
  if (req.session.admin) {
    res.render("address-book/list", data);
  } else {
    res.render("address-book/list-no-admin", data);
  }
});
router.get("/add", async (req, res) => {
  res.locals.title = "新增通訊錄 - " + res.locals.title;
  res.locals.pageName = "ab-add";
  res.render("address-book/add");
});

router.get("/edit/:ab_id", async (req, res) => {
  res.locals.title = "編輯通訊錄 - " + res.locals.title;
  const ab_id = parseInt(req.params.ab_id) || 0;
  if (!ab_id) {
    // 用戶亂輸入字串 (應該要是資料 PK)
    return res.redirect("/address-book");
  }
  const sql = `SELECT * FROM address_book WHERE ab_id=${ab_id}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    // 沒有該筆資料
    return res.redirect("/address-book");
  }
  const row = rows[0];
  const b = moment(row.birthday);
  row.birthday = b.isValid() ? b.format("YYYY-MM-DD") : "";
  res.render("address-book/edit", row);
});

// **************** API *****************************
router.get("/api", async (req, res) => {
  const data = await getListData(req);
  res.json(data);
});

// 處理新增的資料項目
router.post("/api", upload.none(), async (req, res) => {
  const output = {
    success: false,
    result: null,
    bodyData: req.body, // 除錯用
  };
  // TODO: 欄位資料的檢查
  const schema = z.object({
    name: z
      .string({ message: "姓名必填" })
      .min(2, { message: "請輸正確的姓名" }),
    email: z.string().email({ message: "請輸入正確的電郵" }),
    mobile: z
      .string()
      .regex(/^09\d{2}-?\d{3}-?\d{3}$/, { message: "請輸入正確的手機號碼" }),
  });

  const data = { ...req.body }; // 表單資料
  const zResult = schema.safeParse(data);
  if (!zResult.success) {
    output.error = zResult.error;
    return res.json(output);
  }

  const b = moment(data.birthday);
  if (b.isValid()) {
    data.birthday = b.format("YYYY-MM-DD");
  } else {
    // 如果是無效的日期, 給空值
    data.birthday = null;
  }

  data.created_at = new Date();
  const sql2 = "INSERT INTO `address_book` SET ?";
  // INSERT, UPDATE 最好用 try/catch 做錯誤處理
  try {
    const [result] = await db.query(sql2, [data]);
    output.success = !!result.affectedRows;
    output.result = result;
  } catch (ex) {
    output.error = ex;
  }
  res.json(output);
  /*
  const sql1 =
    "INSERT INTO `address_book`(`name`, `email`, `mobile`, `birthday`, `address`, `created_at`) VALUES (?, ?, ?, ?, ?, NOW())";

  const [result] = await db.query(sql1, [
    req.body.name,
    req.body.email,
    req.body.mobile,
    req.body.birthday,
    req.body.address,
  ]);
  */
  /*
{
    "fieldCount": 0,
    "affectedRows": 1,
    "insertId": 1010,
    "info": "",
    "serverStatus": 2,
    "warningStatus": 0,
    "changedRows": 0
}
  */
});

// 讀取單筆資料的 API
router.get("/api/:ab_id", async (req, res) => {
  const output = {
    success: false,
    data: {},
    error: "",
  };

  const ab_id = parseInt(req.params.ab_id) || 0;
  if (!ab_id) {
    // 用戶亂輸入字串 (應該要是資料 PK)
    output.error = "PK 不正確";
    return res.json(output);
  }
  const sql = `SELECT * FROM address_book WHERE ab_id=${ab_id}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    output.error = "沒有該筆資料";
    return res.json(output);
  }
  const row = rows[0];
  const b = moment(row.birthday);
  row.birthday = b.isValid() ? b.format("YYYY-MM-DD") : "";
  output.data = row;
  output.success = true; // 表示有正常拿到資料
  return res.json(output);
});

router.delete("/api/:ab_id", async (req, res) => {
  const output = {
    success: false,
    ab_id: req.params.ab_id,
    error: "",
  };
  const ab_id = parseInt(req.params.ab_id) || 0;
  if (ab_id) {
    // 除了 "讀取" 之外, 都應該要做錯誤處理
    try {
      const sql = `DELETE FROM address_book WHERE ab_id=${ab_id}`;
      const [result] = await db.query(sql);
      output.success = !!result.affectedRows;
    } catch (ex) {
      output.error = "可能因為外鍵限制, 無法刪除資料";
    }
  } else {
    output.error = "不合法的編號";
  }
  res.json(output);
});

router.put("/api/:ab_id", upload.none(), async (req, res) => {
  const output = {
    success: false,
    ab_id: req.params.ab_id,
    result: null,
    bodyData: req.body, // 除錯用
  };

  const ab_id = parseInt(req.params.ab_id) || 0;
  if (!ab_id) {
    output.error = "不合法的編號";
    return res.json(output);
  }

  // TODO: 欄位資料的檢查
  const schema = z.object({
    name: z
      .string({ message: "姓名必填" })
      .min(2, { message: "請輸正確的姓名" }),
    email: z.string().email({ message: "請輸入正確的電郵" }),
    mobile: z
      .string()
      .regex(/^09\d{2}-?\d{3}-?\d{3}$/, { message: "請輸入正確的手機號碼" }),
  });

  const data = { ...req.body }; // 表單資料
  const zResult = schema.safeParse(data);
  if (!zResult.success) {
    output.error = zResult.error;
    return res.json(output);
  }

  const b = moment(data.birthday);
  if (b.isValid()) {
    data.birthday = b.format("YYYY-MM-DD");
  } else {
    // 如果是無效的日期, 給空值
    data.birthday = null;
  }

  const sql2 = "UPDATE `address_book` SET ? WHERE ab_id=?";
  // INSERT, UPDATE 最好用 try/catch 做錯誤處理
  try {
    const [result] = await db.query(sql2, [data, ab_id]);
    output.success = !!(result.affectedRows && result.changedRows);
    output.result = result;
  } catch (ex) {
    output.error = ex;
  }
  res.json(output);
});

// 加入最愛或者移除
router.post("/api/toggle-like/:ab_id", async (req, res) => {
  const output = {
    success: false,
    ab_id: req.params.ab_id,
    action: "", // "add", "remove"
  };

  // 沒登入就不往下做
  if (!req.session.admin) {
    output.error = "請登入會員";
    return res.json(output);
  }

  // PK 必須是數值
  const ab_id = parseInt(req.params.ab_id) || 0;
  if (!ab_id) {
    output.error = "不合法的編號";
    return res.json(output);
  }
  /*
  // 1. 查看有沒有這個朋友
  const sql0 = `SELECT ab_id FROM address_book WHERE ab_id=? `;
  const [rows0] = await db.query(sql0, [ab_id]);

  if(!rows0.length){
    output.error = "沒有這個朋友";
    return res.json(output);
  }
  */

  // 2. 查看是不是有記錄了
  const sql = `SELECT * FROM ab_likes WHERE member_id=? AND ab_id=? `;
  const [rows] = await db.query(sql, [req.session.admin.member_id, ab_id]);

  let sql2, result;
  if (rows.length) {
    // 有資料的情況
    output.action = "remove";
    sql2 = `DELETE FROM ab_likes WHERE member_id=? AND ab_id=? `;
  } else {
    // 沒有資料的情況
    output.action = "add";
    sql2 = `INSERT INTO ab_likes (member_id, ab_id) VALUES (?, ?) `;
  }
  try {
    [result] = await db.query(sql2, [req.session.admin.member_id, ab_id]);
    output.success = !!result.affectedRows;
  } catch (ex) {
    output.error = "沒有這個朋友";
  }

  res.json(output);
});
export default router;
