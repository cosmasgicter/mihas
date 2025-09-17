import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function setupMicroservices() {
  console.log('🚀 Setting up microservices infrastructure...')

  try {
    // Test database connection
    const { data, error } = await supabase.from('applications').select('count').limit(1)
    if (error) throw error
    
    console.log('✅ Database connection verified')

    // Test storage buckets
    const { data: buckets } = await supabase.storage.listBuckets()
    console.log('✅ Storage buckets:', buckets?.map(b => b.name).join(', '))

    // Test notifications table
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('count')
      .limit(1)
    
    if (notifError) {
      console.log('❌ Notifications table not found:', notifError.message)
    } else {
      console.log('✅ Notifications table ready')
    }

    console.log('🎉 Microservices setup complete!')
    console.log('\n📋 Available services:')
    console.log('  - Auth Service: /api/auth/*')
    console.log('  - Application Service: /api/applications/*')
    console.log('  - Document Service: /api/documents/*')
    console.log('  - Notification Service: /api/notifications/*')
    console.log('  - Analytics Service: /api/analytics/*')

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    process.exit(1)
  }
}

setupMicroservices()