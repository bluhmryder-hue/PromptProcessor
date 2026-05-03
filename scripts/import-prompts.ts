import fs from 'fs';
import path from 'path';

const repoDir = path.join(process.cwd(), 'downloaded-repo');
const agentsDir = path.join(repoDir, 'agents');
const instructionsDir = path.join(repoDir, 'instructions');
const promptsDir = path.join(repoDir, 'prompts');

const prompts: any[] = [];
const nameToId: Record<string, string> = {};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function processDir(dir: string, category: string) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    
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
      dependencies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}

processDir(agentsDir, 'agent');
processDir(instructionsDir, 'instruction');
processDir(promptsDir, 'prompt');

// Second pass: find dependencies using a single-pass optimized regex
const allFileNames = Object.keys(nameToId).sort((a, b) => b.length - a.length);

if (allFileNames.length > 0) {
  const escapedNames = allFileNames.map(escapeRegExp);
  // Pattern Explanation:
  // 1. (?<!{{CALL:\s*)         -> Avoid double-wrapping existing calls
  // 2. (?<![\w\-.])            -> Ensure no leading filename-valid chars (whole word)
  // 3. (file1|file2|...)       -> Match any of our filenames (longest first)
  // 4. (?![\w\-])              -> Ensure not followed by alphanumeric or dash
  // 5. (?!\.[\w\-])            -> Ensure not followed by a dot that is part of an extension (allows trailing sentence period)
  const pattern = `(?<!{{CALL:\\s*)(?<![\\w\\-.])(${escapedNames.join('|')})(?![\\w\\-])(?!\\.[\\w\\-])`;
  const masterRegex = new RegExp(pattern, 'g');

  for (const prompt of prompts) {
    const deps = new Set<string>();

    prompt.content = prompt.content.replace(masterRegex, (match: string) => {
      // Only replace if it's NOT the prompt itself
      if (match === prompt.name) return match;
      
      const id = nameToId[match];
      deps.add(id);
      return `{{CALL: ${match}}}`;
    });

    prompt.dependencies = Array.from(deps);
  }
}

const outputPath = path.join(process.cwd(), 'src', 'lib', 'github-prompts.json');
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(prompts, null, 2));

console.log(`Successfully imported ${prompts.length} prompts to ${outputPath}`);
