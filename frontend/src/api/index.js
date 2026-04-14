import api from './axios'

export const guidesApi = {
  getSlots: (guideId, params) => api.get(`/guides/${guideId}/slots`, { params }),
  getProfile: (guideId) => api.get(`/guides/${guideId}`),
  getMyProfile: () => api.get('/guides/me'),
  updateMyProfile: (data) => api.put('/guides/me', data),
  getMyBookings: () => api.get('/guides/me/bookings'),
  respondBooking: (bookingId, data) => api.put(`/bookings/${bookingId}/respond`, data),
  getMySlots: () => api.get('/guides/me/slots'),
  createSlot: (data) => api.post('/guides/me/slots', data),
  updateSlot: (slotId, data) => api.put(`/guides/me/slots/${slotId}`, data),
  deleteSlot: (slotId) => api.delete(`/guides/me/slots/${slotId}`),
  submitPlaceRequest: (data) => api.post('/guides/place-requests', data),
  getAssignmentRequests: () => api.get('/guides/me/assignment-requests'),
  requestAssignment: (data) => api.post('/guides/me/assignment-requests', data),
  getMyRatings: () => api.get('/guides/me/ratings'),
  requestProfileOtp: () => api.post('/guides/me/profile-otp'),
  verifyProfileOtp: (data) => api.post('/guides/me/verify-profile-otp', data),
}

export const bookingsApi = {
  create: (data) => api.post('/bookings', data),
  getMine: () => api.get('/bookings/mine'),
  cancel: (bookingId) => api.delete(`/bookings/${bookingId}`),
  startTour: (bookingId, code) => api.put(`/bookings/${bookingId}/start`, { code }),
  completeTour: (bookingId) => api.put(`/bookings/${bookingId}/complete`),
}

export const ratingsApi = {
  submit: (data) => api.post('/ratings', data),
}

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getPendingGuides: (params) => api.get('/admin/guides/pending', { params }),
  reviewGuide: (id, data) => api.put(`/admin/guides/${id}/approve`, data),
  updateGuide: (id, data) => api.put(`/admin/guides/${id}`, data),
  getPlaceRequests: (params) => api.get('/admin/place-requests', { params }),
  reviewPlaceRequest: (id, data) => api.put(`/admin/place-requests/${id}/review`, data),
  getAnomalies: () => api.get('/admin/anomalies'),
  getBookings: (params) => api.get('/admin/bookings', { params }),
  getAssignmentRequests: (params) => api.get('/admin/guide-assignment-requests', { params }),
  reviewAssignmentRequest: (id, data) => api.put(`/admin/guide-assignment-requests/${id}/review`, data),
}
