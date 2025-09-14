// Test script to verify continue application functionality
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function testContinueApplication() {
  console.log('Testing continue application functionality...')
  
  try {
    // Check if we have any draft applications
    const { data: draftApps, error } = await supabase
      .from('applications_new')
      .select('*')
      .eq('status', 'draft')
      .limit(5)
    
    if (error) {
      console.error('Error fetching draft applications:', error)
      return
    }
    
    console.log(`Found ${draftApps?.length || 0} draft applications`)
    
    if (draftApps && draftApps.length > 0) {
      console.log('Sample draft application:')
      const app = draftApps[0]
      console.log({
        id: app.id,
        user_id: app.user_id,
        full_name: app.full_name,
        program: app.program,
        status: app.status,
        created_at: app.created_at,
        has_result_slip: !!app.result_slip_url,
        has_pop: !!app.pop_url
      })
      
      // Check if this application has grades
      const { data: grades } = await supabase
        .from('application_grades')
        .select('*')
        .eq('application_id', app.id)
      
      console.log(`Application has ${grades?.length || 0} grades recorded`)
      
      // Determine what step this should be on
      let expectedStep = 1
      if (app.program && app.full_name) {
        expectedStep = 2
        if (grades && grades.length > 0 && app.result_slip_url) {
          expectedStep = 3
          if (app.pop_url) {
            expectedStep = 4
          }
        }
      }
      
      console.log(`Expected step for this application: ${expectedStep}`)
    }
    
    console.log('Continue application test completed successfully!')
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testContinueApplication()