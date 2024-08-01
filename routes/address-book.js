import express from "express";
import moment from "moment-timezone";
import { z } from "zod";
import db from "./../utils/connect-mysql.js";
import upload from "./../utils/upload-imgs.js";

const router = express.Router();

const getListData = async (req) => {
  //每頁最多幾筆
  const perPage = 25;
  let redirect = ""; // 沒有設定值，就要跳轉頁面
  let success = false; // 有沒有成功取得資料

  // query string ，用戶要看第幾頁
  let page = parseInt(req.query.page) || 1;
  if (page < 1) {
    redirect = "?page=1";
    return { success, redirect };
  }

  let where = " WHERE 1 ";
  // 模糊查詢 LIKE
  let keyword = req.query.keyword || "";
  if (keyword) {
    const keyword_ = db.escape("%" + keyword + "%");
    where += ` AND (\`name\` LIKE ${keyword_} OR mobile LIKE ${keyword_} )`;
  }

  // 取得資料的總筆數
  const t_sql = `SELECT COUNT(1) totalRows FROM address_book ${where}`;
  const [[{ totalRows }]] = await db.query(t_sql);

  // 總頁數給預設值
  let totalPages = 0;
  let rows = [];
  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      redirect = `?page=${totalPages}`;
      return { success, redirect };
    }

    // 取得分頁資料，
    const sql = `SELECT * FROM address_book ${where} ORDER BY ab_id DESC
    LIMIT ${(page - 1) * perPage} , ${perPage}`;
    [rows] = await db.query(sql);

    // 轉換成 JS Date 類型成展示頁面的日期格式
    rows.forEach((r) => {
      const b = moment(r.birthday);
      r.birthday = b.isValid() ? b.format("YYYY-MM-DD") : "";
    });
  }

  // 處理頁碼 start
  const prevNum = 5; // 當頁按鈕前面最多幾個按鈕
  let beginPage, endPage; // 起始的頁碼，結束的頁碼
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
  // 處理頁碼 end
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

  res.render("address-book/list", data);
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

router.post("/api", upload.none(), async (req, res) => {
  // 新增資料功能 1
  const output = {
    success: false,
    result: null,
    bodyData: req.body, // 除錯用
  };

  // TODO: 欄位資料檢查
  const schema = z.object({
    name: z
      .string({ message: "姓名必填" })
      .min(2, { message: "請輸入正確的姓名" }),
    email: z.string().email({ message: "請輸入正確的電子郵件信箱" }),
    mobile: z.string(r).regex(/^09\d{2}-?\d{3}-?\d{3}$/, {
      message: "請輸入正確的電子郵件信箱",
    }),
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
    data.birthday = null; //  如果沒有生日，給空字串
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
  // res.json(output);

  // 傳統新增資料
  // const sql1 = "INSERT INTO `address_book`( `name`, `email`, `mobile`,`birthday`, `address`, `created_at`) VALUES ( ?,?,?,?,?, NOW())"

  // const [result] = await db.query(sql1, [
  // req.body.name,
  // req.body.email,
  // req.body.mobile,
  // req.body.birthday,
  // req.body.address,
  // ]);

  // res.json(result);
});

router.delete("/api/:ab_id", async (req, res) => {
  const output = {
    success: false,
    ab_id: req.params.ab_id,
    error: "",
  };
  const ab_id = parseInt(req.params.ab_id) || 0;
  if (ab_id) {
    const sql = `DELETE FROM address_book WHERE ab_id=${ab_id}`;
    const [result] = await db.query(sql);
    output.success = !!result.affectedRows;
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

export default router;
