import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://localhost:5223/api', 
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`; 
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Tự động văng ra ngoài nếu Token hết hạn (Lỗi 401)
api.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
    }
    return Promise.reject(error);
});