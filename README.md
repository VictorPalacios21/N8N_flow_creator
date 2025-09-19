ai-flow-orchestrator/
├─ README.md
├─ prompts/
│  ├─ PROMPT_EDITOR_DE_FLUJOS_N8N.md      # prompt para que el modelo produzca SOLO el contrato JSON
│  └─ PROMPT_COMMITTER_N8N.md             # prompt para generar commit/PR JSON
├─ flows/
│  └─ n8n/                                # opcional: carpeta “oficial” si decides versionar exports
├─ patches/
│  └─ pending/                            # aquí pegas los contratos JSON que devuelve el modelo
│     └─ ejemplo.json
├─ scripts/
│  ├─ validate_contract.mjs               # valida el contrato y el export de n8n
│  └─ n8n_upsert.mjs                      # importa en n8n con modo create-only
└─ .github/
   └─ workflows/
      ├─ import-to-n8n.yml                # corre en PR con etiqueta `import-to-n8n`
      └─ dispatch-to-n8n.yml              # (opcional) POST a un webhook de validación
