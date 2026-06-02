require('dotenv').config();

const required = [
  'WECHAT_APIV3_KEY',
  'WECHAT_MCHID',
  'WECHAT_PLATFORM_SERIAL',
  'WECHAT_PLATFORM_PUBLIC_KEY',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`缺少必需的环境变量: ${key}，请检查 .env 文件`);
  }
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  wechat: {
    mchId: process.env.WECHAT_MCHID,
    apiV3Key: process.env.WECHAT_APIV3_KEY,
    platformSerial: process.env.WECHAT_PLATFORM_SERIAL,
    platformPublicKey: process.env.WECHAT_PLATFORM_PUBLIC_KEY.replace(/\\n/g, '\n'),
  },
};

if (Buffer.byteLength(config.wechat.apiV3Key, 'utf8') !== 32) {
  throw new Error('WECHAT_APIV3_KEY 必须为32字节');
}

module.exports = config;
