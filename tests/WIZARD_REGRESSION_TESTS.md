# Wizard Regression Tests

This document describes the regression tests added to prevent duplicate application creation when navigating back to Step 1 in the application wizard.

## Problem Fixed

Previously, when users navigated back to Step 1 (Basic KYC) and proceeded again, the system would create a new application instead of updating the existing draft. This resulted in:

- Duplicate applications in the database
- Loss of application numbers and tracking codes
- Inconsistent application state

## Solution Implemented

Updated `useWizardController.ts` `handleNextStep` function to:

1. Check if `applicationId` exists before deciding whether to create or update
2. Use `updateApplication.mutateAsync` when `applicationId` is defined
3. Use `createApplication.mutateAsync` only when no draft exists
4. Preserve existing `application_number` and `public_tracking_code` when updating

## Test Coverage

### Unit Tests (`tests/unit/wizard-controller.test.ts`)

- ✅ Creates new application when `applicationId` is not defined
- ✅ Updates existing application when `applicationId` is defined  
- ✅ Preserves existing application_number and tracking_code when updating
- ✅ Validates required fields before proceeding
- ✅ Validates NRC or Passport requirement

### E2E Tests (`tests/e2e/wizard-regression.spec.ts`)

- ✅ Does not create duplicate applications when going back to Step 1 and proceeding again
- ✅ Preserves application ID and tracking codes across navigation
- ✅ Maintains form data when navigating between steps
- ✅ Handles multiple round trips between steps

### Integration Tests (`tests/integration/wizard-navigation.test.js`)

- ✅ Handles Step 1 navigation without creating duplicate applications
- ✅ Preserves application identifiers across navigation
- ✅ Handles form validation during navigation

## Running the Tests

```bash
# Run all wizard-related tests
npm run test:wizard
npm run test:wizard:regression
npm run test:wizard:navigation

# Run unit tests
npm run test:unit

# Run specific test files
npx playwright test tests/e2e/wizard-regression.spec.ts
npx vitest tests/unit/wizard-controller.test.ts
npx playwright test tests/integration/wizard-navigation.test.js
```

## Test Scenarios Covered

### Scenario 1: First-time Application
1. User fills Step 1 form
2. Clicks "Next Step"
3. System creates new application with unique identifiers
4. User proceeds to Step 2

### Scenario 2: Navigation Back and Forward
1. User completes Step 1 (application created)
2. User navigates to Step 2
3. User clicks "Previous" to go back to Step 1
4. User modifies some data
5. User clicks "Next Step" again
6. System updates existing application (no duplicate created)
7. User proceeds to Step 2 with same application ID

### Scenario 3: Multiple Round Trips
1. User navigates back and forth between Step 1 and Step 2 multiple times
2. System consistently updates the same application
3. Application identifiers remain stable
4. Form data is preserved

### Scenario 4: Draft Loading
1. User has existing draft application
2. User loads wizard (draft is restored)
3. User navigates between steps
4. System updates existing draft instead of creating new application

## Key Assertions

- `createApplication.mutateAsync` is called only once per session
- `updateApplication.mutateAsync` is called for subsequent Step 1 submissions
- Application number and tracking code remain consistent
- No duplicate applications exist in database
- Form data persistence works correctly
- Navigation is smooth without errors

## Files Modified

1. `src/pages/student/applicationWizard/hooks/useWizardController.ts`
   - Updated `handleNextStep` function logic
   - Added conditional create vs update logic

2. `tests/unit/wizard-controller.test.ts` (new)
   - Unit tests for the controller logic

3. `tests/e2e/wizard-regression.spec.ts` (new)
   - End-to-end regression tests

4. `tests/integration/wizard-navigation.test.js` (new)
   - Integration tests for navigation scenarios

5. `package.json`
   - Added new test scripts

## Monitoring

These tests should be run regularly to ensure:
- No regression in the duplicate application fix
- Navigation continues to work smoothly
- Application state management remains consistent
- User experience is not degraded

The tests are designed to catch any future changes that might reintroduce the duplicate application issue.