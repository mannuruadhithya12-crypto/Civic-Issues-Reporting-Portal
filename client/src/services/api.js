import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL 
    ? (process.env.REACT_APP_API_URL.endsWith('/api') ? process.env.REACT_APP_API_URL : `${process.env.REACT_APP_API_URL.replace(/\/$/, '')}/api`) 
    : "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const dataMode = localStorage.getItem('dataMode') || 'live';
  if (dataMode === 'demo') {
    config.headers['X-Demo-Mode'] = 'demo';
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      error.message = 'The server request timed out. Please check backend status and try again.';
    }
    return Promise.reject(error);
  }
);

export default api;
