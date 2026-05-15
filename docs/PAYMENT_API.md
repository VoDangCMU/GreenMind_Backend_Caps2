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

### 5. List Waste Bills (Hóa Đơn Rác)

```
GET /payments/waste-bills?paid=false&page=1&limit=20
```

Trả về danh sách hóa đơn rác đã được thu gom (`status = picked_up`), tính tiền theo `totalMassKg × 500 VND`.

**Query Params:**

| Param | Giá trị | Mô tả |
|-------|---------|-------|
| `paid` | `true` / `false` | Lọc theo trạng thái thanh toán. Không truyền = tất cả |
| `page` | number | Default `1` |
| `limit` | number | Default `20`, tối đa `50` |

**Response 200:**
```json
{
  "message": "Waste bills retrieved",
  "data": [
    {
      "id": "uuid",
      "householdId": "uuid",
      "totalMassKg": 5.2,
      "billAmount": 2600,
      "ratePerKg": 500,
      "isPaid": false,
      "paidAt": null,
      "pickedUpAt": "2026-05-15T10:00:00.000Z",
      "collectorId": "uuid",
      "status": "picked_up"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 8, "totalPages": 1 }
}
```

---

### 6. Thanh Toán Waste Bill

```
POST /payments/waste-checkout
```

Tạo Stripe Checkout Session để thanh toán một hóa đơn rác cụ thể.

**Request Body:**

| Field | Type | Required | Mô tả |
|-------|------|----------|-------|
| `wasteDetectionId` | string (uuid) | ✅ | ID của waste detection record |
| `successUrl` | string | ✅ | URL redirect sau khi thanh toán thành công |
| `cancelUrl` | string | ✅ | URL redirect khi huỷ |

**Request:**
```http
POST /api/payments/waste-checkout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "wasteDetectionId": "uuid",
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
    "billAmount": 2600,
    "totalMassKg": 5.2,
    "ratePerKg": 500
  }
}
```

**Validation — Backend tự kiểm tra:**
- `status` phải là `picked_up`
- `isPaid` phải là `false` (chưa thanh toán)
- `totalMassKg` phải có giá trị

**Sau khi Stripe thanh toán xong:**

Stripe gọi webhook `checkout.session.completed` → Backend tự động:
- Set `isPaid = true`
- Set `paidAt = now()`

> VND là **zero-decimal currency** trong Stripe — `billAmount` truyền trực tiếp, **không nhân 100**.

---

## Cấu Hình Mobile

### Bước 1 — Gọi API & Mở URL

```javascript
// React Native
const { data } = await api.post('/payments/create-checkout', {
  amount: 50000,
  currency: 'vnd',
  description: 'GreenMind Premium',
  successUrl: 'greenmind://payment/success',
  cancelUrl: 'greenmind://payment/cancel',
});

// Mở trang Stripe trong browser
await Linking.openURL(data.data.url);
```

> Không cần cài Stripe SDK phía mobile — chỉ cần mở URL.

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
| `400` | Thiếu `amount`, `successUrl`, `cancelUrl` | Kiểm tra body |
| `401` | Sai / hết hạn token | Refresh token, đăng nhập lại |
| `500` | Lỗi Stripe API | Retry sau vài giây |
| `503` | Server chưa cấu hình Stripe | Liên hệ admin |

```javascript
try {
  const { data } = await api.post('/payments/create-checkout', payload);
  await Linking.openURL(data.data.url);
} catch (error) {
  switch (error.response?.status) {
    case 401: return navigation.navigate('Login');
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
