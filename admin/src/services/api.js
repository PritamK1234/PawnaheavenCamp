import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  verify: () => api.get('/auth/verify'),
};

// Property APIs
export const propertyAPI = {
  getAll: () => api.get('/properties/list'),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties/create', data),
  update: (id, data) => api.put(`/properties/update/${id}`, data),
  delete: (id) => api.delete(`/properties/delete/${id}`),
  toggleStatus: (id, field, value) =>
    api.patch(`/properties/toggle-status/${id}`, { field, value }),
  uploadImage: (formData) => api.post('/properties/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getCategorySettings: () => api.get('/properties/settings/categories'),
  updateCategorySettings: (category, data) => api.put(`/properties/settings/categories/${category}`, data),
};

export default api;
