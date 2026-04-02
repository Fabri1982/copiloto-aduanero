// Database types - will be auto-generated from Supabase later
// For now, define the basic types we need

export type UserRole = 'admin' | 'supervisor' | 'operador' | 'backoffice' | 'cliente'

export type CaseStatus = 
  | 'draft'
  | 'documents_uploaded'
  | 'processing'
  | 'needs_review'
  | 'ready_for_provision'
  | 'provision_sent'
  | 'payment_uploaded'
  | 'payment_under_validation'
  | 'closed'

export type DocumentType = 
  | 'commercial_invoice'
  | 'packing_list'
  | 'bl'
  | 'awb'
  | 'payment_receipt'
  | 'unknown'

export type AlertSeverity = 'low' | 'medium' | 'high'

export type ProvisionStatus = 
  | 'draft'
  | 'ready_to_send'
  | 'sent'
  | 'viewed'
  | 'payment_pending'
  | 'payment_uploaded'
  | 'payment_validated'

export type PaymentStatus = 'pending' | 'validated' | 'rejected'

export interface Agency {
  id: string
  name: string
  settings_json: Record<string, unknown>
  created_at: string
}

export interface User {
  id: string
  agency_id: string
  role: UserRole
  name: string
  email: string
  created_at: string
}

export interface OperationCase {
  id: string
  agency_id: string
  client_name: string
  reference_code: string
  status: CaseStatus
  priority: 'low' | 'medium' | 'high'
  created_by: string
  created_at: string
  updated_at: string
}

export interface CaseDocument {
  id: string
  case_id: string
  file_path: string
  document_type: DocumentType
  file_name: string
  uploaded_by: string
  version: number
  created_at: string
}

export interface AuditEvent {
  id: string
  agency_id: string
  case_id: string | null
  actor_type: 'user' | 'agent' | 'system'
  actor_id: string
  event_name: string
  event_payload_json: Record<string, unknown>
  created_at: string
}
