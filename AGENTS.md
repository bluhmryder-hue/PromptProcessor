# AGENTS.md

Last Modified: 2025-04-19 23:46:00

## 🤖 AI Agent Guidelines

### Coding Standards
- **TypeScript First**: Use strict typing and avoid `any`.
- **Functionality over Form**: Never break behavior for cleanliness.
- **Self-Documentation**: Code should be readable, but complex logic needs comments.

### Key Scripts
- `scripts/import-prompts.ts`: Processes raw Markdown files into a structured JSON for the frontend.
- `npm run lint`: Runs type-checking across the project.

### Project Flow (A -> B -> C)
1. **A**: Markdown files in `downloaded-repo`.
2. **B**: Import script processes files, adds metadata, and resolves dependencies.
3. **C**: `src/lib/github-prompts.json` is generated for consumption by the React application.
