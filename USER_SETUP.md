# User Account Setup

## New Live Credentials

The application has been cleaned of all dummy/test code and placeholders. To set up the new live user accounts, follow these steps:

### 1. Run the SQL Setup Script

Execute the `setup-users.sql` file in your Supabase SQL editor to create the new user accounts:

**Admin Account:**
- Email: `alexisstar8@gmail.com`
- Password: `Beanola2025`
- Role: `admin`

**Student Account:**
- Email: `cosmas@beanola.com`
- Password: `Beanola2025`
- Role: `student`

### 2. Changes Made

✅ **Removed all dummy/test code:**
- Removed test credentials section from SignIn page
- Removed placeholder PWA icon generation files
- Removed Turnstile verification placeholders
- Cleaned up all test references

✅ **Cleaned up files:**
- Removed `generate-icons.js`
- Removed `public/icon-generator.html`
- Removed `public/temp-icon.html`
- Removed `public/PWA-ICONS-README.md`
- Removed `public/use.txt`

✅ **Updated authentication:**
- Simplified SignIn page (removed test credential auto-fill)
- Cleaned up SignUp page (removed development placeholders)
- All authentication flows now use live code only

### 3. Next Steps

1. Execute the `setup-users.sql` script in Supabase
2. Test login with the new credentials
3. Delete the `setup-users.sql` file after successful setup
4. Delete this `USER_SETUP.md` file

### 4. Security Notes

- Both accounts use the same password for initial setup
- Consider changing passwords after first login
- The admin account has full system access
- The student account has limited access to student features

All dummy data and test code has been removed. The application is now ready for production use.