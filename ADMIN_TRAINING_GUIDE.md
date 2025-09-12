# MIHAS/KATC Admin Training Guide

## 🎯 Overview

This guide covers the enhanced application management system with new features for efficient administration.

## 🚀 Accessing the New System

### Login & Navigation
1. **Login** at `/auth/signin` with admin credentials
2. **Navigate** to `/admin/applications-new` for the enhanced dashboard
3. **Legacy system** remains available at `/admin/applications`

## 📊 Enhanced Dashboard Features

### 1. Advanced Filtering System

**Location:** Top filter panel with 8 filter options

**Available Filters:**
- **Search Box:** Name, email, or application number
- **Status Filter:** Draft, Submitted, Under Review, Approved, Rejected
- **Payment Filter:** Pending Review, Verified, Rejected
- **Program Filter:** Clinical Medicine, Environmental Health, Registered Nursing
- **Institution Filter:** KATC, MIHAS
- **Age Filter:** Minimum age (numeric input)
- **Grade Filter:** Minimum average grade (numeric input)
- **Date Range:** Application creation date range

**How to Use:**
1. Type in search box for instant filtering
2. Select from dropdowns to narrow results
3. Use numeric filters for age/grade requirements
4. Set date ranges for time-based analysis
5. **Filters combine** - all active filters work together

### 2. Bulk Operations

**Selecting Applications:**
- **Individual:** Click checkbox next to each application
- **Select All:** Click header checkbox to select all visible applications
- **Clear Selection:** Click "Clear Selection" button

**Bulk Actions Available:**
- **Status Updates:** Under Review, Approved, Rejected
- **Payment Updates:** Verified, Rejected

**How to Perform Bulk Updates:**
1. Select applications using checkboxes
2. Blue toolbar appears showing "X selected"
3. Choose action from dropdown menus:
   - "Bulk Status Update" → Select new status
   - "Bulk Payment Update" → Select new payment status
4. Changes apply immediately to all selected applications

### 3. Export Functionality

**Export Options:**
- **CSV Export:** Spreadsheet-compatible format
- **Excel Export:** Excel-compatible format

**What Gets Exported:**
- All visible applications (respects current filters)
- Complete application data including:
  - Personal information
  - Program and intake details
  - Status and payment information
  - Grade summaries and averages
  - Calculated fields (age, days since submission)

**How to Export:**
1. Apply desired filters to narrow data
2. Click "Export CSV" or "Export Excel" button
3. File downloads automatically with timestamp
4. Filename format: `applications_YYYY-MM-DD.csv`

### 4. Enhanced Data Display

**New Calculated Fields:**
- **Age:** Automatically calculated from date of birth
- **Average Grade:** Calculated from all subject grades
- **Days Since Submission:** Time tracking for processing
- **Total Subjects:** Count of Grade 12 subjects submitted

**Visual Improvements:**
- **Color-coded status badges** for quick identification
- **Enhanced grade display** with averages
- **Direct document links** for easy access
- **Improved data organization** in table format

## 🔧 Individual Application Management

### Status Management
**Available Statuses:**
- **Draft:** Application in progress
- **Submitted:** Ready for review
- **Under Review:** Currently being processed
- **Approved:** Application accepted
- **Rejected:** Application declined

**How to Update:**
1. Find application in table
2. Use status dropdown in "Status" column
3. Select new status from dropdown
4. **Email notification sent automatically** to student

### Payment Status Management
**Available Payment Statuses:**
- **Pending Review:** Awaiting verification
- **Verified:** Payment confirmed
- **Rejected:** Payment issues found

**How to Update:**
1. Locate application in table
2. Use payment dropdown in "Payment" column
3. Select new payment status
4. **Email notification sent automatically** to student

### Document Access
**Available Documents:**
- **Result Slip:** Grade 12 examination results (required)
- **Extra KYC:** Additional identification documents (optional)
- **Proof of Payment:** Payment confirmation (required)

**How to Access:**
1. Look in "Actions" column
2. Click document links to view/download
3. Documents open in new tab for review
4. All documents are securely stored and accessible

## 📧 Email Notification System

