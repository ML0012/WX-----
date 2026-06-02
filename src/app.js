const express = require('express');
const routes = require('./routes');
const logger = require('./utils/logger');

const app = express();

// 对回调路由使用 express.raw 保留原始请求体 Buffer，验签必须用原始字节流
app.use(
  '/api/pay/wechat/notify',
  express.raw({ type: 'application/json' }),
);

// 其他路由使用标准 JSON 解析
app.use(express.json());

app.use('/api', routes);

// 健康检查
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 全局未捕获错误兜底
app.use((err, _req, res, _next) => {
  logger.error('未捕获的服务器错误', { message: err.message, stack: err.stack });
  res.status(500).json({ code: 'FAIL', message: '服务器内部错误' });
});

module.exports = app;
