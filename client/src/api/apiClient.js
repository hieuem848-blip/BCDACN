import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

// Một số endpoint công khai vẫn được gọi trong tab đã từng đăng nhập.
// skipAuth=true đảm bảo token cũ trong localStorage không bị gửi kèm,
// tránh optionalAuthenticate hiểu nhầm khách vãng lai là tài khoản đã đăng nhập.
api.interceptors.request.use((config) => {
  const skipAuth = config.skipAuth === true;
  delete config.skipAuth;

  if (skipAuth) {
    if (typeof config.headers?.delete === "function") {
      config.headers.delete("Authorization");
      config.headers.delete("authorization");
    } else if (config.headers) {
      delete config.headers.Authorization;
      delete config.headers.authorization;
    }
    return config;
  }

  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
