# Cho phép khách chưa đăng nhập thanh toán SePay/ZaloPay

Patch này điều chỉnh luồng đặt phòng để khách chưa đăng nhập có thể:
- Tạo booking bằng họ tên, email, số điện thoại.
- Chọn SePay Sandbox hoặc ZaloPay Sandbox.
- Chọn thanh toán tại khách sạn (CASH) như trước.
- Được chuyển đến trang thanh toán và quay lại trang kết quả để backend kiểm tra trạng thái.

## Cách hoạt động bảo mật

Khi khách vãng lai tạo booking online, Backend tạo một chuỗi token ngẫu nhiên 256-bit. Backend chỉ lưu SHA-256 của token trong Payment; token gốc chỉ trả một lần cho trình duyệt. Frontend giữ token trong `sessionStorage`, gửi token qua header `X-Guest-Payment-Token` khi tạo giao dịch và kiểm tra trạng thái. Vì vậy API không dùng riêng `bookingId` làm quyền truy cập.

Khách đã đăng nhập vẫn tiếp tục dùng JWT như trước. IPN SePay và callback ZaloPay vẫn phải xác thực chữ ký/secret của nhà cung cấp, không phụ thuộc việc người đặt phòng có đăng nhập hay không.

## Các file thay đổi

### Frontend
- `client/src/components/booking/PaymentMethodSelect.jsx`
- `client/src/pages/Booking.jsx`
- `client/src/api/paymentApi.js`

### Backend
- `server/src/services/booking.service.js`
- `server/src/models/Payment.js`
- `server/src/controllers/payment.controller.js`
- `server/src/routes/payment.routes.js`
- `server/src/middleware/rateLimiter.js`
- `server/src/services/zalopayService.js`

Không cần xóa file nào và không cần sửa `server/.env` chỉ vì thay đổi này.

## Cách áp dụng

1. Giải nén patch.
2. Copy thư mục `client` và `server` trong patch vào đúng thư mục tương ứng của project, cho phép ghi đè các file cùng tên.
3. Không ghi đè `.env`.
4. Khởi động lại Backend và Frontend.

## Cách kiểm tra

1. Mở cửa sổ ẩn danh để chắc chắn chưa đăng nhập.
2. Chọn phòng, ngày ở và nhập họ tên, email, số điện thoại.
3. Chọn SePay Sandbox hoặc ZaloPay Sandbox; cả hai lựa chọn không còn bị khóa.
4. Nhấn tiếp tục thanh toán. Booking sẽ ở `PENDING_PAYMENT` cho đến khi IPN/callback có chữ ký hợp lệ.
5. Sau khi cổng thanh toán chuyển về website, trang kết quả dùng token đã lưu trong sessionStorage để hỏi Backend trạng thái giao dịch.
6. Thử lại bằng CASH để xác nhận thanh toán tại khách sạn vẫn hoạt động.

## Cấu hình môi trường

Giữ nguyên credential SePay/ZaloPay trong `server/.env` hiện tại. Vẫn cần đảm bảo:
- SePay IPN URL trỏ đúng `/api/payments/sepay/ipn` và Auth Type `SECRET_KEY`.
- ZaloPay callback URL trỏ đúng `/api/payments/zalopay/callback`.
- `CLIENT_URL` đúng địa chỉ frontend đang chạy.

Chưa thể xác nhận giao dịch Sandbox thực tế nếu chưa thực hiện trên tài khoản/credential của nhà cung cấp.
