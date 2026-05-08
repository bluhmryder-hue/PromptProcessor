import { test, mock } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { processDir } from './import-prompts.ts';

test('processDir should return early if directory does not exist', (t) => {
  const existsSyncMock = mock.method(fs, 'existsSync', () => false);
  const readdirSyncMock = mock.method(fs, 'readdirSync');

  const prompts: any[] = [];
  const nameToId: Record<string, string> = {};

  processDir('non-existent-dir', 'test', prompts, nameToId);

  assert.strictEqual(existsSyncMock.mock.callCount(), 1);
  assert.strictEqual(readdirSyncMock.mock.callCount(), 0);
  assert.strictEqual(prompts.length, 0);

  existsSyncMock.mock.restore();
  readdirSyncMock.mock.restore();
});

test('processDir should correctly process markdown files', (t) => {
  const testDir = 'test-dir';
  const fileName = 'test.md';
  const fileContent = '# Test Title\nTest content';

  const existsSyncMock = mock.method(fs, 'existsSync', (path: string) => path === testDir);
  const readdirSyncMock = mock.method(fs, 'readdirSync', (path: string) => {
    if (path === testDir) return [fileName as unknown as fs.Dirent];
    return [];
  });
  const readFileSyncMock = mock.method(fs, 'readFileSync', (filePath: string) => {
    if (filePath === path.join(testDir, fileName)) return fileContent;
    return '';
  });

  const prompts: any[] = [];
  const nameToId: Record<string, string> = {};

  processDir(testDir, 'test', prompts, nameToId);

  assert.strictEqual(prompts.length, 1);
  assert.strictEqual(prompts[0].title, 'Test Title');
  assert.strictEqual(prompts[0].content, fileContent);
  assert.strictEqual(nameToId[fileName], 'gh_test_test_md');

  existsSyncMock.mock.restore();
  readdirSyncMock.mock.restore();
  readFileSyncMock.mock.restore();
});
