# Testing

This directory contains all test files for the MIHAS/KATC Application System.

## Structure

- `e2e/` - End-to-end tests using Playwright
- `integration/` - Integration tests and test utilities
- `unit/` - Unit tests (to be added)

## Running Tests

```bash
# Install test dependencies
npm run test:install

# Run all tests
npm test

# Run specific test suites
npm run test:auth
npm run test:wizard
npm run test:enhanced

# Run with UI
npm run test:ui
```

## Test Configuration

- `playwright.config.ts` - Playwright configuration
- `vite.config.test.ts` - Vite test configuration