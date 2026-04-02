export interface ExportProfile {
  id: string
  agency_id: string
  profile_key: string
  name: string
  format: 'csv' | 'xlsx' | 'json'
  field_mapping: Record<string, string>
  max_lengths?: Record<string, number>
  required_fields?: string[]
  created_at: string
}

export interface ExportableCaseData {
  caseId: string
  clientName: string
  referenceCode?: string
  status: string
  priority: string
  header: Record<string, {
    value: string | null
    source_document: string
    confidence: number
  }>
  items: Array<{
    description: string
    quantity: number | null
    unit_price: number | null
    total_price: number | null
    source_document: string
    confidence: number
    tariff_classification?: {
      hs_code: string
      description: string
      duty_rate: number
      vat_rate: number
    }
  }>
  conflicts?: Array<{
    field_name: string
    severity: 'low' | 'medium' | 'high'
  }>
}

export interface ExportResult {
  headers: string[]
  rows: string[][]
  warnings: string[]
  format: string
  filename: string
}

// Perfiles de exportación predefinidos
const DEFAULT_PROFILES: Omit<ExportProfile, 'id' | 'agency_id' | 'created_at'>[] = [
  {
    profile_key: 'csv_generic_v1',
    name: 'CSV Genérico v1',
    format: 'csv',
    field_mapping: {
      'expediente_id': 'caseId',
      'referencia': 'referenceCode',
      'cliente': 'clientName',
      'estado': 'status',
      'prioridad': 'priority',
      'numero_factura': 'header.invoice_number.value',
      'fecha_factura': 'header.invoice_date.value',
      'proveedor': 'header.supplier_name.value',
      'moneda': 'header.currency.value',
      'monto_total': 'header.total_amount.value',
      'incoterm': 'header.incoterm.value',
      'peso_bruto': 'header.gross_weight.value',
      'numero_bultos': 'header.package_count.value',
      'transporte_ref': 'header.transport_reference.value',
    },
    required_fields: ['caseId', 'clientName'],
  },
  {
    profile_key: 'sigad_v1',
    name: 'SIGAD v1',
    format: 'csv',
    field_mapping: {
      'DUA': 'referenceCode',
      'NIF_IMPORTADOR': 'header.importer_vat.value',
      'RAZON_SOCIAL': 'clientName',
      'NUMERO_FACTURA': 'header.invoice_number.value',
      'FECHA_FACTURA': 'header.invoice_date.value',
      'PAIS_ORIGEN': 'header.origin_country.value',
      'CODIGO_ADUANA': 'header.customs_office.value',
      'VALOR_ADUANERO': 'header.customs_value.value',
      'POSICION_ARANCELARIA': 'items.0.tariff_classification.hs_code',
      'DESCRIPCION_MERCA': 'items.0.description',
      'PESO_NETO': 'header.net_weight.value',
      'PESO_BRUTO': 'header.gross_weight.value',
    },
    max_lengths: {
      'DUA': 17,
      'NIF_IMPORTADOR': 17,
      'RAZON_SOCIAL': 150,
      'NUMERO_FACTURA': 35,
      'POSICION_ARANCELARIA': 12,
      'DESCRIPCION_MERCA': 280,
    },
    required_fields: ['DUA', 'NIF_IMPORTADOR', 'RAZON_SOCIAL'],
  },
  {
    profile_key: 'xlsx_review_v1',
    name: 'Excel Revisión v1',
    format: 'xlsx',
    field_mapping: {
      'Expediente': 'caseId',
      'Referencia': 'referenceCode',
      'Cliente': 'clientName',
      'Estado': 'status',
      'Prioridad': 'priority',
      'Factura': 'header.invoice_number.value',
      'Fecha': 'header.invoice_date.value',
      'Proveedor': 'header.supplier_name.value',
      'Moneda': 'header.currency.value',
      'Total': 'header.total_amount.value',
      'Incoterm': 'header.incoterm.value',
      'Peso': 'header.gross_weight.value',
      'Bultos': 'header.package_count.value',
      'Transporte': 'header.transport_reference.value',
      'Conflictos': 'conflicts_count',
      'Confianza': 'avg_confidence',
    },
    required_fields: ['Expediente', 'Cliente'],
  },
]

