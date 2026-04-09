/**
 * leaderboard.js — Global Leaderboard for WordQuest
 * ====================================================
 * Reads all users from localStorage, sorts by totalXP (desc),
 * then renders a medal podium for the top-3 and a ranked list
 * for the remainder.
 *
 * Depends on: auth.js (window.Auth)
 */

(function (global) {
    'use strict';

    /* ── Medal config ───────────────────────────────────────── */
    const MEDALS = [
        { rank: 1, emoji: '🥇', label: '1st', color: '#EAB308', bg: 'rgba(234,179,8,.18)', border: 'rgba(234,179,8,.45)', size: 'w-20 h-20 text-3xl', podiumH: 'h-28' },
        { rank: 2, emoji: '🥈', label: '2nd', color: '#9CA3AF', bg: 'rgba(156,163,175,.14)', border: 'rgba(156,163,175,.4)', size: 'w-16 h-16 text-2xl', podiumH: 'h-20' },
        { rank: 3, emoji: '🥉', label: '3rd', color: '#CD7F32', bg: 'rgba(180,100,10,.18)', border: 'rgba(205,127,50,.45)', size: 'w-14 h-14 text-2xl', podiumH: 'h-14' },
    ];

    /* ── Open ───────────────────────────────────────────────── */
    function open() {
        _render();
        _openOverlay('leaderboard-overlay');
    }

    /* ── Close ──────────────────────────────────────────────── */
    function close() {
        _closeOverlay('leaderboard-overlay');
    }

    /* ── Build leaderboard data ─────────────────────────────── */
    function _getBoard() {
        try {
            const raw = localStorage.getItem('wq_users');
            const users = raw ? JSON.parse(raw) : [];
            return users
                .map(u => ({
                    id: u.id,
                    username: u.username || 'Unknown',
                    totalXP: u.totalXP || 0,
                    coins: u.coins || 0,
                    avatarIndex: Auth.getAvatarIndex(u.username || ''),
                }))
                .sort((a, b) => b.totalXP - a.totalXP);
        } catch {
            return [];
        }
    }

    /* ── Main render ────────────────────────────────────────── */
    function _render() {
        const currentUser = Auth.getCurrentUser();
        const board = _getBoard();

        /* ── Podium (top 3) ───────────────────────────────────── */
        const podiumWrap = document.getElementById('lb-podium');
        const podiumFrag = document.createDocumentFragment();

        // Reorder visually: 2nd | 1st | 3rd
        const displayOrder = [1, 0, 2]; // indices into MEDALS
        const podiumUsers = [board[1], board[0], board[2]];

        displayOrder.forEach((medalIdx, colIdx) => {
            const med = MEDALS[medalIdx];
            const user = podiumUsers[colIdx];

            const col = document.createElement('div');
            col.className = 'flex flex-col items-center gap-2';

            if (user) {
                const isSelf = currentUser && user.id === currentUser.id;
                const lvData = Auth.calculateLevel(user.totalXP);
                const init = user.username.charAt(0).toUpperCase();

                col.innerHTML = `
          <!-- Medal emoji -->
          <span class="text-2xl" aria-hidden="true">${med.emoji}</span>

          <!-- Avatar -->
          <div class="${med.size} rounded-2xl av-${user.avatarIndex} flex items-center
                 justify-center font-black text-white select-none relative"
               style="box-shadow:0 0 18px ${_hexAlpha(med.color, .45)}; border:2px solid ${med.border};">
            ${_esc(init)}
            ${isSelf ? `<span class="absolute -top-2 -right-2 bg-indigo-500 rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold">YOU</span>` : ''}
          </div>

          <!-- Name -->
          <p class="text-white font-bold text-sm text-center leading-tight max-w-[80px] truncate"
             title="${_esc(user.username)}">${_esc(user.username)}</p>

          <!-- XP -->
          <p class="font-black text-xs" style="color:${med.color};">${user.totalXP.toLocaleString()} XP</p>

          <!-- Podium block -->
          <div class="${med.podiumH} w-full rounded-t-xl flex items-end justify-center pb-1 text-xs font-bold"
               style="background:${med.bg}; border:1px solid ${med.border}; color:${med.color}; border-bottom:none; min-width:72px;">
            ${med.label}
          </div>
        `;
            } else {
                // Empty slot
                col.innerHTML = `
          <span class="text-2xl opacity-30" aria-hidden="true">${med.emoji}</span>
          <div class="${med.size} rounded-2xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-center text-slate-600 text-xs select-none">—</div>
          <p class="text-slate-600 text-xs">—</p>
          <p class="text-slate-700 text-xs">0 XP</p>
          <div class="${med.podiumH} w-full rounded-t-xl" style="background:rgba(51,51,90,.3); min-width:72px;"></div>
        `;
            }

            podiumFrag.appendChild(col);
        });

        podiumWrap.innerHTML = '';
        podiumWrap.appendChild(podiumFrag);

        /* ── Full ranked list (all players) ────────────────── */
        const listWrap = document.getElementById('lb-list');

        if (board.length === 0) {
            listWrap.innerHTML = '<p class="text-slate-500 text-sm text-center py-4">No players yet.</p>';
            return;
        }

        const listFrag = document.createDocumentFragment();

        board.forEach((user, idx) => {
            const rank = idx + 1;
            const isSelf = currentUser && user.id === currentUser.id;
            const lvData = Auth.calculateLevel(user.totalXP);
            const rankObj = Auth.getRank(lvData.level);
            const init = user.username.charAt(0).toUpperCase();

            let rankDisplay;
            if (rank === 1) rankDisplay = `<span class="text-yellow-400 font-black text-sm">🥇 1</span>`;
            else if (rank === 2) rankDisplay = `<span class="text-slate-400 font-black text-sm">🥈 2</span>`;
            else if (rank === 3) rankDisplay = `<span style="color:#CD7F32" class="font-black text-sm">🥉 3</span>`;
            else rankDisplay = `<span class="text-slate-500 font-bold text-sm">#${rank}</span>`;

            const row = document.createElement('div');
            row.className = `flex items-center gap-3 p-3 rounded-xl transition-colors ${isSelf ? 'ring-1 ring-indigo-500/60' : 'hover:bg-slate-800/40'}`;
            row.style.background = isSelf ? 'rgba(79,70,229,.12)' : '';

            row.innerHTML = `
        <!-- Rank -->
        <div class="w-8 text-center flex-shrink-0">${rankDisplay}</div>

        <!-- Avatar -->
        <div class="w-9 h-9 rounded-xl av-${user.avatarIndex} flex items-center justify-center
                    font-bold text-white text-sm flex-shrink-0 select-none">
          ${_esc(init)}
        </div>

        <!-- Name + rank badge -->
        <div class="flex-1 min-w-0">
          <p class="text-white font-semibold text-sm truncate">
            ${_esc(user.username)}${isSelf ? ' <span class="text-indigo-400 text-xs">(You)</span>' : ''}
          </p>
          <p class="text-slate-500 text-xs">Lv ${lvData.level} · ${rankObj.icon} ${rankObj.name}</p>
        </div>

        <!-- XP -->
        <div class="text-right flex-shrink-0">
          <p class="text-indigo-300 font-bold text-sm">${user.totalXP.toLocaleString()}</p>
          <p class="text-slate-600 text-xs">XP</p>
        </div>
      `;

            listFrag.appendChild(row);
        });

        listWrap.innerHTML = '';
        listWrap.appendChild(listFrag);
    }

    /* ── Utility ─────────────────────────────────────────────── */
    function _hexAlpha(hex, a) {
        // Convert #RRGGBB or named colour keyword → rgba
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!m) return hex;
        return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
    }

    function _esc(s) {
        return String(s).replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function _setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function _openOverlay(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function _closeOverlay(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
        const ALL = ['quiz-overlay', 'stageclear-overlay', 'gameover-overlay',
            'levelup-overlay', 'shop-overlay', 'leaderboard-overlay'];
        if (!ALL.some(oid => {
            const o = document.getElementById(oid);
            return o && !o.classList.contains('hidden');
        })) document.body.style.overflow = '';
    }

    /* ── Public API ───────────────────────────────────────────── */
    global.Leaderboard = Object.freeze({ open, close });

}(window));
