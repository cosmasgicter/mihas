import { apiClient } from './client'

export const documentService = {
  upload: (data: { fileName: string; fileData: any; documentType: string; applicationId: string }) =>
    apiClient.request('/api/documents/upload', {
      method: 'POST',
      body: JSON.stringify(data)
    })
}