export function getPredefinedProfiles(): typeof DEFAULT_PROFILES {
  return DEFAULT_PROFILES
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return ''
    }
    if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return ''
    }
  }

  return current !== null && current !== undefined ? String(current) : ''
}

function truncateValue(value: string, maxLength: number | undefined): string {
  if (!maxLength || value.length <= maxLength) {
    return value
  }
  return value.substring(0, maxLength)
}

export function generateExport(
  caseData: ExportableCaseData,
  profile: ExportProfile
): ExportResult {
  const warnings: string[] = []
  const headers: string[] = []
  const row: string[] = []

  // Construir datos auxiliares
  const dataWithMeta = {
    ...caseData,
    conflicts_count: String(caseData.conflicts?.length || 0),
    avg_confidence: calculateAvgConfidence(caseData),
  }

  // Procesar cada campo del mapeo
  for (const [header, fieldPath] of Object.entries(profile.field_mapping)) {
    headers.push(header)
    
    let value = getNestedValue(dataWithMeta as unknown as Record<string, unknown>, fieldPath)
    
    // Aplicar truncado si existe max_length para este campo
    if (profile.max_lengths && profile.max_lengths[header]) {
      const originalValue = value
      value = truncateValue(value, profile.max_lengths[header])
      if (originalValue !== value) {
        warnings.push(`Campo "${header}" truncado de ${originalValue.length} a ${value.length} caracteres`)
      }
    }

    // Verificar campos requeridos
    if (profile.required_fields?.includes(header) && !value) {
      warnings.push(`Campo requerido "${header}" está vacío`)
    }

    row.push(value)
  }

  // Generar nombre de archivo
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `${profile.profile_key}_${caseData.referenceCode || caseData.caseId}_${timestamp}.${profile.format}`

  return {
    headers,
    rows: [row],
    warnings,
    format: profile.format,
    filename,
  }
}

export function generateBatchExport(
  casesData: ExportableCaseData[],
  profile: ExportProfile
): ExportResult {
  if (casesData.length === 0) {
    return {
      headers: Object.keys(profile.field_mapping),
      rows: [],
      warnings: ['No hay datos para exportar'],
      format: profile.format,
      filename: `${profile.profile_key}_empty.${profile.format}`,
    }
  }

  const warnings: string[] = []
  const headers = Object.keys(profile.field_mapping)
  const rows: string[][] = []

  for (const caseData of casesData) {
    const dataWithMeta = {
      ...caseData,
      conflicts_count: String(caseData.conflicts?.length || 0),
      avg_confidence: calculateAvgConfidence(caseData),
    }

    const row: string[] = []
    for (const [header, fieldPath] of Object.entries(profile.field_mapping)) {
      let value = getNestedValue(dataWithMeta as unknown as Record<string, unknown>, fieldPath)
      
      if (profile.max_lengths && profile.max_lengths[header]) {
        value = truncateValue(value, profile.max_lengths[header])
      }

      if (profile.required_fields?.includes(header) && !value) {
        warnings.push(`Caso ${caseData.caseId}: campo requerido "${header}" está vacío`)
      }

      row.push(value)
    }
    rows.push(row)
  }

  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `${profile.profile_key}_batch_${casesData.length}_${timestamp}.${profile.format}`

  return {
    headers,
    rows,
    warnings: [...new Set(warnings)], // Eliminar duplicados
    format: profile.format,
    filename,
  }
}

function calculateAvgConfidence(caseData: ExportableCaseData): string {
  const confidences: number[] = []
  
  // Confianza de campos del header
  for (const field of Object.values(caseData.header)) {
    if (field.confidence) {
      confidences.push(field.confidence)
    }
  }
  
  // Confianza de items
  for (const item of caseData.items) {
    if (item.confidence) {
      confidences.push(item.confidence)
    }
  }

  if (confidences.length === 0) return '0'
  
  const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length
  return avg.toFixed(2)
}
