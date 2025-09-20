#!/usr/bin/env node
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const N8N_URL = process.env.N8N_URL;
const API_KEY = process.env.N8N_API_KEY;

if (!N8N_URL || !API_KEY) {
  console.error("Faltan N8N_URL o N8N_API_KEY");
  process.exit(1);
}

const hdr = { "Content-Type": "application/json", "X-N8N-API-KEY": API_KEY };
const fetchJson = async (url, init={}) => {
  const res = await fetch(url, { ...init, headers: { ...(init.headers||{}), ...hdr } });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  return json;
};

const pendingDir = process.argv[2] || "patches/pending";
const files = readdirSync(pendingDir).filter(f => f.endsWith(".json"));
if (!files.length) { console.log("No hay patches en patches/pending."); process.exit(0); }

mkdirSync(".gh-output", { recursive: true });
let created = [];

for (const f of files) {
  const patch = JSON.parse(readFileSync(join(pendingDir, f), "utf8"));
  if (patch.target !== "n8n" || !Array.isArray(patch.artifacts)) {
    console.error(`Saltando ${f}: contrato inválido o sin artifacts`);
    continue;
  }

  for (const a of patch.artifacts) {
    const rawContent = a.content;
    let exportJson;
    if (typeof rawContent === "string") {
      try { exportJson = JSON.parse(rawContent); }
      catch (e) { throw new Error(`artifact.content no es JSON válido en ${f}: ${e.message}`); }
    } else if (rawContent && typeof rawContent === "object") {
      exportJson = rawContent;
    } else {
      throw new Error(`artifact.content debe ser string o JSON object en ${f}`);
    }

    if (!exportJson.nodes || !exportJson.connections) {
      throw new Error(`El export no tiene nodes/connections en ${f}`);
    }

    const baseName = exportJson.name || "unnamed-workflow";
    const newName = `${baseName}-bot-${Date.now()}`;
    const payload = { ...exportJson, name: newName };
    const res = await fetchJson(`${N8N_URL}/rest/workflows`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log(`✔ Created workflow "${res.name || newName}" (id=${res.id || "?"}) from ${f}`);
    created.push({ patch: f, id: res.id || null, name: res.name || newName });
  }
}

writeFileSync(".gh-output/created.json", JSON.stringify(created, null, 2));
console.log("Creations written to .gh-output/created.json");
