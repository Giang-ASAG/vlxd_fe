/**
 * API Client utility for fetching data from the backend.
 * Uses native fetch with a simpler interface.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "https://vlxd-be.onrender.com/api";

async function request(endpoint, options = {}) {
  const { method = "GET", headers = {}, body, ...customConfig } = options;

  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...customConfig,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    
    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type");
    let data;

    // Check if response is JSON
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      // If not JSON, try to parse as text and throw error
      const text = await response.text();
      throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
    }

    if (response.ok) {
      return data;
    }

    // Handle API errors
    throw new Error(data.message || `API error: ${response.status}`);
  } catch (error) {
    console.error(`API Request Error [${method} ${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  get: (endpoint, config) => request(endpoint, { ...config, method: "GET" }),
  post: (endpoint, body, config) => request(endpoint, { ...config, method: "POST", body }),
  put: (endpoint, body, config) => request(endpoint, { ...config, method: "PUT", body }),
  patch: (endpoint, body, config) => request(endpoint, { ...config, method: "PATCH", body }),
  delete: (endpoint, config) => request(endpoint, { ...config, method: "DELETE" }),
};

export default api;


const HEALTH_URL = "https://vlxd-be.onrender.com/health"; // Nhớ check lại chữ 'heath' hay 'health' nha bạn
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 phút

let _pollTimer = null;

// Hàm kiểm tra khung giờ từ 7h - 21h (T2 - CN)
function isVNOfficeHours() {
  // Lấy giờ hiện tại ép theo múi giờ Việt Nam
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
    hour: "numeric"
  });

  const parts = formatter.formatToParts(new Date());
  const timeObj = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const hour = parseInt(timeObj.hour, 10);

  // Chạy từ 7h sáng đến trước 21h00 tối (21h01 là dừng)
  // Vì chạy suốt từ T2 đến CN nên không cần check biến ngày (day) nữa
  const isWorkingHour = hour >= 7 && hour < 21; 

  return isWorkingHour;
}

async function pingHealth() {
  // Nếu ngoài khung giờ 7h - 21h thì không ping
  if (!isVNOfficeHours()) {
    console.log(`[HealthPoller] ${new Date().toLocaleTimeString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'})} — Ngoài khung giờ (7h-21h), bỏ qua ping.`);
    return;
  }

  try {
    const res = await fetch(HEALTH_URL, { method: "GET" });
    console.log(`[HealthPoller] ${new Date().toLocaleTimeString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'})} — status: ${res.status}`);
  } catch (err) {
    console.warn("[HealthPoller] Ping thất bại:", err.message);
  }
}

export const healthPoller = {
  start() {
    if (_pollTimer) return; // Tránh khởi động 2 lần
    
    pingHealth(); // Gọi kiểm tra ngay lần đầu
    _pollTimer = setInterval(pingHealth, POLL_INTERVAL_MS);
    console.log("[HealthPoller] Đã bắt đầu, kiểm tra mỗi 5 phút (Chỉ ping từ 7h - 21h, T2 đến CN)");
  },
  stop() {
    if (_pollTimer) {
      clearInterval(_pollTimer);
      _pollTimer = null;
      console.log("[HealthPoller] Đã dừng");
    }
  },
};