// ==UserScript==
// @name         KudoAI Persona Browser
// @namespace    Ryder.Tools
// @version      1.1.0
// @description  Browse, search, favorite, and copy the complete KudoAI persona library.
// @author       Ryder
// @homepageURL  https://github.com/bluhmryder-hue/PromptProcessor
// @downloadURL  https://raw.githubusercontent.com/bluhmryder-hue/PromptProcessor/main/kudoai-persona-browser.user.js
// @updateURL    https://raw.githubusercontent.com/bluhmryder-hue/PromptProcessor/main/kudoai-persona-browser.user.js
// @match        *://*/*
// @grant        GM_getResourceText
// @grant        GM_getValue
// @grant        GM_setValue
// @resource     ai-personas https://cdn.jsdelivr.net/npm/@kudoai/ai-personas@1/dist/ai-personas.min.json
// @run-at       document-idle
// ==/UserScript==

(() => {
    'use strict';

    const PREFIX = 'ryder-ai-personas-';
    const KEYS = {
        favorites: PREFIX + 'favorites',
        recent: PREFIX + 'recent',
        last: PREFIX + 'last'
    };

    if (document.getElementById('ryder-persona-launcher')) return;

    function readSetting(key, fallback) {
        try {
            const value = GM_getValue(key, fallback);
            return value === undefined || value === null ? fallback : value;
        } catch (error) {
            console.warn('[AI Personas] Could not read saved setting:', key, error);
            return fallback;
        }
    }

    function writeSetting(key, value) {
        try {
            GM_setValue(key, value);
        } catch (error) {
            console.warn('[AI Personas] Could not save setting:', key, error);
        }
    }

    let rawData;
    let personas;

    try {
        rawData = GM_getResourceText('ai-personas');
        if (!rawData) throw new Error('The Tampermonkey resource was empty.');
        personas = JSON.parse(rawData);
    } catch (error) {
        console.error('[AI Personas] Failed to load the persona database:', error);
        return;
    }

    if (!personas || typeof personas !== 'object' || Array.isArray(personas)) {
        console.error('[AI Personas] The downloaded database has an unexpected format.');
        return;
    }

    const entries = Object.entries(personas)
        .filter(([, data]) => data && typeof data.prompt === 'string')
        .map(([name, data]) => ({
            name,
            prompt: data.prompt,
            nameLower: name.toLocaleLowerCase(),
            promptLower: data.prompt.toLocaleLowerCase()
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, {
            sensitivity: 'base',
            numeric: true
        }));

    if (!entries.length) {
        console.error('[AI Personas] The database loaded, but it contained no usable persona prompts.');
        return;
    }

    const byName = new Map(entries.map(entry => [entry.name, entry]));
    const favorites = new Set(
        readSetting(KEYS.favorites, []).filter(name => byName.has(name))
    );
    let recent = readSetting(KEYS.recent, [])
        .filter((name, index, list) => byName.has(name) && list.indexOf(name) === index)
        .slice(0, 100);

    const style = document.createElement('style');
    style.textContent = [
        '#ryder-persona-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483646;background:#6655cc;color:#fff;border:0;border-radius:24px;padding:12px 18px;cursor:pointer;font:600 14px sans-serif;box-shadow:0 3px 15px #0005}',
        '#ryder-persona-panel{position:fixed;right:16px;bottom:76px;width:min(570px,calc(100vw - 32px));height:min(790px,calc(100vh - 100px));z-index:2147483647;display:none;flex-direction:column;background:#202124;color:#eee;border:1px solid #555;border-radius:12px;box-shadow:0 5px 30px #0009;font:14px/1.4 system-ui,sans-serif;overflow:hidden}',
        '#ryder-persona-panel *{box-sizing:border-box}',
        '#ryder-persona-panel button,#ryder-persona-panel input,#ryder-persona-panel select,#ryder-persona-panel textarea{font:inherit}',
        '.rp-header{padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #444}',
        '.rp-title{font-weight:700;font-size:15px}',
        '.rp-subtitle{font-size:11px;color:#aaa;margin-top:2px}',
        '.rp-header button,.rp-actions button,.rp-page button,.rp-random{cursor:pointer;border:0;border-radius:6px;padding:8px 11px;background:#51449b;color:#fff}',
        '.rp-search-row{padding:10px 12px 6px}',
        '#rp-search{width:100%;padding:11px;border:1px solid #555;border-radius:7px;background:#303134;color:#fff;outline:none}',
        '.rp-controls{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:6px 12px 10px}',
        '.rp-controls select{min-width:0;width:100%;padding:8px;border:1px solid #555;border-radius:6px;background:#303134;color:#eee}',
        '.rp-statusbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 13px;border-top:1px solid #444;border-bottom:1px solid #444;color:#bbb;font-size:11px}',
        '#rp-count{min-width:0}',
        '.rp-random{padding:5px 9px;font-size:11px;white-space:nowrap}',
        '#rp-results{overflow-y:auto;overscroll-behavior:contain;flex:1;min-height:80px;padding:8px 10px}',
        '.rp-empty{padding:22px 10px;text-align:center;color:#aaa}',
        '.rp-row{display:flex;align-items:stretch;gap:5px;margin:0 0 4px}',
        '.rp-item{flex:1;min-width:0;text-align:left;padding:8px 10px;border:0;border-radius:6px;background:#303134;color:#eee;cursor:pointer;overflow:hidden}',
        '.rp-item:hover,.rp-item.selected{background:#51449b}',
        '.rp-item-name{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}',
        '.rp-item-preview{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#aaa;font-size:11px;margin-top:2px}',
        '.rp-star{width:36px;flex:0 0 36px;border:0;border-radius:6px;background:#303134;color:#f4d36b;cursor:pointer;font-size:17px}',
        '.rp-star:hover{background:#454545}',
        '.rp-page{display:flex;align-items:center;justify-content:center;gap:12px;padding:8px 10px;border-top:1px solid #444}',
        '.rp-page button:disabled{opacity:.35;cursor:default}',
        '#rp-page-label{font-size:11px;color:#bbb;min-width:90px;text-align:center}',
        '#rp-preview{padding:10px 12px;border-top:1px solid #555;background:#252629}',
        '.rp-preview-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}',
        '#rp-name{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '#rp-favorite{flex:0 0 auto;background:#393939;color:#f4d36b}',
        '#rp-prompt{display:block;width:100%;height:112px;resize:vertical;padding:9px;background:#303134;color:#eee;border:1px solid #555;border-radius:7px;font:12px/1.4 ui-monospace,monospace}',
        '.rp-actions{display:flex;gap:7px;margin-top:7px}',
        '.rp-actions button{flex:1}',
        '#rp-copy{background:#6655cc}',
        '#rp-message{font-size:11px;color:#aaa;min-height:15px;margin-top:5px}',
        '@media(max-width:480px){#ryder-persona-panel{right:8px;bottom:68px;width:calc(100vw - 16px);height:calc(100vh - 84px)}#ryder-persona-launcher{right:12px;bottom:12px}.rp-controls{grid-template-columns:1fr 1fr}}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);

    const launcher = document.createElement('button');
    launcher.id = 'ryder-persona-launcher';
    launcher.type = 'button';
    launcher.textContent = 'AI Personas (' + entries.length.toLocaleString() + ')';

    const panel = document.createElement('section');
    panel.id = 'ryder-persona-panel';
    panel.setAttribute('aria-label', 'KudoAI Persona Browser');
    panel.innerHTML =
        '<div class="rp-header">' +
            '<div><div class="rp-title">KudoAI Persona Browser</div>' +
            '<div class="rp-subtitle" id="rp-dataset-info"></div></div>' +
            '<button id="rp-close" type="button">Close</button>' +
        '</div>' +
        '<div class="rp-search-row"><input id="rp-search" type="search" placeholder="Search persona names and prompts..." autocomplete="off"></div>' +
        '<div class="rp-controls">' +
            '<select id="rp-view" aria-label="Persona collection">' +
                '<option value="all">All personas</option>' +
                '<option value="favorites">Favorites</option>' +
                '<option value="recent">Recently used</option>' +
            '</select>' +
            '<select id="rp-letter" aria-label="Filter by first letter"><option value="">All letters</option></select>' +
            '<select id="rp-sort" aria-label="Sort personas">' +
                '<option value="az">Name: A to Z</option>' +
                '<option value="za">Name: Z to A</option>' +
                '<option value="recent">Recently used first</option>' +
            '</select>' +
            '<select id="rp-page-size" aria-label="Results per page">' +
                '<option value="50">50 per page</option>' +
                '<option value="100" selected>100 per page</option>' +
                '<option value="200">200 per page</option>' +
            '</select>' +
            '<select id="rp-search-mode" aria-label="Search fields">' +
                '<option value="both">Search names and prompts</option>' +
                '<option value="names">Search names only</option>' +
            '</select>' +
            '<button id="rp-random" class="rp-random" type="button">Random match</button>' +
        '</div>' +
        '<div class="rp-statusbar"><span id="rp-count" aria-live="polite"></span></div>' +
        '<div id="rp-results"></div>' +
        '<div class="rp-page">' +
            '<button id="rp-prev" type="button">Previous</button>' +
            '<span id="rp-page-label"></span>' +
            '<button id="rp-next" type="button">Next</button>' +
        '</div>' +
        '<div id="rp-preview">' +
            '<div class="rp-preview-head"><strong id="rp-name">Select a persona</strong>' +
            '<button id="rp-favorite" type="button" disabled>☆ Favorite</button></div>' +
            '<textarea id="rp-prompt" readonly placeholder="Select a persona to preview its full prompt..."></textarea>' +
            '<div class="rp-actions"><button id="rp-copy" type="button" disabled>Copy prompt</button></div>' +
            '<div id="rp-message" role="status" aria-live="polite"></div>' +
        '</div>';

    (document.body || document.documentElement).append(launcher, panel);

    const el = id => panel.querySelector('#' + id);
    const searchInput = el('rp-search');
    const viewSelect = el('rp-view');
    const letterSelect = el('rp-letter');
    const sortSelect = el('rp-sort');
    const pageSizeSelect = el('rp-page-size');
    const searchModeSelect = el('rp-search-mode');
    const results = el('rp-results');
    const countLabel = el('rp-count');
    const pageLabel = el('rp-page-label');
    const previousButton = el('rp-prev');
    const nextButton = el('rp-next');
    const selectedName = el('rp-name');
    const promptBox = el('rp-prompt');
    const favoriteButton = el('rp-favorite');
    const copyButton = el('rp-copy');
    const message = el('rp-message');

    let selected = null;
    let currentPage = 0;
    let filteredEntries = entries;

    for (let code = 65; code <= 90; code++) {
        const letter = String.fromCharCode(code);
        const option = document.createElement('option');
        option.value = letter;
        option.textContent = letter;
        letterSelect.appendChild(option);
    }
    const otherOption = document.createElement('option');
    otherOption.value = '#';
    otherOption.textContent = 'Other';
    letterSelect.appendChild(otherOption);

    el('rp-dataset-info').textContent =
        entries.length.toLocaleString() + ' personas loaded · ' +
        Math.round(rawData.length / 1024).toLocaleString() + ' KB source';

    function persistCollections() {
        writeSetting(KEYS.favorites, Array.from(favorites));
        writeSetting(KEYS.recent, recent);
    }

    function updateFavoriteButton() {
        if (!selected) {
            favoriteButton.textContent = '☆ Favorite';
            favoriteButton.disabled = true;
            return;
        }
        const isFavorite = favorites.has(selected.name);
        favoriteButton.textContent = isFavorite ? '★ Favorited' : '☆ Favorite';
        favoriteButton.disabled = false;
    }

    function getFilteredEntries() {
        const query = searchInput.value.trim().toLocaleLowerCase();
        const terms = query ? query.split(/\s+/).filter(Boolean) : [];
        const view = viewSelect.value;
        const firstLetter = letterSelect.value;
        const searchNamesOnly = searchModeSelect.value === 'names';

        let list = entries.filter(entry => {
            if (view === 'favorites' && !favorites.has(entry.name)) return false;
            if (view === 'recent' && !recent.includes(entry.name)) return false;

            if (firstLetter) {
                const first = entry.name.charAt(0).toLocaleUpperCase();
                if (firstLetter === '#') {
                    if (/[A-Z]/.test(first)) return false;
                } else if (first !== firstLetter) {
                    return false;
                }
            }

            if (!terms.length) return true;
            return terms.every(term =>
                entry.nameLower.includes(term) ||
                (!searchNamesOnly && entry.promptLower.includes(term))
            );
        });

        if (sortSelect.value === 'za') {
            list = list.slice().reverse();
        } else if (sortSelect.value === 'recent') {
            const recentOrder = new Map(recent.map((name, index) => [name, index]));
            list = list.slice().sort((a, b) =>
                (recentOrder.get(a.name) ?? Number.MAX_SAFE_INTEGER) -
                (recentOrder.get(b.name) ?? Number.MAX_SAFE_INTEGER) ||
                a.name.localeCompare(b.name)
            );
        }
        return list;
    }

    function renderResults(resetPage) {
        if (resetPage) currentPage = 0;
        filteredEntries = getFilteredEntries();

        const total = filteredEntries.length;
        const pageSize = Number(pageSizeSelect.value) || 100;
        const pageCount = Math.max(1, Math.ceil(total / pageSize));

        if (currentPage >= pageCount) currentPage = pageCount - 1;
        const start = currentPage * pageSize;
        const end = Math.min(start + pageSize, total);
        const pageEntries = filteredEntries.slice(start, end);

        countLabel.textContent = total
            ? 'Showing ' + (start + 1).toLocaleString() + '–' + end.toLocaleString() +
              ' of ' + total.toLocaleString() + ' matches · ' +
              entries.length.toLocaleString() + ' total'
            : '0 matches · ' + entries.length.toLocaleString() + ' total personas';

        pageLabel.textContent = 'Page ' + (currentPage + 1) + ' of ' + pageCount;
        previousButton.disabled = currentPage <= 0;
        nextButton.disabled = currentPage >= pageCount - 1;

        results.replaceChildren();
        if (!pageEntries.length) {
            const empty = document.createElement('div');
            empty.className = 'rp-empty';
            empty.textContent = 'No personas match these filters.';
            results.appendChild(empty);
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const entry of pageEntries) {
            const row = document.createElement('div');
            row.className = 'rp-row';

            const choose = document.createElement('button');
            choose.type = 'button';
            choose.className = 'rp-item' + (selected && selected.name === entry.name ? ' selected' : '');

            const title = document.createElement('span');
            title.className = 'rp-item-name';
            title.textContent = entry.name;

            const preview = document.createElement('span');
            preview.className = 'rp-item-preview';
            preview.textContent = entry.prompt.replace(/\s+/g, ' ').slice(0, 150);

            choose.append(title, preview);
            choose.addEventListener('click', () => selectPersona(entry.name));

            const star = document.createElement('button');
            star.type = 'button';
            star.className = 'rp-star';
            star.textContent = favorites.has(entry.name) ? '★' : '☆';
            star.title = favorites.has(entry.name) ? 'Remove favorite' : 'Add favorite';
            star.setAttribute('aria-label', star.title + ': ' + entry.name);
            star.addEventListener('click', () => toggleFavorite(entry.name));

            row.append(choose, star);
            fragment.appendChild(row);
        }
        results.appendChild(fragment);
    }

    function selectPersona(personaName) {
        const entry = byName.get(personaName);
        if (!entry) return;

        selected = entry;
        selectedName.textContent = entry.name;
        promptBox.value = entry.prompt;
        copyButton.disabled = false;
        message.textContent = 'Full prompt · ' + entry.prompt.length.toLocaleString() + ' characters';

        recent = [entry.name, ...recent.filter(name => name !== entry.name)].slice(0, 100);
        writeSetting(KEYS.last, entry.name);
        persistCollections();
        updateFavoriteButton();
        renderResults(false);
    }

    function toggleFavorite(personaName) {
        if (favorites.has(personaName)) {
            favorites.delete(personaName);
        } else {
            favorites.add(personaName);
        }
        persistCollections();
        if (selected && selected.name === personaName) updateFavoriteButton();
        renderResults(false);
    }

    launcher.addEventListener('click', () => {
        const opening = panel.style.display !== 'flex';
        panel.style.display = opening ? 'flex' : 'none';
        if (opening) searchInput.focus();
    });

    el('rp-close').addEventListener('click', () => {
        panel.style.display = 'none';
    });

    searchInput.addEventListener('input', () => renderResults(true));
    viewSelect.addEventListener('change', () => renderResults(true));
    letterSelect.addEventListener('change', () => renderResults(true));
    sortSelect.addEventListener('change', () => renderResults(true));
    pageSizeSelect.addEventListener('change', () => renderResults(true));
    searchModeSelect.addEventListener('change', () => renderResults(true));

    previousButton.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            renderResults(false);
        }
    });

    nextButton.addEventListener('click', () => {
        const pageSize = Number(pageSizeSelect.value) || 100;
        const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
        if (currentPage < pageCount - 1) {
            currentPage++;
            renderResults(false);
        }
    });

    el('rp-random').addEventListener('click', () => {
        const currentMatches = getFilteredEntries();
        if (!currentMatches.length) {
            message.textContent = 'No matching personas to choose from.';
            return;
        }
        const randomEntry = currentMatches[Math.floor(Math.random() * currentMatches.length)];
        selectPersona(randomEntry.name);
    });

    favoriteButton.addEventListener('click', () => {
        if (selected) toggleFavorite(selected.name);
    });

    copyButton.addEventListener('click', async () => {
        if (!selected) return;
        try {
            await navigator.clipboard.writeText(selected.prompt);
            message.textContent = 'Copied full prompt (' + selected.prompt.length.toLocaleString() + ' characters).';
        } catch (error) {
            promptBox.focus();
            promptBox.select();
            message.textContent = 'Clipboard access was blocked. Press Ctrl+C to copy the selected text.';
        }
    });

    const previousSelection = readSetting(KEYS.last, '');
    if (previousSelection && byName.has(previousSelection)) {
        selectPersona(previousSelection);
    } else {
        updateFavoriteButton();
    }

    renderResults(true);

    console.info(
        '[AI Personas] Loaded ' + entries.length.toLocaleString() +
        ' personas from ' + rawData.length.toLocaleString() + ' source characters.'
    );
})();