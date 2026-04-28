// Last Modified: 2025-04-19 23:55:00
import fs from 'fs';
import path from 'path';

interface Prompt {
  id: string;
  name: string;
  title: string;
  content: string;
  tags: string[];
  model_preferences: {
    temperature: number;
  };
  dependencies: string[];
  createdAt: number;
  updatedAt: number;
}

const repoDir = path.join(process.cwd(), 'downloaded-repo');
const agentsDir = path.join(repoDir, 'agents');
const instructionsDir = path.join(repoDir, 'instructions');
const promptsDir = path.join(repoDir, 'prompts'); // Just in case there are prompts here

const prompts: Prompt[] = [];
const nameToId: Record<string, string> = {};

export function extractTitle(file: string, content: string): string {
  let title = file
    .replace('.agent.md', '')
    .replace('.instructions.md', '')
    .replace('.prompt.md', '')
    .replace('.md', '');

  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }
  return title;
}

export function generateId(file: string, category: string): string {
  return `gh_${category}_${file.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function processDir(dir: string, category: string) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    
    const title = extractTitle(file, content);
    const id = generateId(file, category);
    nameToId[file] = id;

    const prompt: Prompt = {
      id,
      name: file,
      title,
      content,
      tags: ['github', 'copilot', category],
      model_preferences: { temperature: 0.2 },
      dependencies: [], // Will populate in second pass
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    prompts.push(prompt);
  }
}

processDir(agentsDir, 'agent');
processDir(instructionsDir, 'instruction');
processDir(promptsDir, 'prompt');

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

const outputPath = path.join(process.cwd(), 'src', 'lib', 'github-prompts.json');
fs.writeFileSync(outputPath, JSON.stringify(prompts, null, 2));

console.log(`Successfully imported ${prompts.length} prompts to ${outputPath}`);
