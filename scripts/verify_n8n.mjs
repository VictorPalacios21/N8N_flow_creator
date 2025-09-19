#!/usr/bin/env node
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const N8N_URL = process.env.N8N_URL;
const API_KEY = process.env.N8N_API_KEY;
const WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || "";

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

mkdirSync(".gh-output", { recursive: true });

const pendingDir = process.argv[2] || "patches/pending";
const files = readdirSync(pendingDir).filter(f => f.endsWith(".json"));
let created = [];
try { created = JSON.parse(readFileSync(".gh-output/created.json", "utf8")); } catch {}

const results = [];
let globalOk = true;

for (const f of files) {
  const patch = JSON.parse(readFileSync(join(pendingDir, f), "utf8"));
  const verify = patch.verification || null;
  const track = created.find(c => c.patch === f);

  const item = { patch: f, exists: false, webhookTest: null, ok: false };

  const list = await fetchJson(`${N8N_URL}/rest/workflows`);
  const wf = Array.isArray(list?.data)
    ? list.data.find(w => (track?.id ? w.id === track.id : (track?.name && w.name === track.name)))
    : null;

  item.exists = !!wf;

  if (verify?.type === "webhook" && WEBHOOK_BASE && wf) {
    const url = `${WEBHOOK_BASE.replace(/\/$/, "")}/${(verify.path||"").replace(/^\//, "")}`;
    const res = await fetch(url, {
      method: verify.method || "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(verify.payload || {}),
    });
    const text = await res.text();
    let body = null; try { body = JSON.parse(text); } catch { body = text; }

    const expectStatus = verify.expect?.status;
    const expectJson = verify.expect?.json;
    const statusOk = expectStatus ? res.status === expectStatus : res.ok;
    const jsonOk = expectJson ? JSON.stringify(body).includes(JSON.stringify(expectJson)) : true;

    item.webhookTest = { url, status: res.status, response: body, statusOk, jsonOk };
  }

  item.ok = item.exists && (!item.webhookTest || (item.webhookTest.statusOk && item.webhookTest.jsonOk));
  if (!item.ok) globalOk = false;
  results.push(item);
}

const out = { ok: globalOk, results };
writeFileSync(".gh-output/verification.json", JSON.stringify(out, null, 2));
console.log(`Verification: ${globalOk ? "OK" : "FAIL"} (see .gh-output/verification.json)`);
