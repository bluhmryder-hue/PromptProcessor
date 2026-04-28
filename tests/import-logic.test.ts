// Last Modified: 2025-04-19 23:53:00
/**
 * Mocking file system for tests.
 * These tests verify the logic of prompt processing.
 */

import { describe, it, expect } from 'vitest';
import { extractTitle, generateId } from '../scripts/import-prompts';

describe('Prompt Importer Logic', () => {
  it('should extract title from filename if no heading is present', () => {
    const file = 'my-prompt.md';
    const content = 'Hello world';
    expect(extractTitle(file, content)).toBe('my-prompt');
  });

  it('should extract title from first # Heading', () => {
    const file = 'my-prompt.md';
    const content = '# Custom Title\nHello world';
    expect(extractTitle(file, content)).toBe('Custom Title');
  });

  it('should generate consistent IDs', () => {
    expect(generateId('test.md', 'agent')).toBe('gh_agent_test_md');
    expect(generateId('my-agent.agent.md', 'agent')).toBe('gh_agent_my_agent_agent_md');
  });

  it('should handle special characters in filenames for ID generation', () => {
    expect(generateId('a b.md', 'prompt')).toBe('gh_prompt_a_b_md');
  });
});
