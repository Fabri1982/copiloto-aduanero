-- ============================================
-- DOCUMENT EXTRACTIONS TABLE
-- Stores OCR/AI extraction results per document
-- ============================================
CREATE TABLE public.document_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.case_documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  model_name TEXT,
  raw_text TEXT,
  extraction_json JSONB DEFAULT '{}',
  confidence DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

-- Trigger to update updated_at on document_extractions
CREATE OR REPLACE FUNCTION update_document_extractions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_document_extractions_updated_at ON public.document_extractions;
CREATE TRIGGER update_document_extractions_updated_at
  BEFORE UPDATE ON public.document_extractions
  FOR EACH ROW EXECUTE FUNCTION update_document_extractions_updated_at();

-- ============================================
-- CASE ITEMS TABLE
-- Individual items extracted from documents
-- ============================================
CREATE TABLE public.case_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES public.operation_cases(id) ON DELETE CASCADE,
  description TEXT,
  quantity DECIMAL(15,4),
  unit_price DECIMAL(15,2),
  total_price DECIMAL(15,2),
  source_document_id UUID REFERENCES public.case_documents(id) ON DELETE SET NULL,
  confidence DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TARIFF CLASSIFICATIONS TABLE
-- Tariff/HS code classifications for items
-- ============================================
CREATE TABLE public.tariff_classifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES public.operation_cases(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.case_items(id) ON DELETE CASCADE,
  original_description TEXT,
  chile_hs_code_8 TEXT,
  short_description TEXT,
  long_description TEXT,
  normalized_composition JSONB DEFAULT '{}',
  confidence DECIMAL(3,2) DEFAULT 0.00,
  needs_human_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tariff_classifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- SERVICE ROLE POLICIES (for Inngest via createAdminClient)
-- Service role can do ALL operations on all tables

-- Document extractions service_role policies
CREATE POLICY "Service role can do all on document_extractions" ON public.document_extractions
  FOR ALL USING (true) WITH CHECK (true);

-- Case items service_role policies
CREATE POLICY "Service role can do all on case_items" ON public.case_items
  FOR ALL USING (true) WITH CHECK (true);

-- Tariff classifications service_role policies
CREATE POLICY "Service role can do all on tariff_classifications" ON public.tariff_classifications
  FOR ALL USING (true) WITH CHECK (true);

-- AUTHENTICATED USER POLICIES (agency-based access)

-- DOCUMENT EXTRACTIONS: Access through document's case agency
CREATE POLICY "Users can view agency document_extractions" ON public.document_extractions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.case_documents cd
      JOIN public.operation_cases oc ON cd.case_id = oc.id
      WHERE cd.id = document_extractions.document_id
      AND oc.agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can insert agency document_extractions" ON public.document_extractions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.case_documents cd
      JOIN public.operation_cases oc ON cd.case_id = oc.id
      WHERE cd.id = document_extractions.document_id
      AND oc.agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can update agency document_extractions" ON public.document_extractions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.case_documents cd
      JOIN public.operation_cases oc ON cd.case_id = oc.id
      WHERE cd.id = document_extractions.document_id
      AND oc.agency_id = public.get_user_agency_id()
    )
  );

-- CASE ITEMS: Access through case's agency
CREATE POLICY "Users can view agency case_items" ON public.case_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases
      WHERE id = case_items.case_id
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can insert agency case_items" ON public.case_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operation_cases
      WHERE id = case_items.case_id
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can update agency case_items" ON public.case_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases
      WHERE id = case_items.case_id
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can delete agency case_items" ON public.case_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases
      WHERE id = case_items.case_id
      AND agency_id = public.get_user_agency_id()
    )
  );

-- TARIFF CLASSIFICATIONS: Access through case's agency
CREATE POLICY "Users can view agency tariff_classifications" ON public.tariff_classifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases
      WHERE id = tariff_classifications.case_id
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can insert agency tariff_classifications" ON public.tariff_classifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operation_cases
      WHERE id = tariff_classifications.case_id
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can update agency tariff_classifications" ON public.tariff_classifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases
      WHERE id = tariff_classifications.case_id
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can delete agency tariff_classifications" ON public.tariff_classifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases
      WHERE id = tariff_classifications.case_id
      AND agency_id = public.get_user_agency_id()
    )
  );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_document_extractions_document ON public.document_extractions(document_id);
CREATE INDEX idx_document_extractions_status ON public.document_extractions(status);
CREATE INDEX idx_case_items_case ON public.case_items(case_id);
CREATE INDEX idx_case_items_source_document ON public.case_items(source_document_id);
CREATE INDEX idx_tariff_classifications_case ON public.tariff_classifications(case_id);
CREATE INDEX idx_tariff_classifications_item ON public.tariff_classifications(item_id);
