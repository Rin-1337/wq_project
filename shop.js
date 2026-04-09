/**
 * shop.js — Item Shop for WordQuest
 * ====================================
 * Depends on: auth.js (window.Auth), game.js (window.Game)
 *
 * Items:
 *   Hint   (50 coins) — Eliminates one wrong option in the active question.
 *   Shield (100 coins) — Absorbs next HP loss; stacks up to 3.
 */

(function (global) {
    'use strict';

    /* ── Shop item catalogue ──────────────────────────────────── */
    const ITEMS = [
        {
            id: 'hint',
            name: 'Hint',
            emoji: '💡',
            desc: 'Eliminates one wrong answer from the current question.',
            cost: 50,
            color: 'rgba(234,179,8,.16)',
            border: 'rgba(234,179,8,.38)',
            textColor: '#FCD34D',
        },
        {
            id: 'shield',
            name: 'Shield',
            emoji: '🛡️',
            desc: 'Passively blocks the next HP loss. Stacks up to 3.',
            cost: 100,
            color: 'rgba(37,99,235,.16)',
            border: 'rgba(96,165,250,.38)',
            textColor: '#93C5FD',
        },
    ];

    /* ── Open the shop modal ─────────────────────────────────── */
    function open() {
        _render();
        if (!_delegated) {
            const grid = document.getElementById('shop-items');
            if (grid) {
                grid.addEventListener('click', function (e) {
                    const btn = e.target.closest('[data-item-id]');
                    if (btn && !btn.disabled) _buy(btn.dataset.itemId);
                });
                _delegated = true;
            }
        }
        _openOverlay('shop-overlay');
    }

    /* ── Close ───────────────────────────────────────────────── */
    function close() {
        _closeOverlay('shop-overlay');
    }

    /* ── Render item cards ───────────────────────────────────── */
    let _delegated = false;

    function _render() {
        const user = Auth.getCurrentUser();
        if (!user) return;

        _setText('shop-coins', user.coins.toLocaleString());
        _setText('shop-shield-count', _getShields());

        const grid = document.getElementById('shop-items');
        grid.innerHTML = '';

        ITEMS.forEach(item => {
            const canAfford = user.coins >= item.cost;

            // Availability note
            let note = '';
            if (item.id === 'hint') {
                const inGame = global.Game && typeof global.Game.getState === 'function'
                    ? global.Game.getState() : null;
                if (!inGame) note = '<p class="text-xs text-slate-500 mt-1">Open during a quiz</p>';
            }
            if (item.id === 'shield') {
                const shields = _getShields();
                note = `<p class="text-xs mt-1" style="color:${item.textColor}">Owned: ${shields}</p>`;
            }

            const card = document.createElement('div');
            card.className = 'rounded-2xl p-5 flex flex-col gap-3';
            card.style.cssText = `background:${item.color}; border:1px solid ${item.border};`;

            card.innerHTML = `
        <div class="flex items-start justify-between">
          <div>
            <span class="text-4xl">${item.emoji}</span>
          </div>
          <div class="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold"
               style="background:rgba(234,179,8,.18); color:#FCD34D; border:1px solid rgba(234,179,8,.3);">
            <i class="fas fa-coins text-[10px]"></i> ${item.cost}
          </div>
        </div>
        <div>
          <h4 class="font-bold text-white">${_esc(item.name)}</h4>
          <p class="text-slate-400 text-xs mt-0.5 leading-relaxed">${_esc(item.desc)}</p>
          ${note}
        </div>
        <button
          class="shop-buy-btn w-full rounded-xl py-2 text-sm font-bold transition-all duration-150"
          style="background:${canAfford ? `linear-gradient(135deg,${item.border},${item.textColor})` : 'rgba(51,51,90,.6)'}; color:${canAfford ? '#fff' : '#475569'}; cursor:${canAfford ? 'pointer' : 'not-allowed'};"
          data-item-id="${item.id}"
          ${canAfford ? '' : 'disabled'}
          aria-label="Buy ${_esc(item.name)} for ${item.cost} coins">
          ${canAfford ? `Buy ${item.emoji}` : '🔒 Not enough coins'}
        </button>
      `;

            grid.appendChild(card);
        });
    }

    /* ── Purchase logic ──────────────────────────────────────── */
    function _buy(itemId) {
        const user = Auth.getCurrentUser();
        if (!user) return;

        const item = ITEMS.find(i => i.id === itemId);
        if (!item) return;

        if (user.coins < item.cost) {
            _toast(`Not enough coins! You need ${item.cost} 🪙`, 'warn');
            return;
        }

        // Deduct coins and persist
        user.coins -= item.cost;
        Auth.updateUser(user);

        if (itemId === 'hint') {
            // Hint: must be in-game
            if (global.Game && typeof global.Game.useHint === 'function') {
                const ok = global.Game.useHint();
                if (!ok) {
                    // Refund — couldn't apply
                    user.coins += item.cost;
                    Auth.updateUser(user);
                    _toast('Hint can only be used during an active question!', 'warn');
                    return;
                }
                _toast('💡 Hint used! One wrong answer removed.', 'success');
            } else {
                // Refund — not in game
                user.coins += item.cost;
                Auth.updateUser(user);
                _toast('Start a quiz first, then buy a Hint!', 'warn');
                return;
            }
        } else if (itemId === 'shield') {
            // Increment shield inventory (stored per-user in localStorage)
            _addShield();
            if (global.Game && typeof global.Game.activateShield === 'function') {
                global.Game.activateShield();
            }
            _toast('🛡️ Shield equipped! Your next HP loss will be blocked.', 'success');
        }

        // Refresh coins across the UI
        _setText('nav-coins', user.coins.toLocaleString());
        if (global.App && typeof global.App.refreshDashboard === 'function') {
            global.App.refreshDashboard(user);
        }

        // Re-render shop cards with updated state
        _render();
    }

    /* ── Shield inventory helpers ─────────────────────────────── */
    const SHIELD_KEY = 'wq_shields';

    function _getShields() {
        const user = Auth.getCurrentUser();
        if (!user) return 0;
        try {
            const raw = localStorage.getItem(SHIELD_KEY);
            const map = raw ? JSON.parse(raw) : {};
            return Math.max(0, map[user.id] || 0);
        } catch { return 0; }
    }

    function _addShield() {
        const user = Auth.getCurrentUser();
        if (!user) return;
        try {
            const raw = localStorage.getItem(SHIELD_KEY);
            const map = raw ? JSON.parse(raw) : {};
            map[user.id] = Math.min(3, (map[user.id] || 0) + 1);
            localStorage.setItem(SHIELD_KEY, JSON.stringify(map));
        } catch { /* quota */ }
    }

    /** Called by game.js when a shield is consumed in battle. */
    function consumeShield() {
        const user = Auth.getCurrentUser();
        if (!user) return false;
        try {
            const raw = localStorage.getItem(SHIELD_KEY);
            const map = raw ? JSON.parse(raw) : {};
            if ((map[user.id] || 0) <= 0) return false;
            map[user.id] = Math.max(0, (map[user.id] || 0) - 1);
            localStorage.setItem(SHIELD_KEY, JSON.stringify(map));
            return true;
        } catch { return false; }
    }

    /** How many shields the current user holds. */
    function shieldCount() {
        return _getShields();
    }

    /* ── Overlay helpers ─────────────────────────────────────── */
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

    /* ── Tiny helpers ─────────────────────────────────────────── */
    function _setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function _esc(s) {
        return String(s).replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function _toast(msg, type) {
        if (global.App && typeof global.App.toast === 'function') {
            global.App.toast(msg, type);
        }
    }

    /* ── Public API ───────────────────────────────────────────── */
    global.Shop = Object.freeze({
        open,
        close,
        consumeShield,
        shieldCount,
    });

}(window));
