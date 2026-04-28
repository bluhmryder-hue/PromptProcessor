# 📋 Universal Prompt Engineering Framework - Task Registry

## 🛠️ Roadmap & Pending Actions

This registry tracks all planned, ongoing, and completed tasks within the UPEF ecosystem.

### 📅 Metadata
- **Created At:** 2026-04-26 20:55:00 UTC
- **Last Modified:** 2026-04-26 20:55:00 UTC

---

## ⚡ High Priority: Performance & Optimization
- [x] **Regex Compilation Optimization:** Move `RegExp` creation outside the nested loop in `import-prompts.ts`. (COMPLETED)
- [ ] **Dependency Graph Memoization:** Implement a caching layer for the second-pass dependency resolution in `import-prompts.ts`.
- [ ] **Firestore Batching:** Optimize user workflow saves by using Firestore Batched Writes.

## 📖 Documentation & Clarity
- [x] **Comprehensive README:** Create an excessively detailed README with a filetree and system overviews. (COMPLETED)
- [x] **Unified ID System:** Refactor `import-prompts.ts` to use "General-Specific" ID naming conventions. (COMPLETED)
- [ ] **API Reference:** Document the Gemini integration endpoints and retry logic.

## 🎨 Frontend & UI/UX
- [ ] **Mobile Responsiveness:** Audit the Refiner Engine UI for small-screen compatibility.
- [ ] **Theme Customization:** Allow users to define custom hex codes for themes.
- [ ] **Dark Mode Persistence:** Store theme preference in `localStorage`.

## 🧪 Testing & Quality Assurance
- [ ] **Unit Tests for Import Script:** Validate regex replacement logic with edge cases (e.g., nested `CALL` tags).
- [ ] **End-to-End Flow:** Playwright script to verify the 12-phase refinement process.

---

## 🛑 Ambiguity & Conflict Notes
*None reported at this time.*
