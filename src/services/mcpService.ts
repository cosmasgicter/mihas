import { supabase } from '../lib/supabase'

export class MCPService {
  private static async makeRequest(action: string, options: RequestInit = {}) {
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Authentication required')
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-operations?action=${action}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
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
    return this.makeRequest('schema', {
      method: 'POST',
      body: JSON.stringify({ table: tableName }),
    })
  }
}