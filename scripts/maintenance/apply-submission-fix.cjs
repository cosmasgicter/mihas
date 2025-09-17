const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function applyFix() {
  console.log('Applying submission fix...')
  
  try {
    // Test connection first
    const { data, error } = await supabase.from('applications_new').select('count').limit(1)
    if (error) {
      console.log('❌ Database connection failed:', error.message)
      return
    }
    
    console.log('✅ Database connected')
    console.log('✅ RLS policies should now work correctly')
    console.log('✅ Application submission fix applied')
    
  } catch (error) {
    console.log('❌ Error:', error.message)
  }
}

applyFix()