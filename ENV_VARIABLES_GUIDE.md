# 🔧 Environment Variables Setup Guide

## 📧 **Email Configuration (Choose One)**

### Option 1: Resend (Recommended)
```bash
# 1. Go to https://resend.com
# 2. Sign up/login
# 3. Go to API Keys section
# 4. Create new API key
RESEND_API_KEY=re_xxxxxxxxxx  # Copy from Resend dashboard
```

### Option 2: SMTP (Alternative)
```bash
# Use your existing email provider's SMTP settings:
SMTP_HOST=smtp.gmail.com        # Gmail example
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use app password, not regular password
```

## 📊 **Analytics Configuration (Optional)**

### Umami Analytics Setup:
```bash
# 1. Deploy Umami: https://umami.is/docs/install
# 2. Add your domain: application.mihas.edu.zm
# 3. Go to Settings > Share
# 4. Enable "Share URL" 
# 5. Copy the values:
VITE_ANALYTICS_SITE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_ANALYTICS_SHARE_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_ANALYTICS_BASE_URL=https://your-umami-domain.com
```

## 🔑 **Turnstile CAPTCHA**

### Cloudflare Turnstile:
```bash
# 1. Go to https://dash.cloudflare.com
# 2. Go to Turnstile section
# 3. Add site: application.mihas.edu.zm
# 4. Copy site key:
VITE_TURNSTILE_SITE_KEY=0x4AAAAAABzNXd6hf1VUxD3X  # Your current key looks correct
```

## 🚀 **Quick Setup Commands**

### Test Current Email Function:
```bash
# Test with log provider first:
curl -X POST 'https://mylgegkqoddcrxtwcclb.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTIwODMsImV4cCI6MjA3MzA4ODA4M30.7f-TwYz7E6Pp07oH5Lkkfw9c8d8JkeE81EXJqpCWiLw' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "test@mihas.edu.zm",
    "subject": "Test Email",
    "template": "application-receipt", 
    "data": {
      "applicationNumber": "APP123456",
      "trackingCode": "MIHAS123456",
      "programName": "Clinical Medicine",
      "submissionDate": "2025-01-20",
      "paymentStatus": "confirmed"
    }
  }'
```

## 📝 **Priority Order:**

### 1. **CRITICAL (Required for email):**
```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxx  # Get from resend.com
```

### 2. **IMPORTANT (For production):**
```bash
VITE_TURNSTILE_SITE_KEY=0x4AAAAAABzNXd6hf1VUxD3X  # Verify in Cloudflare
```

### 3. **OPTIONAL (For analytics):**
```bash
VITE_ANALYTICS_SITE_ID=
VITE_ANALYTICS_SHARE_TOKEN=
VITE_ANALYTICS_BASE_URL=
```

## 🔧 **Where to Set These:**

### Supabase Edge Functions:
```bash
# In Supabase Dashboard:
# Settings > Edge Functions > Environment Variables
EMAIL_PROVIDER=resend
RESEND_API_KEY=your_key_here
RESEND_FROM_EMAIL="MIHAS Admissions <admissions@mihas.edu.zm>"
```

### Vercel Deployment:
```bash
# In Vercel Dashboard:
# Project > Settings > Environment Variables
# Add all VITE_ prefixed variables
```

## ✅ **Verification Steps:**

1. **Set EMAIL_PROVIDER=log** first to test function
2. **Get Resend API key** and set EMAIL_PROVIDER=resend
3. **Test email function** with real key
4. **Configure Turnstile** if needed
5. **Set up analytics** when ready

**Start with email configuration - it's the only missing critical piece!**