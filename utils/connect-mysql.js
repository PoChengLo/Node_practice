import mysql from "mysql2/promise";

const { DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT } = process.env;

// 顯示在terminal
// console.log({ DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT });

const db = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  // 等待連線
  waitForConnections: true,
  // 連線最大數量，佔用硬體資源
  connectionLimit: 5,
  // 排隊數量，無限
  queueLimit: 0,
});

export default db;
