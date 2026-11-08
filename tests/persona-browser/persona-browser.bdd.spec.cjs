const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const USERSCRIPT_PATH = path.resolve(__dirname, '../../kudoai-persona-browser.user.js');
const USERSCRIPT = fs.readFileSync(USERSCRIPT_PATH, 'utf8');

function makeDataset() {
  const dataset = {
    'Python Programming Assistant': {
      prompt: 'Act as a Python programming assistant. Write Python scripts, debug software, explain algorithms, and review code.'
    },
    'Creative Writing Coach': {
      prompt: 'Act as a creative writing coach. Help with fiction, storytelling, novels, editing, and character development.'
    },
    'Dungeons & Dragons Game Master': {
      prompt: 'Act as a tabletop roleplaying game master. Create quests, NPCs, adventures, and fantasy encounters.'
    },
    'Data Analysis Specialist': {
      prompt: 'Act as a data analyst. Analyze datasets, build dashboards, use statistics, and explain SQL queries.'
    },
    'Travel Planner': {
      prompt: 'Act as a travel planner. Build itineraries, compare destinations, and organize vacations.'
    }
  };

  for (let i = 1; i <= 205; i++) {
    const number = String(i).padStart(3, '0');
    dataset['Sample Persona ' + number] = {
      prompt: 'Fixture persona ' + number + '. A deterministic sample record used to verify full-list browsing and pagination.'
    };
  }
  return dataset;
}

