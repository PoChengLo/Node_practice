import express from "express";
import moment from "moment-timezone";
import db from "./../utils/connect-mysql.js";

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

  // 取得資料的總筆數
  const t_sql = "SELECT COUNT(1) totalRows FROM address_book";
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
    const sql = `SELECT * FROM address_book ORDER BY ab_id DESC
    LIMIT ${(page - 1) * perPage} , ${perPage}`;
    [rows] = await db.query(sql);

    // 轉換成 JS Date 類型成展示頁面的日期格式
    rows.forEach((r) => {
      r.birthday = moment(r.birthday).format("YYYY-MM-DD");
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

// **************** API *****************************
router.get("/api", async (req, res) => {
  const data = await getListData(req);
  res.json(data);
});

export default router;
