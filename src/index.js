const config = require('./config');
const app = require('./app');
const logger = require('./utils/logger');

app.listen(config.port, () => {
  logger.info(`微信支付回调服务已启动，端口: ${config.port}`);
  logger.info(`回调地址: http://localhost:${config.port}/api/pay/wechat/notify`);
});
