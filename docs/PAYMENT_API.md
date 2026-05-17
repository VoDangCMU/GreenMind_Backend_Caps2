# 💳 Payment API — Tài Liệu Mobile

> **Base URL**: `https://<backend-domain>/api/payments`  
> **Auth**: Tất cả endpoints (trừ `/webhook`) đều cần `Authorization: Bearer <token>`

---

## API Endpoints

### 1. Lấy Thống Kê Thanh Toán

```
GET /payments/analytics?days=30
```

**Query Params:**

| Param | Type | Default | Mô tả |
|-------|------|---------|-------|
| `days` | number | `30` | Số ngày lấy dữ liệu (1–365) |

**Request:**
```http
GET /api/payments/analytics?days=30
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "message": "Payment analytics retrieved",
  "data": {
    "metrics": {
      "totalRevenue": 1500000,
      "totalTransactions": 42,
      "successRate": 95,
      "avgTransactionValue": 37500,
      "refundedAmount": 50000,
      "pendingAmount": 0
    },
    "revenueSeries": [
      { "date": "14/5", "revenue": 200000, "count": 5 },
      { "date": "15/5", "revenue": 350000, "count": 8 }
    ],
    "statusBreakdown": [
      { "status": "succeeded", "count": 40, "amount": 1500000 },
      { "status": "pending",   "count": 1,  "amount": 30000 },
      { "status": "failed",    "count": 1,  "amount": 50000 },
      { "status": "refunded",  "count": 1,  "amount": 50000 }
    ],
    "recentTransactions": [
      {
        "id": "ch_3Pxxx",
        "amount": 50000,
        "currency": "vnd",
        "status": "succeeded",
        "customer": "Nguyen Van A",
        "email": "a@example.com",
        "description": "GreenMind Premium",
        "createdAt": "2026-05-15T12:00:00.000Z"
      }
    ]
  }
}
```

> `amount` trả về đơn vị **xu (cents)** theo Stripe. VD: `50000` = 500.00 VND

---

### 2. Tạo Checkout Session

```
POST /payments/create-checkout
```

**Request Body:**

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `amount` | number | ✅ | Số tiền tính bằng **xu**. VD: `50000` = 500.00 VND |
| `currency` | string | ❌ | Default `"usd"`. Dùng `"vnd"` cho VN |
| `description` | string | ❌ | Tên sản phẩm hiển thị trên Stripe |
| `successUrl` | string | ✅ | URL/deep link khi thanh toán thành công |
| `cancelUrl` | string | ✅ | URL/deep link khi huỷ |

**Request:**
```http
POST /api/payments/create-checkout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 50000,
  "currency": "vnd",
  "description": "GreenMind Premium — 1 tháng",
  "successUrl": "greenmind://payment/success",
  "cancelUrl": "greenmind://payment/cancel"
}
```

**Response 200:**
```json
{
  "message": "Checkout session created",
  "data": {
    "url": "https://checkout.stripe.com/pay/cs_test_...",
    "sessionId": "cs_test_..."
  }
}
```

---

### 3. List Stripe Invoices (Subscription / Checkout)

```
GET /payments/stripe-invoices
```

Trả về danh sách invoice từ Stripe (subscription, one-time checkout). Tìm customer bằng email user.

**Request:**
```http
GET /api/payments/stripe-invoices
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "message": "Stripe invoices retrieved",
  "data": [
    {
      "id": "in_1Pxxx",
      "number": "INV-0001",
      "status": "paid",
      "amountDue": 50000,
      "amountPaid": 50000,
      "currency": "vnd",
      "description": "GreenMind Premium",
      "pdfUrl": "https://pay.stripe.com/invoice/...",
      "hostedUrl": "https://invoice.stripe.com/i/...",
      "createdAt": "2026-05-15T12:00:00.000Z",
      "dueDate": null
    }
  ]
}
```

**Invoice Status:**
| Status | Nghĩa |
|--------|-------|
| `paid` | Đã thanh toán |
| `open` | Chưa thanh toán, còn hạn |
| `draft` | Nháp, chưa gửi |
| `void` | Đã huỷ |
| `uncollectible` | Không thu được |

---

### 4. Thêm Thẻ (Add Card)

```
POST /payments/setup-intent
```

Tạo Stripe `SetupIntent` để mobile lưu thẻ mà không charge tiền ngay.  
Backend tự động **tìm hoặc tạo** Stripe Customer từ email user.

**Request:**
```http
POST /api/payments/setup-intent
Authorization: Bearer <access_token>
```
*(Không cần body)*

**Response 200:**
```json
{
  "message": "Setup intent created",
  "data": {
    "clientSecret": "seti_1Pxxx_secret_xxx",
    "customerId": "cus_xxx"
  }
}
```

