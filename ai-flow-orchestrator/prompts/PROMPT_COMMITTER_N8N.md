Genera exclusivamente un objeto JSON con el siguiente formato:

{
  "commit": {
    "message": "<mensaje>"
  },
  "pr": {
    "title": "<titulo>",
    "body": "<cuerpo>"
  }
}

Reglas obligatorias:
- No añadas texto fuera del JSON.
- El `commit.message` debe seguir la convención `feat(n8n): ...`, `fix(n8n): ...` o `refactor(n8n): ...` según el tipo de cambio.
- `pr.title` debe reutilizar la misma convención que el commit.
- `pr.body` debe ser un resumen en formato Markdown (puede incluir listas) del cambio y pruebas realizadas.
