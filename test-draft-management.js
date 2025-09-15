// Test script for draft management functionality
// Run this in the browser console to test draft operations

console.log('🧪 Testing Draft Management System...')

// Test 1: Create mock draft data
function createMockDraft() {
  const mockDraft = {
    formData: {
      full_name: 'Test User',
      program: 'Clinical Medicine',
      email: 'test@example.com'
    },
    selectedGrades: [
      { subject_id: '1', grade: 2 },
      { subject_id: '2', grade: 3 }
    ],
    currentStep: 2,
    applicationId: 'test-123',
    savedAt: new Date().toISOString()
  }
  
  localStorage.setItem('applicationWizardDraft', JSON.stringify(mockDraft))
  console.log('✅ Mock draft created in localStorage')
  return mockDraft
}

// Test 2: Check if draft exists
function checkDraftExists() {
  const draft = localStorage.getItem('applicationWizardDraft')
  console.log('📋 Draft exists:', !!draft)
  if (draft) {
    try {
      const parsed = JSON.parse(draft)
      console.log('📄 Draft data:', parsed)
      return parsed
    } catch (e) {
      console.error('❌ Failed to parse draft:', e)
      return null
    }
  }
  return null
}

// Test 3: Clear draft using localStorage
function clearDraftLocal() {
  localStorage.removeItem('applicationWizardDraft')
  console.log('🗑️ Draft cleared from localStorage')
}

// Test 4: Test comprehensive cleanup
function testComprehensiveCleanup() {
  // Create multiple draft entries
  localStorage.setItem('applicationWizardDraft', '{"test": true}')
  localStorage.setItem('applicationDraft', '{"test": true}')
  localStorage.setItem('draftFormData', '{"test": true}')
  sessionStorage.setItem('applicationWizardDraft', '{"test": true}')
  
  console.log('📦 Created multiple draft entries')
  
  // Clear all draft-related keys
  const allKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)]
  const draftKeys = allKeys.filter(key => 
    key.includes('draft') || 
    key.includes('wizard') || 
    key.includes('application')
  )
  
  console.log('🔍 Found draft keys:', draftKeys)
  
  // Clear localStorage draft keys
  Object.keys(localStorage).forEach(key => {
    if (key.includes('draft') || key.includes('wizard') || key.includes('application')) {
      localStorage.removeItem(key)
    }
  })
  
  // Clear sessionStorage draft keys
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('draft') || key.includes('wizard') || key.includes('application')) {
      sessionStorage.removeItem(key)
    }
  })
  
  console.log('🧹 Comprehensive cleanup completed')
}

// Test 5: Simulate browser refresh prevention
function testRefreshPrevention() {
  const handler = (e) => {
    e.preventDefault()
    e.returnValue = 'Test: Draft operation in progress'
    console.log('🚫 Refresh prevented')
    return e.returnValue
  }
  
  window.addEventListener('beforeunload', handler)
  console.log('🛡️ Refresh prevention enabled (try refreshing the page)')
  
  // Remove after 10 seconds
  setTimeout(() => {
    window.removeEventListener('beforeunload', handler)
    console.log('✅ Refresh prevention disabled')
  }, 10000)
}

// Run all tests
function runAllTests() {
  console.log('\n🚀 Starting Draft Management Tests...\n')
  
  // Test 1
  console.log('Test 1: Creating mock draft')
  createMockDraft()
  
  // Test 2
  console.log('\nTest 2: Checking draft exists')
  checkDraftExists()
  
  // Test 3
  console.log('\nTest 3: Clearing draft locally')
  clearDraftLocal()
  checkDraftExists()
  
  // Test 4
  console.log('\nTest 4: Testing comprehensive cleanup')
  testComprehensiveCleanup()
  
  // Test 5
  console.log('\nTest 5: Testing refresh prevention (10 seconds)')
  testRefreshPrevention()
  
  console.log('\n✅ All tests completed!')
}

// Export functions for manual testing
window.draftTests = {
  createMockDraft,
  checkDraftExists,
  clearDraftLocal,
  testComprehensiveCleanup,
  testRefreshPrevention,
  runAllTests
}

console.log('🎯 Draft management tests loaded!')
console.log('Run window.draftTests.runAllTests() to test all functionality')
console.log('Or run individual tests like window.draftTests.createMockDraft()')