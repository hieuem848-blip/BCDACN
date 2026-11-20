import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    // null: giao dịch của khách vãng lai (thanh toán tại khách sạn hoặc online)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    // SHA-256 token cho khách vãng lai thanh toán online; không lưu token gốc.
    guestPaymentTokenHash: { type: String, select: false },
    amount: { type: Number, required: true, min: 0 },
    method: {
      // Giữ STRIPE/MOCK để tương thích các bản ghi cũ; luồng mới chỉ tạo CASH/SEPAY/ZALOPAY.
      type: String,
      enum: ["CASH", "SEPAY", "ZALOPAY", "STRIPE", "MOCK"],
      default: "CASH",
    },
    status: { type: String, enum: ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"], default: "PENDING", index: true },
    providerOrderId: { type: String, trim: true },
    providerRequestId: { type: String, trim: true },
    providerTransactionId: { type: String, trim: true, default: "" },
    providerResponseCode: { type: String, trim: true, default: "" },
    providerMessage: { type: String, trim: true, default: "" },
    gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: undefined },
    expiresAt: Date,
    paidAt: Date,
    // Dữ liệu cũ của Stripe vẫn được giữ để không làm hỏng bản ghi hiện có.
    stripePaymentIntentId: { type: String, trim: true },
  },
  { timestamps: true, collection: "payments" },
);

paymentSchema.index({ stripePaymentIntentId: 1 }, {
  unique: true,
  partialFilterExpression: { stripePaymentIntentId: { $type: "string", $gt: "" } },
});
paymentSchema.index({ method: 1, providerOrderId: 1 }, {
  unique: true,
  partialFilterExpression: { providerOrderId: { $type: "string", $gt: "" } },
});

export default mongoose.model("Payment", paymentSchema);
