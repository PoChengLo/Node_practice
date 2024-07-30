import express from "express";

const router = express.Router();

// 路由處理器
router.get("/admin/:p1?/:p2?/", (req, res) => {
  res.json({
    params: req.params,
    url: req.url,
    baseurl: req.baseUrl,
    originalUrl: req.originalUrl,
  });
});

export default router;
