const { Router } = require('express');
const { handleWechatNotify } = require('../controllers/wechatNotify');

const router = Router();

// 微信支付 APIv3 异步回调
router.post('/pay/wechat/notify', handleWechatNotify);

module.exports = router;