### Automatic Notifications
**Triggers:**
- Status changes (draft → submitted → under review → approved/rejected)
- Payment status changes (pending → verified/rejected)

**Notification Content:**
- **Subject:** Application/Payment Status Update + Application Number
- **Body:** Clear status change message
- **Recipient:** Student's registered email address

### Notification Management
**Viewing Notifications:**
- Access notification history in admin panel
- See pending, sent, and failed notifications
- Track notification delivery status

**Manual Actions:**
- Mark notifications as sent if needed
- View notification content and recipients
- Monitor notification delivery success

## 📈 Reporting & Analytics

### Summary Statistics
**Dashboard Metrics:**
- **Total Applications:** All applications in system
- **Submitted:** Applications ready for review
- **Pending Payment Review:** Awaiting payment verification
- **Approved:** Successfully processed applications

### Advanced Filtering for Reports
**Use Cases:**
- **Age Analysis:** Filter by minimum age to see age distribution
- **Grade Performance:** Filter by minimum grade to identify top performers
- **Time-based Reports:** Use date ranges for periodic analysis
- **Program Analysis:** Filter by specific programs or institutions
- **Status Tracking:** Monitor applications by current status

### Export for External Analysis
**Best Practices:**
1. **Apply filters first** to get specific data sets
2. **Export regularly** for backup and analysis
3. **Use date ranges** for periodic reports
4. **Combine filters** for detailed insights

## 🛠️ Troubleshooting

### Common Issues

**Bulk Operations Not Working:**
- Ensure applications are selected (checkboxes checked)
- Verify you have admin permissions
- Check network connection

**Export Not Downloading:**
- Check browser download settings
- Ensure popup blockers are disabled
- Try different browser if issues persist

**Filters Not Applying:**
- Clear browser cache and refresh
- Check if multiple conflicting filters are set
- Reset filters and try again

**Email Notifications Not Sending:**
- Notifications are queued automatically
- Check notification history panel
- Verify student email addresses are correct

### Performance Tips

**For Large Data Sets:**
- Use filters to reduce displayed applications
- Export in smaller batches if needed
- Apply date ranges to limit scope

**For Bulk Operations:**
- Select reasonable batch sizes (50-100 applications)
- Process in smaller groups for better performance
- Monitor system response times

## 🎓 Training Exercises

### Exercise 1: Basic Filtering
1. Navigate to enhanced dashboard
2. Search for a specific student name
3. Filter by "Clinical Medicine" program
4. Filter by "KATC" institution
5. Export the filtered results

### Exercise 2: Bulk Status Update
1. Select 5 applications with "Submitted" status
2. Use bulk update to change to "Under Review"
3. Verify status changes applied
4. Check that notifications were created

### Exercise 3: Payment Verification
1. Filter applications by "Pending Review" payment status
2. Review proof of payment documents
3. Update payment status to "Verified" for valid payments
4. Update to "Rejected" for invalid payments

### Exercise 4: Advanced Reporting
1. Set date range for last 30 days
2. Filter by minimum age of 18
3. Filter by minimum grade of 6.0
4. Export results for analysis
5. Review summary statistics

## 📞 Support & Resources

### Getting Help
- **Technical Issues:** Contact IT support
- **Process Questions:** Refer to this guide
- **System Updates:** Check for announcements

### Best Practices
- **Regular Exports:** Backup data weekly
- **Timely Processing:** Review applications within 48 hours
- **Document Review:** Always verify uploaded documents
- **Status Updates:** Keep students informed via status changes

### Security Reminders
- **Log out** when finished
- **Don't share** admin credentials
- **Verify identity** before making changes
- **Report suspicious** activity immediately

## 🎉 Quick Reference

### Keyboard Shortcuts
- **Ctrl+F:** Browser search within page
- **Ctrl+A:** Select all (when in bulk mode)
- **Ctrl+Click:** Multi-select applications

### Status Workflow
```
Draft → Submitted → Under Review → Approved/Rejected
```

### Payment Workflow
```
Pending Review → Verified/Rejected
```

### Filter Combinations
- **Program + Institution:** Automatic (derived)
- **Age + Grade:** Academic performance analysis
- **Date + Status:** Processing timeline analysis
- **Search + Filters:** Specific student tracking