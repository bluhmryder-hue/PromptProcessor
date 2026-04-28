# ⚡ Universal Prompt Engineering Framework (UPEF)

## 📖 Comprehensive Project Overview

The **Universal Prompt Engineering Framework (UPEF)** is a high-authority, model-agnostic environment designed for advanced prompt engineering, library management, and iterative refinement. It leverages cutting-edge LLM integration (primarily Google Gemini) and a robust React-based frontend to facilitate the construction of complex, multi-dimensional prompts.

This framework is built to transform raw conceptual inputs into highly structured "Meta-Prompts" through a multi-phase refinement engine.

### 📅 Metadata & Versioning
- **Created At:** 2026-04-26 20:20:00 UTC
- **Last Modified:** 2026-04-26 20:55:00 UTC
- **Version:** 1.0.0-Stable

---

## 🏗️ Detailed Project Structure

Below is the exhaustive filetree diagram of the repository, detailing the purpose of every directory and core file.

```text
.
├── components/                 # Frontend UI components (React)
│   └── ui/                     # Reusable Atomic UI modules (Shadcn/UI based)
│       ├── accordion.tsx       # Collapsible content sections
│       ├── dropdown-menu.tsx   # Contextual navigation and action menus
│       └── select.tsx          # Form selection inputs
├── scripts/                    # Backend/Build-time utility scripts
│   └── import-prompts.ts       # HIGH PERFORMANCE: Imports and transforms raw markdown prompts
├── .env.sample                 # Template for environment-specific variables
├── InitialIdea.txt             # Original conceptual prototype of the refinement engine
├── LICENSE                     # MIT License documentation
├── README.md                   # YOU ARE HERE: Comprehensive project documentation
├── TODO.md                     # Roadmap and pending task registry
├── index.html                  # Main application entry point
├── metadata.json               # Application manifest and capability definitions
├── package.json                # Project dependencies and script definitions
├── tsconfig.json               # TypeScript compiler configuration
└── vite.config.ts              # Vite build and development server configuration
```

---

## 🛠️ Core Systems Documentation

### 1. Refinement Engine (`InitialIdea.txt`)
The heart of the application. It utilizes a 12-phase logic synthesis protocol:
- **Phase 1 (Expansion):** Conceptual framework scaling (600-1000 words).
- **Phase 2 (Generation):** Weakness identification and generation of 60 unique modifications.
- **Phase 3 (Consolidation):** Synthesis into 10 high-impact master concepts and Meta-Prompt integration.

### 2. Import Automation (`scripts/import-prompts.ts`)
A performance-optimized script that:
- Scans `downloaded-repo` for `.md` files.
- Generates unique, descriptive IDs for each prompt.
- **Optimized Regex Logic:** Uses pre-compiled regex maps to replace filename mentions with dynamic `{{CALL: ...}}` syntax, ensuring O(N) regex overhead instead of O(N^2).

### 3. Frontend Architecture
Built with **React 19**, **Tailwind CSS 4**, and **Framer Motion**.
- **Theming System:** Includes presets like "Architect Slate", "Night City", and "Digital Rain".
- **State Management:** Uses React hooks with Firestore synchronization for persistence.

---

## 🚀 Getting Started

### Prerequisites
- Node.js v22.x or higher
- npm v11.x or higher

### Installation
1. Clone the repository.
2. Copy `.env.sample` to `.env` and fill in your API keys.
3. Run `npm install` to populate `node_modules`.

### Development
```bash
npm run dev
```

---

## 📜 Legal & Compliance
This project is licensed under the MIT License. See the `LICENSE` file for full details.

---

## 🛡️ Ambiguity Resolution Notice
All components are designed with strict operational protocols. Any deviation from the defined logic sequences in `import-prompts.ts` or the refinement engine must be documented in `TODO.md` before implementation.
