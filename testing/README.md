# Testing Directory

This directory contains all testing-related files for the MIHAS/KATC Application System.

## Structure

- `tests/` - Playwright test files and fixtures
- `playwright.config.ts` - Playwright configuration
- `vite.config.test.ts` - Vite test configuration
- `test-*.js` - Individual test scripts
- `test-*.html` - Test HTML files

## Running Tests

From the project root:

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run specific test suites
npm run test:auth
npm run test:wizard
npm run test:enhanced

# Debug tests
npm run test:debug
```

## Test Files

- `auth.spec.ts` - Authentication tests
- `application-wizard.spec.ts` - Application wizard tests
- `enhanced-features.spec.ts` - Enhanced features tests
- `form-submission.spec.ts` - Form submission tests
- `application-system-complete.spec.ts` - Complete system tests