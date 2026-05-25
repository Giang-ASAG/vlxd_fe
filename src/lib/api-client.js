/**
 * API Client utility for fetching data from the backend.
 * Uses native fetch with a simpler interface.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "https://vlxd-be.onrender.com/api";

function formatApiError(data, status) {
  if (!data || typeof data !== "object") return `API error: ${status}`;

  if (data.errors && typeof data.errors === "object") {
    const parts = Object.entries(data.errors).map(([field, messages]) => {
      const text = Array.isArray(messages) ? messages.join(", ") : String(messages);
      return `${field}: ${text}`;
    });
    if (parts.length) return parts.join("; ");
  }

  if (data.error?.message) return data.error.message;
  if (typeof data.message === "string" && data.message) return data.message;
  if (data.title) return data.title;
  return `API error: ${status}`;
}

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

    const isJsonBody =
      contentType &&
      (contentType.includes("application/json") || contentType.includes("application/problem+json"));

    if (isJsonBody) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(text ? text.substring(0, 200) : `API error: ${response.status}`);
    }

    if (response.ok) {
      if (data && data.success === false) {
        throw new Error(formatApiError(data, response.status));
      }
      return data;
    }

    throw new Error(formatApiError(data, response.status));
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