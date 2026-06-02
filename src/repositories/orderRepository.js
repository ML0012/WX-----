const logger = require('../utils/logger');

// ─── 订单状态常量 ───
const ORDER_STATUS = {
  PENDING: 'PENDING',   // 待支付
  PAID: 'PAID',         // 已支付
  CANCELLED: 'CANCELLED',
};

// ─── 内存 Mock 存储（生产环境替换为真实数据库实现即可） ───
const mockOrders = new Map([
  ['TEST_ORDER_001', {
    outTradeNo: 'TEST_ORDER_001',
    amountTotal: 100,       // 单位：分（即 1.00 元）
    status: ORDER_STATUS.PENDING,
    transactionId: null,
    paidAt: null,
  }],
  ['TEST_ORDER_002', {
    outTradeNo: 'TEST_ORDER_002',
    amountTotal: 5990,      // 单位：分（即 59.90 元）
    status: ORDER_STATUS.PENDING,
    transactionId: null,
    paidAt: null,
  }],
  ['TEST_ORDER_003', {
    outTradeNo: 'TEST_ORDER_003',
    amountTotal: 1,         // 单位：分（即 0.01 元）
    status: ORDER_STATUS.PAID,
    transactionId: '4200001234202301011234567890',
    paidAt: new Date('2026-01-01T08:00:00Z'),
  }],
]);

/**
 * 根据商户订单号查询订单
 * @param {string} outTradeNo
 * @returns {Promise<object|null>}
 */
async function findByOutTradeNo(outTradeNo) {
  const order = mockOrders.get(outTradeNo) || null;
  logger.debug('查询订单', { outTradeNo, found: !!order });
  return order;
}

/**
 * 将订单标记为已支付
 * @param {string} outTradeNo
 * @param {string} transactionId - 微信支付流水号
 * @returns {Promise<boolean>}
 */
async function markPaid(outTradeNo, transactionId) {
  const order = mockOrders.get(outTradeNo);
  if (!order) return false;

  order.status = ORDER_STATUS.PAID;
  order.transactionId = transactionId;
  order.paidAt = new Date();

  logger.info('订单已更新为已支付', { outTradeNo, transactionId });
  return true;
}

module.exports = {
  ORDER_STATUS,
  findByOutTradeNo,
  markPaid,
};
