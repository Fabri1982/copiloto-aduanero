-- ============================================
-- VALIDATION ALERTS TABLE
-- ============================================
CREATE TABLE public.validation_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES public.operation_cases(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message TEXT NOT NULL,
  affected_fields TEXT[] DEFAULT '{}',
  recommended_action TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.validation_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CASE CONFLICTS TABLE
-- ============================================
CREATE TABLE public.case_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES public.operation_cases(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  left_value TEXT,
  right_value TEXT,
  left_source TEXT NOT NULL,
  right_source TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolved_value TEXT,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_conflicts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CASE REVIEWS TABLE (Audit trail for field edits)
-- ============================================
CREATE TABLE public.case_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES public.operation_cases(id) ON DELETE CASCADE,
  field_id UUID REFERENCES public.extracted_fields(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.case_documents(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES public.profiles(id),
  before_json JSONB DEFAULT '{}',
  after_json JSONB DEFAULT '{}',
  review_type TEXT DEFAULT 'manual_correction' CHECK (review_type IN ('manual_correction', 'conflict_resolution', 'validation_override')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- EXTRACTED FIELDS TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS public.extracted_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES public.operation_cases(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.case_documents(id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  extracted_value TEXT,
  confidence DECIMAL(3,2) DEFAULT 0.00,
  evidence_text TEXT,
  page_number INTEGER,
  manually_corrected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.extracted_fields ENABLE ROW LEVEL SECURITY;

-- Trigger to update updated_at on extracted_fields
CREATE OR REPLACE FUNCTION update_extracted_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_extracted_fields_updated_at ON public.extracted_fields;
CREATE TRIGGER update_extracted_fields_updated_at
  BEFORE UPDATE ON public.extracted_fields
  FOR EACH ROW EXECUTE FUNCTION update_extracted_fields_updated_at();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- VALIDATION ALERTS: Access through case's agency
CREATE POLICY "Users can view agency validation alerts" ON public.validation_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = validation_alerts.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can update agency validation alerts" ON public.validation_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = validation_alerts.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can insert agency validation alerts" ON public.validation_alerts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = validation_alerts.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

-- CASE CONFLICTS: Access through case's agency
CREATE POLICY "Users can view agency case conflicts" ON public.case_conflicts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = case_conflicts.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can update agency case conflicts" ON public.case_conflicts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = case_conflicts.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can insert agency case conflicts" ON public.case_conflicts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = case_conflicts.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

-- CASE REVIEWS: Access through case's agency
CREATE POLICY "Users can view agency case reviews" ON public.case_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = case_reviews.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can insert agency case reviews" ON public.case_reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = case_reviews.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

-- EXTRACTED FIELDS: Access through case's agency
CREATE POLICY "Users can view agency extracted fields" ON public.extracted_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = extracted_fields.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can update agency extracted fields" ON public.extracted_fields
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = extracted_fields.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can insert agency extracted fields" ON public.extracted_fields
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = extracted_fields.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_validation_alerts_case ON public.validation_alerts(case_id);
CREATE INDEX IF NOT EXISTS idx_validation_alerts_resolved ON public.validation_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_case_conflicts_case ON public.case_conflicts(case_id);
CREATE INDEX IF NOT EXISTS idx_case_conflicts_status ON public.case_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_case_reviews_case ON public.case_reviews(case_id);
CREATE INDEX IF NOT EXISTS idx_case_reviews_field ON public.case_reviews(field_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_case ON public.extracted_fields(case_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_document ON public.extracted_fields(document_id);
