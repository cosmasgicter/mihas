# Manual Testing Guide: Notification System

## Overview
This guide helps you manually test the notification system to ensure it works correctly after implementation.

## Prerequisites
1. Application is running locally (`npm run dev`)
2. Supabase database is set up with notification tables
3. Test user account exists

## Test Scenarios

### 1. Application Submission Notification

**Steps:**
1. Sign in to the application
2. Navigate to the student dashboard
3. Check the notification bell (should show current unread count)
4. Start a new application by clicking "New Application"
5. Complete all 4 steps of the application wizard:
   - **Step 1**: Fill in basic KYC information
   - **Step 2**: Add at least 5 subjects and upload result slip
   - **Step 3**: Fill payment info and upload proof of payment
   - **Step 4**: Review and confirm submission
6. Submit the application
7. Verify the success screen shows:
   - ✅ "Application Submitted Successfully!" message
   - Application details box with:
     - Application Number
     - Tracking Code
     - Program
     - Institution
8. Click "Go to Dashboard"
9. Check the notification bell - should show increased unread count
10. Click the notification bell to open the panel
11. Verify new notification appears with:
    - ✅ Title: "Application Submitted Successfully"
    - Content mentioning application number and program
    - Green success icon
    - Unread status (blue dot)

**Expected Results:**
- ✅ Application submits successfully
- ✅ Success screen displays application details
- ✅ Notification appears in bell menu
- ✅ Notification content is accurate
- ✅ Unread count updates correctly

### 2. Notification Interaction

**Steps:**
1. With notifications visible in the panel
2. Click on a notification item
3. Verify it marks as read (blue dot disappears)
4. Check that unread count decreases
5. If notification has action URL, verify navigation works
6. Test "Mark all read" button
7. Test notification deletion (trash icon)

**Expected Results:**
- ✅ Notifications mark as read when clicked
- ✅ Unread count updates in real-time
- ✅ Navigation works for actionable notifications
- ✅ Bulk actions work correctly

### 3. API Endpoint Testing

**Direct API Test:**
```bash
# Test the notification API endpoint directly
curl -X POST http://localhost:3000/api/notifications/application-submitted \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "applicationId": "YOUR_APPLICATION_ID",
    "userId": "YOUR_USER_ID"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "notification": {
    "id": "...",
    "title": "✅ Application Submitted Successfully",
    "content": "Your application #... has been submitted...",
    "type": "success"
  },
  "application": {
    "number": "KATC-2024-001",
    "trackingCode": "TRK123ABC",
    "program": "Clinical Medicine",
    "institution": "KATC"
  }
}
```

### 4. Database Verification

**Check notification tables:**
```sql
-- Check in-app notifications
SELECT * FROM in_app_notifications 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC;

-- Check notification logs
SELECT * FROM notification_logs 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY sent_at DESC;
```

**Expected Data:**
- ✅ Notification record exists in `in_app_notifications`
- ✅ Log record exists in `notification_logs`
- ✅ Data is properly sanitized and formatted

### 5. Error Handling

**Test error scenarios:**
1. Submit application without internet connection
2. Submit with invalid authentication
3. Submit with missing application data

**Expected Behavior:**
- ✅ Application submission doesn't fail if notifications fail
- ✅ Graceful error messages in console
- ✅ User can still complete their workflow

## Troubleshooting

### Common Issues

**1. Notifications not appearing:**
- Check browser console for errors
- Verify API endpoint is accessible
- Check Supabase RLS policies
- Verify user authentication

**2. Notification count not updating:**
- Check real-time subscriptions
- Verify component re-rendering
- Check state management

**3. API errors:**
- Verify environment variables
- Check Supabase service role key
- Verify database table structure

### Debug Commands

```bash
# Check if notification tables exist
npm run test:db-check

# Test notification system
node test-notification-system.js

# Run integration tests
npm run test:notifications
```

## Success Criteria

✅ **All tests pass if:**
1. Application submission creates notification
2. Notification appears in bell menu
3. Notification content is accurate and properly formatted
4. Unread count updates correctly
5. Notification interactions work (read, delete, navigate)
6. System handles errors gracefully
7. Database records are created correctly
8. API endpoints respond correctly

## Performance Notes

- Notifications should appear within 2-3 seconds of submission
- Bell menu should open smoothly without lag
- Unread count should update in real-time
- No memory leaks or excessive re-renders

## Security Verification

- ✅ Only user's own notifications are visible
- ✅ API requires proper authentication
- ✅ Data is properly sanitized
- ✅ RLS policies prevent unauthorized access