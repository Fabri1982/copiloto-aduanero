import { processDocument } from './process-document'
import { orchestrateCase } from './orchestrate-case'
import { generateProvision } from './generate-provision'

export const functions = [
  processDocument,
  orchestrateCase,
  generateProvision,
]
