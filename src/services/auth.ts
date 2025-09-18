import { apiClient } from './client'

interface RegisterData {
  email: string
  password: string
  fullName: string
}

interface LoginData {
  email: string
  password: string
}

export const authService = {
  register: (data: RegisterData) =>
    apiClient.request('/api/auth?action=register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  login: (data: LoginData) =>
    apiClient.request('/api/auth?action=login', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  signin: (data: LoginData) =>
    apiClient.request('/api/auth?action=signin', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}
