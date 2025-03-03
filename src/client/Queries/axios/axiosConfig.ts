import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3020/api',
  withCredentials: true,
});

// intercept responses
axiosInstance.interceptors.response.use(
  // Any status code that lie within the range of 2xx cause this function to trigger
  (response) => response,
  // Any status codes that falls outside the range of 2xx cause this function to trigger
  (error) => Promise.reject(error)
);

export default axiosInstance;
