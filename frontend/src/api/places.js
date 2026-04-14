import api from './axios'

export const placesApi = {
  getAll: (params) => api.get('/places', { params }),
  getById: (id) => api.get(`/places/${id}`),
  getGuides: (placeId) => api.get(`/places/${placeId}/guides`),
  getFilterOptions: () => api.get('/places/filters/options'),

  // Admin only
  create: (data) => api.post('/admin/places', data),
  update: (id, data) => api.put(`/admin/places/${id}`, data),
  delete: (id) => api.delete(`/admin/places/${id}`),
  assignGuide: (placeId, guideId) =>
    api.post(`/admin/places/${placeId}/assign-guide?guide_id=${guideId}`),
}
