import express from "express";
import db from "./../utils/connect-mysql.js";

const router = express.Router();

// 路由處理器
router.get("/", async (req, res) => {
  const t_sql = "SELECT COUNT(1) totalRows FROM address_book";

  // 取得資料的總筆數
  const [[{totalRows}]] = await db.query(t_sql);

  res.json(totalRows);
});

export default router;
