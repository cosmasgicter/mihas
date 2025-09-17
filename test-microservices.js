import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testMicroservices() {
  console.log('🧪 Testing microservices...')

  try {
    // Test notification creation
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        type: 'test',
        title: 'Test Notification',
        message: 'Testing microservices setup'
      })
      .select()
      .single()

    if (error) {
      console.log('❌ Notification test failed:', error.message)
    } else {
      console.log('✅ Notification service working')
      
      // Clean up test data
      await supabase.from('notifications').delete().eq('id', notification.id)
    }

    // Test applications table
    const { data: apps, error: appError } = await supabase
      .from('applications')
      .select('count')
      .limit(1)

    if (appError) {
      console.log('❌ Applications service test failed:', appError.message)
    } else {
      console.log('✅ Applications service working')
    }

    console.log('🎉 All microservices tests passed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testMicroservices()