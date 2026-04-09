/**
 * admin.js — Admin Panel Controller สำหรับ WordQuest (Multi-Mode Edition)
 * =========================================================================
 * ไฟล์นี้จัดการทุกอย่างที่เกี่ยวกับ Admin Panel:
 *   - การตรวจสอบสิทธิ์ Admin (Hardcoded credentials)
 *   - Session management ผ่าน localStorage
 *   - User Management พร้อม Stage Progress (5 Stages x 5 Sub-levels)
 *   - Stage/Sub-level Unlock/Lock โดย Admin
 *   - Grant Items (Shields) ให้ผู้ใช้โดยตรง
 *   - Statistics Overview (XP รวม, Coins รวม, Stage ยอดนิยม)
 *   - Global Reset แบบเลือกส่วน (Stage เท่านั้น หรือทั้งหมด)
 *   - Content Preview แยกตาม Mode (MCQ, Type-in-Blank, Scramble, T/F, IWM)
 *   - Danger Zone (Factory Reset, Clear Admin Sessions, Export)
 *
 * GameState Object ที่ใช้:
 *   user.stages = Array(5) ของ { id, unlocked, subLevels: [0|1|2, ...] }
 *     0 = locked, 1 = unlocked/current, 2 = completed
 *   wq_shields = { [userId]: count } ใน localStorage
 *
 * หมายเหตุด้านความปลอดภัย:
 *   นี่คือ "Security Simulation" สำหรับ client-side demo เท่านั้น
 */

