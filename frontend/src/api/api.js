import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
  // Reduce timeout to 30s for better UX
  timeout: 30000,
});

export default api;
