/**
 * app.js — Main App Controller for WordQuest
 * ============================================
 * Handles view switching, form events, dashboard rendering,
 * and the stage-map visualisation.
 *
 * Depends on: auth.js  (must be loaded first)
 */

(function (global) {
    'use strict';

    /* ══════════════════════════════════════════════════════════
       VIEW MANAGEMENT
    ══════════════════════════════════════════════════════════ */

    function showView(name) {
        document.getElementById('auth-view').classList.toggle('hidden', name !== 'auth');
        document.getElementById('dashboard-view').classList.toggle('hidden', name !== 'dashboard');
    }

    function showLogin() {
        document.getElementById('login-panel').classList.remove('hidden');
        document.getElementById('register-panel').classList.add('hidden');
        _clearAllErrors();
        document.getElementById('login-form').reset();
    }

    function showRegister() {
        document.getElementById('register-panel').classList.remove('hidden');
        document.getElementById('login-panel').classList.add('hidden');
        _clearAllErrors();
        document.getElementById('register-form').reset();
    }

    /* ══════════════════════════════════════════════════════════
       UI HELPERS
    ══════════════════════════════════════════════════════════ */

    /** Toggle password visibility for an <input> element. */
    function togglePwd(inputId, btn) {
        const el = document.getElementById(inputId);
        const icon = btn.querySelector('i');
        if (!el) return;
        const showing = el.type === 'text';
        el.type = showing ? 'password' : 'text';
        icon.className = showing ? 'fas fa-eye' : 'fas fa-eye-slash';
    }

    /** Show an inline field error beneath a register input. */
    function _setFieldError(errId, msg) {
        const wrap = document.getElementById(errId);
        if (!wrap) return;
        if (msg) {
            wrap.querySelector('span').textContent = msg;
            wrap.classList.remove('hidden');
        } else {
            wrap.classList.add('hidden');
        }
    }

    /** Show the login form-level general error banner. */
    function _setLoginError(msg) {
        const wrap = document.getElementById('login-general-error');
        const span = document.getElementById('login-general-error-msg');
        if (!wrap || !span) return;
        if (msg) {
            span.textContent = msg;
            wrap.classList.remove('hidden');
        } else {
            wrap.classList.add('hidden');
        }
    }

    /** Mark an <input> as errored or clear it. */
    function _markInput(id, hasError) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('is-error', hasError);
    }

    function _clearAllErrors() {
        _setLoginError('');
        ['reg-username-err', 'reg-email-err', 'reg-password-err', 'reg-confirm-err']
            .forEach(id => _setFieldError(id, ''));
        ['login-email', 'login-password',
            'reg-username', 'reg-email', 'reg-password', 'reg-confirm']
            .forEach(id => _markInput(id, false));
    }

    /** Toggle button loading state (disables button, swaps text ↔ spinner). */
    function _setBusy(btnId, busy) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.disabled = busy;
        btn.querySelector('.btn-text').classList.toggle('hidden', busy);
        btn.querySelector('.btn-loading').classList.toggle('hidden', !busy);
    }

    /* ── Toast notifications ──────────────────────────────────── */
    function toast(message, type = 'info') {
        const ICON = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warn: 'fa-triangle-exclamation' };
        const CSS = { success: 'toast-success', error: 'toast-error', info: 'toast-info', warn: 'toast-warn' };

        const el = document.createElement('div');
        el.className = `toast ${CSS[type] || 'toast-info'}`;
        el.innerHTML = `<i class="fa-solid ${ICON[type] || ICON.info}"></i><span>${_esc(message)}</span>`;

        const wrap = document.getElementById('toast-wrap');
        wrap.appendChild(el);
        setTimeout(() => el.remove(), 3300);
    }

    /* ── HTML escaping (XSS prevention for DOM injection) ────── */
    function _esc(s) {
        return String(s).replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    /* ── Tiny async delay for UI polish ─────────────────────── */
    const _delay = ms => new Promise(r => setTimeout(r, ms));

    /* ══════════════════════════════════════════════════════════
       FORM EVENT HANDLERS
    ══════════════════════════════════════════════════════════ */

    document.getElementById('login-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        _clearAllErrors();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        _setBusy('login-btn', true);
        await _delay(380);

        const result = Auth.login(email, password);
        _setBusy('login-btn', false);

        if (!result.ok) {
            _setLoginError(result.error);
            _markInput('login-email', true);
            _markInput('login-password', true);
            toast(result.error, 'error');
            return;
        }

        toast(`Welcome back, ${_esc(result.user.username)}! 🎮`, 'success');
        await _delay(260);
        renderDashboard(result.user);
        showView('dashboard');
    });

    document.getElementById('register-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        _clearAllErrors();

        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;

        // Client-side password match check
        if (password !== confirm) {
            _setFieldError('reg-confirm-err', 'Passwords do not match.');
            _markInput('reg-confirm', true);
            return;
        }

        _setBusy('register-btn', true);
        await _delay(380);

        const result = Auth.register(username, email, password);
        _setBusy('register-btn', false);

        if (!result.ok) {
            const err = result.error;
            if (/username/i.test(err)) { _setFieldError('reg-username-err', err); _markInput('reg-username', true); }
            else if (/email/i.test(err)) { _setFieldError('reg-email-err', err); _markInput('reg-email', true); }
            else if (/password/i.test(err)) { _setFieldError('reg-password-err', err); _markInput('reg-password', true); }
            toast(err, 'error');
            return;
        }

        toast(`Welcome to WordQuest, ${_esc(result.user.username)}! 🚀`, 'success');
        await _delay(260);
        renderDashboard(result.user);
        showView('dashboard');
    });

    document.getElementById('logout-btn').addEventListener('click', function () {
        Auth.logout();
        toast('You have been logged out. See you next time!', 'info');
        showView('auth');
        showLogin();
    });

    /* ══════════════════════════════════════════════════════════
       DASHBOARD RENDERER
    ══════════════════════════════════════════════════════════ */
    // Snapshot of stringified stage data; stage map is only rebuilt when this changes.
    let _lastStagesSnapshot = null;

    /* ══════════════════════════════════════════════════════════
       GLOBAL STATE MANAGER  (Dirty-check UI Cache)
    ══════════════════════════════════════════════════════════ */

    /* เก็บค่าล่าสุดที่เขียนลง DOM ทุก field
       อัปเดต DOM ก็ต่อเมื่อค่าเปลี่ยนแปลงจริงเท่านั้น
       ป้องกัน DOM thrashing ใน refreshDashboard() ซึ่งถูกเรียกหลังทุกคำถามที่ตอบถูก
       (coins/XP เปลี่ยน; ชื่อ / avatar ไม่เปลี่ยน — dirty-check ตัด DOM write ที่ไม่จำเป็น) */
    const _uiCache = Object.create(null);

    /** เขียน textContent เฉพาะเมื่อค่าเปลี่ยน */
    function _setIfChanged(id, val) {
        const s = String(val);
        if (_uiCache[id] === s) return;   // ค่าเดิม → ไม่แตะ DOM เลย
        _uiCache[id] = s;
        const el = document.getElementById(id);
        if (el) el.textContent = s;
    }

    /** เขียน className เฉพาะเมื่อ class string เปลี่ยน */
    function _setClassIfChanged(id, cls) {
        const key = '_c_' + id;
        if (_uiCache[key] === cls) return;
        _uiCache[key] = cls;
        const el = document.getElementById(id);
        if (el) el.className = cls;
    }

    /**
     * อัปเดต textContent และ className พร้อมกัน โดยมี dirty-check ทั้งคู่
     * ใช้กับ element ที่เปลี่ยนได้ทั้งข้อความและ style (เช่น avatar, rank badge)
     */
    function _setElIfChanged(id, text, cls) {
        const tKey = id + '_t', cKey = id + '_c';
        if (_uiCache[tKey] === text && _uiCache[cKey] === cls) return;
        _uiCache[tKey] = text;
        _uiCache[cKey] = cls;
        const el = document.getElementById(id);
        if (!el) return;
        if (text !== undefined) el.textContent = text;
        if (cls !== undefined) el.className = cls;
    }

    function renderDashboard(user) {
        if (!user) return;

        // Ensure stages array is always complete (data-migration guard)
        if (!Array.isArray(user.stages) || user.stages.length !== 5) {
            user.stages = Auth.STAGE_DEFS.map((def, i) => ({
                id: def.id,
                unlocked: i === 0,
                subLevels: i === 0 ? [1, 0, 0, 0, 0] : [0, 0, 0, 0, 0],
            }));
            Auth.updateUser(user);
        }

        const lvData = Auth.calculateLevel(user.totalXP);
        const rank = Auth.getRank(lvData.level);
        const avIdx = Auth.getAvatarIndex(user.username);
        const init = user.username.charAt(0).toUpperCase();

        /* ── Navbar ──────────────────────────────────────────── */
        // dirty-check: เขียน DOM เฉพาะเมื่อค่าเปลี่ยน (coins/level เปลี่ยนบ่อย; username ไม่เปลี่ยน)
        _setIfChanged('nav-coins', user.coins.toLocaleString());
        _setIfChanged('nav-username', user.username);
        _setIfChanged('nav-level-txt', `Level ${lvData.level}`);
        _setElIfChanged('nav-avatar', init,
            `w-9 h-9 rounded-xl av-${avIdx} flex items-center justify-center font-bold text-white text-sm select-none`);

        /* ── Welcome message ─────────────────────────────────── */
        const hr = new Date().getHours();
        const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
        _setIfChanged('welcome-msg', `${greet}, ${user.username}! Ready to level up your English?`);

        /* ── Profile card ────────────────────────────────────── */
        _setElIfChanged('profile-avatar', init,
            `w-20 h-20 rounded-2xl av-${avIdx} flex items-center justify-center text-3xl font-black text-white mb-3 select-none`);
        _setIfChanged('profile-username', user.username);
        _setIfChanged('profile-level', lvData.level);
        _setElIfChanged('profile-rank', `${rank.icon} ${rank.name}`,
            `${rank.css} mt-2 px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase`);

        // Join date — dirty-check by label string (changes at most once a day)
        const days = Math.floor((Date.now() - new Date(user.createdAt)) / 86400000);
        const joinLabel = days === 0 ? 'Joined today'
            : days === 1 ? 'Joined yesterday'
                : `Joined ${days} days ago`;
        if (_uiCache['_join'] !== joinLabel) {
            _uiCache['_join'] = joinLabel;
            const joinEl = document.getElementById('profile-joined');
            if (joinEl) joinEl.querySelector('span').textContent = joinLabel;
        }

        /* ── Stats chips ─────────────────────────────────────── */
        _setIfChanged('stat-level', lvData.level.toLocaleString());
        _setIfChanged('stat-xp', user.totalXP.toLocaleString());
        _setIfChanged('stat-coins', user.coins.toLocaleString());

        /* ── XP progress bar (animated) ─────────────────────── */
        const pct = Math.min(100, Math.round((lvData.xpInLevel / lvData.xpForNext) * 100));
        const remaining = lvData.xpForNext - lvData.xpInLevel;

        _setIfChanged('xp-cur', lvData.xpInLevel.toLocaleString());
        _setIfChanged('xp-max', lvData.xpForNext.toLocaleString());
        _setIfChanged('xp-hint',
            remaining > 0
                ? `${remaining.toLocaleString()} XP needed to reach Level ${lvData.level + 1}`
                : '🎉 Ready to level up!');

        // XP bar: อัปเดตเฉพาะเมื่อ % เปลี่ยน — double-RAF เพื่อ smooth transition
        const pctStr = pct + '%';
        if (_uiCache['_xpbar'] !== pctStr) {
            _uiCache['_xpbar'] = pctStr;
            const bar = document.getElementById('xp-bar');
            if (bar) {
                bar.style.width = '0%';
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => { bar.style.width = pctStr; });
                });
            }
        }

        /* ── Stage map (rebuild only when stage data changes) ── */
        const stagesKey = JSON.stringify(user.stages);
        if (stagesKey !== _lastStagesSnapshot) {
            _lastStagesSnapshot = stagesKey;
            renderStageMap(user);
        }

        /* ── Survival Mode UI ────────────────────────────────────────── */
        if (global.Game && typeof global.Game.refreshSurvivalUI === 'function') {
            global.Game.refreshSurvivalUI(user);
        }

        /* ── Sound toggle button ─────────────────────────────────────────── */
        if (global.SoundManager) {
            _updateSoundBtn(global.SoundManager.isEnabled());
        }
    }

    /* ══════════════════════════════════════════════════════════
       STAGE MAP RENDERER
    ══════════════════════════════════════════════════════════ */

    // Accent colour sets for each stage  ( bg / border / nodeBase / nodeText )
    const STAGE_ACCENTS = {
        indigo: {
            cardBg: 'rgba(79,70,229,.14)',
            cardBdr: 'rgba(99,102,241,.32)',
            nodeBase: 'background: #4F46E5;',
            barFill: '#6366F1',
            titleClr: '#818CF8',
        },
        purple: {
            cardBg: 'rgba(124,58,237,.14)',
            cardBdr: 'rgba(139,92,246,.32)',
            nodeBase: 'background: #7C3AED;',
            barFill: '#A78BFA',
            titleClr: '#C4B5FD',
        },
        blue: {
            cardBg: 'rgba(37,99,235,.14)',
            cardBdr: 'rgba(96,165,250,.32)',
            nodeBase: 'background: #2563EB;',
            barFill: '#60A5FA',
            titleClr: '#93C5FD',
        },
        cyan: {
            cardBg: 'rgba(8,145,178,.14)',
            cardBdr: 'rgba(34,211,238,.32)',
            nodeBase: 'background: #0891B2;',
            barFill: '#22D3EE',
            titleClr: '#67E8F9',
        },
        gold: {
            cardBg: 'rgba(180,130,6,.14)',
            cardBdr: 'rgba(234,179,8,.32)',
            nodeBase: 'background: #B45309;',
            barFill: '#FBBF24',
            titleClr: '#FDE68A',
        },
    };

    function renderStageMap(user) {
        const container = document.getElementById('stage-map');
        const frag = document.createDocumentFragment();

        user.stages.forEach((stage, idx) => {
            const def = Auth.STAGE_DEFS[idx];
            const ac = STAGE_ACCENTS[def.accentClass] || STAGE_ACCENTS.indigo;
            const isLocked = !stage.unlocked;
            const doneCnt = stage.subLevels.filter(s => s === 2).length;
            const allDone = doneCnt === 5;

            /* ── Sub-level node row ──────────────────────────── */
            const nodesHTML = _buildSubLevelNodes(stage.subLevels, ac, isLocked);

            /* ── Mini progress bar ───────────────────────────── */
            const barPct = (doneCnt / 5) * 100;

            /* ── Status label ────────────────────────────────── */
            let statusLabel;
            if (isLocked) statusLabel = `<span class="text-slate-600"><i class="fas fa-lock mr-1"></i>Locked</span>`;
            else if (allDone) statusLabel = `<span style="color:#34D399">✅ Complete</span>`;
            else statusLabel = `<span style="color:${ac.titleClr}">${doneCnt}/5 Done</span>`;

            /* ── Card HTML ───────────────────────────────────── */
            const card = document.createElement('div');
            card.className = `stage-card glass rounded-2xl p-5 cursor-pointer ${isLocked ? 'locked opacity-60' : 'unlocked'} border`;
            card.style.cssText = `background: ${ac.cardBg}; border-color: ${isLocked ? 'rgba(71,85,105,.3)' : ac.cardBdr};`;
            card.setAttribute('data-stage', stage.id);
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', `Stage ${stage.id}: ${def.name}`);
            card.setAttribute('tabindex', '0');

            card.innerHTML = `
        <!-- Header -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0 mr-2">
            <p class="text-slate-500 text-xs font-medium leading-none mb-0.5">Stage ${stage.id}</p>
            <h4 class="font-bold text-white text-sm leading-tight truncate">${_esc(def.name)}</h4>
          </div>
          <span class="text-xl flex-shrink-0" aria-hidden="true">${isLocked ? '🔒' : def.icon}</span>
        </div>

        <!-- Description -->
        <p class="text-slate-500 text-xs mb-4 leading-relaxed">${_esc(def.desc)}</p>

        <!-- Sub-level nodes -->
        ${nodesHTML}

        <!-- Footer: status + mini bar -->
        <div class="flex items-center justify-between mt-4 gap-2">
          <span class="text-xs font-semibold">${statusLabel}</span>
          <div class="w-14 h-1.5 rounded-full bg-slate-700/70 overflow-hidden flex-shrink-0">
            <div class="h-full rounded-full transition-all duration-700"
              style="width: ${barPct}%; background: ${isLocked ? '#374151' : ac.barFill};"></div>
          </div>
        </div>
      `;

            frag.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(frag);
    }

    /** Build the sub-level node connector row. */
    function _buildSubLevelNodes(subLevels, ac, isLocked) {
        // We use a relative wrapper with an absolute centre-line behind nodes
        const nodes = subLevels.map((state, i) => {
            let cls, inner;

            if (state === 2) {
                // Completed
                cls = 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer';
                inner = `<span style="background:#059669; border: 2px solid #34D399;" class="w-7 h-7 rounded-full flex items-center justify-center">` +
                    `<i class="fas fa-check text-[10px]"></i></span>`;
            } else if (state === 1) {
                // Current / unlocked
                cls = 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white node-current cursor-pointer';
                inner = `<span style="${ac.nodeBase} border: 2px solid #F59E0B;" class="w-7 h-7 rounded-full flex items-center justify-center">${i + 1}</span>`;
            } else {
                // Locked
                const lockStyle = isLocked
                    ? 'background:#1E293B; border: 2px solid #334155;'
                    : 'background:#1E293B; border: 2px solid #334155;';
                cls = 'w-7 h-7 rounded-full flex items-center justify-center text-xs text-slate-600 cursor-not-allowed';
                inner = `<span style="${lockStyle}" class="w-7 h-7 rounded-full flex items-center justify-center">` +
                    `<i class="fas fa-lock text-[9px]"></i></span>`;
            }

            return `<div class="${cls}" title="Sub-level ${i + 1}" data-sublevel-idx="${i}">${inner}</div>`;
        }).join('');

        return `
      <div class="relative">
        <div class="absolute top-1/2 left-3.5 right-3.5 h-px -translate-y-1/2"
          style="background: rgba(71,85,105,.5);"></div>
        <div class="relative flex items-center justify-between">
          ${nodes}
        </div>
      </div>
    `;
    }

    /** Handle clicking on a specific sub-level node. */
    function _onSubLevelClick(stageIdx, stage, subIdx, isLocked) {
        if (isLocked) {
            toast(`Stage ${stage.id} is locked. Complete the previous stage first! 🔒`, 'warn');
            return;
        }
        const state = stage.subLevels[subIdx];
        if (state === 0) {
            toast(`Sub-level ${subIdx + 1} is locked. Complete the previous one first! 🔒`, 'warn');
            return;
        }
        if (typeof Game !== 'undefined') {
            Game.start(stageIdx, subIdx);
        }
    }

    /** Handle clicking the stage card background (starts next available sub-level). */
    function _onStageClick(stageIdx, stage, def, isLocked) {
        if (isLocked) {
            toast(`Stage ${stage.id} is locked. Complete the previous stage first! 🔒`, 'warn');
            return;
        }
        if (stage.subLevels.every(s => s === 2)) {
            toast(`${def.icon} “${def.name}” is fully complete! 🎉`, 'success');
            return;
        }
        // Start the first current/unlocked sub-level
        const subIdx = stage.subLevels.findIndex(s => s === 1);
        if (subIdx !== -1 && typeof Game !== 'undefined') {
            Game.start(stageIdx, subIdx);
        }
    }

    /* ══════════════════════════════════════════════════════════
       UTILITY
    ══════════════════════════════════════════════════════════ */

    function _setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    /* ── Sound toggle button state sync ─────────────────────────── */
    function _updateSoundBtn(on) {
        const btn = document.getElementById('btn-sound-toggle');
        if (!btn) return;
        const icon = btn.querySelector('i');
        if (icon) icon.className = on
            ? 'fas fa-volume-high text-slate-300 text-sm'
            : 'fas fa-volume-xmark text-slate-600 text-sm';
        btn.title = on ? 'Sound On (click to mute)' : 'Sound Off (click to enable)';
    }

    /* ══════════════════════════════════════════════════════════
       PUBLIC SURFACE  (called from inline HTML onclick props)
    ══════════════════════════════════════════════════════════ */

    global.App = Object.freeze({
        showLogin,
        showRegister,
        togglePwd,
        toast,
        refreshDashboard: function (user) {
            renderDashboard(user || Auth.getCurrentUser());
        },
    });

    /* ══════════════════════════════════════════════════════════
       INITIALISATION
    ══════════════════════════════════════════════════════════ */

    /* ══════════════════════════════════════════════════════════
       GLOBAL EVENT DELEGATION  (แทนที่ onclick="" inline handlers)
    ══════════════════════════════════════════════════════════ */

    /**
     * Single click listener บน document.body ครอบคลุมทุก data-action
     * แทนที่ onclick="" inline handlers ต่างๆ ใน HTML
     * ลด overhead จาก event listeners ที่กระจายอยู่ใน HTML ลงเหลือ 1 handler
     */
    function _initGlobalDelegation() {
        document.body.addEventListener('click', function (e) {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action;
            const target = el.dataset.target;

            switch (action) {
                case 'show-login': showLogin(); break;
                case 'show-register': showRegister(); break;
                case 'toggle-pwd': togglePwd(target, el); break;
                case 'shop-open': if (global.Shop) global.Shop.open(); break;
                case 'shop-close': if (global.Shop) global.Shop.close(); break;
                case 'lb-open': if (global.Leaderboard) global.Leaderboard.open(); break;
                case 'lb-close': if (global.Leaderboard) global.Leaderboard.close(); break;
                case 'game-clear-close': if (global.Game) global.Game.closeStageClear(); break;
                case 'game-over-close': if (global.Game) global.Game.closeGameOver(); break;
                case 'game-levelup-close': if (global.Game) global.Game.closeLevelUp(); break;
                case 'game-cert-close': if (global.Game) global.Game.closeCertificate(); break;
                case 'survival-start':  if (global.Game) global.Game.startSurvival(); break;
                case 'survival-close':  if (global.Game) global.Game.closeSurvival(); break;
                case 'sound-toggle':
                    if (global.SoundManager) {
                        const nowOn = global.SoundManager.toggle();
                        _updateSoundBtn(nowOn);
                    }
                    break;
            }
        });
    }

    // Single delegated listener on #stage-map — bound once at init, never re-added on re-render.
    function _initStageMapDelegation() {
        const container = document.getElementById('stage-map');
        if (!container) return;

        container.addEventListener('click', function (e) {
            const card = e.target.closest('[data-stage]');
            if (!card) return;
            const stageIdx = parseInt(card.dataset.stage, 10) - 1;
            const user = Auth.getCurrentUser();
            if (!user || !user.stages[stageIdx]) return;
            const stage = user.stages[stageIdx];
            const def = Auth.STAGE_DEFS[stageIdx];
            const isLocked = !stage.unlocked;
            const nodeEl = e.target.closest('[data-sublevel-idx]');
            if (nodeEl) {
                _onSubLevelClick(stageIdx, stage, parseInt(nodeEl.dataset.sublevelIdx, 10), isLocked);
            } else {
                _onStageClick(stageIdx, stage, def, isLocked);
            }
        });

        container.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const card = e.target.closest('[data-stage]');
            if (!card) return;
            e.preventDefault();
            const stageIdx = parseInt(card.dataset.stage, 10) - 1;
            const user = Auth.getCurrentUser();
            if (!user || !user.stages[stageIdx]) return;
            const stage = user.stages[stageIdx];
            const def = Auth.STAGE_DEFS[stageIdx];
            const isLocked = !stage.unlocked;
            _onStageClick(stageIdx, stage, def, isLocked);
        });
    }

    function init() {
        _initGlobalDelegation();   // data-action delegation บน body (แทน inline onclick handlers)
        _initStageMapDelegation(); // stage map click + keydown (เก็บแยกเพราะมี logic เฉพาะ)
        // อัปเดต initial sound button state
        if (global.SoundManager) _updateSoundBtn(global.SoundManager.isEnabled());
        if (Auth.isLoggedIn()) {
            const user = Auth.getCurrentUser();
            renderDashboard(user);
            showView('dashboard');
        } else {
            showView('auth');
            showLogin();
        }
    }

    document.addEventListener('DOMContentLoaded', init);

}(window));
