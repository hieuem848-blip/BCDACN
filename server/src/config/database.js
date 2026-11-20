import mongoose from "mongoose";

const syncPaymentIndexes = async () => {
  try {
    const paymentColl = mongoose.connection.db.collection("payments");
    const indexes = await paymentColl.indexes();

    if (indexes.some((i) => i.name === "providerOrderId_1")) {
      await paymentColl.dropIndex("providerOrderId_1");
      console.log("Đã dọn dẹp index cũ providerOrderId_1 trên collection payments");
    }

    if (indexes.some((i) => i.name === "stripePaymentIntentId_1" && i.sparse && !i.partialFilterExpression)) {
      await paymentColl.dropIndex("stripePaymentIntentId_1");
      console.log("Đã dọn dẹp index cũ stripePaymentIntentId_1 trên collection payments");
    }
  } catch (err) {
    console.warn("Lưu ý kiểm tra index database:", err.message);
  }
};

export const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    await syncPaymentIndexes();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};
