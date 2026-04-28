# Project TODO

Last Modified: 2025-04-19 23:45:00

## 🎯 Top 30 High-Priority Items (Selected via 5-Agent Review)

1.  **Error Handling for Repo**: Implement checks for missing `downloaded-repo` directory.
2.  **Auto-Create Output Dir**: Automatically create `src/lib/` if it doesn't exist.
3.  **Schema Validation**: Implement Zod or similar validation for the output JSON.
4.  **Unit Tests**: Add tests for `processDir` and filename parsing.
5.  **Integration Tests**: Test the full pipeline from Markdown to JSON.
6.  **Logging System**: Implement structured logging (Info, Warn, Error).
7.  **Frontmatter Support**: Allow metadata extraction from YAML frontmatter.
8.  **Dry-Run Mode**: CLI flag to simulate import without writing files.
9.  **Configuration File**: Support a `config.json` for paths and categories.
10. **Duplicate ID Detection**: Handle or warn about colliding prompt IDs.
11. **Tag Extraction**: Extract tags from `#tag` syntax in Markdown body.
12. **JSON Documentation**: Document the structure and usage of `github-prompts.json`.
13. **Markdown Linting**: Basic linting of input files for better quality.
14. **Exclude Patterns**: Ability to ignore specific files or subdirectories.
15. **Formatted Output**: Ensure the output JSON is pretty-printed and stable.
16. **TypeScript Exports**: Generate a `.ts` file with types alongside the JSON.
17. **Search Indexing**: Generate a lightweight search index for the UI.
18. **CLI Arguments**: Use `yargs` or `commander` for flexible paths.
19. **Dependency Regex Fix**: Improve dependency detection to avoid false positives.
20. **Circular Dep Check**: Detect and prevent circular dependencies in prompts.
21. **Metadata Enhancement**: Add word count and estimated token usage.
22. **Import Cache**: Speed up imports by only processing changed files.
23. **Diff Preview**: Show what prompts were added, removed, or changed.
24. **Multi-Flavor Markdown**: Support different Markdown parsers/flavors.
25. **Auto-Fixer**: Automatically fix minor formatting issues in prompts.
26. **Link Verification**: Check that internal links between prompts are valid.
27. **Token Constraints**: Warn if prompts exceed typical model limits.
28. **Cost Estimator**: Estimate the cost of using the prompts based on tokens.
29. **Backup System**: Keep a rolling backup of the previous JSON export.
30. **Success Notifications**: Simple console-based success report with stats.

---
*Brainstorming & Selection Process completed by Agents: Architect, Developer, QA, DevOps, and Product Manager.*