**Mobile dùng `clientSecret` với Stripe SDK:**
```javascript
// React Native — cần cài @stripe/stripe-react-native
import { useStripe } from '@stripe/stripe-react-native';

const { initPaymentSheet, presentPaymentSheet } = useStripe();

// 1. Lấy clientSecret từ backend
const { data } = await api.post('/payments/setup-intent');
const { clientSecret } = data.data;

// 2. Init Payment Sheet ở mode setup (không charge tiền)
await initPaymentSheet({
  setupIntentClientSecret: clientSecret,
  merchantDisplayName: 'GreenMind',
});

// 3. Hiện UI nhập thẻ
const { error } = await presentPaymentSheet();
if (!error) {
  // Thẻ đã được lưu vào Stripe Customer
}
```

> Sau khi user lưu thẻ → Stripe lưu `PaymentMethod` vào Customer.  
> Lần sau charge có thể dùng `stripe.paymentIntents.create({ customer, payment_method: 'pm_xxx', confirm: true })`.

---

### 5. List Waste Bills (Hóa Đơn Rác Theo Tháng)

```
GET /payments/waste-bills?paid=false
```

Trả về danh sách hóa đơn rác **gom nhóm theo hộ gia đình + tháng**.  
Mỗi nhóm là một hóa đơn tháng bao gồm toàn bộ các lần thu gom trong tháng đó.

**Query Params:**

| Param | Giá trị | Mô tả |
|-------|---------|-------|
| `paid` | `true` / `false` | Lọc theo trạng thái. Không truyền = trả tất cả |

> `isPaid = true` khi **tất cả** lần thu gom trong tháng đều đã thanh toán.

**Request:**
```http
GET /api/payments/waste-bills?paid=false
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "message": "Waste bills retrieved",
  "data": [
    {
      "householdId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "year": 2026,
      "month": 5,
      "billName": "Hóa đơn thu gom rác - Tháng 5/2026",
      "total": 7500,
      "ratePerKg": 500,
      "dueDate": "2026-06-10",
      "isPaid": false,
      "recordCount": 3,
      "paidCount": 1,
      "lastPickedAt": "2026-05-28T14:30:00.000Z"
    },
    {
      "householdId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "year": 2026,
      "month": 4,
      "billName": "Hóa đơn thu gom rác - Tháng 4/2026",
      "total": 3000,
      "ratePerKg": 500,
      "dueDate": "2026-05-10",
      "isPaid": true,
      "recordCount": 2,
      "paidCount": 2,
      "lastPickedAt": "2026-04-25T09:00:00.000Z"
    }
  ]
}
```

**Giải thích fields:**

| Field | Mô tả |
|-------|-------|
| `householdId` | UUID của hộ gia đình |
| `year` / `month` | Năm / tháng của nhóm hóa đơn |
| `billName` | Tên hiển thị: `"Hóa đơn thu gom rác - Tháng M/YYYY"` |
| `total` | Tổng tiền cần thanh toán (VND) |
| `ratePerKg` | Đơn giá (luôn là `500 VND/kg`) |
| `dueDate` | Hạn thanh toán — luôn là **ngày 10 tháng tiếp theo** (`YYYY-MM-DD`) |
| `isPaid` | `true` khi tất cả lần thu gom đã trả |
| `recordCount` | Tổng số lần thu gom trong tháng |
| `paidCount` | Số lần thu gom đã thanh toán |
| `lastPickedAt` | Thời điểm thu gom gần nhất |

---

### 6. Thanh Toán Hóa Đơn Rác Theo Tháng

```
POST /payments/waste-checkout
```

Tạo Stripe Checkout Session để thanh toán **toàn bộ** hóa đơn rác của một hộ trong một tháng.  
Webhook Stripe tự động mark tất cả records trong nhóm là `isPaid = true` khi thanh toán thành công.

**Request Body:**

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `householdId` | string (uuid) | ✅ | ID hộ gia đình |
| `month` | integer (1–12) | ✅ | Tháng cần thanh toán |
| `year` | integer (≥ 2020) | ✅ | Năm cần thanh toán |
| `successUrl` | string | ✅ | URL redirect sau khi thanh toán thành công |
| `cancelUrl` | string | ✅ | URL redirect khi huỷ |

**Request:**
```http
POST /api/payments/waste-checkout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "householdId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "month": 5,
  "year": 2026,
  "successUrl": "greenmind://payment/success",
  "cancelUrl": "greenmind://payment/cancel"
}
```

**Response 200:**
```json
{
  "message": "Waste checkout session created",
  "data": {
    "url": "https://checkout.stripe.com/pay/cs_test_...",
    "sessionId": "cs_test_...",
    "billName": "Hóa đơn thu gom rác - Tháng 5/2026",
    "totalAmount": 7500,
    "totalMassKg": 15.0,
    "ratePerKg": 500,
    "recordCount": 3,
    "month": 5,
    "year": 2026
  }
}
```

