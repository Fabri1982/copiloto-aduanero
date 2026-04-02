#!/usr/bin/env node
/**
 * Script para ejecutar migraciones SQL en Supabase
 * Usa el Management API de Supabase para ejecutar SQL
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración
const SUPABASE_URL = 'https://nuxtpuyoppssgysjuywf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51eHRwdXlvcHBzc2d5c2p1eXdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NDM1MSwiZXhwIjoyMDkwNjQwMzUxfQ.KACffzgTjS4BJTA5bdxsevcyKcaRj3ZLgE_e6I3e_JY';
const PROJECT_REF = 'nuxtpuyoppssgysjuywf';
const MIGRATION_FILE = join(__dirname, 'supabase', 'migrations', '20260402050000_create_extraction_tables.sql');

// Leer el archivo SQL
const sqlContent = readFileSync(MIGRATION_FILE, 'utf-8');

// Ejecutar SQL via Supabase Management API
async function executeViaManagementApi(query) {
  // Usar el Management API para ejecutar SQL
  // Este endpoint requiere un access token, no el service role key
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  return await response.json();
}

// Ejecutar SQL via el endpoint de query de Supabase Studio (api/pg-meta)
async function executeViaPgMeta(query) {
  const response = await fetch(`${SUPABASE_URL}/api/pg-meta/default/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  return await response.json();
}

// Ejecutar SQL via el endpoint de postgres
async function executeViaPostgres(query) {
  // Endpoint de postgres para SQL
  const response = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ query })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  return await response.json();
}

// Main
async function main() {
  console.log('📄 Leyendo archivo de migración...');
  console.log(`📁 Archivo: ${MIGRATION_FILE}`);
  console.log(`📏 Tamaño: ${sqlContent.length} caracteres`);
  console.log(`🔗 Proyecto: ${SUPABASE_URL}\n`);
  
  console.log('📝 Intentando ejecutar SQL completo...\n');
  
  // Intentar diferentes endpoints
  const endpoints = [
    { name: 'Management API', fn: executeViaManagementApi },
    { name: 'PG Meta API', fn: executeViaPgMeta },
    { name: 'Postgres Query API', fn: executeViaPostgres },
  ];
  
  for (const endpoint of endpoints) {
    console.log(`🔍 Probando ${endpoint.name}...`);
    try {
      const result = await endpoint.fn(sqlContent);
      console.log(`✅ Éxito con ${endpoint.name}!`);
      console.log('Resultado:', JSON.stringify(result, null, 2));
      return;
    } catch (error) {
      console.log(`❌ ${endpoint.name} falló: ${error.message}\n`);
    }
  }
  
  console.log('\n⚠️ Ningún endpoint funcionó directamente.');
  console.log('💡 Recomendación: Usa el SQL Editor en Supabase Studio');
  console.log(`   URL: ${SUPABASE_URL}/project/${PROJECT_REF}/sql`);
  console.log('\n📋 SQL a ejecutar:');
  console.log('='.repeat(80));
  console.log(sqlContent);
  console.log('='.repeat(80));
  
  // Guardar SQL en un archivo para fácil copia
  const outputFile = join(__dirname, 'migration-to-run.sql');
  writeFileSync(outputFile, sqlContent);
  console.log(`\n💾 SQL también guardado en: ${outputFile}`);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
