/**
 * auth.js — Authentication Module for WordQuest
 * ================================================
 * Handles user registration, login, logout, and session management.
 * All user data is persisted in localStorage; session state lives in
 * sessionStorage so it clears automatically when the tab is closed.
 *
 * SECURITY NOTE:
 *   This is a fully client-side demo. The password hash used here
 *   (djb2-variant) is NOT cryptographically secure and must never be
 *   used in a server-side or production environment. Use bcrypt /
 *   Argon2 with server-side authentication for real applications.
 */

(function (global) {
    'use strict';

    /* ── Storage keys ─────────────────────────────────────────── */
    const USERS_KEY = 'wq_users';
    const SESSION_KEY = 'wq_session';
    const DEMO_SALT = 'WQ_DEMO_2024'; // static salt for demo hashing only

    /* ── Rank table ──────────────────────────────────────────── */
    const RANKS = [
        { minLevel: 1, maxLevel: 2, name: 'Rookie', icon: '🥉', css: 'badge-rookie' },
        { minLevel: 3, maxLevel: 5, name: 'Explorer', icon: '🌿', css: 'badge-explorer' },
        { minLevel: 6, maxLevel: 9, name: 'Adventurer', icon: '⚔️', css: 'badge-adventurer' },
        { minLevel: 10, maxLevel: 14, name: 'Scholar', icon: '📚', css: 'badge-scholar' },
        { minLevel: 15, maxLevel: 999, name: 'Master', icon: '👑', css: 'badge-master' },
    ];

    /* ── Stage definitions ───────────────────────────────────── */
    const STAGE_DEFS = [
        { id: 1, name: 'The Basics', icon: '📝', desc: 'Alphabet & Simple Words', accentClass: 'indigo' },
        { id: 2, name: 'Word Builder', icon: '🔤', desc: 'Vocabulary Expansion', accentClass: 'purple' },
        { id: 3, name: 'Grammar Gates', icon: '⚙️', desc: 'Sentence Structure', accentClass: 'blue' },
        { id: 4, name: 'Read & Conquer', icon: '📖', desc: 'Reading Comprehension', accentClass: 'cyan' },
        { id: 5, name: "Master's Hall", icon: '🏰', desc: 'Advanced English Mastery', accentClass: 'gold' },
    ];

    /* ── XP formula ──────────────────────────────────────────── */
    // XP needed to advance FROM level N to level N+1
    function xpForLevel(n) {
        return n * 100;
    }

    /**
     * Derive level, in-level XP, and XP-for-next from a raw totalXP value.
     * @param {number} totalXP
     * @returns {{ level: number, xpInLevel: number, xpForNext: number }}
     */
    function calculateLevel(totalXP) {
        let level = 1;
        let accumulated = 0;
        while (true) {
            const needed = xpForLevel(level);
            if (accumulated + needed > totalXP) {
                return {
                    level,
                    xpInLevel: totalXP - accumulated,
                    xpForNext: needed,
                };
            }
            accumulated += needed;
            level++;
        }
    }

    /**
     * Return the rank object matching a given level.
     * @param {number} level
     * @returns {object}
     */
    function getRank(level) {
        return RANKS.find(r => level >= r.minLevel && level <= r.maxLevel) || RANKS[0];
    }

    /* ── Password hashing (demo only) ───────────────────────── */
    /**
     * Deterministic, non-cryptographic djb2-style hash.
     * Only used to avoid storing plain-text passwords in localStorage.
     * NOT suitable for production use.
     */
    function _hashPassword(plain) {
        const s = plain + DEMO_SALT;
        let h = 5381;
        for (let i = 0; i < s.length; i++) {
            h = Math.imul(h, 33) ^ s.charCodeAt(i);
        }
        return (h >>> 0).toString(16).padStart(8, '0');
    }

    /* ── ID generation ───────────────────────────────────────── */
    function _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    }

    /* ── Input sanitisation (XSS prevention) ────────────────── */
    const _HTML_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };

    function sanitize(value) {
        if (typeof value !== 'string') return '';
        return value.trim().replace(/[&<>"']/g, c => _HTML_ESCAPE[c]);
    }

    /* ── Validation helpers ──────────────────────────────────── */
    function _isValidEmail(email) {
        // Simplified RFC 5322 check — good enough for client-side gating
        return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
    }

    function _isValidUsername(username) {
        // 3–20 chars; letters, digits, underscore, hyphen only
        return /^[a-zA-Z0-9_\-]{3,20}$/.test(username);
    }

    /* ── Avatar colour index (0-7) ───────────────────────────── */
    function getAvatarIndex(username) {
        let h = 0;
        for (let i = 0; i < username.length; i++) {
            h = Math.imul(h, 31) + username.charCodeAt(i) | 0;
        }
        return Math.abs(h) % 8;
    }

    /* ── Default stage-progress structure ───────────────────── */
    // Sub-level states: 0 = locked | 1 = unlocked/current | 2 = completed
    function _defaultStages() {
        return STAGE_DEFS.map((def, i) => ({
            id: def.id,
            unlocked: i === 0,
            subLevels: i === 0 ? [1, 0, 0, 0, 0] : [0, 0, 0, 0, 0],
        }));
    }

    /* ── localStorage helpers ────────────────────────────────── */
    function _loadUsers() {
        try {
            const raw = localStorage.getItem(USERS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function _saveUsers(users) {
        try {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        } catch (e) {
            console.error('[Auth] Could not persist users:', e);
        }
    }

    function _setSession(userId) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: userId, ts: Date.now() }));
    }

    function _clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    function _getSessionId() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            const sess = raw ? JSON.parse(raw) : null;
            return sess && sess.id ? sess.id : null;
        } catch {
            return null;
        }
    }

    /* ══════════════════════════════════════════════════════════
       PUBLIC API
    ══════════════════════════════════════════════════════════ */

    /**
     * Register a new user.
     *
     * @param {string} username
     * @param {string} email
     * @param {string} password
     * @returns {{ ok: boolean, error?: string, user?: object }}
     */
    function register(username, email, password) {
        // Sanitise & normalise
        username = sanitize(username);
        email = (typeof email === 'string' ? email : '').trim().toLowerCase();
        password = typeof password === 'string' ? password : '';

        // ── Validate ──────────────────────────────────────────
        if (!username)
            return { ok: false, error: 'Username is required.' };
        if (!_isValidUsername(username))
            return { ok: false, error: 'Username must be 3–20 chars (letters, digits, _ or -).' };

        if (!email)
            return { ok: false, error: 'Email address is required.' };
        if (!_isValidEmail(email))
            return { ok: false, error: 'Please enter a valid email address.' };

        if (password.length < 6)
            return { ok: false, error: 'Password must be at least 6 characters.' };
        if (password.length > 128)
            return { ok: false, error: 'Password is too long (max 128 chars).' };

        const users = _loadUsers();

        if (users.some(u => u.username.toLowerCase() === username.toLowerCase()))
            return { ok: false, error: 'That username is already taken.' };

        if (users.some(u => u.email === email))
            return { ok: false, error: 'An account with this email already exists.' };

        // ── Build user object ─────────────────────────────────
        const now = new Date().toISOString();
        const user = {
            id: _generateId(),
            username,
            email,
            password: _hashPassword(password),
            avatarIndex: getAvatarIndex(username),
            level: 1,
            totalXP: 0,
            coins: 0,
            stages: _defaultStages(),
            achievements: [],
            createdAt: now,
            lastLoginAt: now,
        };

        users.push(user);
        _saveUsers(users);

        // Auto-login after registration
        _setSession(user.id);

        // Return a copy without the password hash
        const { password: _, ...safeUser } = user;
        return { ok: true, user: safeUser };
    }

    /**
     * Log in with email + password.
     *
     * @param {string} email
     * @param {string} password
     * @returns {{ ok: boolean, error?: string, user?: object }}
     */
    function login(email, password) {
        email = (typeof email === 'string' ? email : '').trim().toLowerCase();
        password = (typeof password === 'string' ? password : '');

        if (!email || !password)
            return { ok: false, error: 'Email and password are required.' };

        if (!_isValidEmail(email))
            return { ok: false, error: 'Please enter a valid email address.' };

        const users = _loadUsers();
        const user = users.find(u => u.email === email);

        // Generic message prevents user-enumeration
        if (!user || user.password !== _hashPassword(password))
            return { ok: false, error: 'Invalid email or password.' };

        // Stamp last login
        user.lastLoginAt = new Date().toISOString();
        _saveUsers(users);

        _setSession(user.id);

        const { password: _, ...safeUser } = user;
        return { ok: true, user: safeUser };
    }

    /**
     * Log out the current user.
     */
    function logout() {
        _clearSession();
    }

    /**
     * Return the full user object for the active session, or null.
     * @returns {object|null}
     */
    function getCurrentUser() {
        const id = _getSessionId();
        if (!id) return null;

        const user = _loadUsers().find(u => u.id === id) || null;
        if (!user) return null;

        const { password: _, ...safeUser } = user;
        return safeUser;
    }

    /**
     * Check whether any user is currently logged in.
     * @returns {boolean}
     */
    function isLoggedIn() {
        return getCurrentUser() !== null;
    }

    /**
     * Persist changes to a user object (identified by `id`).
     * The password field is intentionally excluded from this path.
     *
     * @param {object} updatedUser  — must contain `id`
     * @returns {boolean}
     */
    function updateUser(updatedUser) {
        if (!updatedUser || !updatedUser.id) return false;
        const users = _loadUsers();
        const idx = users.findIndex(u => u.id === updatedUser.id);
        if (idx === -1) return false;

        // Merge, but never overwrite the stored password via this method
        const { password, ...changes } = updatedUser;
        users[idx] = Object.assign({}, users[idx], changes);
        _saveUsers(users);
        return true;
    }

    /* ── Expose public API on window.Auth ───────────────────── */
    global.Auth = Object.freeze({
        register,
        login,
        logout,
        getCurrentUser,
        isLoggedIn,
        updateUser,

        // Pure helpers used by app.js
        calculateLevel,
        getRank,
        xpForLevel,
        getAvatarIndex,
        sanitize,

        // Static data
        RANKS,
        STAGE_DEFS,
    });

}(window));