**Response 400 — Thiếu / sai params:**
```json
{ "message": "householdId, month, year, successUrl and cancelUrl are required" }
```

```json
{ "message": "month must be a number between 1 and 12" }
```

**Response 404 — Không có record chưa thanh toán:**
```json
{
  "message": "No unpaid waste records found for household 3fa85f64-... in 5/2026"
}
```

**Sau khi Stripe thanh toán xong:**

Stripe gọi webhook `checkout.session.completed` → Backend tự động:
- Tìm tất cả records `isPaid = false` của `householdId` trong `month/year`
- Set `isPaid = true` và `paidAt = now()` cho **toàn bộ** nhóm

> VND là **zero-decimal currency** trong Stripe — `totalAmount` truyền trực tiếp, **không nhân 100**.

**Giải thích fields response:**

| Field | Mô tả |
|-------|-------|
| `url` | Redirect user đến URL này để thanh toán trên Stripe |
| `sessionId` | Stripe Checkout Session ID |
| `billName` | Tên hóa đơn hiển thị trên trang Stripe |
| `totalAmount` | Tổng tiền (VND) |
| `totalMassKg` | Tổng khối lượng rác (kg) trong tháng |
| `recordCount` | Số lần thu gom được gộp vào hóa đơn này |

---

## Cấu Hình Mobile

### Bước 1 — Hiển thị danh sách hóa đơn & mở thanh toán

```javascript
// React Native — flow hoàn chỉnh cho waste bill

// 1. Lấy danh sách hóa đơn chưa trả
const { data } = await api.get('/payments/waste-bills?paid=false');
const bills = data.data;
// bills[0] = { householdId, year, month, billName, total, dueDate, isPaid, ... }

// 2. Khi user bấm "Thanh toán" cho một tháng
const bill = bills[0];
const { data: checkout } = await api.post('/payments/waste-checkout', {
  householdId: bill.householdId,
  month: bill.month,
  year: bill.year,
  successUrl: 'greenmind://payment/success',
  cancelUrl: 'greenmind://payment/cancel',
});

// 3. Mở trang Stripe trong browser
await Linking.openURL(checkout.data.url);
```

> Không cần cài Stripe SDK phía mobile cho waste-checkout — chỉ cần mở URL.

---

### Bước 2 — Cấu Hình Deep Link

**React Native (Expo) — `app.json`:**
```json
{
  "expo": {
    "scheme": "greenmind",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [{ "scheme": "greenmind" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

**iOS — `Info.plist`:**
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>greenmind</string>
    </array>
  </dict>
</array>
```

---

### Bước 3 — Xử Lý Deep Link Callback

```javascript
import { Linking } from 'react-native';

useEffect(() => {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    if (url.startsWith('greenmind://payment/success')) {
      // Thanh toán thành công → navigate to success screen
      navigation.replace('PaymentSuccess');
    } else if (url.startsWith('greenmind://payment/cancel')) {
      // Người dùng huỷ
      navigation.goBack();
    }
  });

  return () => subscription.remove();
}, []);
```

---

### Xử Lý Lỗi

| HTTP Code | Nguyên nhân | Xử lý |
|-----------|------------|-------|
| `400` | Thiếu / sai `householdId`, `month`, `year`, `successUrl`, `cancelUrl` | Kiểm tra body |
| `401` | Sai / hết hạn token | Refresh token, đăng nhập lại |
| `404` | Không tìm thấy record chưa thanh toán trong tháng đó | Thông báo đã thanh toán hết hoặc chưa có rác |
| `500` | Lỗi Stripe API | Retry sau vài giây |
| `503` | Server chưa cấu hình Stripe | Liên hệ admin |

```javascript
try {
  const { data } = await api.post('/payments/waste-checkout', payload);
  await Linking.openURL(data.data.url);
} catch (error) {
  switch (error.response?.status) {
    case 400: return Alert.alert('Lỗi', error.response.data.message);
    case 401: return navigation.navigate('Login');
    case 404: return Alert.alert('Thông báo', 'Không có hóa đơn chưa thanh toán trong tháng này.');
    case 503: return Alert.alert('Lỗi', 'Thanh toán chưa khả dụng. Liên hệ hỗ trợ.');
    default:  return Alert.alert('Lỗi', 'Không thể tạo phiên thanh toán. Thử lại sau.');
  }
}
```

---

### Stripe Test Cards (Dev/Staging)

| Số thẻ | Kết quả |
|--------|---------|
| `4242 4242 4242 4242` | Thành công |
| `4000 0000 0000 0002` | Bị từ chối |
| `4000 0025 0000 3155` | Yêu cầu 3D Secure |
| `4000 0000 0000 9995` | Hết tiền |

> Dùng bất kỳ tháng/năm tương lai và CVC 3 số tùy ý.
