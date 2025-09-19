# AI Flow Orchestrator

Este repositorio mínimo viable coordina la generación, validación e importación de flujos de trabajo para n8n (Community Edition) bajo una política **create-only**. Los cambios se describen como contratos JSON almacenados en `patches/pending/` y posteriormente importados automáticamente a n8n mediante GitHub Actions.

## Estructura del repositorio

```
README.md
.github/
  workflows/
    import-to-n8n.yml
    dispatch-to-n8n.yml
patches/
  pending/
    ejemplo.json
prompts/
  PROMPT_EDITOR_DE_FLUJOS_N8N.md
  PROMPT_COMMITTER_N8N.md
scripts/
  validate_contract.mjs
  n8n_upsert.mjs
flows/
  n8n/
    .gitkeep
```

## Componentes principales

- **prompts/**: Contienen los prompts para el rol de editor (genera contratos JSON válidos de n8n) y para el rol de committer (sintetiza mensajes de commit y PR).
- **flows/n8n/**: Directorio destinado a los exports completos de workflows. Se mantiene vacío hasta que un contrato aplicado cree nuevos flujos.
- **patches/pending/**: Carpeta con contratos pendientes de importar. Cada contrato describe una o varias piezas (`artifacts`) que deben almacenarse bajo `flows/n8n/`.
- **scripts/**:
  - `validate_contract.mjs`: Verifica que los contratos cumplan con el esquema requerido antes de importarlos.
  - `n8n_upsert.mjs`: Importa los workflows a n8n creando siempre nuevas copias con sufijo `-bot-<timestamp>`.
- **.github/workflows/**:
  - `import-to-n8n.yml`: Automatiza la validación e importación cuando un Pull Request recibe la etiqueta `import-to-n8n`.
  - `dispatch-to-n8n.yml`: Permite disparar manualmente un webhook opcional para integraciones adicionales.

## Flujo de trabajo

1. El editor genera un contrato JSON usando el prompt `PROMPT_EDITOR_DE_FLUJOS_N8N.md` y lo coloca en `patches/pending/`.
2. Antes de fusionar los cambios, el contrato es validado con `node scripts/validate_contract.mjs patches/pending`.
3. Al etiquetar un Pull Request con `import-to-n8n`, el workflow `import-to-n8n.yml` ejecuta la validación y luego `node scripts/n8n_upsert.mjs patches/pending`, importando automáticamente los workflows a n8n con modo create-only.
4. El committer sintetiza mensajes usando el prompt `PROMPT_COMMITTER_N8N.md` para mantener consistencia en commits y Pull Requests.

## Requisitos de entorno

- Node.js 20+
- Variables de entorno/secrets disponibles en GitHub Actions:
  - `N8N_URL`: URL base de la instancia n8n (sin credenciales incrustadas).
  - `N8N_API_KEY`: API Key con permisos para crear workflows.
  - `N8N_WEBHOOK_URL` (opcional): Webhook externo para orquestación adicional.

## Ejecución manual

```bash
# Validar contratos pendientes
node scripts/validate_contract.mjs patches/pending

# Importar contratos (requiere N8N_URL y N8N_API_KEY configurados)
N8N_URL="https://tu-instancia.n8n.app" \
N8N_API_KEY="tu_api_key" \
node scripts/n8n_upsert.mjs patches/pending
```

## Contratos de ejemplo

Se incluye `patches/pending/ejemplo.json` con un contrato que crea un flujo "Hello Webhook" compuesto por dos nodos: Webhook y Respond to Webhook. Este export sirve como referencia del formato esperado.
