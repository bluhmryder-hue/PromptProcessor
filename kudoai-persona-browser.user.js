// ==UserScript==
// @name         KudoAI Persona Browser
// @namespace    Ryder.Tools
// @version      1.0.1
// @description  Search, preview, and copy 1,400+ AI personas from KudoAI.
// @author       Ryder
// @homepageURL  https://github.com/bluhmryder-hue/PromptProcessor
// @downloadURL  https://raw.githubusercontent.com/bluhmryder-hue/PromptProcessor/main/kudoai-persona-browser.user.js
// @updateURL    https://raw.githubusercontent.com/bluhmryder-hue/PromptProcessor/main/kudoai-persona-browser.user.js
// @match        *://*/*
// @grant        GM_getResourceText
// @resource     ai-personas https://cdn.jsdelivr.net/npm/@kudoai/ai-personas@1/dist/ai-personas.min.json
// @run-at       document-idle
// ==/UserScript==

(() => {
    'use strict';

    const STORAGE_KEY = 'ryder-ai-personas-last';
    let personas;

    try {
        personas = JSON.parse(GM_getResourceText('ai-personas'));
    } catch (error) {
        console.error('[AI Personas] Failed to load dataset:', error);
        return;
    }

    if (!personas || typeof personas !== 'object' || Array.isArray(personas)) {
        console.error('[AI Personas] The downloaded dataset has an unexpected format.');
        return;
    }

    const entries = Object.entries(personas)
        .filter(([, data]) => data && typeof data.prompt === 'string')
        .sort(([a], [b]) => a.localeCompare(b));

    const style = document.createElement('style');
    style.textContent = `
        #ryder-persona-launcher {
            position: fixed; right: 20px; bottom: 20px;
            z-index: 2147483646; background: #6655cc; color: white;
            border: 0; border-radius: 24px; padding: 12px 18px;
            cursor: pointer; font: 600 14px sans-serif;
            box-shadow: 0 3px 15px #0005;
        }
        #ryder-persona-panel {
            position: fixed; right: 20px; bottom: 75px;
            width: min(420px, calc(100vw - 40px));
            height: min(600px, calc(100vh - 110px));
            z-index: 2147483647; display: none; flex-direction: column;
            background: #202124; color: #eee; border: 1px solid #555;
            border-radius: 12px; box-shadow: 0 5px 30px #0008;
            font: 14px sans-serif; overflow: hidden;
        }
        #ryder-persona-panel * { box-sizing: border-box; }
        #ryder-persona-panel input, #ryder-persona-panel button { font: inherit; }
        .rp-header {
            padding: 14px; display: flex; justify-content: space-between;
            align-items: center; border-bottom: 1px solid #444;
        }
        .rp-header button, .rp-actions button {
            cursor: pointer; border: 0; border-radius: 6px;
            padding: 9px 12px; background: #6655cc; color: white;
        }
        #rp-search {
            margin: 12px; padding: 11px; border: 1px solid #555;
            border-radius: 7px; background: #303134; color: white; outline: none;
        }
        #rp-results { overflow-y: auto; flex: 1; padding: 0 12px; }
        .rp-item {
            display: block; width: 100%; text-align: left; padding: 10px;
            margin-bottom: 4px; border: 0; border-radius: 6px;
            background: #303134; color: white; cursor: pointer;
        }
        .rp-item:hover, .rp-item.selected { background: #51449b; }
        #rp-preview { padding: 12px; border-top: 1px solid #444; }
        #rp-prompt {
            width: 100%; height: 125px; resize: vertical; padding: 10px;
            background: #303134; color: white; border: 1px solid #555;
            border-radius: 7px;
        }
        .rp-actions { display: flex; gap: 8px; margin-top: 9px; }
        .rp-actions button { flex: 1; }
        #rp-status { font-size: 12px; color: #aaa; margin-top: 8px; }
    `;
    (document.head || document.documentElement).appendChild(style);

    const launcher = document.createElement('button');
    launcher.id = 'ryder-persona-launcher';
    launcher.type = 'button';
    launcher.textContent = 'AI Personas';

    const panel = document.createElement('div');
    panel.id = 'ryder-persona-panel';
    panel.innerHTML = `
        <div class="rp-header">
            <strong>AI Persona Browser</strong>
            <button id="rp-close" type="button">Close</button>
        </div>
        <input id="rp-search" type="search" placeholder="Search personas..." autocomplete="off">
        <div id="rp-results"></div>
        <div id="rp-preview">
            <strong id="rp-name">Select a persona</strong>
            <textarea id="rp-prompt" readonly placeholder="Persona prompt appears here..."></textarea>
            <div class="rp-actions"><button id="rp-copy" type="button">Copy prompt</button></div>
            <div id="rp-status" role="status" aria-live="polite"></div>
        </div>
    `;

    (document.body || document.documentElement).append(launcher, panel);

    const search = panel.querySelector('#rp-search');
    const results = panel.querySelector('#rp-results');
    const prompt = panel.querySelector('#rp-prompt');
    const name = panel.querySelector('#rp-name');
    const status = panel.querySelector('#rp-status');
    let selected = null;

    function selectPersona(personaName) {
        selected = personaName;
        name.textContent = personaName;
        prompt.value = personas[personaName].prompt;
        panel.querySelectorAll('.rp-item').forEach(button => {
            button.classList.toggle('selected', button.dataset.name === personaName);
        });
        status.textContent = '';
        try { localStorage.setItem(STORAGE_KEY, personaName); } catch (_) { /* optional */ }
    }

    function renderResults(query = '') {
        const normalized = query.trim().toLocaleLowerCase();
        const matches = entries.filter(([personaName, data]) =>
            personaName.toLocaleLowerCase().includes(normalized) ||
            data.prompt.toLocaleLowerCase().includes(normalized)
        ).slice(0, 150);

        results.replaceChildren();
        for (const [personaName] of matches) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'rp-item';
            button.textContent = personaName;
            button.dataset.name = personaName;
            button.addEventListener('click', () => selectPersona(personaName));
            results.appendChild(button);
        }
        if (!matches.length) results.textContent = 'No matching personas found.';
    }

    launcher.addEventListener('click', () => {
        const opening = panel.style.display !== 'flex';
        panel.style.display = opening ? 'flex' : 'none';
        if (opening) search.focus();
    });

    panel.querySelector('#rp-close').addEventListener('click', () => {
        panel.style.display = 'none';
    });
    search.addEventListener('input', () => renderResults(search.value));

    panel.querySelector('#rp-copy').addEventListener('click', async () => {
        if (!selected) {
            status.textContent = 'Select a persona first.';
            return;
        }
        try {
            await navigator.clipboard.writeText(prompt.value);
            status.textContent = 'Prompt copied to clipboard.';
        } catch (_) {
            prompt.focus();
            prompt.select();
            status.textContent = 'Clipboard unavailable. Press Ctrl+C to copy.';
        }
    });

    renderResults();
    try {
        const previous = localStorage.getItem(STORAGE_KEY);
        if (previous && personas[previous]) selectPersona(previous);
    } catch (_) { /* optional */ }

    console.info(`[AI Personas] Loaded ${entries.length} personas.`);
})();