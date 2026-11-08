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
    await page.locator('#rp-results')).not.toContainText('Creative Writing Coach');

    await page.locator('#rp-advanced summary').click();
    const pythonTag = page.locator('.rp-tag-option').filter({ hasText: /^Python\s/ });
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
    await page.mouse.move(headerBox.x + 190, headerBox.y + 95, { steps: 8 });
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
    const before = await panel.boundingBox();
    const resizeStyle = await panel.evaluate(node => getComputedStyle(node).resize);
    expect(resizeStyle).toBe('both');

    await page.mouse.move(before.x + before.width - 4, before.y + before.height - 4);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width + 100, before.y + before.height + 80, { steps: 12 });
    await page.mouse.up();

    const after = await panel.boundingBox();
    expect(after.width).toBeGreaterThan(before.width + 35);
    expect(after.height).toBeGreaterThan(before.height + 25);
  });

  test('Given the results list is visible, when its resize handle is dragged, then the list height changes independently', async ({ page }) => {
    await page.locator('#ryder-persona-launcher').click();

    const list = page.locator('#rp-results');
    const before = await list.boundingBox();
    const resizeStyle = await list.evaluate(node => getComputedStyle(node).resize);
    expect(resizeStyle).toBe('vertical');

    await page.mouse.move(before.x + before.width - 4, before.y + before.height - 4);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width - 4, before.y + before.height + 65, { steps: 10 });
    await page.mouse.up();

    const after = await list.boundingBox();
    expect(after.height).toBeGreaterThan(before.height + 20);
  });
});
