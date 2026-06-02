const { verifySignature, decryptResource } = require('../services/wechatpay');
const { findByOutTradeNo, markPaid, ORDER_STATUS } = require('../repositories/orderRepository');
const logger = require('../utils/logger');

function success(res) {
  return res.status(200).json({ code: 'SUCCESS', message: '成功' });
}

function fail(res, statusCode, message) {
  return res.status(statusCode).json({ code: 'FAIL', message });
}

/**
 * 微信支付 APIv3 异步回调处理器
 */
async function handleWechatNotify(req, res) {
  logger.info('收到微信支付回调');

  try {
    // ── 1. 获取原始请求体 ──
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
    if (!rawBody) {
      logger.warn('回调请求体为空');
      return fail(res, 400, '请求体为空');
    }

    // ── 2. 签名验证 ──
    const verifyResult = verifySignature(req.headers, rawBody);
    if (!verifyResult.valid) {
      logger.warn('验签失败', { reason: verifyResult.message });
      return fail(res, 401, verifyResult.message);
    }
    logger.info('验签通过');

    // ── 3. 解析请求体并检查事件类型 ──
    const body = JSON.parse(rawBody);
    const { event_type, resource } = body;

    if (event_type !== 'TRANSACTION.SUCCESS') {
      logger.info('非支付成功事件，跳过处理', { event_type });
      return success(res);
    }

    if (!resource) {
      logger.warn('回调缺少 resource 字段');
      return fail(res, 400, '缺少 resource 字段');
    }

    // ── 4. AEAD_AES_256_GCM 解密 ──
    let paymentResult;
    try {
      paymentResult = decryptResource(resource);
    } catch (err) {
      logger.error('解密失败', { message: err.message, stack: err.stack });
      return fail(res, 400, '资源解密失败');
    }
    logger.info('解密成功', {
      out_trade_no: paymentResult.out_trade_no,
      transaction_id: paymentResult.transaction_id,
      trade_state: paymentResult.trade_state,
    });

    // 只处理支付成功的结果
    if (paymentResult.trade_state !== 'SUCCESS') {
      logger.info('交易状态非 SUCCESS，跳过', { trade_state: paymentResult.trade_state });
      return success(res);
    }

    const { out_trade_no, transaction_id, amount } = paymentResult;

    // ── 5. 查询订单 ──
    const order = await findByOutTradeNo(out_trade_no);
    if (!order) {
      logger.error('订单不存在', { out_trade_no });
      return fail(res, 400, `订单不存在: ${out_trade_no}`);
    }

    // ── 6. 幂等性校验 ──
    if (order.status === ORDER_STATUS.PAID) {
      logger.info('订单已支付，幂等跳过', { out_trade_no, transactionId: order.transactionId });
      return success(res);
    }

    // ── 7. 金额核对 ──
    if (order.amountTotal !== amount?.total) {
      logger.error('金额不一致', {
        out_trade_no,
        expected: order.amountTotal,
        actual: amount?.total,
      });
      return fail(res, 400, '订单金额与支付金额不一致');
    }

    // ── 8. 更新订单状态 ──
    const updated = await markPaid(out_trade_no, transaction_id);
    if (!updated) {
      logger.error('更新订单失败', { out_trade_no });
      return fail(res, 500, '更新订单状态失败');
    }

    logger.info('订单支付处理完成', { out_trade_no, transaction_id });
    return success(res);

  } catch (err) {
    logger.error('回调处理异常', { message: err.message, stack: err.stack });
    return fail(res, 500, '服务器内部错误');
  }
}

module.exports = { handleWechatNotify };
