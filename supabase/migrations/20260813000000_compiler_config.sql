CREATE TABLE compiler_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_name TEXT NOT NULL,
    jobe_language TEXT NOT NULL UNIQUE,
    version TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed basic supported languages for Jobe
INSERT INTO compiler_languages (display_name, jobe_language, version, is_enabled) VALUES
('Python 3', 'python3', '3.10', true),
('Java', 'java', '11', true),
('C++', 'cpp', '9.4', true),
('C', 'c', '9.4', true),
('NodeJS', 'nodejs', '18.x', true);

-- Row Level Security
ALTER TABLE compiler_languages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage compiler languages"
ON compiler_languages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Everyone can read enabled languages
CREATE POLICY "Anyone can view enabled compiler languages"
ON compiler_languages
FOR SELECT
TO authenticated
USING (is_enabled = true);
