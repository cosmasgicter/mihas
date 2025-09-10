#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrationFiles = [
  '001_create_enums.sql',
  '002_create_institutions.sql',
  '003_create_user_profiles.sql',
  '004_create_user_roles.sql',
  '005_create_programs.sql',
  '006_create_program_intakes.sql',
  '007_create_applications.sql',
  '008_create_documents.sql',
  '009_create_notifications.sql',
  '010_create_audit_logs.sql',
  '011_create_settings.sql',
  '012_create_storage_policies.sql',
  '013_create_security_tables.sql',
  '014_create_monitoring_tables.sql'
];

async function executeMigration(filename) {
  const filePath = path.join(__dirname, 'scripts', filename);
  
  if (!fs.existsSync(filePath)) {
    console.error(`Migration file not found: ${filename}`);
    return false;
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`Executing migration: ${filename}`);
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`Error in ${filename}:`, error.message);
      return false;
    }
    
    console.log(`✓ Successfully executed: ${filename}`);
    return true;
  } catch (err) {
    console.error(`Error executing ${filename}:`, err.message);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');

  // Create exec_sql function if it doesn't exist
  const execSqlFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$;
  `;

  try {
    await supabase.rpc('exec', { sql: execSqlFunction });
  } catch (err) {
    // Function might already exist, continue
  }

  let successCount = 0;
  let failureCount = 0;

  for (const filename of migrationFiles) {
    const success = await executeMigration(filename);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    console.log(''); // Add spacing between migrations
  }

  console.log('📊 Database setup completed!');
  console.log(`✅ Successful migrations: ${successCount}`);
  console.log(`❌ Failed migrations: ${failureCount}`);

  if (failureCount > 0) {
    console.log('\n⚠️  Some migrations failed. Please check the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All migrations executed successfully!');
    await populateInitialData();
  }
}

async function populateInitialData() {
  console.log('\n📝 Populating initial data...');

  // Add sample programs for MIHAS
  const samplePrograms = [
    {
      institution_id: '11111111-1111-1111-1111-111111111111',
      code: 'CERT-NURSING',
      name: 'Certificate in Nursing',
      description: 'A comprehensive nursing program preparing students for healthcare careers',
      duration_years: 2,
      qualification_level: 'Certificate',
      prerequisites: ['Grade 12 Certificate', 'Mathematics', 'Science subjects'],
      required_documents: ['Grade 12 Certificate', 'NRC/Passport', 'Medical Certificate', 'Birth Certificate'],
      application_fee_amount: 500.00
    },
    {
      institution_id: '11111111-1111-1111-1111-111111111111',
      code: 'DIP-CLINICAL-MED',
      name: 'Diploma in Clinical Medicine',
      description: 'Advanced medical training program for clinical practitioners',
      duration_years: 3,
      qualification_level: 'Diploma',
      prerequisites: ['Grade 12 Certificate with strong science background', 'Mathematics', 'Biology', 'Chemistry'],
      required_documents: ['Grade 12 Certificate', 'NRC/Passport', 'Medical Certificate', 'Birth Certificate', 'Police Clearance'],
      application_fee_amount: 750.00
    },
    {
      institution_id: '11111111-1111-1111-1111-111111111111',
      code: 'CERT-PHARMACY',
      name: 'Certificate in Pharmacy Technology',
      description: 'Training program for pharmacy technicians and assistants',
      duration_years: 2,
      qualification_level: 'Certificate',
      prerequisites: ['Grade 12 Certificate', 'Mathematics', 'Chemistry'],
      required_documents: ['Grade 12 Certificate', 'NRC/Passport', 'Medical Certificate', 'Birth Certificate'],
      application_fee_amount: 450.00
    }
  ];

  try {
    for (const program of samplePrograms) {
      const { error } = await supabase
        .from('programs')
        .insert(program);
      
      if (error) {
        console.error(`Error inserting program ${program.code}:`, error.message);
      } else {
        console.log(`✓ Added program: ${program.name}`);
      }
    }

    // Add sample intakes for the current academic year
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    const { data: programs } = await supabase
      .from('programs')
      .select('id, code');

    if (programs) {
      for (const program of programs) {
        const intakes = [
          {
            program_id: program.id,
            name: `${program.code} - January ${nextYear} Intake`,
            academic_year: `${currentYear}/${nextYear}`,
            intake_period: 'January',
            capacity: 50,
            application_start_date: new Date(`${currentYear}-10-01`).toISOString(),
            application_end_date: new Date(`${currentYear}-12-31`).toISOString(),
            is_open: true
          },
          {
            program_id: program.id,
            name: `${program.code} - September ${nextYear} Intake`,
            academic_year: `${currentYear}/${nextYear}`,
            intake_period: 'September',
            capacity: 50,
            application_start_date: new Date(`${nextYear}-06-01`).toISOString(),
            application_end_date: new Date(`${nextYear}-08-31`).toISOString(),
            is_open: false
          }
        ];

        for (const intake of intakes) {
          const { error } = await supabase
            .from('program_intakes')
            .insert(intake);
          
          if (error) {
            console.error(`Error inserting intake for ${program.code}:`, error.message);
          } else {
            console.log(`✓ Added intake: ${intake.name}`);
          }
        }
      }
    }

    console.log('\n🎉 Initial data populated successfully!');
    
  } catch (err) {
    console.error('Error populating initial data:', err.message);
  }
}

// Run the setup
setupDatabase().catch(console.error);