(function (global) {
    'use strict';

    /* ══════════════════════════════════════════════════════════
       CONSTANTS — ค่าคงที่สำหรับระบบ Admin
    ══════════════════════════════════════════════════════════ */

    const ADMIN_USERNAME = 'admin';
    const ADMIN_SALT = 'WQ_ADMIN_2026';
    const ADMIN_PASSWORD_HASH = _hashAdminPwd('admin');

    const ADMIN_SESSION_KEY = 'wq_admin_session';
    const USERS_KEY = 'wq_users';
    const SHIELD_KEY = 'wq_shields';
    const ACHIEVEMENTS_KEY = 'wq_achievements'; // { [userId]: { perfectStreak, coinHoarder, englishMaster } }

    const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 ชั่วโมง

    // ชื่อ Stage ตรงกับ auth.js STAGE_DEFS
    const STAGE_NAMES = [
        'The Basics',
        'Word Builder',
        'Grammar Gates',
        'Read & Conquer',
        "Master's Hall",
    ];

    // Mode ของแต่ละ Stage (ต้องตรงกับ window.STAGE_MODES ใน questions.js)
    const STAGE_MODES = {
        1: 'multiple-choice',
        2: 'type-in-blank',
        3: 'sentence-scramble',
        4: 'true-false',
        5: 'image-word-match',
    };

    // Metadata แสดงผลของแต่ละ Mode
    const MODE_META = {
        'multiple-choice': { icon: '🎯', label: 'MCQ', color: '#818CF8', bg: 'rgba(99,102,241,.18)' },
        'type-in-blank': { icon: '⌨️', label: 'Typing', color: '#6EE7B7', bg: 'rgba(16,185,129,.18)' },
        'sentence-scramble': { icon: '🔀', label: 'Scramble', color: '#FCD34D', bg: 'rgba(245,158,11,.18)' },
        'true-false': { icon: '⚡', label: 'T/F', color: '#F9A8D4', bg: 'rgba(244,63,94,.18)' },
        'image-word-match': { icon: '🖼️', label: 'Image', color: '#67E8F9', bg: 'rgba(6,182,212,.18)' },
    };

    const VIEW_TITLES = {
        users: 'User Management',
        stats: 'Statistics Overview',
        content: 'Content Preview',
        danger: 'Danger Zone',
    };


    /* ══════════════════════════════════════════════════════════
       MUTABLE STATE — ตัวแปรสถานะที่เปลี่ยนแปลงได้
    ══════════════════════════════════════════════════════════ */

    let _currentView = 'users';
    let _pendingLevelUserId = null;
    let _pendingGrantUserId = null;  // userId ที่รอ Grant Items
    let _pendingStageUserId = null;  // userId ที่รอ Stage unlock/lock
    let _confirmCallback = null;
    let _clockTimer = null;


    /* ══════════════════════════════════════════════════════════
       HASH FUNCTION — djb2 (สำหรับ demo เท่านั้น)
       ใช้ function declaration เพื่อให้ถูก hoist ก่อน const
    ══════════════════════════════════════════════════════════ */

    function _hashAdminPwd(plain) {
        const s = plain + ADMIN_SALT;
        let h = 5381;
        for (let i = 0; i < s.length; i++) {
            h = Math.imul(h, 33) ^ s.charCodeAt(i);
        }
        return (h >>> 0).toString(16).padStart(8, '0');
    }


    /* ══════════════════════════════════════════════════════════
       ADMIN SESSION MANAGEMENT — จัดการ session ของ Admin
    ══════════════════════════════════════════════════════════ */

    function _setAdminSession() {
        const session = { token: _generateSecureToken(), username: ADMIN_USERNAME, ts: Date.now() };
        try { localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session)); } catch (e) { }
    }

    function _clearAdminSession() { localStorage.removeItem(ADMIN_SESSION_KEY); }

    function _getAdminSession() {
        try { const raw = localStorage.getItem(ADMIN_SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
    }

    function _generateSecureToken() {
        const arr = new Uint8Array(16);
        crypto.getRandomValues(arr);
        return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    }

    function _checkAdminSession() {
        const session = _getAdminSession();
        if (!session || !session.token || !session.ts || !session.username) return false;
        if (session.username !== ADMIN_USERNAME) { _clearAdminSession(); return false; }
        if (Date.now() - session.ts > SESSION_TTL_MS) { _clearAdminSession(); return false; }
        return true;
    }


    /* ══════════════════════════════════════════════════════════
       AUTH FUNCTIONS — Login / Logout
    ══════════════════════════════════════════════════════════ */

    function adminLogin(username, password) {
        if (!username || username.trim() !== ADMIN_USERNAME)
            return { ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
        if (!password || _hashAdminPwd(password) !== ADMIN_PASSWORD_HASH)
            return { ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
        _setAdminSession();
        return { ok: true };
    }

    function adminLogout() {
        _clearAdminSession();
        if (_clockTimer) clearInterval(_clockTimer);
        window.location.reload();
    }


    /* ══════════════════════════════════════════════════════════
       LOCALSTORAGE HELPERS — อ่าน/เขียน localStorage
    ══════════════════════════════════════════════════════════ */

    function _loadUsers() {
        try { const raw = localStorage.getItem(USERS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
    }

    function _saveUsers(users) {
        try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch (e) { }
    }

    // อ่าน shield inventory map ทั้งหมด (userId -> count)
    function _loadShieldsMap() {
        try { const raw = localStorage.getItem(SHIELD_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
    }

    function _saveShieldsMap(map) {
        try { localStorage.setItem(SHIELD_KEY, JSON.stringify(map)); } catch (e) { }
    }

    // คืนจำนวน shields ของ user คนหนึ่ง
    function _getShieldsForUser(userId) {
        return Math.max(0, _loadShieldsMap()[userId] || 0);
    }

    // อ่าน achievements ทั้งหมด (userId -> { perfectStreak, coinHoarder, englishMaster })
    function _loadAllAchievements() {
        try { const raw = localStorage.getItem(ACHIEVEMENTS_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
    }

    // คืน achievements ของ user คนหนึ่ง
    function _getAchievementsForUser(userId) {
        return _loadAllAchievements()[userId] || {};
    }


    /* ══════════════════════════════════════════════════════════
       XP / LEVEL HELPERS — คำนวณ Level จาก XP
    ══════════════════════════════════════════════════════════ */

    function _xpForLevel(n) { return n * 100; }

    function _calculateLevel(totalXP) {
        let level = 1, accumulated = 0;
        while (true) {
            const needed = _xpForLevel(level);
            if (accumulated + needed > totalXP)
                return { level, xpInLevel: totalXP - accumulated, xpForNext: needed };
            accumulated += needed;
            level++;
        }
    }

    // XP ขั้นต่ำสำหรับ level N: (n-1)*n*50
    function _xpForStartOfLevel(n) {
        if (n <= 1) return 0;
        return (n - 1) * n * 50;
    }


    /* ══════════════════════════════════════════════════════════
       STAGE PROGRESS HELPERS
       user.stages[i] = { id, unlocked, subLevels:[0|1|2, ...] }
       0=locked, 1=unlocked/current, 2=completed
    ══════════════════════════════════════════════════════════ */

    // นับ sub-levels ที่ completed (state === 2)
    function _countCompleted(stage) {
        if (!stage || !Array.isArray(stage.subLevels)) return 0;
        return stage.subLevels.filter(s => s === 2).length;
    }

    // สร้าง default stages ใหม่ (Stage 1 unlocked, ที่เหลือ locked)
    function _defaultStages() {
        return [1, 2, 3, 4, 5].map((id, i) => ({
            id,
            unlocked: i === 0,
            subLevels: i === 0 ? [1, 0, 0, 0, 0] : [0, 0, 0, 0, 0],
        }));
    }

    // ตรวจว่า user มี stages ครบ ถ้าไม่มี → สร้างใหม่
    function _ensureStages(user) {
        if (!user.stages || !Array.isArray(user.stages) || user.stages.length !== 5) {
            user.stages = _defaultStages();
        }
        user.stages.forEach(stage => {
            if (!Array.isArray(stage.subLevels) || stage.subLevels.length !== 5) {
                stage.subLevels = [0, 0, 0, 0, 0];
            }
        });
    }


    /* ══════════════════════════════════════════════════════════
       AVATAR HELPER — index 0-7 จาก username
    ══════════════════════════════════════════════════════════ */

    function _getAvatarIndex(username) {
        let h = 0;
        for (let i = 0; i < username.length; i++) {
            h = Math.imul(h, 31) + username.charCodeAt(i) | 0;
        }
        return Math.abs(h) % 8;
    }


    /* ══════════════════════════════════════════════════════════
       USER TABLE — Render ตารางผู้ใช้พร้อม Stage Progress + Mode Badge
       ใช้ DocumentFragment เพื่อ batch insert (ป้องกัน lag เมื่อมีผู้ใช้มาก)
    ══════════════════════════════════════════════════════════ */

    function renderUsersTable() {
        const query = (document.getElementById('users-search')?.value || '').trim().toLowerCase();
        let users = _loadUsers();

        // อัปเดต badge จำนวนผู้ใช้ทั้งหมด (ก่อน filter)
        _setText('users-count-badge', users.length);

        if (query) {
            users = users.filter(u =>
                (u.username || '').toLowerCase().includes(query) ||
                (u.email || '').toLowerCase().includes(query)
            );
        }

        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-14 text-center text-slate-500 text-sm">
                <i class="fas fa-users-slash text-3xl opacity-20 block mb-3"></i>
                ${query ? `ไม่พบผู้ใช้ที่ตรงกับ "<strong class="text-slate-400">${_esc(query)}</strong>"` : 'ยังไม่มีผู้ใช้ลงทะเบียนในระบบ'}
            </td></tr>`;
            return;
        }

        // DocumentFragment — batch insertion เพื่อประสิทธิภาพสูงสุด
        const frag = document.createDocumentFragment();

        users.forEach((u, i) => {
            _ensureStages(u);

            const avIdx = _getAvatarIndex(u.username || '');
            const initials = (u.username || '?').slice(0, 2).toUpperCase();
            const lv = _calculateLevel(u.totalXP || 0).level;
            const shields = _getShieldsForUser(u.id);
            const survHS  = u.survivalHighScore || 0;
            const achMap  = _getAchievementsForUser(u.id);
            const achBadges = [
                achMap.perfectStreak ? '<span class="ach-badge" title="Perfect Streak">🎯</span>' : '',
                achMap.coinHoarder   ? '<span class="ach-badge" title="Coin Hoarder">💰</span>'   : '',
                achMap.englishMaster ? '<span class="ach-badge" title="English Master">👑</span>' : '',
            ].filter(Boolean).join('');
            const joinDate = u.createdAt
                ? new Date(u.createdAt).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })
                : '—';

            // หา Stage ที่กำลังเล่นอยู่ = unlocked แต่ยังไม่ complete ทั้ง 5
            let currentStageNum = 0;
            for (let si = 0; si < 5; si++) {
                const stage = u.stages[si];
                if (stage.unlocked && _countCompleted(stage) < 5 && currentStageNum === 0) {
                    currentStageNum = si + 1;
                }
            }

            // Progress rows สำหรับ 5 Stages
            const progressHtml = u.stages.map((stage, si) => {
                const completed = _countCompleted(stage);
                const mode = STAGE_MODES[si + 1];
                const meta = MODE_META[mode] || MODE_META['multiple-choice'];
                const pct = Math.round(completed / 5 * 100);
                const locked = !stage.unlocked;
                return `<div class="stage-prog-row${locked ? ' stage-prog-locked' : ''}" title="Stage ${si + 1}: ${STAGE_NAMES[si]} | ${mode}">
                    <div class="stage-prog-label">
                        <span class="mode-badge" style="background:${meta.bg};color:${meta.color}">${meta.icon} S${si + 1}</span>
                        <span class="stage-prog-frac">${locked ? '🔒' : completed + '/5'}</span>
                    </div>
                    <div class="stage-prog-bar-track">
                        <div class="stage-prog-bar-fill" style="width:${pct}%;background:${meta.color}"></div>
                    </div>
                </div>`;
            }).join('');

            // Mode badge ของ Stage ที่กำลังเล่น
            const activeMeta = currentStageNum > 0 ? (MODE_META[STAGE_MODES[currentStageNum]] || MODE_META['multiple-choice']) : null;
            const modeBadge = activeMeta
                ? `<span class="current-mode-badge" style="background:${activeMeta.bg};color:${activeMeta.color};border:1px solid ${activeMeta.color}55">${activeMeta.icon} ${activeMeta.label}</span>`
                : `<span class="current-mode-badge" style="background:rgba(16,185,129,.15);color:#6EE7B7;border:1px solid rgba(16,185,129,.3)">✅ Done</span>`;

            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-800/70 hover:bg-slate-800/40 transition-colors';
            tr.dataset.userId = u.id;
            tr.innerHTML = `
                <td class="px-4 py-3 text-slate-500 text-sm text-center">${i + 1}</td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full av-${avIdx} flex items-center justify-center text-xs font-bold text-white flex-shrink-0">${initials}</div>
                        <div class="min-w-0">
                            <div class="text-white font-semibold text-sm leading-tight truncate">${_esc(u.username || '—')}</div>
                            <div class="text-slate-500 text-xs truncate">${_esc(u.email || '—')}</div>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3 text-center">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                          style="background:rgba(99,102,241,.15);color:#a5b4fc;border:1px solid rgba(99,102,241,.3)">Lv.${lv}</span>
                </td>
                <td class="px-4 py-3 text-center text-amber-300 font-semibold text-sm">${(u.totalXP || 0).toLocaleString()}</td>
                <td class="px-4 py-3 text-center text-yellow-300 text-sm">
                    <div class="font-semibold"><i class="fas fa-coins text-yellow-400 text-xs mr-1 opacity-80"></i>${(u.coins || 0).toLocaleString()}</div>
                    <div class="text-slate-500 text-xs mt-0.5"><i class="fas fa-shield-halved mr-0.5 text-indigo-400"></i>${shields}</div>
                </td>
                <td class="px-3 py-2 min-w-[180px]">
                    <div class="mb-1.5">${modeBadge}</div>
                    <div class="space-y-0.5">${progressHtml}</div>
                </td>
                <td class="px-3 py-2 min-w-[140px]">
                    <div class="flex items-center gap-1 text-xs mb-1.5">
                        <i class="fas fa-infinity text-red-400 text-[10px]"></i>
                        <span class="font-bold text-white text-sm">${survHS > 0 ? survHS : '\u2014'}</span>
                        <span class="text-slate-600 text-[.65rem]">best</span>
                    </div>
                    ${achBadges
                        ? `<div class="flex gap-1">${achBadges}</div>`
                        : `<span class="text-slate-700 text-xs">No achievements</span>`
                    }
                </td>
                <td class="px-4 py-3 text-center text-slate-400 text-xs whitespace-nowrap">${joinDate}</td>
                <td class="px-4 py-3">
                    <div class="flex flex-col gap-1.5 items-center">
                        <div class="flex gap-1">
                            <button class="btn-act btn-act-level"    onclick="AdminPanel.openUpdateLevelModal('${_esc(u.id)}')" title="ตั้งค่า Level"><i class="fas fa-layer-group"></i> Level</button>
                            <button class="btn-act btn-act-stage"    onclick="AdminPanel.openStageModal('${_esc(u.id)}')"       title="Unlock/Lock Stage"><i class="fas fa-unlock-keyhole"></i> Stage</button>
                        </div>
                        <div class="flex gap-1">
                            <button class="btn-act btn-act-grant"    onclick="AdminPanel.openGrantModal('${_esc(u.id)}')"       title="Grant Items"><i class="fas fa-gift"></i> Grant</button>
                            <button class="btn-act btn-act-reset"    onclick="AdminPanel.resetUserXPCoins('${_esc(u.id)}')"    title="รีเซ็ต XP/Coins"><i class="fas fa-rotate-left"></i> Reset</button>
                            <button class="btn-act btn-act-delete"   onclick="AdminPanel.deleteUser('${_esc(u.id)}')"          title="ลบผู้ใช้"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </td>`;
            frag.appendChild(tr);
        });

        // อัปเดต DOM ครั้งเดียว
        tbody.innerHTML = '';
        tbody.appendChild(frag);
    }


    /* ══════════════════════════════════════════════════════════
       DELETE / RESET USER — จัดการข้อมูลผู้ใช้
    ══════════════════════════════════════════════════════════ */

    function deleteUser(userId) {
        _showConfirm('ลบผู้ใช้', 'การดำเนินการนี้จะลบข้อมูลผู้ใช้ทั้งหมดออกอย่างถาวร รวมถึง Shields ใน inventory คุณแน่ใจหรือไม่?', () => {
            const users = _loadUsers().filter(u => u.id !== userId);
            _saveUsers(users);
            const sm = _loadShieldsMap();
            delete sm[userId];
            _saveShieldsMap(sm);
            renderUsersTable();
            renderStatistics();
            _showToast('ลบผู้ใช้เรียบร้อยแล้ว', 'success');
        });
    }

    function resetUserXPCoins(userId) {
        _showConfirm('รีเซ็ต XP / Coins', 'XP, Coins และ Level จะถูกตั้งกลับเป็น 0/0/Lv.1 (Stage progress ยังคงอยู่)', () => {
            const users = _loadUsers();
            const user = users.find(u => u.id === userId);
            if (!user) return;
            user.totalXP = 0; user.coins = 0; user.level = 1;
            _saveUsers(users);
            renderUsersTable();
            _showToast('รีเซ็ต XP/Coins เรียบร้อยแล้ว', 'success');
        });
    }


    /* ══════════════════════════════════════════════════════════
       LEVEL UPDATE MODAL — ตั้งค่า Level โดย Admin
    ══════════════════════════════════════════════════════════ */

    function openUpdateLevelModal(userId) {
        const user = _loadUsers().find(u => u.id === userId);
        if (!user) return;
        _pendingLevelUserId = userId;
        const input = document.getElementById('level-update-input');
        if (input) input.value = _calculateLevel(user.totalXP || 0).level;
        document.getElementById('level-update-modal')?.classList.remove('hidden');
        input?.focus(); input?.select();
    }

    function _confirmUpdateLevel() {
        const input = document.getElementById('level-update-input');
        const newLevel = parseInt(input?.value || '1', 10);
        if (isNaN(newLevel) || newLevel < 1 || newLevel > 100) { _showToast('กรุณากรอก Level ระหว่าง 1–100', 'error'); return; }
        const users = _loadUsers();
        const user = users.find(u => u.id === _pendingLevelUserId);
        if (!user) return;
        user.totalXP = _xpForStartOfLevel(newLevel);
        user.level = newLevel;
        _saveUsers(users);
        document.getElementById('level-update-modal')?.classList.add('hidden');
        _pendingLevelUserId = null;
        renderUsersTable();
        _showToast(`อัปเดต Level เป็น ${newLevel} เรียบร้อยแล้ว`, 'success');
    }


    /* ══════════════════════════════════════════════════════════
       STAGE UNLOCK/LOCK MODAL
       Admin toggle unlocked ของแต่ละ Stage และ cycle state ของ Sub-level
       Sub-level state: 0=locked → 1=unlocked → 2=completed (วนซ้ำ)
    ══════════════════════════════════════════════════════════ */

    function openStageModal(userId) {
        const users = _loadUsers();
        const user = users.find(u => u.id === userId);
        if (!user) return;
        _ensureStages(user);
        _pendingStageUserId = userId;
        _setText('stage-modal-username', user.username || '—');

        const container = document.getElementById('stage-modal-body');
        if (!container) return;

        container.innerHTML = user.stages.map((stage, si) => {
            const mode = STAGE_MODES[si + 1];
            const meta = MODE_META[mode] || MODE_META['multiple-choice'];
            const completed = _countCompleted(stage);

            const subBtns = stage.subLevels.map((state, li) => {
                const icons = ['🔒', '🔓', '✅'];
                const labels = ['Locked', 'Unlocked', 'Completed'];
                return `<button class="sub-state-btn" data-stage="${si}" data-sub="${li}" data-state="${state}"
                                title="Sub-Level ${li + 1}: ${labels[state] || 'Locked'} — คลิกเพื่อเปลี่ยน"
                                onclick="AdminPanel._cycleSubLevel(${si}, ${li})">
                            <span class="sub-num">${li + 1}</span>
                            <span class="sub-icon">${icons[state] || '🔒'}</span>
                        </button>`;
            }).join('');

            return `<div class="stage-edit-card ${stage.unlocked ? 'stage-unlocked' : 'stage-locked'}">
                <div class="stage-edit-header">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="mode-badge-lg" style="background:${meta.bg};color:${meta.color}">${meta.icon} S${si + 1}</span>
                        <div class="min-w-0">
                            <div class="text-white text-sm font-bold leading-tight">${_esc(STAGE_NAMES[si])}</div>
                            <div class="text-slate-500 text-xs">${meta.label} — ${completed}/5 completed</div>
                        </div>
                    </div>
                    <button class="stage-lock-btn ${stage.unlocked ? 'stage-lock-btn-unlocked' : 'stage-lock-btn-locked'}"
                            onclick="AdminPanel._toggleStageUnlock(${si})"
                            title="${stage.unlocked ? 'คลิกเพื่อ Lock' : 'คลิกเพื่อ Unlock'}">
                        <i class="fas ${stage.unlocked ? 'fa-lock-open' : 'fa-lock'}"></i>
                        ${stage.unlocked ? 'Unlocked' : 'Locked'}
                    </button>
                </div>
                <div class="sub-btn-row">${subBtns}</div>
                <p class="text-slate-600 text-xs mt-2">🔒 Locked &nbsp; 🔓 Available &nbsp; ✅ Completed — คลิก Sub-level เพื่อสลับ</p>
            </div>`;
        }).join('');

        document.getElementById('stage-edit-modal')?.classList.remove('hidden');
    }

    // toggle Stage unlocked — เรียกจาก onclick ใน modal
    function _toggleStageUnlock(stageIndex) {
        const users = _loadUsers();
        const user = users.find(u => u.id === _pendingStageUserId);
        if (!user) return;
        _ensureStages(user);
        if (stageIndex === 0) { _showToast('Stage 1 ไม่สามารถ Lock ได้', 'warn'); return; }
        user.stages[stageIndex].unlocked = !user.stages[stageIndex].unlocked;
        _saveUsers(users);
        openStageModal(_pendingStageUserId); // re-render modal
        _showToast(`Stage ${stageIndex + 1} ${user.stages[stageIndex].unlocked ? 'Unlocked' : 'Locked'} แล้ว`, 'info');
    }

    // cycle sub-level state: 0 → 1 → 2 → 0
    function _cycleSubLevel(stageIndex, subIndex) {
        const users = _loadUsers();
        const user = users.find(u => u.id === _pendingStageUserId);
        if (!user) return;
        _ensureStages(user);
        const cur = user.stages[stageIndex].subLevels[subIndex] || 0;
        user.stages[stageIndex].subLevels[subIndex] = (cur + 1) % 3;
        _saveUsers(users);
        openStageModal(_pendingStageUserId);
    }

    function _closeStageModal() {
        document.getElementById('stage-edit-modal')?.classList.add('hidden');
        _pendingStageUserId = null;
        renderUsersTable();
        _showToast('บันทึก Stage Progress เรียบร้อยแล้ว', 'success');
    }


    /* ══════════════════════════════════════════════════════════
       GRANT ITEMS MODAL
       Admin มอบ Shields ให้ user โดยตรงผ่าน wq_shields ใน localStorage
       ไม่ต้องพึ่ง session ของ user ที่ login อยู่
    ══════════════════════════════════════════════════════════ */

    function openGrantModal(userId) {
        const user = _loadUsers().find(u => u.id === userId);
        if (!user) return;
        _pendingGrantUserId = userId;
        _setText('grant-modal-username', user.username || '—');
        _setText('grant-current-shields', _getShieldsForUser(userId));
        const input = document.getElementById('grant-shield-input');
        if (input) input.value = 1;
        document.getElementById('grant-items-modal')?.classList.remove('hidden');
        input?.focus();
    }

    function _confirmGrantItems() {
        const input = document.getElementById('grant-shield-input');
        const amount = parseInt(input?.value || '0', 10);
        if (isNaN(amount) || amount < 1 || amount > 10) { _showToast('กรุณากรอกจำนวน 1–10', 'error'); return; }
        const sm = _loadShieldsMap();
        sm[_pendingGrantUserId] = Math.min(99, (sm[_pendingGrantUserId] || 0) + amount);
        _saveShieldsMap(sm);
        document.getElementById('grant-items-modal')?.classList.add('hidden');
        _pendingGrantUserId = null;
        renderUsersTable();
        _showToast(`มอบ Shield x${amount} เรียบร้อยแล้ว`, 'success');
    }


    /* ══════════════════════════════════════════════════════════
       STATISTICS — อ่าน fresh data จาก localStorage ทุกครั้ง
       ตรงตาม requirement: "fetch latest game_data every time page loads"
    ══════════════════════════════════════════════════════════ */

    function renderStatistics() {
        const users = _loadUsers(); // fresh read

        const totalUsers = users.length;
        const totalXP = users.reduce((s, u) => s + (u.totalXP || 0), 0);
        const totalCoins = users.reduce((s, u) => s + (u.coins || 0), 0);
        const shieldsMap = _loadShieldsMap();
        const totalShield = Object.values(shieldsMap).reduce((s, v) => s + v, 0);

        // นับจ8achievements และ survival data
        const achMapAll = _loadAllAchievements();
        let totalAch = 0;
        users.forEach(u => {
            const ua = achMapAll[u.id] || {};
            totalAch += Object.values(ua).filter(Boolean).length;
        });
        const survivalPlayers = users.filter(u => (u.survivalHighScore || 0) > 0).length;
        const topSurvival = users.reduce((best, u) => Math.max(best, u.survivalHighScore || 0), 0);

        // นับ Stage completions แยกตาม Stage index
        const stageComp = [0, 0, 0, 0, 0];
        users.forEach(u => {
            if (!u.stages || !Array.isArray(u.stages)) return;
            u.stages.forEach((stage, si) => {
                if (!Array.isArray(stage.subLevels)) return;
                stageComp[si] += stage.subLevels.filter(sl => sl === 2).length;
            });
        });

        const maxComp = Math.max(...stageComp, 0);
        const mostIdx = maxComp > 0 ? stageComp.indexOf(maxComp) : -1;
        const mostPlayed = mostIdx >= 0 ? `Stage ${mostIdx + 1}: ${STAGE_NAMES[mostIdx]}` : 'ยังไม่มีข้อมูล';

        _setText('stat-total-users', totalUsers.toLocaleString());
        _setText('stat-total-xp', totalXP.toLocaleString());
        _setText('stat-total-coins', totalCoins.toLocaleString());
        _setText('stat-total-shield', totalShield.toLocaleString());
        _setText('stat-most-stage', mostPlayed);
        // สถิติ Achievement + Survival
        _setText('stat-total-achievements', totalAch.toLocaleString());
        _setText('stat-survival-players', survivalPlayers.toLocaleString());
        _setText('stat-survival-top', topSurvival > 0 ? topSurvival : '—');

        _renderStageDistribution(stageComp);
        _renderTopUsersChart(users);
    }

    // Stage Distribution bar chart พร้อม Mode icon
    function _renderStageDistribution(comp) {
        const el = document.getElementById('stats-stage-dist');
        if (!el) return;
        const maxVal = Math.max(...comp, 1);
        el.innerHTML = comp.map((count, si) => {
            const meta = MODE_META[STAGE_MODES[si + 1]] || MODE_META['multiple-choice'];
            const pct = Math.round(count / maxVal * 100);
            return `<div class="flex items-center gap-3">
                <span class="mode-badge flex-shrink-0" style="background:${meta.bg};color:${meta.color};min-width:4.5rem;justify-content:center">${meta.icon} S${si + 1}</span>
                <div class="flex-1">
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-slate-300 font-semibold">${_esc(STAGE_NAMES[si])}</span>
                        <span class="text-slate-500">${count} completions</span>
                    </div>
                    <div class="h-2 rounded-full" style="background:rgba(51,65,85,.7)">
                        <div class="h-full rounded-full" style="width:${pct}%;background:${meta.color};transition:width .9s ease"></div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    // Top 5 XP chart
    function _renderTopUsersChart(users) {
        const chartEl = document.getElementById('stats-top-users');
        if (!chartEl) return;
        const sorted = [...users].sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0)).slice(0, 5);
        if (sorted.length === 0) { chartEl.innerHTML = '<p class="text-slate-500 text-sm text-center py-6">ยังไม่มีผู้ใช้ในระบบ</p>'; return; }
        const maxXP = sorted[0].totalXP || 1;
        const grads = ['linear-gradient(90deg,#EAB308,#F59E0B)', 'linear-gradient(90deg,#9CA3AF,#D1D5DB)', 'linear-gradient(90deg,#CD7F32,#D97706)', 'linear-gradient(90deg,#6366F1,#818CF8)', 'linear-gradient(90deg,#0EA5E9,#38BDF8)'];
        chartEl.innerHTML = sorted.map((u, rank) => {
            const pct = Math.round((u.totalXP || 0) / maxXP * 100);
            const av = _getAvatarIndex(u.username || '');
            const ini = (u.username || '?').slice(0, 2).toUpperCase();
            const lv = _calculateLevel(u.totalXP || 0).level;
            return `<div class="flex items-center gap-3">
                <span class="text-slate-600 text-xs font-bold w-4 text-right flex-shrink-0">${rank + 1}</span>
                <div class="w-8 h-8 rounded-full av-${av} flex items-center justify-center text-xs font-bold text-white flex-shrink-0">${ini}</div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center mb-1.5">
                        <span class="text-slate-300 text-xs font-semibold truncate">${_esc(u.username || '—')}</span>
                        <div class="flex gap-2 flex-shrink-0 ml-2">
                            <span class="text-slate-500 text-xs">Lv.${lv}</span>
                            <span class="text-amber-300 text-xs font-bold">${(u.totalXP || 0).toLocaleString()} XP</span>
                        </div>
                    </div>
                    <div class="h-2 rounded-full overflow-hidden" style="background:rgba(51,65,85,.7)">
                        <div class="h-full rounded-full" style="width:${pct}%;background:${grads[rank]};transition:width .9s ease"></div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }


    /* ══════════════════════════════════════════════════════════
       CONTENT PREVIEW — Multi-Mode Aware
       แสดงคำถามแต่ละ Stage โดย render schema ตาม Mode ที่ถูกต้อง:
       MCQ/IWM → options list, TIB → blank + answer,
       Scramble → words[] + sentence, T/F → statement + boolean
    ══════════════════════════════════════════════════════════ */

    function renderContentPreview() {
        const stageId = parseInt(document.getElementById('content-stage-select')?.value || '1', 10);
        const subId = parseInt(document.getElementById('content-sublevel-select')?.value || '1', 10);
        const container = document.getElementById('content-questions-list');
        if (!container) return;

        const mode = STAGE_MODES[stageId] || 'multiple-choice';
        const meta = MODE_META[mode] || MODE_META['multiple-choice'];
        const stageBank = (global.QUESTIONS || {})[stageId];
        const pool = stageBank && stageBank[subId];

        _setText('content-q-count', pool ? pool.length : 0);

        // อัปเดต Mode banner
        const banner = document.getElementById('content-mode-banner');
        if (banner) {
            banner.style.cssText = `background:${meta.bg};color:${meta.color};border:1px solid ${meta.color}44`;
            banner.textContent = `${meta.icon} ${meta.label} Mode — Stage ${stageId}: ${STAGE_NAMES[stageId - 1]}`;
        }

        if (!pool || pool.length === 0) {
            container.innerHTML = `<div class="text-center py-12"><i class="fas fa-circle-question text-4xl text-slate-700 block mb-3"></i><p class="text-slate-500 text-sm">ไม่พบคำถามสำหรับ Stage ${stageId} Sub-Level ${subId}</p></div>`;
            return;
        }

        container.innerHTML = pool.map((q, i) => _buildQuestionCard(q, i, mode, meta)).join('');
    }

    function _buildQuestionCard(q, i, mode, meta) {
        let body = '';
        if (mode === 'multiple-choice' || mode === 'image-word-match') {
            const imgHint = q.imageHint ? `<div class="mb-3 px-3 py-2 rounded-lg text-sm" style="background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.2);color:#67E8F9">🖼️ ${_esc(q.imageHint)}</div>` : '';
            const opts = (q.options || []).map((opt, oi) => {
                const ok = oi === q.answer;
                const L = String.fromCharCode(65 + oi);
                return `<li class="flex items-start gap-2 text-sm ${ok ? 'opt-correct' : 'opt-default'}">
                    <span class="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                          style="${ok ? 'background:rgba(16,185,129,.2);border:1px solid rgba(52,211,153,.4);color:#6ee7b7' : 'background:rgba(51,65,85,.5);border:1px solid rgba(71,85,105,.5);color:#64748b'}">${L}</span>
                    <span>${_esc(String(opt))}</span>
                    ${ok ? '<i class="fas fa-check text-xs mt-0.5 text-emerald-400 flex-shrink-0"></i>' : ''}
                </li>`;
            }).join('');
            body = `${imgHint}<ul class="space-y-1.5">${opts}</ul>`;

        } else if (mode === 'type-in-blank') {
            body = `<div class="mb-2 text-sm text-slate-300 leading-relaxed">${_esc(q.blank || '—')}</div>
                <div class="flex flex-wrap gap-2 mt-2">
                    <span class="tib-answer-badge">✅ ${_esc(q.answer || '—')}</span>
                    ${(q.acceptAlt || []).map(a => `<span class="tib-alt-badge">~ ${_esc(a)}</span>`).join('')}
                </div>`;

        } else if (mode === 'sentence-scramble') {
            const words = (q.words || []).map(w => `<span class="ss-preview-word">${_esc(w)}</span>`).join('');
            body = `<div class="mb-2"><div class="text-xs text-slate-500 mb-1.5">Word Bank:</div><div class="flex flex-wrap gap-1.5">${words}</div></div>
                <div class="mt-2 flex items-start gap-2 text-sm" style="color:#6EE7B7"><i class="fas fa-check-circle mt-0.5 flex-shrink-0"></i><span>${_esc(q.sentence || '—')}</span></div>`;

        } else if (mode === 'true-false') {
            const correct = q.answer === true;
            body = `<div class="mb-3 text-sm text-slate-200 leading-relaxed">${_esc(q.statement || '—')}</div>
                <span class="tf-answer-badge ${correct ? 'tf-true' : 'tf-false'}">${correct ? '✅ TRUE' : '❌ FALSE'}</span>`;
        }

        return `<div class="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-colors">
            <div class="flex items-center gap-2 mb-2.5">
                <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style="background:${meta.bg};border:1px solid ${meta.color}44;color:${meta.color}">${i + 1}</span>
                <span class="text-slate-500 text-xs">Theme: <span class="text-slate-400">${_esc(q.theme || '—')}</span></span>
                <span class="ml-auto text-slate-700 text-xs font-mono">${_esc(q.id || '—')}</span>
            </div>
            <p class="text-white font-semibold text-sm mb-3 leading-snug">${_esc(q.q || q.statement || q.blank || '—')}</p>
            ${body}
            ${q.hint ? `<div class="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg text-xs text-slate-400" style="background:rgba(15,23,42,.8);border:1px solid rgba(51,65,85,.5)"><i class="fas fa-lightbulb text-amber-400 mt-0.5 flex-shrink-0"></i><span>${_esc(q.hint)}</span></div>` : ''}
        </div>`;
    }


    /* ══════════════════════════════════════════════════════════
       DANGER ZONE — รวม Global Reset แบบเลือกส่วน
    ══════════════════════════════════════════════════════════ */

    function factoryReset() {
        _showConfirm('⚠️ Factory Reset', 'ลบข้อมูลทุกอย่างใน localStorage — users, progress, shields, sessions ทั้งหมด ไม่สามารถยกเลิกได้!', () => {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
            keys.forEach(k => localStorage.removeItem(k));
            _setAdminSession();
            renderUsersTable();
            _showToast('Factory Reset เสร็จสมบูรณ์', 'warn');
        });
    }

    // Global Reset เฉพาะ Stage Progress — เก็บ XP/Coins ของทุกคนไว้
    function resetStageProgressOnly() {
        _showConfirm('Reset Stage Progress (Keep XP/Coins)', 'Stage progress ของผู้ใช้ทุกคนจะถูกรีเซ็ต XP และ Coins จะยังคงอยู่ คุณแน่ใจหรือไม่?', () => {
            const users = _loadUsers();
            users.forEach(u => { u.stages = _defaultStages(); });
            _saveUsers(users);
            renderUsersTable();
            _showToast('รีเซ็ต Stage Progress ของทุกคนเรียบร้อยแล้ว', 'warn');
        });
    }

    function clearAdminSessions() {
        _showConfirm('Clear Admin Sessions', 'Admin session จะถูกลบ คุณจะถูก Logout อัตโนมัติ (ข้อมูลผู้ใช้ไม่ถูกกระทบ)', () => {
            _clearAdminSession();
            _showToast('ล้าง Admin Sessions เรียบร้อย กำลัง Logout…', 'info');
            setTimeout(() => window.location.reload(), 1500);
        });
    }

    function exportUserData() {
        const users = _loadUsers();
        const shieldsMap = _loadShieldsMap();
        const sanitized = users.map(({ password, ...safe }) => ({ ...safe, shields: shieldsMap[safe.id] || 0 }));
        const blob = new Blob([JSON.stringify(sanitized, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wordquest_users_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        _showToast(`Export ข้อมูล ${sanitized.length} user เรียบร้อยแล้ว`, 'success');
    }


    /* ══════════════════════════════════════════════════════════
       NAVIGATION — สลับ view + sync sidebar active state
    ══════════════════════════════════════════════════════════ */

    function switchView(viewId) {
        _currentView = viewId;
        ['users', 'stats', 'content', 'danger'].forEach(id => document.getElementById('view-' + id)?.classList.add('hidden'));
        document.getElementById('view-' + viewId)?.classList.remove('hidden');
        _setText('view-page-title', VIEW_TITLES[viewId] || 'Dashboard');
        ['users', 'stats', 'content', 'danger'].forEach(id => {
            document.getElementById('admin-nav-' + id)?.classList.toggle('nav-active', id === viewId);
        });
        if (viewId === 'users') renderUsersTable();
        if (viewId === 'stats') renderStatistics();
        if (viewId === 'content') renderContentPreview();
    }


    /* ══════════════════════════════════════════════════════════
       UI HELPERS — Toast, Confirm, Clock, Escape, Text
    ══════════════════════════════════════════════════════════ */

    function _setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = String(text);
    }

    function _esc(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[c]);
    }

    function _showToast(message, type = 'info') {
        const wrap = document.getElementById('admin-toast-wrap');
        if (!wrap) return;
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warn: 'fa-triangle-exclamation' };
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerHTML = `<i class="fas ${icons[type] || icons.info} flex-shrink-0"></i><span>${_esc(message)}</span>`;
        wrap.appendChild(t);
        setTimeout(() => t.remove(), 3200);
    }

    function _showConfirm(title, body, onConfirm) {
        _confirmCallback = onConfirm;
        _setText('confirm-modal-title', title);
        _setText('confirm-modal-body', body);
        document.getElementById('confirm-modal')?.classList.remove('hidden');
    }

    function _startClock() {
        const tick = () => {
            const now = new Date();
            const time = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const date = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
            _setText('admin-clock', `${date} ${time}`);
        };
        tick();
        _clockTimer = setInterval(tick, 1000);
    }


    /* ══════════════════════════════════════════════════════════
       INIT — เริ่มต้นระบบเมื่อ DOM พร้อม
    ══════════════════════════════════════════════════════════ */

    function _init() {
        _checkAdminSession() ? _showDashboard() : _showLoginScreen();

        document.getElementById('admin-login-form')?.addEventListener('submit', e => { e.preventDefault(); _handleLogin(); });
        document.getElementById('btn-admin-logout')?.addEventListener('click', adminLogout);

        ['users', 'stats', 'content', 'danger'].forEach(v =>
            document.getElementById(`admin-nav-${v}`)?.addEventListener('click', () => switchView(v))
        );

        // Level modal
        document.getElementById('level-update-confirm')?.addEventListener('click', _confirmUpdateLevel);
        document.getElementById('level-update-cancel')?.addEventListener('click', () => {
            document.getElementById('level-update-modal')?.classList.add('hidden'); _pendingLevelUserId = null;
        });
        document.getElementById('level-update-input')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') _confirmUpdateLevel();
            if (e.key === 'Escape') { document.getElementById('level-update-modal')?.classList.add('hidden'); _pendingLevelUserId = null; }
        });

        // Stage modal
        document.getElementById('stage-modal-close')?.addEventListener('click', _closeStageModal);
        document.getElementById('stage-modal-save')?.addEventListener('click', _closeStageModal);

        // Grant modal
        document.getElementById('grant-confirm')?.addEventListener('click', _confirmGrantItems);
        document.getElementById('grant-cancel')?.addEventListener('click', () => {
            document.getElementById('grant-items-modal')?.classList.add('hidden'); _pendingGrantUserId = null;
        });
        document.getElementById('grant-shield-input')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') _confirmGrantItems();
            if (e.key === 'Escape') { document.getElementById('grant-items-modal')?.classList.add('hidden'); _pendingGrantUserId = null; }
        });

        // Confirm modal
        document.getElementById('confirm-ok')?.addEventListener('click', () => {
            document.getElementById('confirm-modal')?.classList.add('hidden');
            if (typeof _confirmCallback === 'function') { _confirmCallback(); _confirmCallback = null; }
        });
        document.getElementById('confirm-cancel')?.addEventListener('click', () => {
            document.getElementById('confirm-modal')?.classList.add('hidden'); _confirmCallback = null;
        });

        // Danger zone
        document.getElementById('btn-factory-reset')?.addEventListener('click', factoryReset);
        document.getElementById('btn-reset-stage-only')?.addEventListener('click', resetStageProgressOnly);
        document.getElementById('btn-clear-admin-sessions')?.addEventListener('click', clearAdminSessions);
        document.getElementById('btn-export-data')?.addEventListener('click', exportUserData);

        // Content preview
        document.getElementById('content-stage-select')?.addEventListener('change', renderContentPreview);
        document.getElementById('content-sublevel-select')?.addEventListener('change', renderContentPreview);

        // Search
        document.getElementById('users-search')?.addEventListener('input', renderUsersTable);

        // Backdrop close
        ['level-update-modal', 'confirm-modal', 'grant-items-modal', 'stage-edit-modal'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', e => {
                if (e.target.id === id) document.getElementById(id).classList.add('hidden');
            });
        });
    }

    function _showLoginScreen() {
        document.getElementById('admin-login-screen')?.classList.remove('hidden');
        document.getElementById('admin-dashboard')?.classList.add('hidden');
        document.getElementById('admin-username-input')?.focus();
    }

    function _showDashboard() {
        document.getElementById('admin-login-screen')?.classList.add('hidden');
        document.getElementById('admin-dashboard')?.classList.remove('hidden');
        _setText('admin-username-display', ADMIN_USERNAME);
        _startClock();
        switchView('users');
    }

    function _handleLogin() {
        const btn = document.getElementById('admin-login-btn');
        const label = btn?.querySelector('.btn-label');
        const spinner = btn?.querySelector('.btn-spinner');
        const errEl = document.getElementById('admin-login-error');
        const errSpan = errEl?.querySelector('span');
        const uname = (document.getElementById('admin-username-input')?.value || '').trim();
        const pwd = (document.getElementById('admin-password-input')?.value || '');

        if (btn) btn.disabled = true;
        label?.classList.add('hidden');
        spinner?.classList.remove('hidden');
        errEl?.classList.add('hidden');

        setTimeout(() => {
            const result = adminLogin(uname, pwd);
            if (btn) btn.disabled = false;
            label?.classList.remove('hidden');
            spinner?.classList.add('hidden');
            if (result.ok) {
                _showDashboard();
            } else {
                if (errSpan) errSpan.textContent = result.error;
                errEl?.classList.remove('hidden');
                document.getElementById('admin-password-input')?.focus();
                document.getElementById('admin-password-input')?.select();
            }
        }, 400);
    }


    /* ══════════════════════════════════════════════════════════
       DOM READY
    ══════════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', _init);


    /* ══════════════════════════════════════════════════════════
       PUBLIC API — expose ฟังก์ชันที่จำเป็นบน window.AdminPanel
    ══════════════════════════════════════════════════════════ */
    global.AdminPanel = Object.freeze({
        deleteUser, resetUserXPCoins, openUpdateLevelModal, renderUsersTable,
        openStageModal, _toggleStageUnlock, _cycleSubLevel,
        openGrantModal,
        renderStatistics,
        renderContentPreview,
        switchView,
        factoryReset, resetStageProgressOnly, clearAdminSessions, exportUserData,
        adminLogout,
    });

}(window));
