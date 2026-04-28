# React Example Project

Last Modified: 2025-04-19 23:51:00

A project focused on importing and managing GitHub Copilot prompts, agents, and instructions.

## 📁 Project Structure

```text
.
├── components/           # UI Components (React)
│   └── ui/               # Reusable base components
├── scripts/              # Build and utility scripts
│   └── import-prompts.ts # Markdown to JSON importer
├── tests/                # Test suite
├── src/                  # Application source
│   └── lib/              # Generated JSON and helpers
├── AGENTS.md             # AI Agent guidelines
├── CHANGELOG.md          # Version history
├── TODO.md               # Roadmap and task list
├── LICENSE               # MIT License
├── requirements.txt      # Project requirements
└── .env-example          # Environment configuration template
```

## 🚀 Getting Started

1.  **Clone and Install**:
    ```bash
    npm install
    ```

2.  **Import Prompts**:
    Place Markdown files in `downloaded-repo/` and run:
    ```bash
    npm run import-prompts # or npx tsx scripts/import-prompts.ts
    ```

3.  **Start Development**:
    ```bash
    npm run dev
    ```

## 🛠 Features
- Type-safe prompt importing.
- Dependency resolution between prompts.
- Metadata extraction (titles, tags, category).
- Automated cleanup and formatting.
