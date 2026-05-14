/**
 * API Client utility for fetching data from the backend.
 * Uses native fetch with a simpler interface.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "https://vlxdbe-production.up.railway.app/api";

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
