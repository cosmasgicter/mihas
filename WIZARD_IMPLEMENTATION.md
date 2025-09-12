# 4-Step Application Wizard Implementation

## Overview

This implementation replaces the complex multi-step application form with a streamlined 4-step wizard that meets the exact requirements specified.

## Database Schema

### New Tables Created

1. **`grade12_subjects`** - Reference table for Grade 12 subjects
2. **`applications_new`** - Simplified application table for wizard
3. **`application_grades`** - Subject grades (1-9 scale)
4. **`admin_application_summary`** - View for admin dashboard

### Key Features

- **Auto-derivation**: Institution automatically set based on program
- **File uploads**: Structured storage in `app_docs` bucket
- **RLS policies**: Users see only their data, admins see all
- **Atomic operations**: Grade replacement via stored procedure

## Application Flow

### Step 1: Basic KYC
- Full name, NRC/Passport, DOB, sex, phone, email
- Residence town, guardian info (optional)
- Program selection (Clinical Medicine | Environmental Health | Registered Nursing)
- Intake selection
- Auto-derives institution (KATC for Clinical Medicine/Environmental Health, MIHAS for Nursing)

### Step 2: Education & Documents
- Grade 12 subjects selection (minimum 6, maximum 10)
- Integer grades 1-9 only
- **Required**: Result slip upload
- **Optional**: Extra KYC documents upload

### Step 3: Payment
- Shows application fee: K150
- Displays payment target based on program:
  - KATC: MTN 0966 992 299
  - MIHAS: MTN 0961 515 151
- Payment details form
- **Required**: Proof of payment upload
- Sets payment_status = 'pending_review'

### Step 4: Review & Submit
- Read-only summary of all information
- Confirmation checkbox
- Submit → status = 'submitted', submitted_at = now()

## Admin Features

### Applications Dashboard (`/admin/applications-new`)
- Grid view with filters (status, payment_status, program, institution)
- Search by name, email, application number
- Status management dropdowns
- Direct links to uploaded documents
- Summary statistics

### Key Admin Actions
- Update application status (draft → submitted → under_review → approved/rejected)
- Update payment status (pending_review → verified/rejected)
- View all uploaded documents
- Filter and search applications

## File Storage

### Structure
```
app_docs/
└── applications/
    └── {user_id}/
        └── {application_id}/
            ├── result_slip/
            ├── extra_kyc/
            └── proof_of_payment/
```

### Security
- Users can only access their own files
- Admins can access all files
- Signed URLs for secure access

## Routes

### Student Routes
- `/student/application-wizard` - New 4-step wizard
- `/apply` - Legacy form (still available)

### Admin Routes
- `/admin/applications-new` - New wizard applications
- `/admin/applications` - Legacy applications

## Migration

1. Run SQL from `new_wizard_schema.sql` in Supabase
2. Creates new tables alongside existing ones
3. No existing data is modified
4. Both systems can run in parallel

## Key Functions

### `rpc_replace_grades(application_id, grades_json)`
Atomically replaces all grades for an application:
```sql
SELECT rpc_replace_grades(
  'app-uuid',
  '[{"subject_id": "subj-uuid", "grade": 7}]'::jsonb
);
```

### Auto-generation Functions
- `generate_application_number()` - Creates APP2024XXXXX format
- `generate_tracking_code_new()` - Creates TRKXXXXXX format

## Validation Rules

### Step 1 Validation
- Either NRC or Passport required (not both)
- All required fields must be filled
- Program and intake selection required

### Step 2 Validation
- Minimum 6 subjects required
- Grades must be integers 1-9
- Result slip upload required
- Extra KYC upload optional

### Step 3 Validation
- All payment fields required except momo_ref
- Proof of payment upload required
- Amount must be >= 150

### Step 4 Validation
- Confirmation checkbox required
- All previous steps must be completed

## Testing Checklist

- [ ] Create application through wizard
- [ ] Upload all required documents
- [ ] Submit application successfully
- [ ] Admin can view application
- [ ] Admin can update statuses
- [ ] Payment status management works
- [ ] File downloads work for admin
- [ ] RLS policies prevent unauthorized access
- [ ] Auto-derivation of institution works
- [ ] Grade validation (1-9, minimum 6 subjects)

## Deployment Notes

1. Apply database migration first
2. Deploy frontend code
3. Test wizard flow end-to-end
4. Verify admin dashboard functionality
5. Check file upload/download permissions

## Enhanced Features ✅

### Email Notifications
- Automatic notifications on status changes
- Automatic notifications on payment status changes
- Admin dashboard to view notification history
- Mark notifications as sent/failed

### Bulk Operations
- Select multiple applications with checkboxes
- Bulk status updates (under_review, approved, rejected)
- Bulk payment status updates (verified, rejected)
- Clear selection functionality

### Export & Reporting
- Export filtered applications to CSV
- Export filtered applications to Excel
- Advanced filtering by age, grade, date range
- Real-time data export with current filters

### Advanced Filtering
- Search by name, email, application number
- Filter by status, payment status, program, institution
- Filter by minimum age and average grade
- Date range filtering for application creation
- Combined filter logic for precise results

### Enhanced Admin View
- `admin_application_detailed` view with calculated fields
- Age calculation from date of birth
- Average grade calculation from subjects
- Days since submission tracking
- Comprehensive application summary

## Future Enhancements

- Integration with email service providers (SendGrid, Mailgun)
- Real-time notifications via WebSocket
- Advanced reporting dashboards with charts
- Integration with payment gateways
- Automated workflow triggers