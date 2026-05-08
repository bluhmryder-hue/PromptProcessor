import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function processDir(dir: string, category: string, prompts: any[], nameToId: Record<string, string>) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    
    // Extract title from first # Heading or fallback to filename
    let title = file
      .replace('.agent.md', '')
      .replace('.instructions.md', '')
      .replace('.prompt.md', '')
      .replace('.md', '');
      
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    const id = `gh_${category}_${file.replace(/[^a-zA-Z0-9]/g, '_')}`;
    nameToId[file] = id;

    prompts.push({
      id,
      name: file,
      title,
      content,
      tags: ['github', 'copilot', category],
      model_preferences: { temperature: 0.2 },
      dependencies: [], // Will populate in second pass
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}

export function importPrompts() {
  const repoDir = path.join(process.cwd(), 'downloaded-repo');
  const agentsDir = path.join(repoDir, 'agents');
  const instructionsDir = path.join(repoDir, 'instructions');
  const promptsDir = path.join(repoDir, 'prompts'); // Just in case there are prompts here

  const prompts: any[] = [];
  const nameToId: Record<string, string> = {};

  processDir(agentsDir, 'agent', prompts, nameToId);
  processDir(instructionsDir, 'instruction', prompts, nameToId);
  processDir(promptsDir, 'prompt', prompts, nameToId);

  // Second pass: find dependencies based on filenames mentioned in the content
  const allFileNames = Object.keys(nameToId);
  for (const prompt of prompts) {
    const deps = new Set<string>();

    for (const fileName of allFileNames) {
      if (fileName !== prompt.name && prompt.content.includes(fileName)) {
        deps.add(nameToId[fileName]);

        // We will also replace literal mentions of the filename with our {{CALL: filename}} syntax
        // so the PromptLab can resolve them dynamically.
        // We use a global regex to replace it, but we have to be careful not to double-wrap it.
        const regex = new RegExp(`(?<!\\{\\{CALL:\\s*)${fileName.replace(/\\./g, '\\.')}`, 'g');
        prompt.content = prompt.content.replace(regex, `{{CALL: ${fileName}}}`);
      }
    }

    prompt.dependencies = Array.from(deps);
  }

  const outputDir = path.join(process.cwd(), 'src', 'lib');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'github-prompts.json');
  fs.writeFileSync(outputPath, JSON.stringify(prompts, null, 2));

  console.log(`Successfully imported ${prompts.length} prompts to ${outputPath}`);
}

// Check if script is run directly
const isMain = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('import-prompts.ts')
);

if (isMain) {
  importPrompts();
}
