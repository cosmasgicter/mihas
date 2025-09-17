-- CRITICAL AUTHENTICATION & JWT TOKEN FIXES
-- Execute these fixes immediately to secure the system

-- 1. ENABLE RLS ON USER_PROFILES TABLE (CRITICAL)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. FIX USER_PROFILES RLS POLICIES
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;

-- Create secure RLS policies for user_profiles
CREATE POLICY "user_profiles_select_secure" ON user_profiles
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'super_admin') 
            AND user_roles.is_active = true
        )
    );

CREATE POLICY "user_profiles_update_secure" ON user_profiles
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'super_admin') 
            AND user_roles.is_active = true
        )
    );

CREATE POLICY "user_profiles_insert_secure" ON user_profiles
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND auth.uid() IS NOT NULL
    );

-- 3. SECURE USER_ROLES TABLE
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

CREATE POLICY "user_roles_select_secure" ON user_roles
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_roles ur2 
            WHERE ur2.user_id = auth.uid() 
            AND ur2.role IN ('admin', 'super_admin') 
            AND ur2.is_active = true
        )
    );

CREATE POLICY "user_roles_admin_only" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur2 
            WHERE ur2.user_id = auth.uid() 
            AND ur2.role IN ('admin', 'super_admin') 
            AND ur2.is_active = true
        )
    );

-- 4. SECURE APPLICATIONS TABLE
DROP POLICY IF EXISTS "Users can view their own applications" ON applications;
DROP POLICY IF EXISTS "Users can update their own applications" ON applications;
DROP POLICY IF EXISTS "Users can insert their own applications" ON applications;

CREATE POLICY "applications_select_secure" ON applications
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'super_admin', 'admissions_officer') 
            AND user_roles.is_active = true
        )
    );

CREATE POLICY "applications_update_secure" ON applications
    FOR UPDATE USING (
        (auth.uid() = user_id AND status IN ('draft', 'submitted')) OR
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'super_admin', 'admissions_officer') 
            AND user_roles.is_active = true
        )
    );

CREATE POLICY "applications_insert_secure" ON applications
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND auth.uid() IS NOT NULL
    );

-- 5. CREATE JWT VALIDATION FUNCTION
CREATE OR REPLACE FUNCTION validate_jwt_claims()
RETURNS TABLE(user_id uuid, email text, role text) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    -- Validate that JWT token exists and is valid
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Invalid or missing JWT token';
    END IF;
    
    -- Return validated user information
    RETURN QUERY
    SELECT 
        auth.uid() as user_id,
        auth.email() as email,
        COALESCE(ur.role, 'student') as role
    FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.is_active = true
    LIMIT 1;
END;
$$;

-- 6. CREATE SECURE SESSION VALIDATION
CREATE OR REPLACE FUNCTION validate_user_session(check_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    session_valid boolean := false;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- If checking specific user, verify it matches current user or user is admin
    IF check_user_id IS NOT NULL AND check_user_id != current_user_id THEN
        -- Check if current user is admin
        SELECT EXISTS(
            SELECT 1 FROM user_roles 
            WHERE user_id = current_user_id 
            AND role IN ('admin', 'super_admin') 
            AND is_active = true
        ) INTO session_valid;
        
        RETURN session_valid;
    END IF;
    
    -- Validate session exists and is active
    SELECT EXISTS(
        SELECT 1 FROM device_sessions 
        WHERE user_id = current_user_id 
        AND is_active = true 
        AND last_activity > NOW() - INTERVAL '30 minutes'
    ) INTO session_valid;
    
    RETURN session_valid;
END;
$$;

-- 7. ADD JWT EXPIRATION CHECK
CREATE OR REPLACE FUNCTION check_jwt_expiration()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    jwt_exp bigint;
    current_time bigint;
BEGIN
    -- Get JWT expiration from claims
    jwt_exp := (auth.jwt() ->> 'exp')::bigint;
    current_time := extract(epoch from now())::bigint;
    
    -- Check if token is expired
    IF jwt_exp IS NULL OR jwt_exp < current_time THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$;

-- 8. SECURE DEVICE_SESSIONS TABLE
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own device sessions" ON device_sessions;

CREATE POLICY "device_sessions_secure" ON device_sessions
    FOR ALL USING (
        auth.uid() = user_id AND check_jwt_expiration()
    );

-- 9. CREATE AUDIT LOG FOR AUTHENTICATION EVENTS
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    event_type text NOT NULL,
    ip_address inet,
    user_agent text,
    success boolean NOT NULL DEFAULT true,
    error_message text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_audit_admin_only" ON auth_audit_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'super_admin') 
            AND user_roles.is_active = true
        )
    );

-- 10. REVOKE DANGEROUS PERMISSIONS
REVOKE ALL ON user_profiles FROM anon;
REVOKE ALL ON user_roles FROM anon;
REVOKE ALL ON applications FROM anon;
REVOKE ALL ON device_sessions FROM anon;

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT ON user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON device_sessions TO authenticated;

COMMIT;