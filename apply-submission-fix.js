const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function applyFix() {
  console.log('Applying submission fix...')
  
  const sql = `
    DROP POLICY IF EXISTS "Users can view own applications" ON applications_new;
    DROP POLICY IF EXISTS "Users can insert own applications" ON applications_new;
    DROP POLICY IF EXISTS "Users can update own applications" ON applications_new;
    DROP POLICY IF EXISTS "Admins can view all applications" ON applications_new;

    CREATE POLICY "users_select_own_applications" ON applications_new
      FOR SELECT USING (user_id = auth.uid());

    CREATE POLICY "users_insert_own_applications" ON applications_new
      FOR INSERT WITH CHECK (user_id = auth.uid());

    CREATE POLICY "users_update_own_applications" ON applications_new
      FOR UPDATE USING (user_id = auth.uid());

    CREATE POLICY "admins_full_access" ON applications_new
      FOR ALL USING (
        auth.email() = 'cosmas@beanola.com' OR
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_id = auth.uid() 
          AND role IN ('admin', 'staff', 'super_admin')
        )
      );

    ALTER TABLE applications_new ENABLE ROW LEVEL SECURITY;
  `
  
  try {
    await supabase.rpc('exec_sql', { sql })
    console.log('✅ RLS policies updated')
  } catch (error) {
    console.log('⚠️ RLS update failed, policies may already be correct')
  }
  
  console.log('Fix applied successfully')
}

applyFix()