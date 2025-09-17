-- Performance Optimization SQL Script
-- This script adds indexes and optimizations to improve query performance

-- ============================================================================
-- INDEXES FOR BETTER QUERY PERFORMANCE
-- ============================================================================

-- User Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- User Roles Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_active ON user_roles(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Applications Indexes
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_institution ON applications(institution);
CREATE INDEX IF NOT EXISTS idx_applications_program ON applications(program);
CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON applications(submitted_at);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);
CREATE INDEX IF NOT EXISTS idx_applications_tracking_code ON applications(public_tracking_code);

-- Application Documents Indexes
CREATE INDEX IF NOT EXISTS idx_application_documents_application_id ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_verification_status ON application_documents(verification_status);

-- Programs and Intakes Indexes
CREATE INDEX IF NOT EXISTS idx_programs_institution_id ON programs(institution_id);
CREATE INDEX IF NOT EXISTS idx_programs_is_active ON programs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_intakes_is_active ON intakes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_intakes_year ON intakes(year);

-- Application Drafts Indexes
CREATE INDEX IF NOT EXISTS idx_application_drafts_user_id ON application_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_application_drafts_updated_at ON application_drafts(updated_at);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Applications with status and institution
CREATE INDEX IF NOT EXISTS idx_applications_status_institution ON applications(status, institution);

-- Applications with user and status (for admin dashboard)
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);

-- User roles with user and active status
CREATE INDEX IF NOT EXISTS idx_user_roles_user_active ON user_roles(user_id, is_active, role);

-- ============================================================================
-- QUERY PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE user_profiles;
ANALYZE user_roles;
ANALYZE applications;
ANALYZE application_documents;
ANALYZE programs;
ANALYZE intakes;
ANALYZE institutions;

-- ============================================================================
-- PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- Create a view for quick application statistics
CREATE OR REPLACE VIEW application_stats AS
SELECT 
    institution,
    program,
    status,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as last_30_days,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as last_7_days
FROM applications 
GROUP BY institution, program, status;

-- Create a view for user activity
CREATE OR REPLACE VIEW user_activity AS
SELECT 
    up.user_id,
    up.full_name,
    up.email,
    up.role,
    COUNT(a.id) as application_count,
    MAX(a.created_at) as last_application_date
FROM user_profiles up
LEFT JOIN applications a ON up.user_id = a.user_id
GROUP BY up.user_id, up.full_name, up.email, up.role;

-- ============================================================================
-- CLEANUP AND MAINTENANCE
-- ============================================================================

-- Remove old application drafts (older than 90 days)
DELETE FROM application_drafts 
WHERE updated_at < CURRENT_DATE - INTERVAL '90 days';

-- ============================================================================
-- PERFORMANCE VERIFICATION QUERIES
-- ============================================================================

-- Test query performance (these should be fast with indexes)
-- Uncomment to test:

/*
-- Test 1: User profile lookup (should be <10ms)
EXPLAIN ANALYZE 
SELECT * FROM user_profiles WHERE user_id = 'test-user-id';

-- Test 2: User roles lookup (should be <10ms)
EXPLAIN ANALYZE 
SELECT * FROM user_roles WHERE user_id = 'test-user-id' AND is_active = true;

-- Test 3: Applications by user (should be <50ms)
EXPLAIN ANALYZE 
SELECT a.*, up.full_name 
FROM applications a 
JOIN user_profiles up ON a.user_id = up.user_id 
WHERE a.user_id = 'test-user-id';

-- Test 4: Applications by status (should be <100ms)
EXPLAIN ANALYZE 
SELECT COUNT(*) FROM applications WHERE status = 'submitted';

-- Test 5: Complex admin query (should be <200ms)
EXPLAIN ANALYZE 
SELECT a.*, up.full_name, up.email 
FROM applications a 
JOIN user_profiles up ON a.user_id = up.user_id 
WHERE a.status IN ('submitted', 'under_review') 
AND a.institution = 'KATC'
ORDER BY a.created_at DESC 
LIMIT 50;
*/

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Performance optimization completed successfully!';
    RAISE NOTICE 'Indexes created for faster queries';
    RAISE NOTICE 'Views created for monitoring';
    RAISE NOTICE 'Old drafts cleaned up';
    RAISE NOTICE 'Run EXPLAIN ANALYZE on your queries to verify performance';
END $$;