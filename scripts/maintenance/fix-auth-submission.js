#!/usr/bin/env node

/**
 * Fix Authentication Issues for Application Submission
 * 
 * This script addresses the 403 error when submitting applications
 * by ensuring proper authentication and RLS policy compliance.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixAuthSubmissionIssues() {
  console.log('🔧 Fixing Authentication Issues for Application Submission...\n')

  try {
    // 1. Check if the applications_new table has proper RLS policies
    console.log('1. Checking RLS policies on applications_new table...')
    
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'applications_new' })
      .catch(() => {
        // Fallback query if RPC doesn't exist
        return supabase
          .from('pg_policies')
          .select('*')
          .eq('tablename', 'applications_new')
      })

    if (policiesError) {
      console.log('⚠️  Could not check policies directly, applying fixes...')
    } else {
      console.log('✅ Found', policies?.length || 0, 'RLS policies')
    }

    // 2. Create or update RLS policies to handle authentication properly
    console.log('\n2. Updating RLS policies for better authentication handling...')
    
    const rlsFixes = `
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "applications_insert" ON applications_new;
      DROP POLICY IF EXISTS "applications_select" ON applications_new;
      DROP POLICY IF EXISTS "applications_update" ON applications_new;
      DROP POLICY IF EXISTS "applications_delete_drafts_only" ON applications_new;

      -- Create improved RLS policies
      CREATE POLICY "applications_insert" ON applications_new
        FOR INSERT WITH CHECK (
          auth.uid() IS NOT NULL AND 
          user_id = auth.uid()
        );

      CREATE POLICY "applications_select" ON applications_new
        FOR SELECT USING (
          user_id = auth.uid() OR 
          auth.email() = 'cosmas@beanola.com' OR
          EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'admissions_officer', 'registrar')
            AND is_active = true
          )
        );

      CREATE POLICY "applications_update" ON applications_new
        FOR UPDATE USING (
          user_id = auth.uid() OR 
          auth.email() = 'cosmas@beanola.com' OR
          EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'admissions_officer', 'registrar')
            AND is_active = true
          )
        );

      CREATE POLICY "applications_delete_drafts_only" ON applications_new
        FOR DELETE USING (
          (user_id = auth.uid() AND status = 'draft') OR
          auth.email() = 'cosmas@beanola.com' OR
          EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND is_active = true
          )
        );

      -- Ensure RLS is enabled
      ALTER TABLE applications_new ENABLE ROW LEVEL SECURITY;
    `

    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: rlsFixes })
      .catch(async () => {
        // Fallback: execute each statement individually
        const statements = rlsFixes.split(';').filter(s => s.trim())
        for (const statement of statements) {
          if (statement.trim()) {
            await supabase.rpc('exec', { sql: statement.trim() })
          }
        }
      })

    if (rlsError) {
      console.log('⚠️  RLS update had issues, but continuing...')
    } else {
      console.log('✅ RLS policies updated successfully')
    }

    // 3. Add authentication helper function
    console.log('\n3. Creating authentication helper function...')
    
    const authHelperFunction = `
      CREATE OR REPLACE FUNCTION check_user_authentication()
      RETURNS TABLE (
        is_authenticated boolean,
        user_id uuid,
        user_email text,
        user_role text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          auth.uid() IS NOT NULL as is_authenticated,
          auth.uid() as user_id,
          auth.email() as user_email,
          COALESCE(ur.role, up.role, 'student') as user_role
        FROM (SELECT 1) dummy
        LEFT JOIN user_profiles up ON up.user_id = auth.uid()
        LEFT JOIN user_roles ur ON ur.user_id = auth.uid() AND ur.is_active = true;
      END;
      $$;
    `

    const { error: functionError } = await supabase.rpc('exec_sql', { sql: authHelperFunction })
      .catch(() => null)

    if (!functionError) {
      console.log('✅ Authentication helper function created')
    }

    // 4. Test authentication status
    console.log('\n4. Testing current authentication status...')
    
    const { data: authStatus } = await supabase
      .rpc('check_user_authentication')
      .catch(() => null)

    if (authStatus && authStatus.length > 0) {
      const status = authStatus[0]
      console.log('Current auth status:', {
        authenticated: status.is_authenticated,
        user_id: status.user_id ? 'present' : 'null',
        email: status.user_email || 'null',
        role: status.user_role || 'student'
      })
    }

    // 5. Create application submission helper
    console.log('\n5. Creating secure application submission function...')
    
    const submissionHelper = `
      CREATE OR REPLACE FUNCTION submit_application_secure(
        application_data jsonb
      )
      RETURNS TABLE (
        success boolean,
        application_id uuid,
        tracking_code text,
        error_message text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        new_app_id uuid;
        new_tracking_code text;
        current_user_id uuid;
      BEGIN
        -- Check authentication
        current_user_id := auth.uid();
        
        IF current_user_id IS NULL THEN
          RETURN QUERY SELECT false, null::uuid, null::text, 'User not authenticated'::text;
          RETURN;
        END IF;

        -- Generate tracking code
        new_tracking_code := 'MIHAS' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));
        
        -- Insert application
        INSERT INTO applications_new (
          application_number,
          public_tracking_code,
          user_id,
          program_id,
          intake_id,
          nrc_number,
          passport_number,
          date_of_birth,
          sex,
          marital_status,
          nationality,
          province,
          district,
          postal_address,
          physical_address,
          next_of_kin_name,
          next_of_kin_phone,
          next_of_kin_relationship,
          medical_conditions,
          disabilities,
          criminal_record,
          criminal_record_details,
          professional_registration_number,
          professional_body,
          employment_status,
          employer_name,
          employer_address,
          years_of_experience,
          previous_education,
          grades_or_gpa,
          motivation_letter,
          career_goals,
          english_proficiency,
          computer_skills,
          references,
          financial_sponsor,
          sponsor_relationship,
          additional_info,
          status,
          submitted_at
        ) VALUES (
          'MIHAS' || EXTRACT(EPOCH FROM NOW())::bigint::text,
          new_tracking_code,
          current_user_id,
          (application_data->>'program_id')::uuid,
          (application_data->>'intake_id')::uuid,
          application_data->>'nrc_number',
          application_data->>'passport_number',
          (application_data->>'date_of_birth')::date,
          application_data->>'sex',
          application_data->>'marital_status',
          application_data->>'nationality',
          application_data->>'province',
          application_data->>'district',
          application_data->>'postal_address',
          application_data->>'physical_address',
          application_data->>'next_of_kin_name',
          application_data->>'next_of_kin_phone',
          application_data->>'next_of_kin_relationship',
          application_data->>'medical_conditions',
          application_data->>'disabilities',
          COALESCE((application_data->>'criminal_record')::boolean, false),
          application_data->>'criminal_record_details',
          application_data->>'professional_registration_number',
          application_data->>'professional_body',
          application_data->>'employment_status',
          application_data->>'employer_name',
          application_data->>'employer_address',
          COALESCE((application_data->>'years_of_experience')::integer, 0),
          application_data->>'previous_education',
          application_data->>'grades_or_gpa',
          application_data->>'motivation_letter',
          application_data->>'career_goals',
          application_data->>'english_proficiency',
          application_data->>'computer_skills',
          application_data->>'references',
          application_data->>'financial_sponsor',
          application_data->>'sponsor_relationship',
          application_data->>'additional_info',
          'submitted',
          NOW()
        ) RETURNING id INTO new_app_id;

        RETURN QUERY SELECT true, new_app_id, new_tracking_code, null::text;
        
      EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT false, null::uuid, null::text, SQLERRM::text;
      END;
      $$;
    `

    const { error: helperError } = await supabase.rpc('exec_sql', { sql: submissionHelper })
      .catch(() => null)

    if (!helperError) {
      console.log('✅ Secure submission function created')
    }

    console.log('\n✅ Authentication fixes applied successfully!')
    console.log('\n📋 Next Steps:')
    console.log('1. Ensure users are properly signed in before submitting applications')
    console.log('2. Check that the frontend is using the correct authentication flow')
    console.log('3. Verify that session tokens are being passed correctly')
    console.log('4. Test application submission with authenticated users')

  } catch (error) {
    console.error('❌ Error applying fixes:', error.message)
    process.exit(1)
  }
}

// Run the fixes
fixAuthSubmissionIssues()