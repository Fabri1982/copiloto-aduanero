-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AGENCIES TABLE
-- ============================================
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  settings_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'operador', 'backoffice', 'cliente')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- OPERATION CASES TABLE
-- ============================================
CREATE TABLE public.operation_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  reference_code TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'documents_uploaded', 'processing', 'needs_review',
    'ready_for_provision', 'provision_sent', 'payment_uploaded',
    'payment_under_validation', 'closed'
  )),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.operation_cases ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_operation_cases_updated_at
  BEFORE UPDATE ON public.operation_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CASE DOCUMENTS TABLE
-- ============================================
CREATE TABLE public.case_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES public.operation_cases(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'unknown' CHECK (document_type IN (
    'commercial_invoice', 'packing_list', 'bl', 'awb', 'payment_receipt', 'unknown'
  )),
  file_name TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- AUDIT EVENTS TABLE
-- ============================================
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.operation_cases(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'agent', 'system')),
  actor_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_payload_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Helper function to get user's agency_id
CREATE OR REPLACE FUNCTION public.get_user_agency_id()
RETURNS UUID AS $$
  SELECT agency_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- AGENCIES: Users can only see their own agency
CREATE POLICY "Users can view own agency" ON public.agencies
  FOR SELECT USING (id = public.get_user_agency_id());

CREATE POLICY "Admins can update own agency" ON public.agencies
  FOR UPDATE USING (id = public.get_user_agency_id())
  WITH CHECK (id = public.get_user_agency_id());

-- PROFILES: Users can see profiles in their agency
CREATE POLICY "Users can view agency profiles" ON public.profiles
  FOR SELECT USING (agency_id = public.get_user_agency_id());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (agency_id = public.get_user_agency_id());

-- OPERATION CASES: Users can CRUD cases in their agency
CREATE POLICY "Users can view agency cases" ON public.operation_cases
  FOR SELECT USING (agency_id = public.get_user_agency_id());

CREATE POLICY "Users can create agency cases" ON public.operation_cases
  FOR INSERT WITH CHECK (agency_id = public.get_user_agency_id());

CREATE POLICY "Users can update agency cases" ON public.operation_cases
  FOR UPDATE USING (agency_id = public.get_user_agency_id())
  WITH CHECK (agency_id = public.get_user_agency_id());

CREATE POLICY "Users can delete agency cases" ON public.operation_cases
  FOR DELETE USING (agency_id = public.get_user_agency_id());

-- CASE DOCUMENTS: Access through case's agency
CREATE POLICY "Users can view agency case documents" ON public.case_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = case_documents.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can insert agency case documents" ON public.case_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = case_documents.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can update agency case documents" ON public.case_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = case_documents.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

CREATE POLICY "Users can delete agency case documents" ON public.case_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.operation_cases 
      WHERE id = case_documents.case_id 
      AND agency_id = public.get_user_agency_id()
    )
  );

-- AUDIT EVENTS: Users can view events in their agency
CREATE POLICY "Users can view agency audit events" ON public.audit_events
  FOR SELECT USING (agency_id = public.get_user_agency_id());

CREATE POLICY "Users can insert agency audit events" ON public.audit_events
  FOR INSERT WITH CHECK (agency_id = public.get_user_agency_id());

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_profiles_agency ON public.profiles(agency_id);
CREATE INDEX idx_operation_cases_agency ON public.operation_cases(agency_id);
CREATE INDEX idx_operation_cases_status ON public.operation_cases(status);
CREATE INDEX idx_operation_cases_created_by ON public.operation_cases(created_by);
CREATE INDEX idx_case_documents_case ON public.case_documents(case_id);
CREATE INDEX idx_audit_events_agency ON public.audit_events(agency_id);
CREATE INDEX idx_audit_events_case ON public.audit_events(case_id);
CREATE INDEX idx_audit_events_created ON public.audit_events(created_at DESC);

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-documents', 'case-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'case-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'case-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'case-documents' AND auth.role() = 'authenticated');
