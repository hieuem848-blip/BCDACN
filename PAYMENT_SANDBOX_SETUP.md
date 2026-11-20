# Cấu hình thanh toán Sandbox cho HotelBooking-AI

## Phương thức được bật

- `SEPAY`: SePay Sandbox (chuyển khoản ngân hàng thử nghiệm).
- `ZALOPAY`: ZaloPay Sandbox.
- `CASH`: Thanh toán trực tiếp tại khách sạn (giữ cách hoạt động cũ).

Khách vãng lai vẫn được dùng `CASH`. SePay và ZaloPay yêu cầu người dùng đăng nhập để Backend gắn giao dịch với tài khoản và cho phép xem trạng thái thanh toán.

## 1. Cài dependencies

Tại thư mục `server`, chạy:

```powershell
npm install
```

Lệnh này cài `sepay-pg-node` (SDK Node.js chính thức) đã khai báo trong `server/package.json` và đồng bộ `server/package-lock.json`. Sau khi cập nhật dependency, không dùng `npm ci` với lockfile cũ trước khi đã chạy `npm install`.

## 2. Cấu hình `server/.env`

Sao chép `server/.env.example` thành `server/.env`, sau đó giữ nguyên các giá trị MongoDB/JWT/Google/Facebook/SMTP đang dùng và điền các biến thanh toán:

```env
SEPAY_MERCHANT_ID=MERCHANT_ID_SANDBOX
SEPAY_SECRET_KEY=MERCHANT_SECRET_KEY_SANDBOX
SEPAY_IPN_SECRET=IPN_SECRET_DO_BAN_TU_DAT
SEPAY_CHECKOUT_URL=https://pay-sandbox.sepay.vn/v1/checkout/init

ZALOPAY_APP_ID=APP_ID_SANDBOX
ZALOPAY_KEY1=KEY1_SANDBOX
ZALOPAY_KEY2=KEY2_SANDBOX
ZALOPAY_CALLBACK_URL=https://YOUR_NGROK_DOMAIN/api/payments/zalopay/callback
ZALOPAY_CREATE_URL=https://sb-openapi.zalopay.vn/v2/create
```

Không đưa `server/.env`, Merchant Secret, IPN Secret, ZaloPay Key1/Key2 hay ngrok Authtoken lên GitHub.

## 3. SePay Sandbox

1. Tạo/đăng nhập tài khoản tại https://my.sepay.vn/.
2. Vào Cổng thanh toán và kích hoạt môi trường Sandbox.
3. Sao chép Merchant ID và Secret Key Sandbox vào `.env`.
4. Chạy Backend và ngrok theo phần 5 để có URL HTTPS công khai.
5. Trong SePay, vào Cổng thanh toán → Cấu hình → IPN:
   - IPN URL: `https://YOUR_NGROK_DOMAIN/api/payments/sepay/ipn`
   - Auth Type: `SECRET_KEY`
   - Secret Key: nhập cùng giá trị `SEPAY_IPN_SECRET` trong `.env` (khác `SEPAY_SECRET_KEY`).
   - Content Type: `application/json`.
6. Lưu cấu hình. Backend xác thực header `X-Secret-Key`, mã hóa đơn, số tiền, tiền tệ và trạng thái giao dịch trước khi xác nhận Booking.

Checkout Sandbox mặc định: `https://pay-sandbox.sepay.vn/v1/checkout/init`.

## 4. ZaloPay Sandbox

1. Lấy App ID, Key1 và Key2 từ môi trường Sandbox/tài liệu Merchant của ZaloPay.
2. Điền `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2` trong `.env`.
3. Đặt `ZALOPAY_CALLBACK_URL` thành URL HTTPS công khai:
   `https://YOUR_NGROK_DOMAIN/api/payments/zalopay/callback`.
4. Endpoint tạo đơn Sandbox mặc định là `https://sb-openapi.zalopay.vn/v2/create`.

Backend tạo `app_trans_id` theo ngày Việt Nam, ký yêu cầu bằng Key1 và xác thực callback bằng Key2. Không đánh dấu thanh toán thành công chỉ dựa trên URL redirect.

## 5. Chạy local và tạo URL HTTPS bằng ngrok

Terminal 1, tại `server`:

```powershell
npm run dev
```

Terminal 2, chạy ngrok:

```powershell
ngrok http 5000
```

Lấy URL HTTPS ngrok, ví dụ `https://example.ngrok-free.app`, rồi thay `YOUR_NGROK_DOMAIN` trong cấu hình IPN SePay và callback ZaloPay. Giữ cả Backend và ngrok chạy trong lúc kiểm thử. Nếu ngrok đổi URL, cập nhật lại URL ở hai cổng.

## 6. Frontend

Terminal tại `client`:

```powershell
npm install
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173` và Backend tại `http://localhost:5000`.

## 7. Trạng thái Booking và điều kiện đánh giá

- Đặt bằng `CASH`: Booking được tạo `CONFIRMED`, Payment `PENDING`, Booking `paymentStatus=UNPAID` để thanh toán tại khách sạn.
- Đặt bằng SePay/ZaloPay: Booking tạo `PENDING_PAYMENT`, Payment `PENDING`.
- Chỉ IPN/callback có xác thực, đúng mã đơn và số tiền mới chuyển Payment sang `SUCCEEDED`, Booking sang `CONFIRMED`, `paymentStatus=PAID`.
- URL redirect không được dùng làm bằng chứng thanh toán thành công; trang `/payment/result` hỏi trạng thái từ Backend.
- Booking có trạng thái `CONFIRMED` hoặc `CHECKED_IN` sẽ tự chuyển sang `COMPLETED` từ ngày kế tiếp sau ngày `checkOut`, khi khách mở danh sách đặt phòng hoặc gửi đánh giá. Đơn `PENDING_PAYMENT` và `CANCELLED` không tự hoàn tất.
- Review API chỉ tạo đánh giá khi Booking đã `COMPLETED`; mỗi Booking chỉ được đánh giá một lần theo unique index hiện có.

## 8. API thanh toán

- `POST /api/payments/sepay/create` (đăng nhập)
- `POST /api/payments/sepay/ipn` (SePay gọi)
- `POST /api/payments/zalopay/create` (đăng nhập)
- `POST /api/payments/zalopay/callback` (ZaloPay gọi)
- `GET /api/payments/status/:bookingId` (đăng nhập)

Lưu ý: Đây là tích hợp Sandbox/demo. Trước khi Production cần dùng Merchant credentials chính thức, URL Production, quy trình hoàn tiền, hết hạn giữ phòng và kiểm thử bảo mật đầy đủ.
