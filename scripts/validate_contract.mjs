#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`No se pudo parsear JSON en ${filePath}: ${error.message}`);
  }
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

async function validateContractFile(filePath) {
  const contract = await readJsonFile(filePath);
  if (contract.target !== 'n8n') {
    throw new Error(`${filePath}: "target" debe ser "n8n".`);
  }
  if (!Array.isArray(contract.artifacts) || contract.artifacts.length === 0) {
    throw new Error(`${filePath}: "artifacts" debe ser un arreglo no vacío.`);
  }

  for (const [index, artifact] of contract.artifacts.entries()) {
    const artifactId = `${filePath} -> artifacts[${index}]`;
    if (!artifact || typeof artifact !== 'object') {
      throw new Error(`${artifactId}: artifact inválido.`);
    }
    if (typeof artifact.path !== 'string' || !artifact.path.startsWith('flows/n8n/')) {
      throw new Error(`${artifactId}: "path" debe iniciar con "flows/n8n/".`);
    }
    if (artifact.mode !== 'overwrite') {
      throw new Error(`${artifactId}: "mode" debe ser "overwrite".`);
    }
    if (!('content' in artifact)) {
      throw new Error(`${artifactId}: falta "content".`);
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
  }

  console.log(`Contrato válido: ${path.basename(filePath)}`);
}

async function main() {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error('Uso: node scripts/validate_contract.mjs <directorio>');
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
      await validateContractFile(fullPath);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
