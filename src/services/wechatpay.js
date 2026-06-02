const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

const TIMESTAMP_TOLERANCE_SEC = 300; // 5 分钟防重放窗口

/**
 * 验证微信支付回调签名（RSA-SHA256）
 * @param {object} headers - HTTP 请求头（已 lowercase）
 * @param {string} rawBody - 原始请求体字符串
 * @returns {{ valid: boolean, message?: string }}
 */
function verifySignature(headers, rawBody) {
  const timestamp = headers['wechatpay-timestamp'];
  const nonce = headers['wechatpay-nonce'];
  const signature = headers['wechatpay-signature'];
  const serial = headers['wechatpay-serial'];

  if (!timestamp || !nonce || !signature || !serial) {
    return { valid: false, message: '缺少必需的微信支付签名头' };
  }

  // 验证证书序列号匹配
  if (serial !== config.wechat.platformSerial) {
    logger.warn('平台证书序列号不匹配', {
      expected: config.wechat.platformSerial,
      received: serial,
    });
    return { valid: false, message: '平台证书序列号不匹配' };
  }

  // 时间戳防重放校验
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts) || Math.abs(now - ts) > TIMESTAMP_TOLERANCE_SEC) {
    logger.warn('回调时间戳超出容忍窗口', { timestamp, now, diff: now - ts });
    return { valid: false, message: '请求时间戳过期或无效' };
  }

  // 构造待验签串: 时间戳\n随机串\n请求体\n
  const message = `${timestamp}\n${nonce}\n${rawBody}\n`;

  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(message);
    const ok = verifier.verify(config.wechat.platformPublicKey, signature, 'base64');
    if (!ok) {
      logger.warn('RSA-SHA256 签名验证失败');
      return { valid: false, message: '签名验证失败' };
    }
    return { valid: true };
  } catch (err) {
    logger.error('验签过程异常', { message: err.message, stack: err.stack });
    return { valid: false, message: '验签异常: ' + err.message };
  }
}

/**
 * AEAD_AES_256_GCM 解密微信回调资源密文
 * @param {object} resource - 回调 body 中的 resource 对象
 * @param {string} resource.ciphertext  - Base64 编码的密文（含 authTag）
 * @param {string} resource.associated_data - 附加数据（AAD）
 * @param {string} resource.nonce - 随机串（IV）
 * @returns {object} 解密后的 JSON 对象
 */
function decryptResource(resource) {
  const { ciphertext, associated_data, nonce } = resource;
  const key = Buffer.from(config.wechat.apiV3Key, 'utf8');
  const iv = Buffer.from(nonce, 'utf8');
  const data = Buffer.from(ciphertext, 'base64');

  // 密文末尾 16 字节为 GCM Authentication Tag
  const AUTH_TAG_LENGTH = 16;
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
  const encryptedData = data.subarray(0, data.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associated_data || '', 'utf8'));

  const plaintext = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(plaintext);
}

module.exports = { verifySignature, decryptResource };
