import { apiConfig } from '../lib/apiConfig'

export class MCPService {
  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${apiConfig.baseURL}/api/mcp/${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`MCP API error: ${response.statusText}`)
    }

    return response.json()
  }

  static async query(sql: string, params?: any[]) {
    return this.makeRequest('query', {
      method: 'POST',
      body: JSON.stringify({ sql, params }),
    })
  }

  static async getSchema() {
    return this.makeRequest('schema')
  }

  static async getTableInfo(tableName: string) {
    return this.makeRequest(`schema?table=${encodeURIComponent(tableName)}`)
  }
}