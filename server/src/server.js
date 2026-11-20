import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { connectDatabase } from "./config/database.js";
import aiRoutes from "./routes/ai.routes.js";
import authRoutes from "./routes/auth.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import homepageRoutes from "./routes/homepage.routes.js";
import hotelRoutes from "./routes/hotel.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import userRoutes from "./routes/user.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(path.join(uploadsDir, "reviews"))) {
  fs.mkdirSync(path.join(uploadsDir, "reviews"), { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

app.get("/", (req, res) => res.json({ message: "Modern AI Hotel Booking API", status: "running" }));

app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "Server is healthy", timestamp: new Date() }),
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/homepage", homepageRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api", catalogRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payments", paymentRoutes);

app.use((err, req, res, next) => {
  const isDuplicate = err.code === 11000;
  const status = isDuplicate ? 409 : err.name === "ValidationError" ? 400 : err.status || 500;

  if (status >= 500 || isDuplicate) console.error(err);

  let duplicateMessage = "Dữ liệu đã tồn tại trong hệ thống.";
  if (isDuplicate) {
    if (err.keyPattern?.email || err.message?.includes("email_1")) {
      duplicateMessage = "Tài khoản hoặc email đã tồn tại.";
    } else if (err.keyPattern?.bookingCode || err.message?.includes("bookingCode_1")) {
      duplicateMessage = "Mã đơn đặt phòng đã tồn tại. Vui lòng thử lại.";
    } else if (err.keyPattern?.providerOrderId || err.message?.includes("providerOrderId")) {
      duplicateMessage = "Mã giao dịch thanh toán đã tồn tại. Vui lòng thử lại.";
    } else if (err.keyPattern?.code || err.message?.includes("code_1")) {
      duplicateMessage = "Mã ưu đãi đã tồn tại.";
    } else if (err.keyPattern?.bookingId || err.message?.includes("bookingId_1")) {
      duplicateMessage = "Đơn đặt phòng đã được ghi nhận trước đó.";
    }
  }

  // Lỗi bất ngờ (500 không có err.status) không lộ nội dung ra client
  const message = isDuplicate
    ? duplicateMessage
    : status < 500 || err.status
      ? err.message
      : "Internal server error";

  res.status(status).json({
    success: false,
    message,
    ...(err.retryAfter && { retryAfter: err.retryAfter }),
  });
});

const start = async () => {
  await connectDatabase();
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
};

start();