test.describe('KudoAI Persona Browser — BDD acceptance scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.setContent('<!doctype html><html><head><title>Userscript test host</title></head><body><main>Host page</main></body></html>');

    await page.evaluate(({ source, dataset }) => {
      const store = Object.create(null);
      window.GM_getResourceText = name => {
        if (name !== 'ai-personas') throw new Error('Unexpected resource: ' + name);
        return JSON.stringify(dataset);
      };
      window.GM_getValue = (key, fallback) =>
        Object.prototype.hasOwnProperty.call(store, key) ? structuredClone(store[key]) : fallback;
      window.GM_setValue = (key, value) => {
        store[key] = structuredClone(value);
      };
      window.__tampermonkeyStore = store;

      const script = document.createElement('script');
      script.textContent = source;
      document.head.appendChild(script);
    }, { source: USERSCRIPT, dataset: makeDataset() });
  });

  test('Given the script is installed, when the launcher is clicked, then the full persona library opens', async ({ page }) => {
    const launcher = page.locator('#ryder-persona-launcher');
    await expect(launcher).toContainText('210');
    await launcher.click();

    await expect(page.locator('#ryder-persona-panel')).toBeVisible();
    await expect(page.locator('#rp-count')).toContainText('210 total');
    await expect(page.locator('#rp-results .rp-row')).toHaveCount(100);
  });

  test('Given more than one page of personas, when Next is selected, then the next page is reachable', async ({ page }) => {
    await page.locator('#ryder-persona-launcher').click();
    await page.locator('#rp-page-size').selectOption('50');

    await expect(page.locator('#rp-page-label')).toHaveText('Page 1 of 5');
    await page.locator('#rp-next').click();
    await expect(page.locator('#rp-page-label')).toHaveText('Page 2 of 5');
    await expect(page.locator('#rp-results .rp-row')).toHaveCount(50);
  });

  test('Given a user searches prompt content, when the query is entered, then matching personas are found', async ({ page }) => {
    await page.locator('#ryder-persona-launcher').click();
    await page.locator('#rp-search').fill('algorithms');

    await expect(page.locator('#rp-count')).toContainText('1 matches');
    await expect(page.locator('#rp-results')).toContainText('Python Programming Assistant');
  });

  test('Given inferred categories and tags, when filters are applied, then the list narrows to the matching topic', async ({ page }) => {
    await page.locator('#ryder-persona-launcher').click();
    await page.locator('#rp-category').selectOption('Software & Technology');

    await expect(page.locator('#rp-results')).toContainText('Python Programming Assistant');
    await expect(page.locator('#rp-results')).not.toContainText('Creative Writing Coach');

    await page.locator('#rp-advanced summary').click();
    const pythonTag = page.locator('.rp-tag-option').filter({ hasText: /^Python/ });
    await expect(pythonTag).toBeVisible();
    await pythonTag.locator('input').check();

    await expect(page.locator('#rp-results')).toContainText('Python Programming Assistant');
    await expect(page.locator('#rp-count')).toContainText('1 matches');
  });

  test('Given a selected persona, when it is favorited, then Favorites shows it', async ({ page }) => {
    await page.locator('#ryder-persona-launcher').click();
    await page.locator('.rp-item').filter({ hasText: 'Python Programming Assistant' }).click();
    await page.locator('#rp-favorite').click();
    await page.locator('#rp-view').selectOption('favorites');

    await expect(page.locator('#rp-count')).toContainText('1 matches');
    await expect(page.locator('#rp-results')).toContainText('Python Programming Assistant');
  });

  test('Given a selected persona, when personal tags and category are saved, then they persist in Tampermonkey storage', async ({ page }) => {
    await page.locator('#ryder-persona-launcher').click();
    await page.locator('.rp-item').filter({ hasText: 'Python Programming Assistant' }).click();

    await page.locator('#rp-persona-category').selectOption('Education & Learning');
    await page.locator('#rp-custom-tags').fill('Ryder Picks, Automation');
    await page.locator('#rp-save-tags').click();

    const saved = await page.evaluate(() => window.__tampermonkeyStore);
    expect(saved['ryder-ai-personas-category-overrides']['Python Programming Assistant']).toBe('Education & Learning');
    expect(saved['ryder-ai-personas-custom-tags']['Python Programming Assistant']).toEqual(['Ryder Picks', 'Automation']);
  });

  test('Given the panel is open, when its title bar is dragged, then the panel moves and its position is saved', async ({ page }) => {
    await page.locator('#ryder-persona-launcher').click();

    const panel = page.locator('#ryder-persona-panel');
    const header = page.locator('.rp-header');
    const before = await panel.boundingBox();
    const headerBox = await header.boundingBox();

    await page.mouse.move(headerBox.x + 90, headerBox.y + 15);
    await page.mouse.down();
    await page.mouse.move(headerBox.x - 10, headerBox.y + 95, { steps: 8 });
    await page.mouse.up();

    const after = await panel.boundingBox();
    expect(Math.abs(after.x - before.x)).toBeGreaterThan(50);
    expect(Math.abs(after.y - before.y)).toBeGreaterThan(40);

    const stored = await page.evaluate(() => window.__tampermonkeyStore['ryder-ai-personas-panel-position']);
    expect(stored).toBeTruthy();
    expect(Math.abs(stored.left - after.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(stored.top - after.y)).toBeLessThanOrEqual(2);
  });

  test('Given the panel was moved, when it is closed and reopened, then its saved position is restored', async ({ page }) => {
    await page.locator('#ryder-persona-launcher').click();
    const panel = page.locator('#ryder-persona-panel');
    const headerBox = await page.locator('.rp-header').boundingBox();

    await page.mouse.move(headerBox.x + 90, headerBox.y + 15);
    await page.mouse.down();
    await page.mouse.move(headerBox.x + 170, headerBox.y + 85, { steps: 8 });
    await page.mouse.up();

    const moved = await panel.boundingBox();
    await page.locator('#rp-close').click();
    await page.locator('#ryder-persona-launcher').click();

    const restored = await panel.boundingBox();
    expect(Math.abs(restored.x - moved.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(restored.y - moved.y)).toBeLessThanOrEqual(2);
  });

  test('Given the browser is centered, when the bottom-right resize handle is dragged, then its width and height both change', async ({ page }) => {
    await page.locator('#ryder-persona-launcher').click();

    // Move the browser away from the viewport edge so it has room to grow.
    const headerBox = await page.locator('.rp-header').boundingBox();
    await page.mouse.move(headerBox.x + 90, headerBox.y + 15);
    await page.mouse.down();
    await page.mouse.move(550, 180, { steps: 8 });
    await page.mouse.up();

    const panel = page.locator('#ryder-persona-panel');
    await panel.evaluate(node => {
      node.style.left = '400px';
      node.style.top = '100px';
      node.style.right = 'auto';
      node.style.bottom = 'auto';
    });
    const before = await panel.boundingBox();
    const handle = page.locator('#rp-panel-resize');
    await expect(handle).toBeVisible();
    await expect(handle).toHaveAttribute('aria-label', 'Resize entire browser');

    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 110, handleBox.y + handleBox.height / 2 + 85, { steps: 12 });
    await page.mouse.up();

    const after = await panel.boundingBox();
    expect(after.width).toBeGreaterThan(before.width + 70);
    expect(after.height).toBeGreaterThan(before.height + 55);

    const saved = await page.evaluate(() => window.__tampermonkeyStore['ryder-ai-personas-panel-size']);
    expect(saved).toBeTruthy();
    expect(saved.width).toBeGreaterThan(before.width + 70);
    expect(saved.height).toBeGreaterThan(before.height + 55);
  });

  test('Given the results list is visible, when its resize handle is dragged, then the list height changes independently', async ({ page }) => {
    await page.locator('#ryder-persona-launcher').click();

    const list = page.locator('#rp-results');
    const before = await list.boundingBox();
    const handle = page.locator('#rp-results-grip');
    await expect(handle).toBeVisible();
    await expect(handle).toHaveAttribute('aria-label', 'Resize results area');

    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 70, { steps: 10 });
    await page.mouse.up();

    const after = await list.boundingBox();
    expect(after.height).toBeGreaterThan(before.height + 25);
    const saved = await page.evaluate(() => window.__tampermonkeyStore['ryder-ai-personas-results-height']);
    expect(saved).toBeGreaterThan(before.height + 25);
  });

  test('Given the live KudoAI release dataset, when the final alphabetical persona is searched, then records beyond the first page remain reachable', async ({ page }) => {
    const response = await fetch(
      'https://cdn.jsdelivr.net/npm/@kudoai/ai-personas@1/dist/ai-personas.min.json',
      { signal: AbortSignal.timeout(30000) }
    );
    expect(response.ok).toBeTruthy();
    const dataset = await response.json();
    const usableEntries = Object.entries(dataset)
      .filter(([, data]) => data && typeof data.prompt === 'string')
      .sort(([a], [b]) => a.localeCompare(b, undefined, {
        sensitivity: 'base',
        numeric: true
      }));

    expect(usableEntries.length).toBeGreaterThan(1500);
    const finalAlphabeticalName = usableEntries[usableEntries.length - 1][0];

    // Run the real production data through the same Tampermonkey API shims as the fixture tests.
    await page.setContent('<!doctype html><html><head><title>Live dataset test host</title></head><body></body></html>');
    await page.evaluate(({ source, liveDataset }) => {
      const store = Object.create(null);
      window.GM_getResourceText = name => {
        if (name !== 'ai-personas') throw new Error('Unexpected resource: ' + name);
        return JSON.stringify(liveDataset);
      };
      window.GM_getValue = (key, fallback) =>
        Object.prototype.hasOwnProperty.call(store, key) ? structuredClone(store[key]) : fallback;
      window.GM_setValue = (key, value) => {
        store[key] = structuredClone(value);
      };
      window.__tampermonkeyStore = store;

      const script = document.createElement('script');
      script.textContent = source;
      document.head.appendChild(script);
    }, { source: USERSCRIPT, liveDataset: dataset });

    const launcher = page.locator('#ryder-persona-launcher');
    await expect(launcher).toContainText(usableEntries.length.toLocaleString());
    await launcher.click();

    await page.locator('#rp-search-mode').selectOption('names');
    await page.locator('#rp-search').fill(finalAlphabeticalName);

    await expect(page.locator('#rp-count')).toContainText('1 matches');
    await expect(page.locator('#rp-results')).toContainText(finalAlphabeticalName);
  });


  test('Given the panel was resized, when it is closed and reopened, then its saved dimensions are restored', async ({ page }) => {
    await page.locator('#ryder-persona-launcher').click();
    const panel = page.locator('#ryder-persona-panel');
    await panel.evaluate(node => {
      node.style.left = '400px';
      node.style.top = '100px';
      node.style.right = 'auto';
      node.style.bottom = 'auto';
    });
    const handle = page.locator('#rp-panel-resize');
    const box = await handle.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 70, { steps: 8 });
    await page.mouse.up();

    const expected = await panel.boundingBox();
    await page.locator('#rp-close').click();
    await page.locator('#ryder-persona-launcher').click();
    const restored = await panel.boundingBox();

    expect(Math.abs(restored.width - expected.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(restored.height - expected.height)).toBeLessThanOrEqual(2);
  });

  test('Given the results area was resized, when the panel is closed and reopened, then its saved height is restored', async ({ page }) => {
    await page.locator('#ryder-persona-launcher').click();
    const list = page.locator('#rp-results');
    const grip = page.locator('#rp-results-grip');
    const box = await grip.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 65, { steps: 8 });
    await page.mouse.up();

    const expected = await list.boundingBox();
    await page.locator('#rp-close').click();
    await page.locator('#ryder-persona-launcher').click();
    const restored = await list.boundingBox();

    expect(Math.abs(restored.height - expected.height)).toBeLessThanOrEqual(3);
  });

});
