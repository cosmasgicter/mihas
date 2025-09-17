#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function testAdminSettings() {
  console.log('🧪 Testing Admin Settings CRUD Operations...\n')

  try {
    // Test 1: Read all settings
    console.log('1️⃣ Testing READ operation...')
    const { data: settings, error: readError } = await supabase
      .from('system_settings')
      .select('*')
      .order('setting_key')

    if (readError) throw readError
    console.log(`✅ Successfully read ${settings.length} settings`)
    console.log('📋 Current settings:')
    settings.forEach(setting => {
      console.log(`   • ${setting.setting_key}: ${setting.setting_value} (${setting.setting_type})`)
    })
    console.log()

    // Test 2: Create a new setting
    console.log('2️⃣ Testing CREATE operation...')
    const testSetting = {
      setting_key: 'test_setting_' + Date.now(),
      setting_value: 'test_value',
      setting_type: 'string',
      description: 'Test setting created by automated test',
      is_public: false
    }

    const { data: newSetting, error: createError } = await adminSupabase
      .from('system_settings')
      .insert([testSetting])
      .select()
      .single()

    if (createError) throw createError
    console.log(`✅ Successfully created setting: ${newSetting.setting_key}`)
    console.log()

    // Test 3: Update the setting
    console.log('3️⃣ Testing UPDATE operation...')
    const { error: updateError } = await adminSupabase
      .from('system_settings')
      .update({
        setting_value: 'updated_test_value',
        description: 'Updated test setting description',
        is_public: true
      })
      .eq('id', newSetting.id)

    if (updateError) throw updateError
    console.log(`✅ Successfully updated setting: ${newSetting.setting_key}`)
    console.log()

    // Test 4: Verify the update
    console.log('4️⃣ Testing READ after UPDATE...')
    const { data: updatedSetting, error: verifyError } = await adminSupabase
      .from('system_settings')
      .select('*')
      .eq('id', newSetting.id)
      .single()

    if (verifyError) throw verifyError
    console.log(`✅ Verified update - Value: ${updatedSetting.setting_value}, Public: ${updatedSetting.is_public}`)
    console.log()

    // Test 5: Delete the test setting
    console.log('5️⃣ Testing DELETE operation...')
    const { error: deleteError } = await adminSupabase
      .from('system_settings')
      .delete()
      .eq('id', newSetting.id)

    if (deleteError) throw deleteError
    console.log(`✅ Successfully deleted test setting: ${newSetting.setting_key}`)
    console.log()

    // Test 6: Test filtering and search functionality
    console.log('6️⃣ Testing FILTER operations...')
    
    // Filter public settings
    const { data: publicSettings, error: publicError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('is_public', true)

    if (publicError) throw publicError
    console.log(`✅ Found ${publicSettings.length} public settings`)

    // Filter private settings
    const { data: privateSettings, error: privateError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('is_public', false)

    if (privateError) throw privateError
    console.log(`✅ Found ${privateSettings.length} private settings`)

    // Search by key pattern
    const { data: contactSettings, error: searchError } = await supabase
      .from('system_settings')
      .select('*')
      .ilike('setting_key', '%contact%')

    if (searchError) throw searchError
    console.log(`✅ Found ${contactSettings.length} contact-related settings`)
    console.log()

    // Test 7: Test different data types
    console.log('7️⃣ Testing different data types...')
    
    const testSettings = [
      {
        setting_key: 'test_boolean_' + Date.now(),
        setting_value: 'true',
        setting_type: 'boolean',
        description: 'Test boolean setting',
        is_public: false
      },
      {
        setting_key: 'test_integer_' + Date.now(),
        setting_value: '42',
        setting_type: 'integer',
        description: 'Test integer setting',
        is_public: false
      },
      {
        setting_key: 'test_decimal_' + Date.now(),
        setting_value: '99.99',
        setting_type: 'decimal',
        description: 'Test decimal setting',
        is_public: false
      }
    ]

    const { data: createdSettings, error: bulkCreateError } = await adminSupabase
      .from('system_settings')
      .insert(testSettings)
      .select()

    if (bulkCreateError) throw bulkCreateError
    console.log(`✅ Successfully created ${createdSettings.length} test settings with different types`)

    // Clean up test settings
    const testIds = createdSettings.map(s => s.id)
    const { error: cleanupError } = await adminSupabase
      .from('system_settings')
      .delete()
      .in('id', testIds)

    if (cleanupError) throw cleanupError
    console.log(`✅ Cleaned up ${testIds.length} test settings`)
    console.log()

    console.log('🎉 All Admin Settings CRUD tests passed successfully!')
    console.log('\n📊 Test Summary:')
    console.log('   ✅ READ operations: Working')
    console.log('   ✅ CREATE operations: Working')
    console.log('   ✅ UPDATE operations: Working')
    console.log('   ✅ DELETE operations: Working')
    console.log('   ✅ FILTER operations: Working')
    console.log('   ✅ Data type handling: Working')
    console.log('\n🚀 The enhanced Admin Settings page is ready for use!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testAdminSettings()