-- Fix Zambian Grading System Documentation
-- This SQL file adds comments to clarify the Zambian grading system

-- Add comment to clarify Zambian grading system
COMMENT ON COLUMN application_grades.grade IS 'Zambian Grade 12 grading system: 1=A+ (highest), 2=A, 3=B+, 4=B, 5=C+, 6=C, 7=D+, 8=D, 9=F (lowest/fail)';

-- Update the constraint to be more descriptive
ALTER TABLE application_grades DROP CONSTRAINT IF EXISTS application_grades_grade_check;
ALTER TABLE application_grades ADD CONSTRAINT application_grades_grade_check 
  CHECK (grade >= 1 AND grade <= 9) 
  NOT VALID;

-- Add a helpful comment to the table
COMMENT ON TABLE application_grades IS 'Student grades using Zambian Grade 12 system where 1 is the highest grade (A+) and 9 is the lowest (F)';

-- Create a helper view for grade interpretation
CREATE OR REPLACE VIEW grade_interpretation AS
SELECT 
  grade_value,
  grade_letter,
  grade_description,
  is_passing
FROM (VALUES
  (1, 'A+', 'Distinction', true),
  (2, 'A', 'Distinction', true),
  (3, 'B+', 'Merit', true),
  (4, 'B', 'Merit', true),
  (5, 'C+', 'Credit', true),
  (6, 'C', 'Credit', true),
  (7, 'D+', 'Pass', true),
  (8, 'D', 'Pass', true),
  (9, 'F', 'Fail', false)
) AS grades(grade_value, grade_letter, grade_description, is_passing);

COMMENT ON VIEW grade_interpretation IS 'Reference view for Zambian Grade 12 grading system interpretation';

-- Create a function to get grade letter from numeric grade
CREATE OR REPLACE FUNCTION get_grade_letter(numeric_grade INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE numeric_grade
    WHEN 1 THEN 'A+'
    WHEN 2 THEN 'A'
    WHEN 3 THEN 'B+'
    WHEN 4 THEN 'B'
    WHEN 5 THEN 'C+'
    WHEN 6 THEN 'C'
    WHEN 7 THEN 'D+'
    WHEN 8 THEN 'D'
    WHEN 9 THEN 'F'
    ELSE 'Invalid'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_grade_letter(INTEGER) IS 'Converts Zambian numeric grade (1-9) to letter grade (A+ to F)';

-- Create a function to check if grade is passing
CREATE OR REPLACE FUNCTION is_passing_grade(numeric_grade INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN numeric_grade BETWEEN 1 AND 8; -- 1-8 are passing, 9 is fail
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_passing_grade(INTEGER) IS 'Returns true if Zambian grade (1-8) is passing, false for fail (9)';

-- Update the admin summary view to include grade letters
CREATE OR REPLACE VIEW admin_application_summary AS
SELECT 
  a.id,
  a.application_number,
  a.full_name,
  a.email,
  a.phone,
  a.program,
  a.intake,
  a.institution,
  a.status,
  a.payment_status,
  a.application_fee,
  a.amount as paid_amount,
  a.submitted_at,
  a.created_at,
  a.result_slip_url,
  a.extra_kyc_url,
  a.pop_url,
  STRING_AGG(
    gs.name || ': ' || ag.grade || ' (' || get_grade_letter(ag.grade) || ')', 
    ', ' ORDER BY gs.name
  ) as grades_summary,
  COUNT(ag.id) as total_subjects,
  ROUND(AVG(ag.grade), 2) as average_grade,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.date_of_birth)) as age,
  EXTRACT(DAY FROM (CURRENT_DATE - a.submitted_at)) as days_since_submission
FROM applications_new a
LEFT JOIN application_grades ag ON a.id = ag.application_id
LEFT JOIN grade12_subjects gs ON ag.subject_id = gs.id
GROUP BY a.id, a.application_number, a.full_name, a.email, a.phone, 
         a.program, a.intake, a.institution, a.status, a.payment_status,
         a.application_fee, a.amount, a.submitted_at, a.created_at,
         a.result_slip_url, a.extra_kyc_url, a.pop_url, a.date_of_birth;

COMMENT ON VIEW admin_application_summary IS 'Enhanced admin view with Zambian grade letters and additional calculated fields';