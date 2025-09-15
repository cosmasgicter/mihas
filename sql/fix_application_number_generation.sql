-- Fix application number generation to use institution codes
-- Replace APP prefix with MIHAS/KATC based on institution

-- Updated function to generate application numbers with institution prefix
CREATE OR REPLACE FUNCTION generate_application_number(p_institution VARCHAR(10) DEFAULT NULL) RETURNS VARCHAR(20) AS $$
DECLARE
  code VARCHAR(20);
  prefix VARCHAR(10);
  exists_check INTEGER;
BEGIN
  -- Set prefix based on institution
  IF p_institution = 'MIHAS' THEN
    prefix := 'MIHAS';
  ELSIF p_institution = 'KATC' THEN
    prefix := 'KATC';
  ELSE
    -- Fallback to APP if institution not specified
    prefix := 'APP';
  END IF;
  
  LOOP
    code := prefix || TO_CHAR(NOW(), 'YYYY') || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    SELECT COUNT(*) INTO exists_check FROM applications_new WHERE application_number = code;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Updated trigger function to pass institution to number generator
CREATE OR REPLACE FUNCTION set_application_defaults() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.application_number IS NULL THEN
    NEW.application_number := generate_application_number(NEW.institution);
  END IF;
  
  IF NEW.public_tracking_code IS NULL THEN
    NEW.public_tracking_code := generate_tracking_code_new();
  END IF;
  
  -- Auto-derive institution from program
  IF NEW.program IN ('Clinical Medicine', 'Environmental Health') THEN
    NEW.institution := 'KATC';
  ELSIF NEW.program = 'Registered Nursing' THEN
    NEW.institution := 'MIHAS';
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS applications_new_defaults_trigger ON applications_new;
CREATE TRIGGER applications_new_defaults_trigger
  BEFORE INSERT OR UPDATE ON applications_new
  FOR EACH ROW
  EXECUTE FUNCTION set_application_defaults();