import axios from 'axios';

const apiClient = axios.create({
  // 🚀 PRODUCTION URL 
  baseURL: 'https://bharatpath-backend-72uc.onrender.com/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export default apiClient;
