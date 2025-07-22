-- Create COMPL-AI benchmarks table
CREATE TABLE IF NOT EXISTS compl_ai_benchmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  principle_id UUID NOT NULL REFERENCES compl_ai_principles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_compl_ai_benchmarks_code ON compl_ai_benchmarks(code);
CREATE INDEX IF NOT EXISTS idx_compl_ai_benchmarks_principle_id ON compl_ai_benchmarks(principle_id);

-- Add RLS policies
ALTER TABLE compl_ai_benchmarks ENABLE ROW LEVEL SECURITY;

-- Policy for reading benchmarks (all authenticated users)
CREATE POLICY "Allow read access to compl_ai_benchmarks" ON compl_ai_benchmarks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for modifying benchmarks (admin and super_admin only)
CREATE POLICY "Allow admin write access to compl_ai_benchmarks" ON compl_ai_benchmarks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_compl_ai_benchmarks_updated_at 
  BEFORE UPDATE ON compl_ai_benchmarks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();