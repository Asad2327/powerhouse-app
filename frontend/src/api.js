import axios from 'axios';
import { getUser } from './utils/auth';

// ==========================
// 🔥 BASE URL (STRICT ENV)
// ==========================
const BASE_URL = import.meta.env.VITE_API_URL;

console.log("🔥 API URL:", BASE_URL);

// ❌ safety check (bohat important)
if (!BASE_URL) {
  console.error("❌ VITE_API_URL missing in .env");
}

// ==========================
// 🔥 AXIOS INSTANCE
// ==========================
const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 60000, // 🔥 prevent hanging requests
  headers: {
    "Content-Type": "application/json"
  }
});

// ==========================
// 🔥 REQUEST INTERCEPTOR
// ==========================
API.interceptors.request.use(
  (config) => {
    const user = getUser();

    if (user) {
      config.headers.role = user.role;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================
// 🔥 RESPONSE INTERCEPTOR
// ==========================
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const errorMessage =
      err?.response?.data?.msg ||
      err?.response?.data?.error ||
      err.message;

    console.error("🚀 API ERROR:", errorMessage);

    // 🔥 network error detect
    if (!err.response) {
      console.error("❌ Backend not reachable (check Railway URL)");
    }

    return Promise.reject(err);
  }
);

export default API;