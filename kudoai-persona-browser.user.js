// ==UserScript==
// @name         KudoAI Persona Browser
// @namespace    Ryder.Tools
// @version      1.4.0
// @description  Browse, classify, tag, filter, favorite, and copy the complete KudoAI persona library.
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
        last: PREFIX + 'last',
        customTags: PREFIX + 'custom-tags',
        categoryOverrides: PREFIX + 'category-overrides',
        panelPosition: PREFIX + 'panel-position',
        panelSize: PREFIX + 'panel-size',
        resultsHeight: PREFIX + 'results-height'
    };
    const PAGE_SIZE_DEFAULT = 100;

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

    function normalizeTag(value) {
        return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    }

    function normalizeTagKey(value) {
        return normalizeTag(value).toLocaleLowerCase();
    }

    let rawData;
    let personas;
    try {
        rawData = GM_getResourceText('ai-personas');
        if (!rawData) throw new Error('The Tampermonkey persona resource was empty.');
        personas = JSON.parse(rawData);
    } catch (error) {
        console.error('[AI Personas] Failed to load the persona database:', error);
        return;
    }

    if (!personas || typeof personas !== 'object' || Array.isArray(personas)) {
        console.error('[AI Personas] The downloaded database has an unexpected format.');
        return;
    }

    const categories = [
        'Software & Technology', 'Writing & Content', 'Creative Arts & Design',
        'Education & Learning', 'Business & Management', 'Marketing & Sales',
        'Health & Wellness', 'Science & Research', 'Data & Analytics',
        'Finance & Accounting', 'Legal & Compliance', 'Language & Translation',
        'Gaming & Roleplay', 'Career & HR', 'Productivity & Planning',
        'Travel & Lifestyle', 'Food & Cooking', 'Customer Support',
        'History & Humanities', 'General & Other'
    ];

    // The upstream dataset supplies names and prompts, not authoritative categories.
    // These rules infer a primary category and topic labels from both fields.
    const categoryRules = [
        { name: 'Software & Technology', patterns: [
            /\b(programm(?:er|ing)|software|developer|coding|code review|linux|terminal|command line|devops|sysadmin|cyber.?security|network engineer|web developer|database administrator|it support|technical support|computer science|api|javascript|python|java developer|c\+\+|rust developer)\b/i
        ] },
        { name: 'Writing & Content', patterns: [
            /\b(writer|writing|author|editor|proofread|copywriter|copywriting|blogger|blog post|novelist|novel|screenwriter|screenplay|poet|poetry|journalist|content creator|content strategist|story writer|technical writer|ebook|ghostwriter)\b/i
        ] },
        { name: 'Creative Arts & Design', patterns: [
            /\b(designer|design|graphic design|ux|ui\/ux|user experience|illustrat\w*|artist|art director|photograph\w*|videograph\w*|video editor|filmmaker|logo design|brand identity|architect|interior design|fashion design|visual artist|3d model|animat\w*)\b/i
        ] },
        { name: 'Education & Learning', patterns: [
            /\b(tutor|teacher|teaching|professor|instructor|educator|student|lesson plan|curriculum|homework|study guide|exam prep|academic|classroom|school|university|learning coach|explainer|teach me|educational)\b/i
        ] },
        { name: 'Business & Management', patterns: [
            /\b(business|entrepreneur|startup|management|manager|executive|ceo|operations|business plan|business model|strategy consultant|consultant|project manager|product manager|leadership|negotiation|business analyst|operations manager)\b/i
        ] },
        { name: 'Marketing & Sales', patterns: [
            /\b(marketing|marketer|sales|salesperson|seo|search engine optimization|social media|advertising|ad campaign|brand strategist|lead generation|email campaign|market research|public relations|growth hacking|conversion rate|influencer)\b/i
        ] },
        { name: 'Health & Wellness', patterns: [
            /\b(health|healthcare|medical|doctor|physician|nurse|therapist|therapy|psychologist|psychology|mental health|wellness|fitness|personal trainer|nutritionist|dietitian|workout|exercise|meditation|mindfulness|sleep coach|physical therapy|first aid)\b/i
        ] },
        { name: 'Science & Research', patterns: [
            /\b(scientist|science|researcher|research assistant|laboratory|biology|biologist|chemistry|chemist|physics|physicist|astronomy|astronomer|geology|ecology|engineering|engineer|scientific|experiment|hypothesis|clinical research)\b/i
        ] },
        { name: 'Data & Analytics', patterns: [
            /\b(data analyst|data analysis|data scientist|analytics|statistician|statistics|dashboard|visuali[sz]ation|spreadsheet|excel|power bi|tableau|sql|business intelligence|machine learning|data engineer|data mining|quantitative analyst)\b/i
        ] },
        { name: 'Finance & Accounting', patterns: [
            /\b(finance|financial|accountant|accounting|bookkeeping|tax preparer|tax advisor|investment|investing|investor|stock market|trading|trader|portfolio|budget|banking|financial advisor|personal finance|cryptocurrency|crypto)\b/i
        ] },
        { name: 'Legal & Compliance', patterns: [
            /\b(lawyer|attorney|legal|law firm|paralegal|contract|compliance|regulatory|litigation|jurisprudence|legal research|court|legislation|law school|privacy officer)\b/i
        ] },
        { name: 'Language & Translation', patterns: [
            /\b(translator|translation|interpreter|language tutor|language learning|language teacher|grammar coach|english teacher|english tutor|spanish tutor|french tutor|vocabulary|pronunciation|linguist|locali[sz]ation)\b/i
        ] },
        { name: 'Gaming & Roleplay', patterns: [
            /\b(game master|gamemaster|game designer|game developer|video game|gaming|gamer|dungeons? & dragons|d&d|tabletop|role.?play|rpg|npc|non.?player character|quest|adventure game|interactive fiction|text adventure|simulation game)\b/i
        ] },
        { name: 'Career & HR', patterns: [
            /\b(career|resume|résumé|cv writer|job interview|interview coach|recruiter|recruiting|human resources|hr manager|hiring manager|job search|career coach|cover letter|workplace|employee relations)\b/i
        ] },
        { name: 'Productivity & Planning', patterns: [
            /\b(productivity|personal assistant|virtual assistant|planner|planning|time management|task manager|organize|organizer|scheduler|scheduling|workflow|habit tracker|goal setting|life coach|decision coach|meeting facilitator)\b/i
        ] },
        { name: 'Travel & Lifestyle', patterns: [
            /\b(travel|traveler|tourism|tourist|trip planner|travel planner|itinerary|vacation|hotel|hospitality|flight|destination|packing list|outdoor adventure|camping guide)\b/i
        ] },
        { name: 'Food & Cooking', patterns: [
            /\b(chef|cook|cooking|recipe|food|baking|baker|culinary|meal plan|menu planner|restaurant|sommelier|barista|kitchen|pastry|nutrition coach)\b/i
        ] },
        { name: 'Customer Support', patterns: [
            /\b(customer service|customer support|support agent|help desk|helpdesk|service desk|call center|faq|troubleshoot|troubleshooting|customer success|complaint resolution)\b/i
        ] },
        { name: 'History & Humanities', patterns: [
            /\b(history|historian|philosophy|philosopher|anthropology|anthropologist|sociology|sociologist|political science|politics|literature|literary|mythology|religion|theology|cultural studies|ethics|archaeology|archaeologist)\b/i
        ] }
    ];

    const topicRules = [
        { tag: 'Programming & Coding', patterns: [/\b(programm(?:er|ing)|coding|code review|software developer|algorithm|debugging|debugger|source code|codebase)\b/i] },
        { tag: 'Python', patterns: [/\bpython\b/i, /\b(django|flask|pandas|numpy|pytest)\b/i] },
        { tag: 'JavaScript & TypeScript', patterns: [/\b(javascript|typescript|node\.?js|react\.?js|vue\.?js|angular)\b/i] },
        { tag: 'Web Development', patterns: [/\b(web developer|web development|html|css|frontend|front.?end|backend|back.?end|full.?stack|website builder)\b/i] },
        { tag: 'Linux & Command Line', patterns: [/\b(linux|bash|shell script|command line|terminal|powershell|unix|sysadmin)\b/i] },
        { tag: 'Cybersecurity', patterns: [/\b(cyber.?security|penetration test|pen.?test|ethical hack|infosec|security analyst|vulnerability|threat model)\b/i] },
        { tag: 'Writing & Editing', patterns: [/\b(writer|writing|editor|editing|proofread|copywriter|copywriting|technical writer|content writer)\b/i] },
        { tag: 'Creative Writing', patterns: [/\b(novel|novelist|fiction|short story|storytelling|screenplay|screenwriter|poet|poetry|fantasy writer|dialogue writer)\b/i] },
        { tag: 'Marketing & SEO', patterns: [/\b(marketing|seo|search engine optimization|advertising|ad campaign|lead generation|conversion|brand strategist)\b/i] },
        { tag: 'Social Media', patterns: [/\b(social media|instagram|tiktok|youtube channel|youtube creator|facebook|linkedin|influencer|community manager)\b/i] },
        { tag: 'Sales & Negotiation', patterns: [/\b(sales|salesperson|sales representative|negotiat\w*|closing deals|prospecting|account executive)\b/i] },
        { tag: 'Design & UX/UI', patterns: [/\b(design|designer|ux|ui\/ux|user experience|user interface|graphic|logo|wireframe|prototyp\w*|visual identity)\b/i] },
        { tag: 'Photography & Video', patterns: [/\b(photo\w*|camera|video editor|filmmak\w*|cinematograph\w*|video production)\b/i] },
        { tag: 'Education & Tutoring', patterns: [/\b(tutor|teacher|teaching|professor|instructor|lesson|curriculum|homework|exam prep|study guide)\b/i] },
        { tag: 'Language Learning', patterns: [/\b(language learning|language tutor|language teacher|grammar coach|vocabulary|pronunciation|english tutor|spanish tutor)\b/i] },
        { tag: 'Translation', patterns: [/\b(translat\w*|interpreter|locali[sz]ation|bilingual)\b/i] },
        { tag: 'Data Analysis', patterns: [/\b(data analys\w*|data scientist|analytics|business intelligence|dashboard|tableau|power bi|excel|spreadsheet|sql query)\b/i] },
        { tag: 'Math & Statistics', patterns: [/\b(mathematic\w*|math tutor|algebra|calculus|geometry|statistics|statistician|probability|linear algebra)\b/i] },
        { tag: 'Science & Engineering', patterns: [/\b(science|scientist|biology|biolog\w*|chemistry|chemist|physics|physicist|astronomy|engineering|engineer|laboratory|experiment)\b/i] },
        { tag: 'Research', patterns: [/\b(research\w*|literature review|peer.?review|academic paper|thesis|dissertation)\b/i] },
        { tag: 'Finance & Investing', patterns: [/\b(finance|financial|invest\w*|stock market|trading|trader|portfolio|cryptocurrency|crypto|banking|budget)\b/i] },
        { tag: 'Accounting & Tax', patterns: [/\b(accountant|accounting|bookkeep\w*|tax|payroll|audit|balance sheet|income statement)\b/i] },
        { tag: 'Legal', patterns: [/\b(legal|lawyer|attorney|paralegal|contract|compliance|litigation|legislation|court)\b/i] },
        { tag: 'Healthcare', patterns: [/\b(healthcare|medical|doctor|physician|nurse|patient|clinical|health information|diagnos\w*)\b/i] },
        { tag: 'Mental Health & Psychology', patterns: [/\b(mental health|psycholog\w*|therap\w*|counsel\w*|stress management|mindfulness|meditation|emotional intelligence)\b/i] },
        { tag: 'Fitness & Nutrition', patterns: [/\b(fitness|workout|exercise|personal trainer|nutrition|dietitian|meal plan|weight loss|strength training|yoga)\b/i] },
        { tag: 'Food & Recipes', patterns: [/\b(chef|cook\w*|recipe|baking|baker|culinary|restaurant|meal plan|kitchen|food critic)\b/i] },
        { tag: 'Gaming', patterns: [/\b(gam(?:e|ing)|gamer|video game|game design|game developer|tabletop|board game|rpg|dungeons? & dragons|d&d)\b/i] },
        { tag: 'Roleplay & Characters', patterns: [/\b(role.?play|character|npc|non.?player character|fictional|act as|pretend to be|improv|interactive fiction)\b/i] },
        { tag: 'Career & Interviews', patterns: [/\b(career|resume|résumé|job interview|interview coach|recruit\w*|hiring|cover letter|job search|human resources|hr manager)\b/i] },
        { tag: 'Productivity & Planning', patterns: [/\b(productivity|planner|planning|organiz\w*|time management|task manager|scheduler|workflow|habit|goal setting|personal assistant)\b/i] },
        { tag: 'Travel & Tourism', patterns: [/\b(travel|tourism|trip planner|itinerary|vacation|hotel|flight|destination|travel guide|tourist)\b/i] },
        { tag: 'Customer Support', patterns: [/\b(customer service|customer support|support agent|help.?desk|service desk|troubleshoot\w*|faq|customer success)\b/i] },
        { tag: 'History & Culture', patterns: [/\b(history|historian|historical|culture|cultural|anthropolog\w*|archaeolog\w*|mythology|folklore)\b/i] },
        { tag: 'Music & Audio', patterns: [/\b(music|musician|songwriter|composer|audio|sound design|music theory|lyrics|lyricist|dj\b)\b/i] },
        { tag: 'Business Strategy', patterns: [/\b(business|entrepreneur|startup|business plan|business model|strategy|management|leadership|operations|consultant)\b/i] }
    ];

    function patternMatches(patterns, text) {
        return patterns.some(pattern => pattern.test(text));
    }

    function inferCategory(name, prompt) {
        let winner = 'General & Other';
        let bestScore = 0;
        for (const rule of categoryRules) {
            let score = 0;
            for (const pattern of rule.patterns) {
                if (pattern.test(name)) score += 4;
                if (pattern.test(prompt)) score += 1;
            }
            if (score > bestScore) {
                bestScore = score;
                winner = rule.name;
            }
        }
        return winner;
    }

    function inferTags(name, prompt) {
        const tags = [];
        for (const rule of topicRules) {
            // A name match is strong evidence; prompt matches catch less obvious specializations.
            if (patternMatches(rule.patterns, name) || patternMatches(rule.patterns, prompt)) {
                tags.push(rule.tag);
            }
        }
        return tags;
    }

    const customTags = readSetting(KEYS.customTags, {});
    const categoryOverrides = readSetting(KEYS.categoryOverrides, {});
    const favorites = new Set(readSetting(KEYS.favorites, []));
    let recent = readSetting(KEYS.recent, []);

    const entries = Object.entries(personas)
        .filter(([, data]) => data && typeof data.prompt === 'string')
        .map(([name, data]) => ({
            name,
            prompt: data.prompt,
            nameLower: name.toLocaleLowerCase(),
            promptLower: data.prompt.toLocaleLowerCase(),
            autoCategory: inferCategory(name, data.prompt),
            autoTags: inferTags(name, data.prompt),
            promptLength: data.prompt.length
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, {
            sensitivity: 'base',
            numeric: true
        }));

    if (!entries.length) {
        console.error('[AI Personas] The database loaded, but contained no usable persona prompts.');
        return;
    }

    const byName = new Map(entries.map(entry => [entry.name, entry]));
    const validCategory = value => categories.includes(value);
    const effectiveCategory = entry => validCategory(categoryOverrides[entry.name])
        ? categoryOverrides[entry.name] : entry.autoCategory;

    function userTagsFor(name) {
        return Array.isArray(customTags[name]) ? customTags[name].map(normalizeTag).filter(Boolean) : [];
    }

    function tagsFor(entry) {
        const result = new Map();
        for (const tag of entry.autoTags) result.set(normalizeTagKey(tag), tag);
        for (const tag of userTagsFor(entry.name)) result.set(normalizeTagKey(tag), tag);
        return Array.from(result.values());
    }

    const style = document.createElement('style');
    style.textContent = [
        '#ryder-persona-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483646;background:#6655cc;color:#fff;border:0;border-radius:24px;padding:12px 18px;cursor:pointer;font:600 14px sans-serif;box-shadow:0 3px 15px #0005}',
        '#ryder-persona-panel{position:fixed;right:16px;bottom:76px;width:min(650px,calc(100vw - 32px));height:min(850px,calc(100vh - 100px));z-index:2147483647;display:none;flex-direction:column;background:#202124;color:#eee;border:1px solid #555;border-radius:12px;box-shadow:0 5px 30px #0009;font:13px/1.4 system-ui,sans-serif;overflow:hidden}',
        '#ryder-persona-panel *{box-sizing:border-box}',
        '#ryder-persona-panel button,#ryder-persona-panel input,#ryder-persona-panel select,#ryder-persona-panel textarea{font:inherit}',
        '.rp-header{padding:11px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #444}',
        '.rp-title{font-weight:700;font-size:15px}.rp-subtitle{font-size:11px;color:#aaa;margin-top:2px}',
        '.rp-header button,.rp-actions button,.rp-page button,.rp-random,.rp-small-button{cursor:pointer;border:0;border-radius:6px;padding:7px 10px;background:#51449b;color:#fff}',
        '.rp-search-row{padding:9px 11px 5px}#rp-search{width:100%;padding:10px;border:1px solid #555;border-radius:7px;background:#303134;color:#fff;outline:none}',
        '.rp-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:5px 11px 8px}',
        '.rp-controls select,.rp-length input,.rp-filter-line select{min-width:0;width:100%;padding:7px;border:1px solid #555;border-radius:6px;background:#303134;color:#eee}',
        '.rp-advanced{margin:0 11px 7px;border:1px solid #444;border-radius:7px;background:#252629}',
        '.rp-advanced summary{cursor:pointer;padding:7px 9px;color:#ddd;font-weight:600}',
        '.rp-advanced-inner{padding:0 9px 9px;display:grid;gap:8px}',
        '.rp-filter-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
        '.rp-filter-line label,.rp-length label{font-size:11px;color:#bbb}',
        '.rp-filter-line select{max-width:200px}',
        '.rp-length{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.rp-length input{width:92px}',
        '.rp-tags{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;max-height:130px;overflow:auto;padding:3px 0}',
        '.rp-tag-option{display:flex;align-items:center;gap:5px;min-width:0;font-size:11px;color:#ddd;cursor:pointer}',
        '.rp-tag-option input{accent-color:#8b7be3;flex:0 0 auto}.rp-tag-option span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rp-tag-option small{color:#999;margin-left:auto}',
        '.rp-statusbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 12px;border-top:1px solid #444;border-bottom:1px solid #444;color:#bbb;font-size:11px}',
        '#rp-count{min-width:0}#rp-results{overflow-y:auto;overscroll-behavior:contain;flex:1;min-height:70px;padding:7px 9px}',
        '.rp-empty{padding:20px 10px;text-align:center;color:#aaa}.rp-row{display:flex;align-items:stretch;gap:5px;margin:0 0 4px}',
        '.rp-item{flex:1;min-width:0;text-align:left;padding:7px 9px;border:0;border-radius:6px;background:#303134;color:#eee;cursor:pointer;overflow:hidden}',
        '.rp-item:hover,.rp-item.selected{background:#51449b}.rp-item-name{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}',
        '.rp-item-meta{display:flex;gap:5px;flex-wrap:wrap;margin-top:3px}.rp-chip{font-size:10px;border-radius:9px;background:#414149;color:#c9c3ff;padding:1px 6px;white-space:nowrap}',
        '.rp-chip.category{background:#354653;color:#b8ddf2}.rp-star{width:35px;flex:0 0 35px;border:0;border-radius:6px;background:#303134;color:#f4d36b;cursor:pointer;font-size:17px}',
        '.rp-star:hover{background:#454545}.rp-page{display:flex;align-items:center;justify-content:center;gap:12px;padding:7px 10px;border-top:1px solid #444}',
        '.rp-page button:disabled{opacity:.35;cursor:default}#rp-page-label{font-size:11px;color:#bbb;min-width:100px;text-align:center}',
        '#rp-preview{padding:9px 11px;border-top:1px solid #555;background:#252629;max-height:230px;overflow:auto}',
        '.rp-preview-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}',
        '#rp-name{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rp-preview-controls{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px}',
        '.rp-preview-controls select,.rp-preview-controls input{min-width:0;width:100%;padding:6px;border:1px solid #555;border-radius:6px;background:#303134;color:#eee}',
        '.rp-tags-edit{display:flex;gap:6px;margin-bottom:6px}.rp-tags-edit input{flex:1;min-width:0;padding:7px;border:1px solid #555;border-radius:6px;background:#303134;color:#eee}',
        '.rp-tags-edit button{flex:0 0 auto}.rp-small-button{padding:5px 8px}#rp-prompt{display:block;width:100%;height:92px;resize:vertical;padding:8px;background:#303134;color:#eee;border:1px solid #555;border-radius:7px;font:11px/1.4 ui-monospace,monospace}',
        '.rp-actions{display:flex;gap:6px;margin-top:6px}.rp-actions button{flex:1}#rp-copy{background:#6655cc}#rp-message{font-size:11px;color:#aaa;min-height:14px;margin-top:4px}',
        '@media(max-width:520px){#ryder-persona-panel{right:6px;bottom:68px;width:calc(100vw - 12px);height:calc(100vh - 82px)}#ryder-persona-launcher{right:12px;bottom:12px}.rp-controls{grid-template-columns:repeat(2,minmax(0,1fr))}.rp-tags{grid-template-columns:repeat(2,minmax(0,1fr))}.rp-preview-controls{grid-template-columns:1fr 1fr}}'
,
        // Compact layout: approximately half the previous padding and gaps.
        '#ryder-persona-panel{resize:none;min-width:320px;min-height:360px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px)}',
        '.rp-header{padding:5.5px 7px;gap:6px;cursor:grab;touch-action:none;user-select:none}',
        '.rp-header:active{cursor:grabbing}',
        '.rp-header button{cursor:pointer;touch-action:auto}',
        '.rp-header button{padding:3.5px 5px}',
        '.rp-search-row{padding:4.5px 5.5px 2.5px}',
        '#rp-search{padding:5px}',
        '.rp-controls{gap:3px;padding:2.5px 5.5px 4px}',
        '.rp-controls select,.rp-length input,.rp-filter-line select{padding:3.5px}',
        '.rp-advanced{margin:0 5.5px 3.5px}',
        '.rp-advanced summary{padding:3.5px 4.5px}',
        '.rp-advanced-inner{padding:0 4.5px 4.5px;gap:4px}',
        '.rp-filter-line{gap:4px}',
        '.rp-length{gap:3px}',
        '.rp-tags{gap:2.5px;max-height:105px}',
        '.rp-statusbar{gap:4px;padding:3.5px 6px}',
        '.rp-random,.rp-small-button{padding:3.5px 5px}',
        '#rp-results{padding:3.5px 4.5px;min-height:80px;resize:none;overflow:auto;flex:0 1 45%;height:45%;max-height:70%}',
        '.rp-row{gap:2.5px;margin-bottom:2px}',
        '.rp-item{padding:3.5px 4.5px}',
        '.rp-item-meta{gap:2.5px;margin-top:1.5px}',
        '.rp-chip{padding:1px 3px}',
        '.rp-star{width:30px;flex-basis:30px}',
        '.rp-page{gap:6px;padding:3.5px 5px}',
        '.rp-page button{padding:3.5px 5px}',
        '#rp-preview{padding:4.5px 5.5px;max-height:200px}',
        '.rp-preview-head{gap:4px;margin-bottom:3px}',
        '.rp-preview-controls{gap:3px;margin-bottom:3px}',
        '.rp-preview-controls select,.rp-preview-controls input{padding:3px}',
        '.rp-tags-edit{gap:3px;margin-bottom:3px}',
        '.rp-tags-edit input{padding:3.5px}',
        '.rp-tags-edit button{padding:3.5px 5px}',
        '#rp-prompt{height:72px;padding:4px}',
        '.rp-actions{gap:3px;margin-top:3px}',
        '.rp-actions button{padding:3.5px 5px}',
        '#rp-message{min-height:10px;margin-top:2px}',
        '@media(max-width:520px){#ryder-persona-panel{min-width:280px;min-height:320px}.rp-controls{gap:3px;padding:2.5px 5px}.rp-tags{gap:2px}}',
        // Explicit resize controls: these work independently of browser-native resize handles.
        '#rp-panel-resize{position:absolute;right:3px;bottom:3px;z-index:20;width:25px;height:25px;padding:0;border:1px solid #8176c4;border-radius:5px;background:#51449b;color:#fff;font-size:17px;line-height:22px;cursor:nwse-resize;touch-action:none;user-select:none;box-shadow:0 1px 4px #0008}',
        '#rp-panel-resize:hover{background:#7564d4}',
        '#rp-results-grip{height:12px;min-height:12px;flex:0 0 12px;display:flex;align-items:center;justify-content:center;position:relative;z-index:5;border-top:1px solid #555;border-bottom:1px solid #444;background:#303136;color:#bbb;cursor:ns-resize;touch-action:none;user-select:none;font-size:13px;line-height:10px;letter-spacing:3px}',
        '#rp-results-grip:hover,#rp-results-grip:focus{background:#51449b;color:white;outline:none}',
        '#rp-results-grip:focus-visible,#rp-panel-resize:focus-visible{outline:2px solid #b7aaff;outline-offset:1px}',
        '#rp-panel-resize:active,#rp-results-grip:active{background:#6655cc}',

    ].join('\\n');
    (document.head || document.documentElement).appendChild(style);

    const launcher = document.createElement('button');
    launcher.id = 'ryder-persona-launcher';
    launcher.type = 'button';
    launcher.textContent = 'AI Personas (' + entries.length.toLocaleString() + ')';

    const panel = document.createElement('section');
    panel.id = 'ryder-persona-panel';
    panel.setAttribute('aria-label', 'KudoAI Persona Browser');
    panel.innerHTML =
        '<div class="rp-header"><div><div class="rp-title">KudoAI Persona Browser</div><div class="rp-subtitle" id="rp-dataset-info"></div></div><button id="rp-close" type="button">Close</button></div>' +
        '<div class="rp-search-row"><input id="rp-search" type="search" placeholder="Search names, prompts, or topics..." autocomplete="off"></div>' +
        '<div class="rp-controls">' +
            '<select id="rp-category" aria-label="Category"><option value="">All categories</option></select>' +
            '<select id="rp-view" aria-label="Collection"><option value="all">All personas</option><option value="favorites">Favorites</option><option value="recent">Recently used</option></select>' +
            '<select id="rp-letter" aria-label="First letter"><option value="">All letters</option></select>' +
            '<select id="rp-sort" aria-label="Sort"><option value="az">Name: A to Z</option><option value="za">Name: Z to A</option><option value="category">Category, then name</option><option value="longest">Longest prompt</option><option value="shortest">Shortest prompt</option><option value="recent">Recently used first</option><option value="favorites">Favorites first</option></select>' +
            '<select id="rp-page-size" aria-label="Results per page"><option value="50">50 per page</option><option value="100" selected>100 per page</option><option value="200">200 per page</option></select>' +
            '<select id="rp-search-mode" aria-label="Search fields"><option value="both">Names and prompts</option><option value="names">Names only</option><option value="prompts">Prompts only</option></select>' +
        '</div>' +
        '<details class="rp-advanced" id="rp-advanced"><summary>Topics & advanced filters</summary><div class="rp-advanced-inner">' +
            '<div class="rp-filter-line"><label for="rp-tag-mode">Selected tags must</label><select id="rp-tag-mode"><option value="any">Match any selected tag</option><option value="all">Match all selected tags</option></select><button id="rp-clear-tags" class="rp-small-button" type="button">Clear tags</button></div>' +
            '<div id="rp-tags" class="rp-tags"></div>' +
            '<div class="rp-length"><label for="rp-min-length">Prompt characters</label><input id="rp-min-length" type="number" min="0" step="100" placeholder="Minimum"><span>to</span><input id="rp-max-length" type="number" min="0" step="100" placeholder="Maximum"></div>' +
            '<div class="rp-filter-line"><label><input id="rp-custom-only" type="checkbox"> Only personas with my custom tags</label></div>' +
        '</div></details>' +
        '<div class="rp-statusbar"><span id="rp-count" aria-live="polite"></span><button id="rp-random" class="rp-random" type="button">Random match</button><button id="rp-reset" class="rp-small-button" type="button">Reset filters</button></div>' +
        '<div id="rp-results"></div><div id="rp-results-grip" role="separator" aria-orientation="horizontal" aria-label="Resize results area" tabindex="0" title="Drag to resize results">⋯</div><div class="rp-page"><button id="rp-prev" type="button">Previous</button><span id="rp-page-label"></span><button id="rp-next" type="button">Next</button></div>' +
        '<div id="rp-preview"><div class="rp-preview-head"><strong id="rp-name">Select a persona</strong></div>' +
            '<div class="rp-preview-controls"><select id="rp-persona-category" aria-label="Persona category"></select><div id="rp-auto-category"></div></div>' +
            '<div class="rp-tags-edit"><input id="rp-custom-tags" type="text" placeholder="Your tags, separated by commas"><button id="rp-save-tags" type="button">Save tags</button></div>' +
            '<textarea id="rp-prompt" readonly placeholder="Select a persona to preview its full prompt..."></textarea>' +
            '<div class="rp-actions"><button id="rp-favorite" type="button" disabled>☆ Favorite</button><button id="rp-copy" type="button" disabled>Copy full prompt</button></div>' +
            '<div id="rp-message" role="status" aria-live="polite"></div></div>';

    panel.insertAdjacentHTML('beforeend', '<button id="rp-panel-resize" type="button" aria-label="Resize entire browser" title="Drag to resize browser">◢</button>');
    (document.body || document.documentElement).append(launcher, panel);

    const el = id => panel.querySelector('#' + id);
    const searchInput = el('rp-search');
    const categorySelect = el('rp-category');
    const viewSelect = el('rp-view');
    const letterSelect = el('rp-letter');
    const sortSelect = el('rp-sort');
    const pageSizeSelect = el('rp-page-size');
    const searchModeSelect = el('rp-search-mode');
    const tagModeSelect = el('rp-tag-mode');
    const tagsContainer = el('rp-tags');
    const results = el('rp-results');
    const resultsGrip = el('rp-results-grip');
    const panelResizeHandle = el('rp-panel-resize');
    const countLabel = el('rp-count');
    const pageLabel = el('rp-page-label');
    const previousButton = el('rp-prev');
    const nextButton = el('rp-next');
    const selectedName = el('rp-name');
    const personaCategorySelect = el('rp-persona-category');
    const autoCategoryLabel = el('rp-auto-category');
    const customTagsInput = el('rp-custom-tags');
    const promptBox = el('rp-prompt');
    const favoriteButton = el('rp-favorite');
    const copyButton = el('rp-copy');
    const message = el('rp-message');
    const panelHeader = panel.querySelector('.rp-header');

    let selected = null;
    let currentPage = 0;
    let filteredEntries = entries;
    let selectedTags = new Set();
    let filterCandidates = entries;

    for (const category of categories) {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    }

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

    const autoOption = document.createElement('option');
    autoOption.value = '';
    autoOption.textContent = 'Automatic category';
    personaCategorySelect.appendChild(autoOption);
    for (const category of categories) {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        personaCategorySelect.appendChild(option);
    }

    el('rp-dataset-info').textContent = entries.length.toLocaleString() +
        ' personas loaded · ' + Math.round(rawData.length / 1024).toLocaleString() +
        ' KB source · Auto-inferred categories and topic tags';

    function persist(key, value) { writeSetting(key, value); }
    function userTagsFor(name) {
        return Array.isArray(customTags[name]) ? customTags[name].map(normalizeTag).filter(Boolean) : [];
    }
    function tagsFor(entry) {
        const result = new Map();
        for (const tag of entry.autoTags) result.set(normalizeTagKey(tag), tag);
        for (const tag of userTagsFor(entry.name)) result.set(normalizeTagKey(tag), tag);
        return Array.from(result.values());
    }
    function getEffectiveCategory(entry) {
        const override = categoryOverrides[entry.name];
        return validCategory(override) ? override : entry.autoCategory;
    }
    function updateFavoriteButton() {
        favoriteButton.disabled = !selected;
        favoriteButton.textContent = selected && favorites.has(selected.name) ? '★ Favorited' : '☆ Favorite';
    }

    function collectCandidates(ignoreTags) {
        const query = searchInput.value.trim().toLocaleLowerCase();
        const terms = query ? query.split(/\s+/).filter(Boolean) : [];
        const firstLetter = letterSelect.value;
        const category = categorySelect.value;
        const minValue = el('rp-min-length').value;
        const maxValue = el('rp-max-length').value;
        const minLength = minValue === '' ? null : Number(minValue);
        const maxLength = maxValue === '' ? null : Number(maxValue);
        const customOnly = el('rp-custom-only').checked;
        const searchMode = searchModeSelect.value;

        let list = entries.filter(entry => {
            if (viewSelect.value === 'favorites' && !favorites.has(entry.name)) return false;
            if (viewSelect.value === 'recent' && !recent.includes(entry.name)) return false;
            if (category && getEffectiveCategory(entry) !== category) return false;

            if (firstLetter) {
                const first = entry.name.charAt(0).toLocaleUpperCase();
                if (firstLetter === '#') {
                    if (/[A-Z]/.test(first)) return false;
                } else if (first !== firstLetter) return false;
            }

            if (minLength !== null && Number.isFinite(minLength) && entry.promptLength < minLength) return false;
            if (maxLength !== null && Number.isFinite(maxLength) && entry.promptLength > maxLength) return false;
            if (customOnly && userTagsFor(entry.name).length === 0) return false;

            if (!terms.length) return true;
            return terms.every(term => {
                const inName = entry.nameLower.includes(term);
                const inPrompt = entry.promptLower.includes(term);
                if (searchMode === 'names') return inName;
                if (searchMode === 'prompts') return inPrompt;
                return inName || inPrompt;
            });
        });

        if (!ignoreTags && selectedTags.size) {
            const activeTags = Array.from(selectedTags);
            list = list.filter(entry => {
                const own = new Set(tagsFor(entry).map(normalizeTagKey));
                return tagModeSelect.value === 'all'
                    ? activeTags.every(tag => own.has(tag))
                    : activeTags.some(tag => own.has(tag));
            });
        }
        return list;
    }

    function renderTagOptions() {
        const scrollTop = tagsContainer.scrollTop;
        const counts = new Map();
        for (const entry of filterCandidates) {
            for (const tag of tagsFor(entry)) {
                const key = normalizeTagKey(tag);
                const item = counts.get(key) || { name: tag, count: 0 };
                item.count++;
                counts.set(key, item);
            }
        }
        for (const key of selectedTags) {
            if (!counts.has(key)) counts.set(key, { name: key, count: 0 });
        }

        const items = Array.from(counts.entries()).sort((a, b) =>
            a[1].name.localeCompare(b[1].name, undefined, { sensitivity: 'base' })
        );
        tagsContainer.replaceChildren();

        if (!items.length) {
            const empty = document.createElement('div');
            empty.className = 'rp-empty';
            empty.textContent = 'No topic tags available for these filters.';
            tagsContainer.appendChild(empty);
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const [key, info] of items) {
            const label = document.createElement('label');
            label.className = 'rp-tag-option';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedTags.has(key);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) selectedTags.add(key);
                else selectedTags.delete(key);
                renderResults(true);
            });
            const text = document.createElement('span');
            text.textContent = info.name;
            const count = document.createElement('small');
            count.textContent = info.count.toLocaleString();
            label.append(checkbox, text, count);
            fragment.appendChild(label);
        }
        tagsContainer.appendChild(fragment);
        tagsContainer.scrollTop = scrollTop;
    }

    function sortEntries(list) {
        const copy = list.slice();
        const recentOrder = new Map(recent.map((name, index) => [name, index]));
        switch (sortSelect.value) {
            case 'za':
                return copy.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: 'base', numeric: true }));
            case 'category':
                return copy.sort((a, b) => getEffectiveCategory(a).localeCompare(getEffectiveCategory(b)) || a.name.localeCompare(b.name));
            case 'longest':
                return copy.sort((a, b) => b.promptLength - a.promptLength || a.name.localeCompare(b.name));
            case 'shortest':
                return copy.sort((a, b) => a.promptLength - b.promptLength || a.name.localeCompare(b.name));
            case 'recent':
                return copy.sort((a, b) => (recentOrder.get(a.name) ?? Number.MAX_SAFE_INTEGER) -
                    (recentOrder.get(b.name) ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name));
            case 'favorites':
                return copy.sort((a, b) => Number(favorites.has(b.name)) - Number(favorites.has(a.name)) || a.name.localeCompare(b.name));
            default:
                return copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
        }
    }

    function renderResults(resetPage) {
        if (resetPage) currentPage = 0;
        filterCandidates = collectCandidates(true);
        filteredEntries = sortEntries(collectCandidates(false));

        const total = filteredEntries.length;
        const pageSize = Number(pageSizeSelect.value) || PAGE_SIZE_DEFAULT;
        const pageCount = Math.max(1, Math.ceil(total / pageSize));
        currentPage = Math.max(0, Math.min(currentPage, pageCount - 1));

        const start = currentPage * pageSize;
        const end = Math.min(start + pageSize, total);
        const pageEntries = filteredEntries.slice(start, end);

        countLabel.textContent = total
            ? 'Showing ' + (start + 1).toLocaleString() + '–' + end.toLocaleString() +
              ' of ' + total.toLocaleString() + ' matches · ' + entries.length.toLocaleString() + ' total'
            : '0 matches · ' + entries.length.toLocaleString() + ' total personas';
        pageLabel.textContent = 'Page ' + (currentPage + 1) + ' of ' + pageCount;
        previousButton.disabled = currentPage <= 0;
        nextButton.disabled = currentPage >= pageCount - 1;

        renderTagOptions();
        results.replaceChildren();
        if (!pageEntries.length) {
            const empty = document.createElement('div');
            empty.className = 'rp-empty';
            empty.textContent = 'No personas match these filters. Try clearing one or more filters.';
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
            const meta = document.createElement('span');
            meta.className = 'rp-item-meta';

            const categoryChip = document.createElement('span');
            categoryChip.className = 'rp-chip category';
            categoryChip.textContent = getEffectiveCategory(entry);
            meta.appendChild(categoryChip);

            for (const tag of tagsFor(entry).slice(0, 3)) {
                const chip = document.createElement('span');
                chip.className = 'rp-chip';
                chip.textContent = tag;
                meta.appendChild(chip);
            }

            choose.append(title, meta);
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
        el('rp-message').textContent = 'Full prompt · ' + entry.promptLength.toLocaleString() + ' characters';

        personaCategorySelect.value = validCategory(categoryOverrides[entry.name]) ? categoryOverrides[entry.name] : '';
        autoCategoryLabel.textContent = 'Auto: ' + entry.autoCategory;
        customTagsInput.value = userTagsFor(entry.name).join(', ');

        recent = [entry.name, ...recent.filter(name => name !== entry.name)].slice(0, 100);
        persist(KEYS.last, entry.name);
        persist(KEYS.recent, recent);
        updateFavoriteButton();
        renderResults(false);
    }

    function toggleFavorite(personaName) {
        if (favorites.has(personaName)) favorites.delete(personaName);
        else favorites.add(personaName);
        persist(KEYS.favorites, Array.from(favorites));
        updateFavoriteButton();
        renderResults(false);
    }

    function saveCustomTags() {
        if (!selected) {
            message.textContent = 'Select a persona before adding your tags.';
            return;
        }
        const parsed = customTagsInput.value.split(',').map(normalizeTag).filter(Boolean);
        const unique = [];
        const seen = new Set();
        for (const tag of parsed) {
            const key = normalizeTagKey(tag);
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(tag);
            }
        }
        if (unique.length > 15) {
            message.textContent = 'Maximum 15 personal tags per persona.';
            return;
        }
        if (unique.length) customTags[selected.name] = unique;
        else delete customTags[selected.name];

        persist(KEYS.customTags, customTags);
        customTagsInput.value = unique.join(', ');
        message.textContent = unique.length ? 'Saved ' + unique.length + ' personal tag(s).' : 'Personal tags cleared.';
        renderResults(false);
    }

    function resetFilters() {
        searchInput.value = '';
        categorySelect.value = '';
        viewSelect.value = 'all';
        letterSelect.value = '';
        sortSelect.value = 'az';
        pageSizeSelect.value = String(PAGE_SIZE_DEFAULT);
        searchModeSelect.value = 'both';
        tagModeSelect.value = 'any';
        el('rp-min-length').value = '';
        el('rp-max-length').value = '';
        el('rp-custom-only').checked = false;
        selectedTags.clear();
        renderResults(true);
        message.textContent = 'Filters cleared.';
    }

    launcher.addEventListener('click', () => {
        const opening = panel.style.display !== 'flex';
        panel.style.display = opening ? 'flex' : 'none';
        if (opening) {
            restorePanelDimensions();
            restorePanelPosition();
            searchInput.focus();
        }
    });
    el('rp-close').addEventListener('click', () => { savePanelPosition(); panel.style.display = 'none'; });

    for (const id of [
        'rp-search', 'rp-category', 'rp-view', 'rp-letter', 'rp-sort',
        'rp-page-size', 'rp-search-mode', 'rp-tag-mode', 'rp-min-length',
        'rp-max-length', 'rp-custom-only'
    ]) {
        const node = el(id);
        node.addEventListener(node.tagName === 'INPUT' && node.type === 'search' ? 'input' : 'change',
            () => renderResults(true));
    }

    previousButton.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            renderResults(false);
        }
    });
    nextButton.addEventListener('click', () => {
        const pageSize = Number(pageSizeSelect.value) || PAGE_SIZE_DEFAULT;
        const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
        if (currentPage < pageCount - 1) {
            currentPage++;
            renderResults(false);
        }
    });

    el('rp-random').addEventListener('click', () => {
        const matches = collectCandidates(false);
        if (!matches.length) {
            message.textContent = 'No personas match the current filters.';
            return;
        }
        selectPersona(matches[Math.floor(Math.random() * matches.length)].name);
    });

    el('rp-clear-tags').addEventListener('click', () => {
        selectedTags.clear();
        renderResults(true);
    });
    el('rp-reset').addEventListener('click', resetFilters);

    favoriteButton.addEventListener('click', () => {
        if (selected) toggleFavorite(selected.name);
    });
    el('rp-save-tags').addEventListener('click', saveCustomTags);
    customTagsInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveCustomTags();
        }
    });

    personaCategorySelect.addEventListener('change', () => {
        if (!selected) return;
        if (personaCategorySelect.value && validCategory(personaCategorySelect.value)) {
            categoryOverrides[selected.name] = personaCategorySelect.value;
            message.textContent = 'Personal category saved.';
        } else {
            delete categoryOverrides[selected.name];
            message.textContent = 'Using automatic category: ' + selected.autoCategory;
        }
        persist(KEYS.categoryOverrides, categoryOverrides);
        autoCategoryLabel.textContent = 'Auto: ' + selected.autoCategory;
        renderResults(false);
    });

    copyButton.addEventListener('click', async () => {
        if (!selected) return;
        try {
            await navigator.clipboard.writeText(selected.prompt);
            message.textContent = 'Copied full prompt (' + selected.promptLength.toLocaleString() + ' characters).';
        } catch (error) {
            promptBox.focus();
            promptBox.select();
            message.textContent = 'Clipboard access was blocked. Press Ctrl+C to copy the selected text.';
        }
    });


    // Drag the panel by its title bar. Save its position through Tampermonkey.
    function restorePanelPosition() {
        const saved = readSetting(KEYS.panelPosition, null);
        if (!saved || !Number.isFinite(Number(saved.left)) || !Number.isFinite(Number(saved.top))) return;

        const rect = panel.getBoundingClientRect();
        const left = Math.max(8, Math.min(Number(saved.left), window.innerWidth - rect.width - 8));
        const top = Math.max(8, Math.min(Number(saved.top), window.innerHeight - rect.height - 8));
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    }

    function savePanelPosition() {
        const rect = panel.getBoundingClientRect();
        writeSetting(KEYS.panelPosition, {
            left: Math.round(rect.left),
            top: Math.round(rect.top)
        });
    }

    panelHeader.addEventListener('pointerdown', event => {
        if (event.button !== 0 || event.target.closest('button,input,select,textarea,a')) return;
        event.preventDefault();

        const startX = event.clientX;
        const startY = event.clientY;
        const startRect = panel.getBoundingClientRect();
        const startLeft = startRect.left;
        const startTop = startRect.top;

        // Switch from right/bottom anchoring to left/top positioning on first drag.
        panel.style.left = startLeft + 'px';
        panel.style.top = startTop + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';

        panelHeader.setPointerCapture(event.pointerId);

        const onMove = moveEvent => {
            const rect = panel.getBoundingClientRect();
            const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
            const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
            const left = Math.max(8, Math.min(startLeft + moveEvent.clientX - startX, maxLeft));
            const top = Math.max(8, Math.min(startTop + moveEvent.clientY - startY, maxTop));
            panel.style.left = left + 'px';
            panel.style.top = top + 'px';
        };

        const onEnd = endEvent => {
            if (panelHeader.hasPointerCapture(endEvent.pointerId)) {
                panelHeader.releasePointerCapture(endEvent.pointerId);
            }
            panelHeader.removeEventListener('pointermove', onMove);
            panelHeader.removeEventListener('pointerup', onEnd);
            panelHeader.removeEventListener('pointercancel', onEnd);
            savePanelPosition();
        };

        panelHeader.addEventListener('pointermove', onMove);
        panelHeader.addEventListener('pointerup', onEnd);
        panelHeader.addEventListener('pointercancel', onEnd);
    });


    // Persisted dimensions use explicit pointer handles rather than native CSS resize.
    function clampNumber(value, minimum, maximum) {
        return Math.max(minimum, Math.min(value, maximum));
    }

    function restorePanelDimensions() {
        const saved = readSetting(KEYS.panelSize, null);
        if (saved && Number.isFinite(Number(saved.width)) && Number.isFinite(Number(saved.height))) {
            const width = clampNumber(Number(saved.width), 320, Math.max(320, window.innerWidth - 16));
            const height = clampNumber(Number(saved.height), 360, Math.max(360, window.innerHeight - 16));
            panel.style.width = width + 'px';
            panel.style.height = height + 'px';
        }

        const savedResultsHeight = Number(readSetting(KEYS.resultsHeight, 0)) || 0;
        if (savedResultsHeight > 0) setResultsHeight(savedResultsHeight);
    }

    function savePanelDimensions() {
        const rect = panel.getBoundingClientRect();
        writeSetting(KEYS.panelSize, {
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        });
    }

    function setResultsHeight(requestedHeight) {
        const maximum = Math.max(80, Math.floor(panel.clientHeight * 0.62));
        const height = clampNumber(requestedHeight, 80, maximum);
        results.style.flex = '0 0 ' + height + 'px';
        results.style.height = height + 'px';
        return height;
    }

    function saveResultsHeight() {
        writeSetting(KEYS.resultsHeight, Math.round(results.getBoundingClientRect().height));
    }

    panelResizeHandle.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();

        const startRect = panel.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = startRect.width;
        const startHeight = startRect.height;

        // Anchor the top-left corner so the visible bottom-right grip tracks the pointer.
        panel.style.left = startRect.left + 'px';
        panel.style.top = startRect.top + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';

        panelResizeHandle.setPointerCapture(event.pointerId);

        const onMove = moveEvent => {
            const maximumWidth = Math.max(320, window.innerWidth - startRect.left - 8);
            const maximumHeight = Math.max(360, window.innerHeight - startRect.top - 8);
            const width = clampNumber(startWidth + moveEvent.clientX - startX, 320, maximumWidth);
            const height = clampNumber(startHeight + moveEvent.clientY - startY, 360, maximumHeight);
            panel.style.width = width + 'px';
            panel.style.height = height + 'px';
        };

        const onEnd = endEvent => {
            if (panelResizeHandle.hasPointerCapture(endEvent.pointerId)) {
                panelResizeHandle.releasePointerCapture(endEvent.pointerId);
            }
            panelResizeHandle.removeEventListener('pointermove', onMove);
            panelResizeHandle.removeEventListener('pointerup', onEnd);
            panelResizeHandle.removeEventListener('pointercancel', onEnd);
            savePanelDimensions();
            savePanelPosition();
        };

        panelResizeHandle.addEventListener('pointermove', onMove);
        panelResizeHandle.addEventListener('pointerup', onEnd);
        panelResizeHandle.addEventListener('pointercancel', onEnd);
    });

    resultsGrip.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();

        const startY = event.clientY;
        const startHeight = results.getBoundingClientRect().height;
        resultsGrip.setPointerCapture(event.pointerId);

        const onMove = moveEvent => {
            setResultsHeight(startHeight + moveEvent.clientY - startY);
        };

        const onEnd = endEvent => {
            if (resultsGrip.hasPointerCapture(endEvent.pointerId)) {
                resultsGrip.releasePointerCapture(endEvent.pointerId);
            }
            resultsGrip.removeEventListener('pointermove', onMove);
            resultsGrip.removeEventListener('pointerup', onEnd);
            resultsGrip.removeEventListener('pointercancel', onEnd);
            saveResultsHeight();
        };

        resultsGrip.addEventListener('pointermove', onMove);
        resultsGrip.addEventListener('pointerup', onEnd);
        resultsGrip.addEventListener('pointercancel', onEnd);
    });

    resultsGrip.addEventListener('keydown', event => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        setResultsHeight(results.getBoundingClientRect().height + direction * 24);
        saveResultsHeight();
    });

    panelResizeHandle.addEventListener('keydown', event => {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();

        const rect = panel.getBoundingClientRect();
        const step = event.shiftKey ? 50 : 20;
        const widthDelta = event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
        const heightDelta = event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
        const width = clampNumber(rect.width + widthDelta, 320, Math.max(320, window.innerWidth - rect.left - 8));
        const height = clampNumber(rect.height + heightDelta, 360, Math.max(360, window.innerHeight - rect.top - 8));
        panel.style.width = width + 'px';
        panel.style.height = height + 'px';
        savePanelDimensions();
    });

    window.addEventListener('resize', () => {
        if (panel.style.display !== 'flex') return;
        const rect = panel.getBoundingClientRect();
        const width = clampNumber(rect.width, 320, Math.max(320, window.innerWidth - 16));
        const height = clampNumber(rect.height, 360, Math.max(360, window.innerHeight - 16));
        panel.style.width = width + 'px';
        panel.style.height = height + 'px';
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
        const top = Math.max(8, Math.min(rect.top, window.innerHeight - height - 8));
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        savePanelPosition();
        savePanelDimensions();
        if (Number(readSetting(KEYS.resultsHeight, 0)) > 0) {
            setResultsHeight(Number(readSetting(KEYS.resultsHeight, 0)));
            saveResultsHeight();
        }
    });

    const previousSelection = readSetting(KEYS.last, '');
    if (previousSelection && byName.has(previousSelection)) selectPersona(previousSelection);
    else updateFavoriteButton();

    renderResults(true);
    console.info('[AI Personas] Loaded ' + entries.length.toLocaleString() +
        ' personas with automatic topic classification from ' + rawData.length.toLocaleString() + ' source characters.');
})();