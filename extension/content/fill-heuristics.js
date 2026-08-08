/**
 * Pure field-matching heuristics for Resumegen Apply.
 * UMD: browser global ResumegenHeuristics + Node module.exports for tests.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.ResumegenHeuristics = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const KEY_ORDER = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'linkedin',
        'website',
        'location',
        'school',
        'degree',
        'summary',
        'current_title',
        'current_company',
        'target_role',
        'skills',
        'full_name',
    ];

    /** @type {Record<string, { autocomplete: string[], name: RegExp[], label: RegExp[], exclude?: RegExp[] }>} */
    const RULES = {
        first_name: {
            autocomplete: ['given-name', 'fname', 'cc-given-name'],
            name: [
                /\bfirst[_.\-\s]?name\b/i,
                /\bgiven[_.\-\s]?name\b/i,
                /\bfname\b/i,
                /\bname[_.\-\s]?first\b/i,
                /\bfirstname\b/i,
                /\[first_?name\]/i,
                /legalnamesection_firstname/i,
                /_systemfield_firstname/i,
                /\bfirst\b/i,
            ],
            label: [
                /\bfirst\s*name\b/i,
                /\bgiven\s*name\b/i,
                /\bpreferred\s*first\s*name\b/i,
                /^first$/i,
            ],
            exclude: [/\blast\b/i, /\bfamily\b/i, /\bsur\b/i, /\bmiddle\b/i, /\bfull\b/i],
        },
        last_name: {
            autocomplete: ['family-name', 'lname', 'cc-family-name'],
            name: [
                /\blast[_.\-\s]?name\b/i,
                /\bfamily[_.\-\s]?name\b/i,
                /\bsurname\b/i,
                /\blname\b/i,
                /\bname[_.\-\s]?last\b/i,
                /\blastname\b/i,
                /\[last_?name\]/i,
                /legalnamesection_lastname/i,
                /_systemfield_lastname/i,
                /\blast\b/i,
            ],
            label: [
                /\blast\s*name\b/i,
                /\bfamily\s*name\b/i,
                /\bsurname\b/i,
                /^last$/i,
            ],
            exclude: [/\bfirst\b/i, /\bgiven\b/i, /\bmiddle\b/i, /\bfull\b/i],
        },
        full_name: {
            autocomplete: ['name', 'nickname'],
            name: [
                /\bfull[_.\-\s]?name\b/i,
                /\blegal[_.\-\s]?name\b/i,
                /\bapplicant[_.\-\s]?name\b/i,
                /\bcandidate[_.\-\s]?name\b/i,
                /\byour[_.\-\s]?name\b/i,
                /\[name\]/i,
                /_systemfield_name\b/i,
                /\bname\b/i,
            ],
            label: [
                /\bfull\s*name\b/i,
                /\blegal\s*name\b/i,
                /\byour\s*name\b/i,
                /\bapplicant\s*name\b/i,
                /^name$/i,
            ],
            exclude: [
                /\bfirst\b/i,
                /\blast\b/i,
                /\bmiddle\b/i,
                /\buser\b/i,
                /\bfile\b/i,
                /\bcompany\b/i,
                /\bschool\b/i,
                /\borg\b/i,
                /\buser\s*name\b/i,
                /\busername\b/i,
            ],
        },
        email: {
            autocomplete: ['email', 'username'],
            name: [
                /\be-?mail\b/i,
                /\bemail[_.\-\s]?address\b/i,
                /\[email\]/i,
                /_systemfield_email/i,
            ],
            label: [/\be-?mail\b/i, /\bemail\s*address\b/i],
            exclude: [/\bconfirm\b/i, /\bverify\b/i, /\bre-?enter\b/i, /\bsecondary\b/i],
        },
        phone: {
            autocomplete: ['tel', 'tel-national', 'tel-local', 'mobile tel'],
            name: [
                /\bphone\b/i,
                /\bmobile\b/i,
                /\bcell\b/i,
                /\btel\b/i,
                /\btelephone\b/i,
                /\[phone/i,
                /_systemfield_phone/i,
                /phonenumber/i,
            ],
            label: [
                /\bphone\b/i,
                /\bmobile\b/i,
                /\bcell\b/i,
                /\btelephone\b/i,
                /\bcontact\s*number\b/i,
            ],
            exclude: [
                /\bext(ension)?\b/i,
                /\bcountry\s*code\b/i,
                /\btype\b/i,
                /\bconfirm\b/i,
            ],
        },
        linkedin: {
            autocomplete: [],
            name: [
                /\blinkedin\b/i,
                /\bli[_.\-\s]?url\b/i,
                /\blinkedin[_.\-\s]?url\b/i,
                /\blinkedin[_.\-\s]?profile\b/i,
            ],
            label: [/\blinkedin\b/i, /\bli\s*profile\b/i],
            exclude: [],
        },
        website: {
            autocomplete: ['url', 'photo'],
            name: [
                /\bwebsite\b/i,
                /\bportfolio\b/i,
                /\bpersonal[_.\-\s]?site\b/i,
                /\bpersonal[_.\-\s]?url\b/i,
                /\bhomepage\b/i,
                /\bweb[_.\-\s]?site\b/i,
                /\bgithub\b/i,
                /\bportfolio[_.\-\s]?url\b/i,
            ],
            label: [
                /\bwebsite\b/i,
                /\bportfolio\b/i,
                /\bpersonal\s*(site|url|website)\b/i,
                /\bgithub\b/i,
                /\bhomepage\b/i,
            ],
            exclude: [/\blinkedin\b/i, /\bresume\b/i, /\bcv\b/i, /\bupload\b/i],
        },
        location: {
            autocomplete: ['address-level2', 'address-level1', 'country-name', 'street-address'],
            name: [
                /\bcity\b/i,
                /\blocation\b/i,
                /\bcurrent[_.\-\s]?location\b/i,
                /\baddress[_.\-\s]?city\b/i,
                /\blocality\b/i,
                /\[city\]/i,
                /_systemfield_location/i,
                /\bgeo\b/i,
            ],
            label: [
                /\bcity\b/i,
                /\blocation\b/i,
                /\bwhere\s*(are\s*you|do\s*you)\s*(based|live|located)\b/i,
                /\bcurrent\s*city\b/i,
                /\bbased\s*in\b/i,
            ],
            // Do not put "Austin, TX" into street/zip/country-only fields when possible.
            exclude: [
                /\bstreet\b/i,
                /\baddress\s*line\b/i,
                /\bzip\b/i,
                /\bpostal\b/i,
                /\bcountry\b/i,
                /\bstate\b/i,
                /\bprovince\b/i,
                /\bapartment\b/i,
                /\bsuite\b/i,
            ],
        },
        school: {
            autocomplete: [],
            name: [
                /\bschool\b/i,
                /\buniversity\b/i,
                /\bcollege\b/i,
                /\beducation[_.\-\s]?school\b/i,
                /\binstitution\b/i,
            ],
            label: [
                /\bschool\b/i,
                /\buniversity\b/i,
                /\bcollege\b/i,
                /\binstitution\b/i,
            ],
            exclude: [/\bhigh\s*school\s*only\b/i],
        },
        degree: {
            autocomplete: [],
            name: [/\bdegree\b/i, /\bqualification\b/i, /\beducation[_.\-\s]?degree\b/i],
            label: [/\bdegree\b/i, /\bqualification\b/i, /\bmajor\b/i, /\bfield\s*of\s*study\b/i],
            exclude: [/\btemperature\b/i],
        },
        summary: {
            autocomplete: [],
            name: [
                /\bsummary\b/i,
                /\bcover[_.\-\s]?letter\b/i,
                /\babout\b/i,
                /\bbio\b/i,
                /\bpersonal[_.\-\s]?statement\b/i,
                /\badditional[_.\-\s]?info\b/i,
                /\bmessage\b/i,
            ],
            label: [
                /\bsummary\b/i,
                /\bcover\s*letter\b/i,
                /\babout\s*(you|me|yourself)\b/i,
                /\bpersonal\s*statement\b/i,
                /\btell\s*us\s*about\b/i,
                /\bwhy\s*(do\s*you\s*)?want\b/i,
                /\badditional\s*(information|comments)\b/i,
            ],
            exclude: [/\bjob\s*description\b/i],
        },
        current_title: {
            autocomplete: ['organization-title'],
            name: [
                /\bcurrent[_.\-\s]?(job[_.\-\s]?)?(title|role|position)\b/i,
                /\bjob[_.\-\s]?title\b/i,
                /\btitle\b/i,
                /\bposition[_.\-\s]?title\b/i,
            ],
            label: [
                /\bcurrent\s*(job\s*)?(title|role|position)\b/i,
                /\bjob\s*title\b/i,
                /\bmost\s*recent\s*(title|role)\b/i,
            ],
            exclude: [/\bdesired\b/i, /\btarget\b/i, /\bpage\b/i, /\bsection\b/i, /\bresume\b/i],
        },
        current_company: {
            autocomplete: ['organization'],
            name: [
                /\bcurrent[_.\-\s]?(company|employer|organization)\b/i,
                /\bcompany[_.\-\s]?name\b/i,
                /\bemployer\b/i,
                /\borganization\b/i,
                /\bcompany\b/i,
            ],
            label: [
                /\bcurrent\s*(company|employer)\b/i,
                /\bcompany\s*name\b/i,
                /\bemployer\b/i,
                /\bwhere\s*do\s*you\s*work\b/i,
            ],
            exclude: [/\bschool\b/i, /\buniversity\b/i],
        },
        target_role: {
            autocomplete: [],
            name: [
                /\bdesired[_.\-\s]?(job|role|position|title)\b/i,
                /\btarget[_.\-\s]?role\b/i,
                /\bposition[_.\-\s]?sought\b/i,
            ],
            label: [
                /\bdesired\s*(job|role|position|title)\b/i,
                /\btarget\s*role\b/i,
                /\brole\s*you.?re\s*applying\b/i,
            ],
            exclude: [],
        },
        skills: {
            autocomplete: [],
            name: [/\bskills\b/i, /\bkeywords\b/i, /\bcompetenc/i, /\btechnologies\b/i],
            label: [/\bskills\b/i, /\bkeywords\b/i, /\btechnologies\b/i, /\btools\b/i],
            exclude: [/\bsoft\s*skills\s*only\b/i],
        },
    };

    /**
     * Normalize free text for matching.
     * @param {string} s
     */
    function normalize(s) {
        return String(s || '')
            .toLowerCase()
            .replace(/[_\-./[\]#:]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Build a signal bag from raw attribute strings (testable without DOM).
     * @param {object} raw
     */
    function buildSignals(raw) {
        // Keep autocomplete tokens hyphenated (HTML spec: given-name, family-name).
        const autocomplete = String(raw.autocomplete || '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
        const name = String(raw.name || '');
        const id = String(raw.id || '');
        const placeholder = String(raw.placeholder || '');
        const ariaLabel = String(raw.ariaLabel || '');
        const labelledBy = String(raw.labelledBy || '');
        const label = String(raw.label || '');
        const dataAutomation = String(raw.dataAutomationId || raw['data-automation-id'] || '');
        const dataTestId = String(raw.dataTestId || raw['data-testid'] || '');
        const type = String(raw.type || 'text').toLowerCase().trim();
        const tag = String(raw.tag || 'input').toLowerCase().trim();

        const nameNorm = normalize(name);
        const idNorm = normalize(id);
        const labelNorm = normalize([label, ariaLabel, labelledBy, placeholder].filter(Boolean).join(' '));
        const dataNorm = normalize([dataAutomation, dataTestId].filter(Boolean).join(' '));
        // Do not fold autocomplete into blob — "given-name" would become "given name"
        // and falsely match full_name's /\bname\b/.
        const blob = normalize([name, id, label, ariaLabel, labelledBy, placeholder, dataAutomation, dataTestId].join(' '));

        return {
            autocomplete,
            name,
            id,
            nameNorm,
            idNorm,
            labelNorm,
            dataNorm,
            blob,
            type,
            tag,
            raw,
        };
    }

    /**
     * Score how well a field matches a profile key. Higher is better; 0 = no match.
     * @param {ReturnType<typeof buildSignals>} signals
     * @param {string} key
     */
    function scoreField(signals, key) {
        const rules = RULES[key];
        if (!rules) {
            return 0;
        }

        // Hard exclusions on the full blob (except when autocomplete is definitive).
        const ac = signals.autocomplete;
        const acHit = rules.autocomplete.some((a) => ac === a || ac.split(' ').includes(a));

        if (rules.exclude) {
            for (const ex of rules.exclude) {
                if (ex.test(signals.blob) && !acHit) {
                    // Allow autocomplete override only for non-conflicting keys.
                    if (key === 'full_name' && (/\bfirst\b/.test(signals.blob) || /\blast\b/.test(signals.blob))) {
                        return 0;
                    }
                    if (key === 'location' && ex.test(signals.labelNorm + ' ' + signals.nameNorm)) {
                        return 0;
                    }
                    if (key !== 'location' && ex.test(signals.blob)) {
                        return 0;
                    }
                }
            }
        }

        // Type gates
        if (key === 'email' && signals.type && !['text', 'email', 'search', ''].includes(signals.type)) {
            if (signals.type !== 'email') {
                // still allow text
            }
        }
        if (key === 'phone' && signals.type === 'email') {
            return 0;
        }
        if (key === 'email' && signals.type === 'tel') {
            return 0;
        }
        if (key === 'summary' && signals.tag === 'select') {
            return 0;
        }
        if ((key === 'first_name' || key === 'last_name' || key === 'full_name') && signals.tag === 'textarea') {
            return 0;
        }

        let score = 0;

        // Autocomplete is the strongest signal (HTML standard + browser autofill).
        if (acHit) {
            score += 100;
        }

        // data-automation-id (Workday) / data-testid
        for (const re of rules.name) {
            if (re.test(signals.dataNorm) || re.test(signals.raw.dataAutomationId || '')) {
                score += 70;
                break;
            }
        }

        // name / id attributes (Greenhouse job_application[first_name], etc.)
        for (const re of rules.name) {
            if (re.test(signals.name) || re.test(signals.id) || re.test(signals.nameNorm) || re.test(signals.idNorm)) {
                score += 50;
                break;
            }
        }

        // Visible label / aria / placeholder
        for (const re of rules.label) {
            if (re.test(signals.labelNorm)) {
                score += 40;
                break;
            }
        }

        // Weaker blob fallback for ATS quirks
        if (score === 0) {
            for (const re of rules.name) {
                if (re.test(signals.blob)) {
                    score += 20;
                    break;
                }
            }
        }

        // Prefer email type for email key
        if (key === 'email' && signals.type === 'email') {
            score += 25;
        }
        if (key === 'phone' && signals.type === 'tel') {
            score += 25;
        }
        if (key === 'website' && signals.type === 'url') {
            score += 20;
        }

        // Prefer textarea for summary
        if (key === 'summary' && signals.tag === 'textarea') {
            score += 15;
        }

        // Penalize very generic "name" match when other name fields exist context — handled by exclude.

        // full_name must not win when the field is clearly first/last only
        if (key === 'full_name') {
            if (/\bfirst\b/.test(signals.blob) || /\blast\b/.test(signals.blob) || /\bgiven\b/.test(signals.blob) || /\bfamily\b/.test(signals.blob)) {
                if (!/\bfull\b/.test(signals.blob) && !/\blegal\b/.test(signals.blob) && !/\bapplicant\b/.test(signals.blob)) {
                    return 0;
                }
            }
            // Bare autocomplete "name" only — already handled via acHit.
            // Avoid weak /\bname\b/ on random blobs that merely contain "name".
            if (score < 100 && !/\bfull\b|\blegal\b|\bapplicant\b|\byour\s*name\b|_systemfield_name|\bcandidate\b/.test(signals.blob + ' ' + signals.nameNorm)) {
                // Require stronger evidence than a lone "name" token in a long blob
                if (!acHit && score <= 50 && !/\bfull\s*name\b|\blegal\s*name\b|_systemfield_name|\[name\]/.test(signals.name + signals.id + signals.labelNorm)) {
                    // keep Ashby / explicit name fields; drop ultra-weak matches
                    if (!/^(name|full_name|fullname_name|candidate_name|applicant_name)$/i.test(signals.nameNorm.replace(/\s+/g, '_'))
                        && !/_systemfield_name\b/i.test(signals.name)
                        && !/\[name\]/i.test(signals.name)) {
                        if (score < 60) {
                            return 0;
                        }
                    }
                }
            }
        }

        // Avoid filling "username" as email unless type=email or autocomplete=email
        if (key === 'email' && /\busername\b/.test(signals.blob) && signals.type !== 'email' && !acHit) {
            score = Math.max(0, score - 40);
        }

        // Minimum confidence
        if (score < 20) {
            return 0;
        }

        return score;
    }

    /**
     * Pick best unused field for each key.
     * @param {Array<{ signals: ReturnType<typeof buildSignals>, index: number }>} fields
     * @param {string[]} keys
     * @returns {Record<string, { index: number, score: number }>}
     */
    function matchFields(fields, keys) {
        const used = new Set();
        /** @type {Record<string, { index: number, score: number }>} */
        const out = {};

        for (const key of keys) {
            let best = null;
            for (const field of fields) {
                if (used.has(field.index)) {
                    continue;
                }
                const score = scoreField(field.signals, key);
                if (score <= 0) {
                    continue;
                }
                if (!best || score > best.score) {
                    best = { index: field.index, score };
                }
            }
            if (best) {
                out[key] = best;
                used.add(best.index);
            }
        }

        return out;
    }

    function valuesFromProfile(profile) {
        const contact = profile.contact || {};
        const edu = profile.education || null;
        const raw = {
            first_name: contact.first_name || '',
            last_name: contact.last_name || '',
            full_name: contact.full_name || '',
            email: contact.email || '',
            phone: contact.phone || '',
            location: contact.location || '',
            linkedin: contact.linkedin || '',
            website: contact.website || '',
            summary: profile.summary || '',
            target_role: profile.target_role || '',
            current_title: profile.latest_role?.title || profile.target_role || '',
            current_company: profile.latest_role?.company || '',
            skills: profile.skills_csv || '',
            school: edu?.school || '',
            degree: [edu?.degree, edu?.field].filter(Boolean).join(' in ') || edu?.degree || '',
        };

        /** @type {Record<string, string>} */
        const values = {};
        for (const key of KEY_ORDER) {
            const v = String(raw[key] || '').trim();
            if (v) {
                values[key] = v;
            }
        }
        return values;
    }

    /**
     * Fuzzy-match free text against a list of options (native <select> options
     * or ARIA listbox option text) and return the best match above threshold.
     * @param {Array<{ text: string, value?: string }>} options
     * @param {string} target
     * @returns {{ index: number, score: number } | null}
     */
    function bestOptionMatch(options, target) {
        const t = normalize(target);
        if (!t) {
            return null;
        }

        let bestIndex = -1;
        let bestScore = 0;

        options.forEach((opt, index) => {
            const text = normalize(opt.text || '');
            const value = normalize(opt.value != null ? opt.value : '');
            if (!text && !value) {
                return;
            }
            let s = 0;
            if (text === t || value === t) {
                s = 100;
            } else if (text.startsWith(t) || t.startsWith(text)) {
                s = 80;
            } else if (text.includes(t) || t.includes(text)) {
                s = 50;
            }
            if (s > bestScore) {
                bestScore = s;
                bestIndex = index;
            }
        });

        if (bestIndex === -1 || bestScore < 50) {
            return null;
        }
        return { index: bestIndex, score: bestScore };
    }

    return {
        KEY_ORDER,
        RULES,
        normalize,
        buildSignals,
        scoreField,
        matchFields,
        valuesFromProfile,
        bestOptionMatch,
    };
}));
