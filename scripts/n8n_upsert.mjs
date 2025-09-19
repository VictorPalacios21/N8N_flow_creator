#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_URL) {
  console.error('La variable de entorno N8N_URL es obligatoria.');
  process.exit(1);
}

if (!N8N_API_KEY) {
  console.error('La variable de entorno N8N_API_KEY es obligatoria.');
  process.exit(1);
}

function normalizeBaseUrl(url) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function ensureN8nExport(data, context) {
  if (data == null || typeof data !== 'object') {
    throw new Error(`${context}: el contenido del export debe ser un objeto JSON.`);
  }
  if (!('nodes' in data) || !Array.isArray(data.nodes)) {
    throw new Error(`${context}: el export debe incluir un arreglo "nodes" válido.`);
  }
  if (!('connections' in data) || typeof data.connections !== 'object') {
    throw new Error(`${context}: el export debe incluir un objeto "connections".`);
  }
}

async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`No se pudo parsear JSON en ${filePath}: ${error.message}`);
  }
}

async function createWorkflow(exportData) {
  const timestampSuffix = `-bot-${Date.now()}`;
  const workflowName = exportData.name ? `${exportData.name}${timestampSuffix}` : `workflow${timestampSuffix}`;
  const payload = { ...exportData, name: workflowName };

  const response = await fetch(`${normalizeBaseUrl(N8N_URL)}/rest/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': N8N_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Error al crear workflow "${workflowName}": ${response.status} ${response.statusText} - ${body}`);
  }

  const result = await response.json();
  console.log(`Workflow creado: ${result.name || workflowName} (ID: ${result.id ?? 'desconocido'})`);
}

async function processContractFile(filePath) {
  const contract = await readJsonFile(filePath);
  if (!Array.isArray(contract.artifacts)) {
    throw new Error(`${filePath}: el contrato debe contener un arreglo "artifacts".`);
  }

  for (const [index, artifact] of contract.artifacts.entries()) {
    const artifactId = `${path.basename(filePath)} -> artifacts[${index}]`;
    if (!artifact || typeof artifact !== 'object') {
      throw new Error(`${artifactId}: artifact inválido.`);
    }

    let exportContent = artifact.content;
    if (typeof exportContent === 'string') {
      try {
        exportContent = JSON.parse(exportContent);
      } catch (error) {
        throw new Error(`${artifactId}: contenido no es JSON válido: ${error.message}`);
      }
    }

    ensureN8nExport(exportContent, artifactId);
    await createWorkflow(exportContent);
  }
}

async function main() {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error('Uso: node scripts/n8n_upsert.mjs <directorio>');
    process.exit(1);
  }

  const resolvedDir = path.resolve(process.cwd(), targetDir);
  let files;
  try {
    files = await fs.readdir(resolvedDir);
  } catch (error) {
    console.error(`No se pudo leer el directorio ${resolvedDir}: ${error.message}`);
    process.exit(1);
  }

  const jsonFiles = files.filter((name) => name.endsWith('.json'));
  if (jsonFiles.length === 0) {
    console.error(`No se encontraron contratos JSON en ${resolvedDir}.`);
    process.exit(1);
  }

  try {
    for (const file of jsonFiles) {
      const fullPath = path.join(resolvedDir, file);
      console.log(`Procesando contrato: ${path.basename(file)}`);
      await processContractFile(fullPath);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
