import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
  // Increase timeout to 60s to accommodate longer AI responses
  timeout: 60000,
});

export default api;
