#!/bin/bash

# CRITICAL SECURITY CLEANUP SCRIPT
# Run this immediately to remove hardcoded credentials and security issues

echo "🚨 STARTING CRITICAL SECURITY CLEANUP..."

# 1. Backup current .env
if [ -f .env ]; then
    echo "📁 Backing up current .env..."
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# 2. Remove files with hardcoded credentials
echo "🗑️  Removing files with hardcoded credentials..."
rm -f test-auth-fix.js
rm -f create-test-user.cjs
rm -f fix-submission-now.cjs
rm -f create-admin.js
rm -f fix-auth-access.cjs
rm -f fix-auth-access.js

# 3. Clean AWS SSO cache
echo "🧹 Cleaning AWS SSO cache..."
rm -rf .aws/sso/cache/

# 4. Remove test files with credentials
echo "🧪 Removing test files with credentials..."
rm -f simple-auth-test.js
rm -f final-auth-test.js
rm -f debug-auth.js
rm -f debug-jwt.js

# 5. Update .gitignore to prevent future credential exposure
echo "🔒 Updating .gitignore..."
cat >> .gitignore << 'EOF'

# Security - Never commit these files
.env
.env.local
.env.production
.env.test
*.key
*.pem
**/credentials.json
**/*credentials*
**/*secret*
**/*password*
.aws/sso/cache/
auth-debug.js
test-auth-*.js
*-credentials-*

# Temporary security files
*.backup.*
security-audit-*.log
EOF

# 6. Create secure .env template
echo "📝 Creating secure .env template..."
cat > .env << 'EOF'
# REPLACE THESE WITH YOUR NEW SECURE CREDENTIALS
VITE_SUPABASE_URL=https://your-new-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_new_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key
NODE_ENV=production
EOF

# 7. Set secure permissions
echo "🔐 Setting secure file permissions..."
chmod 600 .env
chmod 600 .env.secure.example

# 8. Remove from git if already committed
echo "🔄 Removing sensitive files from git..."
git rm --cached .env 2>/dev/null || true
git rm --cached test-auth-fix.js 2>/dev/null || true
git rm --cached create-test-user.cjs 2>/dev/null || true
git rm --cached fix-submission-now.cjs 2>/dev/null || true
git rm --cached create-admin.js 2>/dev/null || true
git rm --cached -r .aws/sso/cache/ 2>/dev/null || true

# 9. Stage security improvements
git add .gitignore
git add CRITICAL_AUTH_FIXES.sql
git add SECURITY_ENVIRONMENT_FIX.md
git add src/lib/authSecurity.ts

echo "✅ SECURITY CLEANUP COMPLETED!"
echo ""
echo "🚨 CRITICAL NEXT STEPS:"
echo "1. Go to your Supabase dashboard and ROTATE ALL KEYS"
echo "2. Update .env with the new secure credentials"
echo "3. Run: npm run build to test the application"
echo "4. Apply database fixes: psql < CRITICAL_AUTH_FIXES.sql"
echo "5. Test authentication thoroughly"
echo "6. Deploy with new secure configuration"
echo ""
echo "⚠️  DO NOT DEPLOY until you have:"
echo "   - Rotated all Supabase credentials"
echo "   - Applied database security fixes"
echo "   - Tested authentication flows"
echo "   - Verified admin access controls"