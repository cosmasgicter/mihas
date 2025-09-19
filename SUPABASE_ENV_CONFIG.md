# 🔧 Supabase Environment Configuration

## 📧 **Edge Functions Environment Variables**

### **Go to Supabase Dashboard:**
1. **Settings** → **Edge Functions** → **Environment Variables**
2. **Add these variables:**

```bash
# Email Configuration (Resend)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_cT8PNR7g_HT72NPZNFRpYmvPnZLYa5n1e
RESEND_FROM_EMAIL="MIHAS Admissions <admissions@mihas.edu.zm>"
EMAIL_FROM=admissions@mihas.edu.zm

# SMTP Configuration (Zoho - Alternative)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USERNAME=admin@mihas.edu.zm
SMTP_PASSWORD=Skyl3r@L0m1s
SMTP_SECURE=true
SMTP_FROM_EMAIL="MIHAS Admissions <admin@mihas.edu.zm>"

# Admin Configuration
APPLICATION_ADMIN_EMAILS=admissions@mihas.edu.zm
```

## 🚀 **Test Email Function After Configuration:**

```bash
curl -X POST 'https://mylgegkqoddcrxtwcclb.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bGdlZ2txb2RkY3J4dHdjY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTIwODMsImV4cCI6MjA3MzA4ODA4M30.7f-TwYz7E6Pp07oH5Lkkfw9c8d8JkeE81EXJqpCWiLw' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "admin@mihas.edu.zm",
    "subject": "MIHAS System Test",
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

## 📊 **Vercel Environment Variables**

### **Copy from vercel-env.txt to Vercel Dashboard:**
1. **Project Settings** → **Environment Variables**
2. **Add all VITE_ prefixed variables**

## 🎯 **Priority Configuration:**

### **1. CRITICAL (Set in Supabase first):**
- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY=re_cT8PNR7g_HT72NPZNFRpYmvPnZLYa5n1e`

### **2. IMPORTANT (Set in Vercel):**
- All `VITE_` prefixed variables from vercel-env.txt

### **3. OPTIONAL (Analytics):**
- Umami analytics variables already configured

## ✅ **Files Updated:**
- ✅ `.env` - Complete configuration
- ✅ `vercel-env.txt` - Vercel deployment variables
- ✅ `.env.production` - Production client variables
- ✅ `.env.development` - Development variables

**Next Step: Configure Supabase Edge Functions environment variables to enable email functionality!**