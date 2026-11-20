import { CalendarDays, CheckCircle2, CreditCard, MapPin, Star, Wallet, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cancelBooking, getMyBookings } from "../api/bookingApi";
import { createSePayPayment, createZaloPayPayment, redirectToPayment } from "../api/paymentApi";
import { createReview, getMyReviews } from "../api/reviewApi";
import ReviewForm from "../components/ReviewForm";
import { BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "../utils/booking";

const money = (n) => new Intl.NumberFormat("vi-VN").format(n || 0);
const fmt = (date) => new Date(date).toLocaleDateString("vi-VN");

const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700",
  PENDING_PAYMENT: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  CHECKED_IN: "bg-indigo-50 text-indigo-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-600",
};

function Bookings() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [reviewing, setReviewing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const result = await getMyBookings();
      setData(result.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách đặt phòng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getMyReviews()
      .then((result) => {
        const ids = (result.data || []).map((review) => String(review.bookingId?._id ?? review.bookingId));
        setReviewedIds(new Set(ids));
      })
      .catch(() => {
        // Backend vẫn chặn đánh giá trùng nếu không tải được danh sách review.
      });
  }, []);

  const payAgain = async (booking, method) => {
    try {
      setBusyId(booking._id);
      setError("");
      const createPayment = method === "SEPAY" ? createSePayPayment : createZaloPayPayment;
      const result = await createPayment(booking._id);
      redirectToPayment(result.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Không thể khởi tạo thanh toán. Vui lòng thử lại.");
      setBusyId("");
    }
  };

  const handleCancel = async (booking) => {
    const accepted = window.confirm(`Bạn có chắc muốn hủy đơn ${booking.bookingCode}?`);
    if (!accepted) return;

    try {
      setBusyId(booking._id);
      setError("");
      await cancelBooking(booking._id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể hủy đơn đặt phòng.");
    } finally {
      setBusyId("");
    }
  };

  const closeReviewForm = () => {
    setReviewing(null);
    setReviewError("");
  };

  const handleSubmitReview = async (values) => {
    try {
      setSubmitting(true);
      setReviewError("");
      await createReview({ bookingId: reviewing._id, ...values });
      setReviewedIds((previous) => new Set(previous).add(String(reviewing._id)));
      setReviewing(null);
    } catch (err) {
      setReviewError(err.response?.data?.message || "Không thể gửi đánh giá. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Đơn đặt phòng của tôi</h1>
      <p className="mt-2 text-slate-500">Theo dõi trạng thái, thanh toán và đánh giá các kỳ lưu trú của bạn.</p>

      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="mt-8 space-y-4">
          {[1, 2].map((index) => <div key={index} className="h-48 animate-pulse rounded-2xl bg-white" />)}
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {data.map((booking) => {
            const statusLabel = BOOKING_STATUS_LABELS[booking.status] || booking.status;
            const statusStyle = STATUS_STYLES[booking.status] || "bg-slate-100 text-slate-600";
            const alreadyReviewed = reviewedIds.has(String(booking._id));

            return (
              <article key={booking._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 md:flex-row">
                  {booking.hotelId?.images?.[0]?.url ? (
                    <img src={booking.hotelId.images[0].url} alt={booking.hotelId?.name || "Khách sạn"} className="h-40 w-full rounded-xl object-cover md:w-56" />
                  ) : (
                    <div className="h-40 w-full rounded-xl bg-slate-100 md:w-56" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-blue-600">{booking.bookingCode}</p>
                        <h2 className="mt-1 text-xl font-bold text-slate-900">{booking.hotelId?.name || "Khách sạn"}</h2>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}>{statusLabel}</span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">{booking.roomTypeId?.name}</p>

                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <span className="flex items-center gap-2"><CalendarDays size={16} />{fmt(booking.checkIn)} → {fmt(booking.checkOut)}</span>
                      <span className="flex items-center gap-2"><MapPin size={16} />{booking.hotelId?.address?.city || ""}</span>
                    </div>

                    <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs text-slate-400">Tổng tiền · {PAYMENT_STATUS_LABELS[booking.paymentStatus] || booking.paymentStatus}</p>
                        <b className="text-xl text-slate-900">{money(booking.totalAmount)}đ</b>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {booking.status === "PENDING_PAYMENT" && booking.paymentStatus !== "PAID" && (
                          <>
                            <button type="button" disabled={busyId === booking._id} onClick={() => payAgain(booking, "SEPAY")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                              <CreditCard size={16} />SePay
                            </button>
                            <button type="button" disabled={busyId === booking._id} onClick={() => payAgain(booking, "ZALOPAY")} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                              <Wallet size={16} />ZaloPay
                            </button>
                          </>
                        )}

                        {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && booking.paymentStatus !== "PAID" && (
                          <button type="button" disabled={busyId === booking._id} onClick={() => handleCancel(booking)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50">
                            <XCircle size={16} />Hủy đơn
                          </button>
                        )}

                        {booking.status === "COMPLETED" && (
                          alreadyReviewed ? (
                            <Link to="/reviews" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                              <Star size={16} />Đã đánh giá
                            </Link>
                          ) : (
                            <button type="button" onClick={() => setReviewing(booking)} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">
                              <Star size={16} />Viết đánh giá
                            </button>
                          )
                        )}

                        <Link to={`/hotels/${booking.hotelId?.slug}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
                          Xem khách sạn
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !data.length && (
        <div className="mt-10 rounded-2xl bg-white p-12 text-center">
          <CheckCircle2 className="mx-auto text-slate-300" />
          <p className="mt-3 text-slate-500">Bạn chưa có đơn đặt phòng.</p>
          <Link to="/hotels" className="mt-4 inline-block text-blue-600">Khám phá khách sạn</Link>
        </div>
      )}

      {reviewing && (
        <ReviewForm
          hotelName={reviewing.hotelId?.name}
          submitting={submitting}
          error={reviewError}
          onSubmit={handleSubmitReview}
          onClose={closeReviewForm}
        />
      )}
    </div>
  );
}

export default Bookings;
