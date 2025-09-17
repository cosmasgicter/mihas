# Scripts

This directory contains utility scripts for the MIHAS/KATC Application System.

## Structure

- `setup/` - Initial setup and configuration scripts
- `maintenance/` - Maintenance, security fixes, and optimization scripts
- `generate-sri.js` - Security Resource Integrity generation
- `validate-security.js` - Security validation utilities

## Usage

Most scripts should be run from the project root:

```bash
# Setup scripts
node scripts/setup/create-admin.js
node scripts/setup/setup-storage.js

# Maintenance scripts  
node scripts/maintenance/security-audit.js
node scripts/maintenance/optimize-images.js
```

## Security Scripts

Security-related scripts are in the `maintenance/` directory and should be run with caution in production environments.