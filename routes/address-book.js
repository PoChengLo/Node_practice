import express from "express";
import moment from "moment-timezone";
import db from "./../utils/connect-mysql.js";

const router = express.Router();

// 路由處理器
router.get("/", async (req, res) => {
  //每頁最多幾筆
  const perPage = 25;

  // query string ，用戶要看第幾頁
  let page = parseInt(req.query.page) || 1;
  if (page < 1) {
    return res.redirect("?page=1");
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
      return res.redirect(`?page=${totalPages}`);
    }

    // 取得分頁資料，
    const sql = `SELECT * FROM address_book ORDER BY ab_id DESC
    LIMIT ${(page - 1) * perPage} , ${perPage}`;
    [rows] = await db.query(sql);

    // 轉換成 JS Date 類型成展示頁面的日期格式
    rows.forEach((r) => {r.birthday = moment(r.birthday).format("YYYY-MM-DD") });

  }
  // res.json({ totalRows, rows, totalPages, page });
  res.render("address-book/list", { totalRows, rows, totalPages, page });
});

export default router;
