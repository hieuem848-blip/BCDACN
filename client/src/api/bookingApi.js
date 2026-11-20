import api from "./apiClient";

// Công khai (khách vãng lai dùng được)
export const getBookingQuote = async (params) => (await api.get("/bookings/quote", { params })).data;

export const lookupBooking = async (params) => (await api.get("/bookings/lookup", { params })).data;

// skipAuth=true khi khách đặt với tư cách vãng lai.
// Khi đăng nhập, giữ JWT để Booking được gắn với userId như bình thường.
export const createBooking = async (data, { skipAuth = false } = {}) =>
  (await api.post("/bookings", data, skipAuth ? { skipAuth: true } : {})).data;

// Cần đăng nhập
export const getMyBookings = async () => (await api.get("/bookings/my")).data;

export const getBooking = async (id) => (await api.get(`/bookings/${id}`)).data;

export const cancelBooking = async (id) => (await api.post(`/bookings/${id}/cancel`)).data;

export const getAllBookings = async () => (await api.get("/bookings/admin/all")).data;
