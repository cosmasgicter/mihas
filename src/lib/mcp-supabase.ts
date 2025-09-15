import { supabase } from './supabase'

export class SupabaseMCPClient {
  private static instance: SupabaseMCPClient
  
  static getInstance(): SupabaseMCPClient {
    if (!SupabaseMCPClient.instance) {
      SupabaseMCPClient.instance = new SupabaseMCPClient()
    }
    return SupabaseMCPClient.instance
  }

  async query(sql: string, params?: any[]) {
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: sql,
        parameters: params || []
      })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('MCP Supabase query error:', error)
      throw error
    }
  }

  async getSchema() {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
    
    if (error) throw error
    return data
  }

  async getTableInfo(tableName: string) {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', tableName)
    
    if (error) throw error
    return data
  }
}

export const mcpSupabase = SupabaseMCPClient.getInstance()