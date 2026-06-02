# 微信支付 Native APIv3 异步回调接口

基于 Node.js + Express 实现的微信支付（Native 扫码支付）APIv3 版本异步支付回调（Notify URL）服务。

## 功能特性

- **RSA-SHA256 签名验证** — 严格按照微信 APIv3 规范验签，含时间戳防重放校验（5 分钟窗口）
- **AEAD_AES_256_GCM 解密** — 使用 Node.js 原生 `crypto` 解密回调密文，零额外依赖
- **幂等处理** — 已支付订单自动跳过，不重复执行业务逻辑
- **金额核对** — 校验订单应付金额与微信实际支付金额一致性
- **可替换数据层** — 抽象 Repository 接口 + 内存 Mock，一键切换真实数据库
- **官方规范应答** — 成功返回 `200 + SUCCESS`，失败返回错误码，微信将按策略重试

## 安装

```bash
npm install
```

依赖项仅两个：
- `express` — Web 框架
- `dotenv` — 环境变量加载

## 配置

复制 `.env.example` 为 `.env` 并填入真实值：

```bash
cp .env.example .env
```

| 环境变量 | 说明 |
|---|---|
| `PORT` | 服务监听端口，默认 `3000` |
| `WECHAT_MCHID` | 微信支付商户号 |
| `WECHAT_APIV3_KEY` | APIv3 密钥（**必须 32 字节**），用于 AEAD 解密 |
| `WECHAT_PLATFORM_SERIAL` | 微信支付平台证书序列号 |
| `WECHAT_PLATFORM_PUBLIC_KEY` | 平台公钥（PEM 格式），换行用 `\n` 表示 |

### 获取平台公钥

平台公钥可通过以下方式获取：

1. **微信支付平台证书** — 使用微信支付 API 下载平台证书，从中提取公钥
2. **微信支付公钥**（新版） — 在商户平台直接获取微信支付公钥

将 PEM 内容写入 `.env` 时，把换行替换为 `\n`：

```
WECHAT_PLATFORM_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhki...\n-----END PUBLIC KEY-----"
```

## 启动

```bash
# 生产启动
npm start

# 开发模式（Node.js >= 18，文件变更自动重启）
npm run dev
```

启动后回调地址为：

```
POST https://你的域名/api/pay/wechat/notify
```

> 微信支付回调要求 HTTPS 且公网可达。本地开发可使用 ngrok 等工具暴露。

## 目录结构

```
src/
├── index.js                  # 启动入口
├── app.js                    # Express 装配（回调路由使用 express.raw）
├── config/
│   └── index.js              # 读取并校验环境变量
├── utils/
│   └── logger.js             # 带时间戳的轻量日志
├── services/
│   └── wechatpay.js          # 核心：RSA-SHA256 验签 + AES-GCM 解密
├── repositories/
│   └── orderRepository.js    # 抽象数据层 + 内存 Mock
├── controllers/
│   └── wechatNotify.js       # 回调业务编排
└── routes/
    └── index.js              # 路由注册
```

## 回调处理流程

1. 接收 POST 请求，保留原始 Body（Buffer）
2. 读取 `Wechatpay-Signature` / `Timestamp` / `Nonce` / `Serial` 请求头
3. 时间戳防重放校验（5 分钟窗口）
4. RSA-SHA256 签名验证
5. AEAD_AES_256_GCM 解密 resource 密文
6. 按 `out_trade_no` 查询订单
7. 幂等检查 — 已支付则直接返回 SUCCESS
8. 金额核对 — `order.amountTotal === amount.total`（单位：分）
9. 更新订单为已支付，记录 `transaction_id`
10. 返回 `{"code":"SUCCESS","message":"成功"}`

## 接入真实数据库

`src/repositories/orderRepository.js` 当前为内存 Mock 实现。接入真实数据库只需实现相同接口：

```javascript
// 根据商户订单号查询订单
async function findByOutTradeNo(outTradeNo) → { outTradeNo, amountTotal, status, transactionId } | null

// 将订单标记为已支付
async function markPaid(outTradeNo, transactionId) → boolean
```

替换导出即可，Controller 层无需修改。

## 健康检查

```
GET /health → {"status":"ok"}
```
