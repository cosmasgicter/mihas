import { apiClient } from './client'

export const notificationService = {
  send: (data: { userId: string; type: string; title: string; message: string; data?: any }) =>
    apiClient.request('/api/notifications?action=send', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  applicationSubmitted: (data: { applicationId: string; userId: string }) =>
    apiClient.request('/api/notifications?action=application-submitted', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}
