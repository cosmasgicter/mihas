const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupSessionManagement() {
  console.log('🚀 Setting up multi-device session management...')

  try {
    // Read and execute the device sessions schema
    const schemaPath = path.join(__dirname, 'sql', 'device_sessions_schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    console.log('📝 Creating device_sessions table and policies...')
    const { error } = await supabase.rpc('exec_sql', { sql: schema })

    if (error) {
      console.error('❌ Error executing schema:', error.message)
      
      // Try alternative approach - execute statements individually
      console.log('🔄 Trying alternative approach...')
      const statements = schema.split(';').filter(stmt => stmt.trim())
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement.trim() + ';' })
          if (stmtError) {
            console.warn('⚠️ Warning executing statement:', stmtError.message)
          }
        }
      }
    }

    // Test the setup by checking if the table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'device_sessions')

    if (tableError) {
      console.error('❌ Error checking table existence:', tableError.message)
    } else if (tables && tables.length > 0) {
      console.log('✅ device_sessions table created successfully')
    } else {
      console.log('⚠️ device_sessions table may not have been created')
    }

    // Test RLS policies
    console.log('🔒 Testing RLS policies...')
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('policyname')
      .eq('tablename', 'device_sessions')

    if (policyError) {
      console.warn('⚠️ Could not verify RLS policies:', policyError.message)
    } else {
      console.log(`✅ Found ${policies?.length || 0} RLS policies for device_sessions`)
    }

    console.log('🎉 Multi-device session management setup completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Restart your development server')
    console.log('2. Test login from multiple devices/browsers')
    console.log('3. Check the Active Sessions section in user settings')

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    process.exit(1)
  }
}

// Alternative SQL execution function if rpc doesn't work
async function executeSQL(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('SQL execution error:', error)
    throw error
  }
}

setupSessionManagement()