-- Migration: Update application fee from K150 to K153
-- Date: January 2025

-- Update default value for new applications
ALTER TABLE applications_new ALTER COLUMN application_fee SET DEFAULT 153.00;

-- Update existing draft applications that still have the old fee
UPDATE applications_new 
SET application_fee = 153.00 
WHERE application_fee = 150.00 
AND status = 'draft';

-- Verify the changes
SELECT 
  COUNT(*) as total_applications,
  COUNT(CASE WHEN application_fee = 153.00 THEN 1 END) as fee_153_count,
  COUNT(CASE WHEN application_fee = 150.00 THEN 1 END) as fee_150_count
FROM applications_new;