#!/usr/bin/env node

// Simple test script for user management API endpoints
const API_BASE = process.env.VITE_API_BASE_URL || 'http://localhost:3000'

async function testUserAPI() {
  console.log('🧪 Testing User Management API...\n')

  // Test authentication (you'll need a valid admin token)
  const token = process.env.TEST_ADMIN_TOKEN
  if (!token) {
    console.log('❌ TEST_ADMIN_TOKEN environment variable required')
    console.log('   Get a token by logging in as an admin user')
    return
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  try {
    // Test 1: List users
    console.log('📋 Testing GET /api/admin/users...')
    const listResponse = await fetch(`${API_BASE}/api/admin/users`, { headers })
    
    if (listResponse.ok) {
      const listData = await listResponse.json()
      console.log(`✅ Successfully fetched ${listData.data?.length || 0} users`)
    } else {
      console.log(`❌ Failed to list users: ${listResponse.status} ${listResponse.statusText}`)
    }

    // Test 2: Create user (optional - uncomment to test)
    /*
    console.log('\n👤 Testing POST /api/admin/users...')
    const createResponse = await fetch(`${API_BASE}/api/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123',
        full_name: 'Test User',
        phone: '+260123456789',
        role: 'student'
      })
    })

    if (createResponse.ok) {
      const createData = await createResponse.json()
      console.log(`✅ Successfully created user: ${createData.data?.email}`)
      
      // Test 3: Update user
      const userId = createData.data?.user_id
      if (userId) {
        console.log('\n✏️ Testing PUT /api/admin/users/[id]...')
        const updateResponse = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            full_name: 'Updated Test User',
            email: 'test@example.com',
            phone: '+260987654321',
            role: 'student'
          })
        })

        if (updateResponse.ok) {
          console.log('✅ Successfully updated user')
        } else {
          console.log(`❌ Failed to update user: ${updateResponse.status}`)
        }

        // Test 4: Delete user
        console.log('\n🗑️ Testing DELETE /api/admin/users/[id]...')
        const deleteResponse = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
          method: 'DELETE',
          headers
        })

        if (deleteResponse.ok) {
          console.log('✅ Successfully deleted user')
        } else {
          console.log(`❌ Failed to delete user: ${deleteResponse.status}`)
        }
      }
    } else {
      console.log(`❌ Failed to create user: ${createResponse.status} ${createResponse.statusText}`)
    }
    */

    console.log('\n🎉 User API tests completed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testUserAPI()