import axios from "axios";
import { API_BASE_URL } from "../config";

// Read the token per request so login/logout and token changes keep their current behavior.
const apiClient = axios.create({ baseURL: API_BASE_URL });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token") || localStorage.getItem("userToken") || localStorage.getItem("partner_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export default apiClient;
