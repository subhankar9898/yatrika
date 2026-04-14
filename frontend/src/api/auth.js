import api from './axios'

export const authApi = {
  register: (data) => api.post('/auth/register', data),

  verifyOtp: (data) => api.post('/auth/verify-otp', data),

  resendOtp: (data) => api.post('/auth/resend-otp', data),

  login: (data) => api.post('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  refresh: () => api.post('/auth/refresh'),

  registerGuide: (data) => api.post('/auth/register/guide', data),

  githubLogin: () => { window.location.href = '/api/v1/auth/github' },

  getMe: () => api.get('/auth/me'),

  updateProfile: (data) => api.put('/auth/me', data),
}
