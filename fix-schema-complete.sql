-- Complete MIHAS Database Schema Fix
-- This creates all necessary tables and functions for the application workflow

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (in correct order)
DROP TABLE IF EXISTS application_grades CASCADE;
DROP TABLE IF EXISTS application_documents CASCADE;
DROP TABLE IF EXISTS application_status_history CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS grade12_subjects CASCADE;
DROP TABLE IF EXISTS intakes CASCADE;
DROP TABLE IF EXISTS programs CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS payment_audit_log CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Create user_profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'student',
    date_of_birth DATE,
    sex TEXT,
    nationality TEXT DEFAULT 'Zambian',
    address TEXT,
    city TEXT,
    next_of_kin_name TEXT,
    next_of_kin_phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create programs table
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    duration_years INTEGER DEFAULT 3,
    department TEXT,
    qualification_level TEXT,
    entry_requirements TEXT,
    fees_per_year DECIMAL(10,2),
    institution_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create intakes table
CREATE TABLE intakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    semester TEXT,
    start_date DATE,
    end_date DATE,
    application_deadline DATE,
    total_capacity INTEGER DEFAULT 100,
    available_spots INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create grade12_subjects table
CREATE TABLE grade12_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create applications table with ALL required columns
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_number TEXT UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Step 1: Basic KYC
    full_name TEXT NOT NULL,
    nrc_number TEXT,
    passport_number TEXT,
    date_of_birth DATE,
    sex TEXT,
    phone TEXT,
    email TEXT NOT NULL,
    residence_town TEXT,
    next_of_kin_name TEXT,
    next_of_kin_phone TEXT,
    program TEXT NOT NULL,
    intake TEXT NOT NULL,
    institution TEXT NOT NULL,
    
    -- Step 2: Education & Documents
    result_slip_url TEXT,
    extra_kyc_url TEXT,
    
    -- Step 3: Payment
    application_fee DECIMAL(10,2) DEFAULT 153.00,
    payment_method TEXT,
    payer_name TEXT,
    payer_phone TEXT,
    amount DECIMAL(10,2),
    paid_at TIMESTAMPTZ,
    momo_ref TEXT,
    pop_url TEXT,
    payment_status TEXT DEFAULT 'pending_review',
    payment_verified_at TIMESTAMPTZ,
    payment_verified_by UUID,
    
    -- Step 4: Status tracking
    status TEXT DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    
    -- Tracking
    public_tracking_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Admin fields
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_started_at TIMESTAMPTZ,
    review_notes TEXT,
    decision_reason TEXT,
    decision_date TIMESTAMPTZ,
    admin_feedback TEXT,
    admin_feedback_date TIMESTAMPTZ,
    admin_feedback_by UUID
);

-- Create application_documents table
CREATE TABLE application_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    system_generated BOOLEAN DEFAULT false,
    verification_status TEXT DEFAULT 'pending',
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(application_id, document_type)
);

-- Create application_grades table
CREATE TABLE application_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES grade12_subjects(id),
    grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 9),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(application_id, subject_id)
);

-- Create application_status_history table
CREATE TABLE application_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_audit_log table
CREATE TABLE payment_audit_log (
    id SERIAL PRIMARY KEY,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    amount DECIMAL(10,2),
    payment_method TEXT,
    reference TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    recorded_by_email TEXT,
    recorded_by_name TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample data
INSERT INTO grade12_subjects (name, code) VALUES
('Mathematics', 'MATH'),
('English', 'ENG'),
('Biology', 'BIO'),
('Chemistry', 'CHEM'),
('Physics', 'PHY'),
('Geography', 'GEO'),
('History', 'HIST'),
('Civic Education', 'CIVIC');

INSERT INTO programs (name, description, institution_id) VALUES
('Clinical Medicine', 'Diploma in Clinical Medicine', null),
('Environmental Health', 'Diploma in Environmental Health', null),
('Registered Nursing', 'Diploma in Registered Nursing', null);

INSERT INTO intakes (name, year, start_date, application_deadline) VALUES
('January 2025', 2025, '2025-01-15', '2024-12-31'),
('May 2025', 2025, '2025-05-15', '2025-04-30'),
('September 2025', 2025, '2025-09-15', '2025-08-31');

-- Create application number generation function
CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS TEXT AS $$
DECLARE
    year_suffix TEXT;
    sequence_num INTEGER;
    app_number TEXT;
BEGIN
    year_suffix := EXTRACT(YEAR FROM NOW())::TEXT;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(application_number FROM 'APP(\d+)') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM applications
    WHERE application_number LIKE 'APP%' || year_suffix;
    
    app_number := 'APP' || LPAD(sequence_num::TEXT, 4, '0') || year_suffix;
    
    RETURN app_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for application number generation
CREATE OR REPLACE FUNCTION set_application_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.application_number IS NULL THEN
        NEW.application_number := generate_application_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_application_number
    BEFORE INSERT ON applications
    FOR EACH ROW
    EXECUTE FUNCTION set_application_number();

-- Create admin view for detailed applications
CREATE OR REPLACE VIEW admin_application_detailed AS
SELECT 
    a.*,
    up.full_name as user_full_name,
    up.phone as user_phone,
    COALESCE(a.amount, 0) as paid_amount,
    EXTRACT(DAY FROM NOW() - a.created_at) as days_since_submission,
    (SELECT COUNT(*) FROM application_grades ag WHERE ag.application_id = a.id) as total_subjects,
    (SELECT ROUND(AVG(ag.grade), 1) FROM application_grades ag WHERE ag.application_id = a.id) as average_grade,
    (SELECT STRING_AGG(gs.name || ':' || ag.grade, ', ') 
     FROM application_grades ag 
     JOIN grade12_subjects gs ON ag.subject_id = gs.id 
     WHERE ag.application_id = a.id) as grades_summary,
    EXTRACT(YEAR FROM NOW()) - EXTRACT(YEAR FROM a.date_of_birth) as age
FROM applications a
LEFT JOIN user_profiles up ON a.user_id = up.user_id;

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own applications" ON applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own applications" ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON applications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own documents" ON application_documents FOR SELECT USING (
    EXISTS (SELECT 1 FROM applications WHERE id = application_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view own grades" ON application_grades FOR SELECT USING (
    EXISTS (SELECT 1 FROM applications WHERE id = application_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- Admin policies (allow all operations for admin users)
CREATE POLICY "Admins can view all applications" ON applications FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Admins can view all documents" ON application_documents FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Admins can view all grades" ON application_grades FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;