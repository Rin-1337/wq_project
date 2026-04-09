/**
 * game.js — Core Quiz Engine for WordQuest (Multi-Mode)
 * =======================================================
 * Depends on: auth.js (window.Auth), questions.js (window.QUESTIONS, window.STAGE_MODES)
 * Integrates with: app.js (window.App.refreshDashboard)
 *
 * Game Modes per Stage:
 *   Stage 1 → multiple-choice   : 4-choice MCQ คลาสสิก
 *   Stage 2 → type-in-blank     : พิมพ์คำที่หายไปในประโยค
 *   Stage 3 → sentence-scramble : คลิกเรียงคำให้ถูกลำดับ
 *   Stage 4 → true-false        : ตัดสินถูก/ผิดภายใน 10 วินาที
 *   Stage 5 → image-word-match  : จับคู่ hint กับคำศัพท์ (MCQ + imageHint)
 */

(function (global) {
    'use strict';

    /* ══════════════════════════════════════════════════════════
       CONSTANTS
    ══════════════════════════════════════════════════════════ */
    const MAX_HP = 3;
    const Q_PER_SESSION = 100;
    const XP_BASE = 100;
    const XP_COMBO = 400;
    const COINS_CORRECT = 100;
    const COMBO_THRESHOLD = 3;
    const TF_TIME_LIMIT = 10;   // วินาที สำหรับ true-false mode

    /* ── localStorage keys สำหรับ Feature ใหม่ ── */
    const ACHIEVEMENTS_KEY = 'wq_achievements'; // { [userId]: { perfectStreak, coinHoarder, englishMaster } }
    const SOUND_KEY = 'wq_sound';        // 'on' | 'off'

    /* ══════════════════════════════════════════════════════════
       SOUND MANAGER — จัดการไฟล์เสียงผ่าน Web Audio API (lazy-load)
       URL จาก Pixabay CDN (royalty-free ใช้ได้ฟรี)
    ══════════════════════════════════════════════════════════ */
    const SoundManager = (function () {
        const URLS = {
            correct: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a7351d.mp3',
            wrong: 'https://cdn.pixabay.com/audio/2022/03/10/audio_22678685ba.mp3',
            victory: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c15396.mp3',
        };
        const _cache = {};
        // อ่านค่าจาก localStorage — default เปิดเสียง
        let _on = (localStorage.getItem(SOUND_KEY) !== 'off');

        /** เล่นเสียงตาม name — lazy-load ครั้งแรก จากนั้น clone ให้เล่นซ้อนกันได้ */
        function play(name) {
            if (!_on || !URLS[name]) return;
            try {
                if (!_cache[name]) {
                    _cache[name] = new Audio(URLS[name]);
                    _cache[name].volume = 0.45;
                }
                const clip = _cache[name].cloneNode();
                clip.volume = 0.45;
                clip.play().catch(function () { }); // รองรับ browser autoplay policy
            } catch (_) { }
        }

        /** สลับ on/off — บันทึกลง localStorage, คืนค่า enabled ใหม่ */
        function toggle() {
            _on = !_on;
            try { localStorage.setItem(SOUND_KEY, _on ? 'on' : 'off'); } catch (_) { }
            return _on;
        }

        function isEnabled() { return _on; }

        return { play, toggle, isEnabled };
    }());

    // Expose บน window ให้ app.js เรียกผ่าน Sound Toggle button
    global.SoundManager = SoundManager;

    /* ══════════════════════════════════════════════════════════
       ACHIEVEMENT SYSTEM — ติดตาม milestones ใน localStorage
       wq_achievements = { [userId]: { perfectStreak, coinHoarder, englishMaster } }
    ══════════════════════════════════════════════════════════ */
    const ACHIEVEMENT_DEFS = {
        perfectStreak: { name: 'Perfect Streak 🎯', desc: 'Answer 10 questions correctly in a row' },
        coinHoarder: { name: 'Coin Hoarder 💰', desc: 'Earn over 1,000 coins in total' },
        englishMaster: { name: 'English Master 👑', desc: 'Clear all 5 stages completely' },
    };

    function _loadAchievements(userId) {
        try {
            const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
            return raw ? (JSON.parse(raw)[userId] || {}) : {};
        } catch (_) { return {}; }
    }

    function _saveAchievement(userId, id) {
        try {
            const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
            const map = raw ? JSON.parse(raw) : {};
            if (!map[userId]) map[userId] = {};
            map[userId][id] = true;
            localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(map));
        } catch (_) { }
    }

    /** ตรวจว่า achievement ยังไม่ได้รับ — ถ้าใช่ บันทึกและแสดง toast */
    function _tryUnlockAchievement(id) {
        const user = Auth.getCurrentUser();
        if (!user) return;
        if (_loadAchievements(user.id)[id]) return; // ได้รับแล้ว — ไม่ซ้ำ
        _saveAchievement(user.id, id);
        _showAchievementToast(id);
    }

    function _showAchievementToast(id) {
        const def = ACHIEVEMENT_DEFS[id];
        if (!def) return;
        const wrap = document.getElementById('toast-wrap');
        if (!wrap) return;
        const t = document.createElement('div');
        t.className = 'toast achievement-toast';
        t.innerHTML = '<i class="fas fa-trophy text-yellow-300 flex-shrink-0"></i>' +
            '<div><div class="text-[.7rem] font-extrabold uppercase tracking-widest" style="color:#FDE68A">' +
            '🏅 New Achievement Unlocked!</div>' +
            '<div class="font-bold text-sm">' + def.name + '</div></div>';
        wrap.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.remove(); }, 5000);
    }

    /* ══════════════════════════════════════════════════════════
       MUTABLE GAME STATE
    ══════════════════════════════════════════════════════════ */
    let _s = null;  // session state — null เมื่อไม่มี session ที่ active

    /* ── Pre-built option buttons สำหรับ multiple-choice / image-word-match ── */
    let _optionBtns = [];
    let _optionTextSpans = [];
    let _optionsListenerBound = false;

    /* ── Timer ref สำหรับ true-false mode ── */
    let _tfTimerInterval = null;

    /* ══════════════════════════════════════════════════════════
       HELPER: Double-RAF animation restart
       แทน void el.offsetWidth เพื่อหลีกเลี่ยง forced synchronous layout
    ══════════════════════════════════════════════════════════ */
    function _restartAnim(el, cls) {
        el.classList.remove(cls);
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add(cls)));
    }

    /* ══════════════════════════════════════════════════════════
       PUBLIC — Start a sub-level quiz session
    ══════════════════════════════════════════════════════════ */
    function start(stageIdx, subLevelIdx) {
        const user = Auth.getCurrentUser();
        if (!user) return;

        const stageId = stageIdx + 1;
        const subLevelId = subLevelIdx + 1;
        const mode = (window.STAGE_MODES || {})[stageId] || 'multiple-choice';

        const stageBank = (window.QUESTIONS || {})[stageId];
        let pool = stageBank && stageBank[subLevelId];

        if (!pool || pool.length === 0) {
            if (stageBank) {
                const fallbackKey = Object.keys(stageBank)
                    .find(k => stageBank[k] && stageBank[k].length > 0);
                if (fallbackKey) {
                    pool = stageBank[fallbackKey];
                    _appToast(`Using fallback questions for Stage ${stageId}.`, 'warn');
                }
            }
            if (!pool || pool.length === 0) {
                _appToast(`Question bank not available for Stage ${stageId}, Sub-level ${subLevelId}.`, 'error');
                return;
            }
        }

        const questions = [...pool]
            .sort(() => Math.random() - 0.5)
            .slice(0, Q_PER_SESSION);

        const lvBefore = Auth.calculateLevel(user.totalXP).level;

        _s = {
            stageIdx,
            subLevelIdx,
            stageId,
            mode,
            questions,
            currentQ: 0,
            hp: MAX_HP,
            combo: 0,
            sessionXP: 0,
            sessionCoins: 0,
            answered: false,
            levelBefore: lvBefore,
            shieldActive: (global.Shop ? global.Shop.shieldCount() : 0),
            hintUsed: false,
            // สำหรับ sentence-scramble: เก็บลำดับคำที่ผู้เล่นเลือก
            scrambleSelected: [],
            scrambleRemaining: [],
        };

        _openOverlay('quiz-overlay');
        const card = document.getElementById('quiz-card');
        if (card) _restartAnim(card, 'view-enter');

        _buildQuizHUD();
        _renderQuestion();
    }

    /* ══════════════════════════════════════════════════════════
       QUIZ HUD
    ══════════════════════════════════════════════════════════ */
    function _buildQuizHUD() {
        // Survival mode แสดงชื่อพิเศษ; Stage mode อ่านจาก STAGE_DEFS
        if (_s.isSurvival) {
            _setText('quiz-stage-name', '♾️ Infinite Survival');
        } else {
            const def = Auth.STAGE_DEFS[_s.stageIdx];
            _setText('quiz-stage-name', `${def.icon} ${def.name}`);
        }
        _initHearts();
        _renderCombo();
        _renderQCounter();
        _renderQProgress();
        _renderShieldHUD();

        // สร้างปุ่ม A–D ล่วงหน้าสำหรับ multiple-choice / image-word-match
        // renderGameMode() จะซ่อน/แสดงตาม mode ที่ใช้งาน
        _buildOptionButtons();
    }

    /* ══════════════════════════════════════════════════════════
       OPTION BUTTON POOL  (Virtual DOM Re-use)
       สร้างปุ่ม A–D ครั้งเดียวต่อ session สำหรับ MCQ modes
    ══════════════════════════════════════════════════════════ */
    function _buildOptionButtons() {
        const wrap = document.getElementById('quiz-options');
        if (!wrap) return;

        wrap.innerHTML = '';
        _optionBtns = [];
        _optionTextSpans = [];
        const LABELS = ['A', 'B', 'C', 'D'];

        for (let i = 0; i < 4; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quiz-option';
            btn.setAttribute('data-idx', String(i));

            const labelSpan = document.createElement('span');
            labelSpan.className = 'quiz-option-label';
            labelSpan.textContent = LABELS[i];

            const textSpan = document.createElement('span');
            textSpan.className = 'quiz-option-text';

            btn.appendChild(labelSpan);
            btn.appendChild(textSpan);
            _optionBtns.push(btn);
            _optionTextSpans.push(textSpan);
            wrap.appendChild(btn);
        }

        // Single delegated listener บน parent — ผูกครั้งเดียวตลอดอายุ session
        if (!_optionsListenerBound) {
            wrap.addEventListener('click', function (e) {
                const btn = e.target.closest('.quiz-option');
                if (!btn || btn.disabled) return;
                _handleAnswer(parseInt(btn.dataset.idx, 10));
            });
            _optionsListenerBound = true;
        }
    }

    /* ══════════════════════════════════════════════════════════
       FISHER-YATES SHUFFLE
    ══════════════════════════════════════════════════════════ */
    function _fisherYates(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    /* ══════════════════════════════════════════════════════════
       DYNAMIC RENDERER — สลับ UI layout ตาม game mode
       รับผิดชอบ: แสดง/ซ่อน container แต่ละ mode และเรียก renderer ที่ตรงกัน
    ══════════════════════════════════════════════════════════ */

    /**
     * renderGameMode(mode) — เลือก renderer ที่เหมาะสมตาม mode ของ stage
     * @param {string} mode - หนึ่งใน STAGE_MODES values
     */
    function renderGameMode(mode) {
        // ซ่อน container ทุก mode ก่อน แล้วแสดงเฉพาะ mode ที่ต้องการ
        const containers = {
            'multiple-choice': 'quiz-mc-container',
            'type-in-blank': 'quiz-tib-container',
            'sentence-scramble': 'quiz-ss-container',
            'true-false': 'quiz-tf-container',
            'image-word-match': 'quiz-mc-container',  // IWM reuses MCQ buttons + imageHint
        };

        Object.values(containers).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        const targetId = containers[mode];
        const target = targetId && document.getElementById(targetId);
        if (target) {
            target.classList.remove('hidden');
            // CSS transition สำหรับ smooth mode switch
            target.classList.add('mode-enter');
            requestAnimationFrame(() => target.classList.remove('mode-enter'));
        }

        // เรียก renderer เฉพาะ mode
        switch (mode) {
            case 'multiple-choice': _renderMCQ(); break;
            case 'type-in-blank': _renderTypeInBlank(); break;
            case 'sentence-scramble': _renderSentenceScramble(); break;
            case 'true-false': _renderTrueFalse(); break;
            case 'image-word-match': _renderImageWordMatch(); break;
            default: _renderMCQ(); break;
        }
    }

    /* ══════════════════════════════════════════════════════════
       QUESTION RENDERER — entry point หลังได้คำถามใหม่
    ══════════════════════════════════════════════════════════ */
    function _renderQuestion() {
        if (!_s) return;
        _s.answered = false;
        _s.hintUsed = false;

        _renderQCounter();
        _renderQProgress();

        // ล้าง feedback จากคำถามก่อนหน้า
        const fb = document.getElementById('quiz-feedback');
        if (fb) { fb.textContent = ''; fb.className = 'hidden'; }

        // ล้าง timer ถ้ามี (จาก true-false)
        _clearTFTimer();

        // Survival: อัปเดต mode ให้ตรงกับคำถามปัจจุบัน (คำถามมาจากหลาย Stage)
        if (_s.isSurvival) {
            _s.mode = _s.questions[_s.currentQ]._mode || 'multiple-choice';
        }

        // แสดง instruction banner เฉพาะคำถามแรกของ session (ไม่แสดงใน Survival)
        _showModeInstruction(_s.mode, _s.currentQ === 0 && !_s.isSurvival);

        // ส่งต่อให้ renderGameMode จัดการ UI ตาม mode
        renderGameMode(_s.mode);
    }

    /* ══════════════════════════════════════════════════════════
       MODE INSTRUCTION BANNER
       แสดงคำแนะนำ "How to play" เฉพาะคำถามแรกของแต่ละ session
    ══════════════════════════════════════════════════════════ */
    const MODE_INSTRUCTIONS = {
        'multiple-choice': '🎯 Choose the correct answer from 4 options.',
        'type-in-blank': '⌨️ Type the missing word in the box and press Enter or click Submit.',
        'sentence-scramble': '🔀 Click the word buttons in the correct order to build the sentence.',
        'true-false': '⚡ Decide TRUE or FALSE quickly — you have 10 seconds per question!',
        'image-word-match': '🖼️ Look at the image hint, then choose the matching word or phrase.',
    };

    function _showModeInstruction(mode, isFirst) {
        const el = document.getElementById('quiz-mode-instruction');
        if (!el) return;
        if (isFirst) {
            el.textContent = MODE_INSTRUCTIONS[mode] || '';
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }

    /* ══════════════════════════════════════════════════════════
       RENDERER 1: MULTIPLE-CHOICE (Stage 1)
       MCQ คลาสสิก — ใช้ pre-built _optionBtns
    ══════════════════════════════════════════════════════════ */
    function _renderMCQ() {
        const q = _s.questions[_s.currentQ];

        // แสดง container MCQ ผ่าน quiz-options (อยู่ใน quiz-mc-container)
        const wrap = document.getElementById('quiz-options');
        if (wrap) wrap.classList.remove('hidden');

        // ซ่อน image hint
        const imgHint = document.getElementById('quiz-image-hint');
        if (imgHint) imgHint.classList.add('hidden');

        _setText('quiz-question-text', q.q);

        // map ตัวเลือก + สุ่มลำดับด้วย Fisher-Yates
        const mapped = q.options.map((text, i) => ({ text, isCorrect: i === q.answer }));
        _fisherYates(mapped);
        _s.shuffledOptions = mapped;

        mapped.forEach((opt, i) => {
            const btn = _optionBtns[i];
            btn.disabled = false;
            btn.className = 'quiz-option';
            btn.style.cssText = '';
            _optionTextSpans[i].textContent = opt.text;
        });
    }

    /* ══════════════════════════════════════════════════════════
       RENDERER 2: TYPE-IN-BLANK (Stage 2)
       ผู้เล่นพิมพ์คำตอบที่หายไปในช่องข้อความ
       - แสดงประโยคที่มี ___ ให้เห็นชัดเจน
       - submit ด้วยปุ่มหรือกด Enter
    ══════════════════════════════════════════════════════════ */
    function _renderTypeInBlank() {
        const q = _s.questions[_s.currentQ];

        // แสดงประโยคที่มี ___ พร้อมไฮไลต์
        const highlighted = (q.blank || '').replace(
            /___/g,
            '<span class="tib-blank">___</span>'
        );
        const qTextEl = document.getElementById('quiz-question-text');
        if (qTextEl) qTextEl.innerHTML = highlighted;

        // รีเซ็ตช่อง input และปุ่ม
        const input = document.getElementById('tib-input');
        const submit = document.getElementById('tib-submit');
        if (input) { input.value = ''; input.disabled = false; input.focus(); }
        if (submit) { submit.disabled = false; }

        // ล้าง feedback เดิม
        const result = document.getElementById('tib-result');
        if (result) { result.textContent = ''; result.className = 'hidden'; }
    }

    /* ══════════════════════════════════════════════════════════
       RENDERER 3: SENTENCE SCRAMBLE (Stage 3)
       ผู้เล่นคลิกปุ่มคำตามลำดับที่ถูกต้องเพื่อสร้างประโยค
       - word-bank: ปุ่มคำที่ยังไม่ถูกเลือก
       - answer-tray: ช่องแสดงคำที่เลือกแล้ว
       - ปุ่ม Reset เพื่อเริ่มใหม่
       - ปุ่ม Check เพื่อตรวจคำตอบ
    ══════════════════════════════════════════════════════════ */
    function _renderSentenceScramble() {
        const q = _s.questions[_s.currentQ];

        _setText('quiz-question-text', q.q || 'Arrange the words to form a correct sentence.');

        // สุ่มลำดับคำเริ่มต้น (Fisher-Yates)
        const shuffled = [...q.words];
        _fisherYates(shuffled);
        _s.scrambleRemaining = shuffled;
        _s.scrambleSelected = [];

        _buildScrambleUI();
    }

    /**
     * _buildScrambleUI() — สร้าง word-bank buttons และ answer-tray ใหม่ทุกครั้ง
     * เรียกซ้ำเมื่อ Reset หรือเมื่อคำถามใหม่
     */
    function _buildScrambleUI() {
        const bank = document.getElementById('ss-word-bank');
        const tray = document.getElementById('ss-answer-tray');
        if (!bank || !tray) return;

        bank.innerHTML = '';
        tray.innerHTML = '';

        // สร้างปุ่มคำใน word-bank
        _s.scrambleRemaining.forEach((word, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ss-word-btn';
            btn.textContent = word;
            btn.dataset.widx = String(idx);
            // คลิกเพื่อย้ายคำไปยัง answer-tray
            btn.addEventListener('click', () => _scramblePick(idx, word));
            bank.appendChild(btn);
        });

        // สร้าง placeholder ใน answer-tray สำหรับแต่ละคำที่เลือกแล้ว
        _s.scrambleSelected.forEach((word, pos) => {
            const chip = _makeScrambleChip(word, pos);
            tray.appendChild(chip);
        });

        // แสดง/ซ่อนปุ่ม Check
        const checkBtn = document.getElementById('ss-check-btn');
        if (checkBtn) {
            checkBtn.disabled = _s.scrambleSelected.length === 0;
        }
    }

    /**
     * _scramblePick(bankIdx, word) — ย้ายคำจาก word-bank → answer-tray
     * @param {number} bankIdx - ตำแหน่งใน _s.scrambleRemaining
     * @param {string} word    - คำที่เลือก
     */
    function _scramblePick(bankIdx, word) {
        if (_s.answered) return;

        // ลบออกจาก remaining และเพิ่มใน selected
        _s.scrambleRemaining.splice(bankIdx, 1);
        _s.scrambleSelected.push(word);
        _buildScrambleUI();
    }

    /**
     * _scrambleRemove(pos) — ย้ายคำจาก answer-tray กลับไป word-bank
     * @param {number} pos - ตำแหน่งใน _s.scrambleSelected
     */
    function _scrambleRemove(pos) {
        if (_s.answered) return;

        const word = _s.scrambleSelected.splice(pos, 1)[0];
        _s.scrambleRemaining.push(word);
        _buildScrambleUI();
    }

    /**
     * _makeScrambleChip(word, pos) — สร้าง chip element ใน answer-tray
     */
    function _makeScrambleChip(word, pos) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ss-chip';
        chip.textContent = word;
        // คลิก chip เพื่อส่งคำกลับไป word-bank
        chip.addEventListener('click', () => _scrambleRemove(pos));
        return chip;
    }

    /**
     * _checkSentenceScramble() — ตรวจคำตอบของ sentence-scramble
     * เปรียบเทียบประโยคที่ผู้เล่นเรียงกับ q.sentence (case-insensitive)
     */
    function _checkSentenceScramble() {
        if (!_s || _s.answered) return;

        const q = _s.questions[_s.currentQ];
        const playerAnswer = _s.scrambleSelected.join(' ').trim();
        const correctAnswer = (q.sentence || '').trim();

        // ตรวจคำตอบแบบ case-insensitive
        const isCorrect = playerAnswer.toLowerCase() === correctAnswer.toLowerCase();

        _s.answered = true;

        // ล็อค word-bank และ answer-tray
        document.querySelectorAll('.ss-word-btn, .ss-chip').forEach(b => b.disabled = true);
        const checkBtn = document.getElementById('ss-check-btn');
        if (checkBtn) checkBtn.disabled = true;
        const resetBtn = document.getElementById('ss-reset-btn');
        if (resetBtn) resetBtn.disabled = true;

        // แสดง tray สีเขียว/แดง
        const tray = document.getElementById('ss-answer-tray');
        if (tray) {
            tray.classList.toggle('ss-tray-correct', isCorrect);
            tray.classList.toggle('ss-tray-wrong', !isCorrect);
        }

        // แสดงประโยคที่ถูกต้องถ้าตอบผิด
        const resultEl = document.getElementById('ss-result');
        if (resultEl) {
            resultEl.textContent = isCorrect ? '' : `✅ Correct: "${correctAnswer}"`;
            resultEl.className = isCorrect ? 'hidden' : 'ss-result-wrong';
        }

        if (isCorrect) _onCorrect(); else _onWrong();

        // แสดง hint
        if (q.hint) {
            const fb = document.getElementById('quiz-feedback');
            if (fb) {
                fb.textContent = `💡 ${q.hint}`;
                fb.className = isCorrect ? 'quiz-feedback-correct' : 'quiz-feedback-wrong';
            }
        }

        setTimeout(_advance, 1800);
    }

    /* ══════════════════════════════════════════════════════════
       RENDERER 4: TRUE/FALSE BLITZ (Stage 4)
       ผู้เล่นตัดสินว่าประโยค "True" หรือ "False" ภายใน 10 วินาที
       มีแถบนับถอยหลัง (countdown bar) แสดง urgency
    ══════════════════════════════════════════════════════════ */
    function _renderTrueFalse() {
        const q = _s.questions[_s.currentQ];

        _setText('quiz-question-text', q.statement || q.q || '');

        // รีเซ็ตปุ่ม True / False
        const trueBtn = document.getElementById('tf-true-btn');
        const falseBtn = document.getElementById('tf-false-btn');
        if (trueBtn) { trueBtn.disabled = false; trueBtn.className = 'tf-btn tf-btn-true'; }
        if (falseBtn) { falseBtn.disabled = false; falseBtn.className = 'tf-btn tf-btn-false'; }

        // รีเซ็ต countdown bar
        const bar = document.getElementById('tf-timer-bar');
        if (bar) {
            bar.style.transition = 'none';
            bar.style.width = '100%';
            // หน่วง 1 frame ก่อนเริ่ม transition เพื่อให้ CSS animation เริ่มต้นสะอาด
            requestAnimationFrame(() => requestAnimationFrame(() => {
                bar.style.transition = `width ${TF_TIME_LIMIT}s linear`;
                bar.style.width = '0%';
            }));
        }

        // เริ่มนับถอยหลัง
        _startTFTimer();
    }

    /**
     * _startTFTimer() — เริ่มนับถอยหลัง TF_TIME_LIMIT วินาที
     * หมดเวลา → ถือว่าตอบผิดโดยอัตโนมัติ
     */
    function _startTFTimer() {
        _clearTFTimer();
        let remaining = TF_TIME_LIMIT;

        const counter = document.getElementById('tf-timer-count');
        if (counter) counter.textContent = remaining;

        _tfTimerInterval = setInterval(() => {
            remaining--;
            if (counter) counter.textContent = remaining;
            if (remaining <= 0) {
                _clearTFTimer();
                if (_s && !_s.answered) {
                    // หมดเวลา — ถือว่าตอบผิด
                    _handleTrueFalse(null);
                }
            }
        }, 1000);
    }

    function _clearTFTimer() {
        if (_tfTimerInterval !== null) {
            clearInterval(_tfTimerInterval);
            _tfTimerInterval = null;
        }
    }

    /**
     * _handleTrueFalse(playerAnswer) — ตรวจคำตอบ true-false
     * @param {boolean|null} playerAnswer - null = หมดเวลา
     */
    function _handleTrueFalse(playerAnswer) {
        if (!_s || _s.answered) return;
        _s.answered = true;
        _clearTFTimer();

        const q = _s.questions[_s.currentQ];
        const isCorrect = playerAnswer !== null && playerAnswer === q.answer;

        // หยุดและแสดงผล countdown bar
        const bar = document.getElementById('tf-timer-bar');
        if (bar) bar.style.transition = 'none';

        // ไฮไลต์ปุ่มที่ถูกต้องและที่เลือก
        const trueBtn = document.getElementById('tf-true-btn');
        const falseBtn = document.getElementById('tf-false-btn');
        if (trueBtn) trueBtn.disabled = true;
        if (falseBtn) falseBtn.disabled = true;

        // แสดงว่า correct คือข้อไหน
        const correctBtn = q.answer === true ? trueBtn : falseBtn;
        if (correctBtn) correctBtn.classList.add('tf-btn-correct');

        if (playerAnswer !== null) {
            const clickedBtn = playerAnswer === true ? trueBtn : falseBtn;
            if (!isCorrect && clickedBtn) clickedBtn.classList.add('tf-btn-wrong');
        }

        if (isCorrect) _onCorrect(); else _onWrong();

        // แสดง hint
        if (q.hint) {
            const fb = document.getElementById('quiz-feedback');
            if (fb) {
                fb.textContent = playerAnswer === null
                    ? `⏰ Time's up! 💡 ${q.hint}`
                    : `💡 ${q.hint}`;
                fb.className = isCorrect ? 'quiz-feedback-correct' : 'quiz-feedback-wrong';
            }
        }

        setTimeout(_advance, 1500);
    }

    /* ══════════════════════════════════════════════════════════
       RENDERER 5: IMAGE-WORD MATCH (Stage 5)
       แสดง imageHint (emoji + description) จากนั้นผู้เล่นเลือก MCQ
       ใช้ pre-built _optionBtns เหมือน multiple-choice
    ══════════════════════════════════════════════════════════ */
    function _renderImageWordMatch() {
        const q = _s.questions[_s.currentQ];

        // แสดง imageHint
        const imgHint = document.getElementById('quiz-image-hint');
        if (imgHint) {
            imgHint.textContent = q.imageHint || '';
            imgHint.classList.remove('hidden');
        }

        _setText('quiz-question-text', q.q || '');

        // ใช้ MCQ logic เดียวกัน
        const mapped = q.options.map((text, i) => ({ text, isCorrect: i === q.answer }));
        _fisherYates(mapped);
        _s.shuffledOptions = mapped;

        const wrap = document.getElementById('quiz-options');
        if (wrap) wrap.classList.remove('hidden');

        mapped.forEach((opt, i) => {
            const btn = _optionBtns[i];
            btn.disabled = false;
            btn.className = 'quiz-option';
            btn.style.cssText = '';
            _optionTextSpans[i].textContent = opt.text;
        });
    }

    /* ══════════════════════════════════════════════════════════
       ANSWER HANDLER — รับ input จาก multiple-choice / image-word-match
       (type-in-blank ใช้ _checkTypeInBlank, scramble ใช้ _checkSentenceScramble,
        true-false ใช้ _handleTrueFalse)
    ══════════════════════════════════════════════════════════ */
    function _handleAnswer(optionIdx) {
        if (!_s || _s.answered) return;
        _s.answered = true;

        const q = _s.questions[_s.currentQ];
        const isCorrect = _s.shuffledOptions[optionIdx].isCorrect;

        _optionBtns.forEach(b => { b.disabled = true; });
        _optionBtns[optionIdx].classList.add(isCorrect ? 'correct' : 'wrong');

        if (!isCorrect) {
            const correctIdx = _s.shuffledOptions.findIndex(o => o.isCorrect);
            _optionBtns[correctIdx].classList.add('correct');
        }

        if (isCorrect) _onCorrect(); else _onWrong();

        if (q.hint) {
            const fb = document.getElementById('quiz-feedback');
            if (fb) {
                fb.textContent = `💡 ${q.hint}`;
                fb.className = isCorrect ? 'quiz-feedback-correct' : 'quiz-feedback-wrong';
            }
        }

        setTimeout(_advance, 1500);
    }

    /* ══════════════════════════════════════════════════════════
       TYPE-IN-BLANK CHECK
       เปรียบเทียบ input ของผู้เล่นกับ q.answer และ q.acceptAlt[]
       ตรวจแบบ case-insensitive และ trim whitespace
    ══════════════════════════════════════════════════════════ */
    function _checkTypeInBlank() {
        if (!_s || _s.answered) return;

        const q = _s.questions[_s.currentQ];
        const input = document.getElementById('tib-input');
        if (!input) return;

        const playerAns = input.value.trim().toLowerCase();
        if (!playerAns) return;  // ไม่ตรวจถ้า input ว่าง

        _s.answered = true;

        // รับคำตอบหลักและทางเลือกเสริม (acceptAlt)
        const correctAnswers = [q.answer, ...(q.acceptAlt || [])]
            .map(a => a.toLowerCase().trim());
        const isCorrect = correctAnswers.includes(playerAns);

        // ปิด input และปุ่ม submit
        input.disabled = true;
        const submit = document.getElementById('tib-submit');
        if (submit) submit.disabled = true;

        // แสดงผล feedback ใน tib-result
        const result = document.getElementById('tib-result');
        if (result) {
            result.textContent = isCorrect
                ? `✅ Correct! "${q.answer}"`
                : `❌ Wrong. Correct answer: "${q.answer}"`;
            result.className = isCorrect ? 'tib-result-correct' : 'tib-result-wrong';
        }

        if (isCorrect) _onCorrect(); else _onWrong();

        if (q.hint) {
            const fb = document.getElementById('quiz-feedback');
            if (fb) {
                fb.textContent = `💡 ${q.hint}`;
                fb.className = isCorrect ? 'quiz-feedback-correct' : 'quiz-feedback-wrong';
            }
        }

        setTimeout(_advance, 1800);
    }

    /* ══════════════════════════════════════════════════════════
       CORRECT / WRONG HANDLERS
    ══════════════════════════════════════════════════════════ */
    function _onCorrect() {
        _s.combo++;
        const xpGain = (_s.combo >= COMBO_THRESHOLD) ? XP_COMBO : XP_BASE;
        _s.sessionXP += xpGain;
        _s.sessionCoins += COINS_CORRECT;
        // Survival mode: นับคำถามที่ตอบถูกสะสม
        if (_s.isSurvival) _s.survivalCount++;
        _renderCombo();
        SoundManager.play('correct');                           // เสียงตอบถูก
        if (_s.combo >= 10) _tryUnlockAchievement('perfectStreak'); // PerfectStreak: ตอบถูก 10 ข้อต่อเนื่อง
        _floatReward(`+${xpGain} XP  +${COINS_CORRECT} 🪙`, true);
    }

    function _onWrong() {
        _s.combo = 0;
        SoundManager.play('wrong');    // เสียงตอบผิด
        if (_s.shieldActive > 0) {
            _s.shieldActive--;
            if (global.Shop && typeof global.Shop.consumeShield === 'function') {
                global.Shop.consumeShield();
            }
            _renderShieldHUD();
            _floatReward('🛡️ Blocked!', true);
            _appToast('🛡️ Shield absorbed the hit!', 'info');
        } else {
            _s.hp--;
            _renderHearts();
            const hRow = document.getElementById('quiz-hearts');
            if (hRow) _restartAnim(hRow, 'hp-shake');
            const card = document.getElementById('quiz-card');
            if (card) _restartAnim(card, 'screen-shake');
        }
        _renderCombo();
    }

    /* ── Advance to next question / end-of-session ── */
    function _advance() {
        if (!_s) return;

        if (_s.hp <= 0) {
            // Survival mode: จบเกมและบันทึก High Score
            if (_s.isSurvival) { _survivalEnd(); return; }
            _gameOver();
            return;
        }

        _s.currentQ++;

        if (_s.isSurvival) {
            // Survival: เมื่อคำถามหมด pool ให้ shuffle ใหม่และเล่นต่อ
            if (_s.currentQ >= _s.questions.length) {
                _fisherYates(_s.questions);
                _s.currentQ = 0;
            }
            _renderQuestion();
        } else if (_s.currentQ >= _s.questions.length) {
            _stageClear();
        } else {
            _renderQuestion();
        }
    }

    /* ══════════════════════════════════════════════════════════
       SHOP ITEM ACTIONS
    ══════════════════════════════════════════════════════════ */
    function useHint() {
        if (!_s || _s.answered || _s.hintUsed) return false;

        // ใช้ได้เฉพาะ MCQ modes (multiple-choice, image-word-match)
        if (!_s.shuffledOptions) return false;

        const wrong = _optionBtns.filter((btn, idx) =>
            !_s.shuffledOptions[idx].isCorrect && !btn.disabled
        );
        if (wrong.length === 0) return false;

        const target = wrong[Math.floor(Math.random() * wrong.length)];
        target.disabled = true;
        target.style.opacity = '0.3';
        target.style.transform = 'scale(.95)';
        _s.hintUsed = true;
        return true;
    }

    function activateShield() {
        if (!_s) return;
        _s.shieldActive = Math.min(3, (_s.shieldActive || 0) + 1);
        _renderShieldHUD();
    }

    function getState() {
        if (!_s) return null;
        return {
            stageIdx: _s.stageIdx,
            currentQ: _s.currentQ,
            answered: _s.answered,
            shieldActive: _s.shieldActive,
        };
    }

    /* ══════════════════════════════════════════════════════════
       STAGE CLEAR
    ══════════════════════════════════════════════════════════ */
    function _stageClear() {
        _clearTFTimer();
        _closeOverlay('quiz-overlay');
        const didLevelUp = _saveProgress();
        SoundManager.play('victory');    // เสียงชนะ Stage
        const def = Auth.STAGE_DEFS[_s.stageIdx];
        _setText('sc-stage-name', `${def.icon} ${def.name}`);
        _setText('sc-xp', `+${_s.sessionXP} XP`);
        _setText('sc-coins', `+${_s.sessionCoins} 🪙`);
        const maxCombo = _s.combo;
        _setText('sc-combo', maxCombo >= COMBO_THRESHOLD ? `🔥 ${maxCombo}x Combo!` : '—');
        _openOverlay('stageclear-overlay');
        if (didLevelUp) {
            setTimeout(() => {
                _closeOverlay('stageclear-overlay');
                _showLevelUpModal();
            }, 2500);
        }
    }

    /* ══════════════════════════════════════════════════════════
       GAME OVER
    ══════════════════════════════════════════════════════════ */
    function _gameOver() {
        _clearTFTimer();
        _closeOverlay('quiz-overlay');
        SoundManager.play('wrong');    // เสียงเมื่อ HP หมด
        const def = Auth.STAGE_DEFS[_s.stageIdx];
        _setText('go-stage-name', `${def.icon} ${def.name}`);
        _openOverlay('gameover-overlay');
    }

    /* ══════════════════════════════════════════════════════════
       PROGRESS PERSISTENCE
    ══════════════════════════════════════════════════════════ */
    function _saveProgress() {
        const user = Auth.getCurrentUser();
        if (!user) return false;

        user.totalXP += _s.sessionXP;
        user.coins += _s.sessionCoins;

        const stageData = user.stages[_s.stageIdx];
        if (stageData) {
            stageData.subLevels[_s.subLevelIdx] = 2;
            const nextSub = _s.subLevelIdx + 1;
            if (nextSub < 5) {
                if (stageData.subLevels[nextSub] === 0) stageData.subLevels[nextSub] = 1;
            } else {
                const nextStage = _s.stageIdx + 1;
                if (nextStage < 5 && user.stages[nextStage]) {
                    user.stages[nextStage].unlocked = true;
                    if (user.stages[nextStage].subLevels[0] === 0) {
                        user.stages[nextStage].subLevels[0] = 1;
                    }
                }
            }
        }

        requestAnimationFrame(() => Auth.updateUser(user));
        if (global.App && typeof global.App.refreshDashboard === 'function') {
            global.App.refreshDashboard(user);
        }

        // ตรวจ Achievements หลังบันทึก progress ล่าสุด
        if ((user.coins || 0) >= 1000) _tryUnlockAchievement('coinHoarder');
        if (user.stages && user.stages.every(function (st) {
            return st.subLevels && st.subLevels.every(function (sl) { return sl === 2; });
        })) {
            _tryUnlockAchievement('englishMaster');
        }

        const newLevel = Auth.calculateLevel(user.totalXP).level;
        return newLevel > _s.levelBefore;
    }

    /* ══════════════════════════════════════════════════════════
       LEVEL UP MODAL
    ══════════════════════════════════════════════════════════ */
    function _showLevelUpModal() {
        const user = Auth.getCurrentUser();
        if (!user) return;
        const lvData = Auth.calculateLevel(user.totalXP);
        const rank = Auth.getRank(lvData.level);
        _setText('lu-level', lvData.level);
        _setText('lu-rank', `${rank.icon} ${rank.name}`);
        _openOverlay('levelup-overlay');
        setTimeout(closeLevelUp, 5000);
    }

    /* ══════════════════════════════════════════════════════════
       INFINITE SURVIVAL MODE
       ปลดล็อคเมื่อผ่านครบ 5 Stage — รวม pool คำถามทั้งหมดจาก QUESTIONS
       เล่นต่อเนื่องจนกว่า HP จะหมด บันทึก High Score ใน user.survivalHighScore
    ══════════════════════════════════════════════════════════ */

    /** ตรวจว่าผ่านครบ 5 Stage (sub-levels ทั้งหมด state = 2) */
    function _isAllStagesComplete() {
        const user = Auth.getCurrentUser();
        if (!user || !Array.isArray(user.stages)) return false;
        return user.stages.every(function (st) {
            return Array.isArray(st.subLevels) && st.subLevels.every(function (sl) { return sl === 2; });
        });
    }

    /** สร้าง pool คำถามจากทุก Stage + annotate _mode ให้แต่ละข้อ */
    function _buildSurvivalPool() {
        const pool = [];
        const allQ = window.QUESTIONS || {};
        const modes = window.STAGE_MODES || {};
        Object.keys(allQ).forEach(function (stageKey) {
            const stageId = parseInt(stageKey, 10);
            const mode = modes[stageId] || 'multiple-choice';
            const stageBank = allQ[stageId];
            Object.values(stageBank).forEach(function (subArr) {
                if (Array.isArray(subArr)) {
                    subArr.forEach(function (q) {
                        pool.push(Object.assign({}, q, { _mode: mode }));
                    });
                }
            });
        });
        _fisherYates(pool);
        return pool;
    }

    /** เริ่ม Survival Mode — ต้องผ่านครบ 5 Stage ก่อน */
    function startSurvival() {
        const user = Auth.getCurrentUser();
        if (!user) return;
        if (!_isAllStagesComplete()) {
            _appToast('🔒 Complete all 5 stages to unlock Infinite Survival!', 'warn');
            return;
        }
        const pool = _buildSurvivalPool();
        if (pool.length === 0) { _appToast('No questions available.', 'error'); return; }

        const lvBefore = Auth.calculateLevel(user.totalXP).level;
        _s = {
            isSurvival: true,
            stageIdx: -1,
            subLevelIdx: -1,
            mode: pool[0]._mode || 'multiple-choice',
            questions: pool,
            currentQ: 0,
            survivalCount: 0,   // จำนวนคำถามที่ตอบถูกสะสมใน session นี้
            hp: MAX_HP,
            combo: 0,
            sessionXP: 0,
            sessionCoins: 0,
            answered: false,
            levelBefore: lvBefore,
            shieldActive: (global.Shop ? global.Shop.shieldCount() : 0),
            hintUsed: false,
            scrambleSelected: [],
            scrambleRemaining: [],
        };

        _openOverlay('quiz-overlay');
        const card = document.getElementById('quiz-card');
        if (card) _restartAnim(card, 'view-enter');
        _buildQuizHUD();
        _renderQuestion();
    }

    /** จบ Survival — บันทึก High Score + XP/Coins + แสดง result overlay */
    function _survivalEnd() {
        _clearTFTimer();
        _closeOverlay('quiz-overlay');
        const count = _s.survivalCount;
        const xp = _s.sessionXP;
        const coins = _s.sessionCoins;
        const user = Auth.getCurrentUser();

        if (user) {
            user.totalXP += xp;
            user.coins += coins;
            const prevBest = user.survivalHighScore || 0;
            const isNewBest = count > prevBest;
            if (isNewBest) user.survivalHighScore = count;
            Auth.updateUser(user);
            if (global.App && typeof global.App.refreshDashboard === 'function') {
                global.App.refreshDashboard(user);
            }
            // ตรวจ CoinHoarder หลังจากได้รับ coins จาก Survival
            if ((user.coins || 0) >= 1000) _tryUnlockAchievement('coinHoarder');
            if (isNewBest && count > 0) {
                _appToast('🏆 New high score! ' + count + ' questions survived!', 'success');
            }
        }

        _setText('surv-score', count);
        _setText('surv-best', user ? (user.survivalHighScore || count) : count);
        _setText('surv-xp', '+' + xp + ' XP');
        _setText('surv-coins', '+' + coins + ' 🪙');
        _openOverlay('survival-result-overlay');
        _s = null;
    }

    /** ปิด survival result overlay */
    function closeSurvival() { _closeOverlay('survival-result-overlay'); }

    /** อัปเดต Survival UI ใน Dashboard (เรียกจาก app.js refreshDashboard) */
    function refreshSurvivalUI(user) {
        const u = user || Auth.getCurrentUser();
        if (!u) return;
        const unlocked = _isAllStagesComplete();
        const btn = document.getElementById('btn-survival');
        if (btn) {
            btn.disabled = !unlocked;
            btn.innerHTML = unlocked
                ? '<i class="fas fa-infinity mr-2"></i>Start Survival'
                : '<i class="fas fa-lock mr-2"></i>Locked';
        }
        const scoreEl = document.getElementById('survival-best-display');
        if (scoreEl) {
            scoreEl.textContent = (u.survivalHighScore || 0) > 0 ? u.survivalHighScore : '—';
        }
    }

    /* ══════════════════════════════════════════════════════════
       CERTIFICATE OF COMPLETION
       ปรากฏอัตโนมัติเมื่อผู้เล่น clear Stage 5 Sub-level 5 สำเร็จ
    ══════════════════════════════════════════════════════════ */

    function _showCertificate() {
        const user = Auth.getCurrentUser();
        if (!user) return;
        const lvData = Auth.calculateLevel(user.totalXP);
        const rank = Auth.getRank(lvData.level);
        _setText('cert-username', user.username || 'Adventurer');
        _setText('cert-rank', rank.icon + ' ' + rank.name);
        _setText('cert-level', 'Level ' + lvData.level);
        const now = new Date();
        _setText('cert-date',
            now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
        _openOverlay('certificate-overlay');
    }

    function closeCertificate() { _closeOverlay('certificate-overlay'); }

    /* ══════════════════════════════════════════════════════════
       PUBLIC CLOSE HANDLERS
    ══════════════════════════════════════════════════════════ */
    function closeGameOver() {
        _closeOverlay('gameover-overlay');
        if (_s) start(_s.stageIdx, _s.subLevelIdx);
    }

    function closeStageClear() {
        // ตรวจว่าเพิ่ง clear Stage 5 Sub-level 5 (ด่านสุดท้าย) → แสดง Certificate
        const isFinalStage = _s && _s.stageIdx === 4 && _s.subLevelIdx === 4;
        _closeOverlay('stageclear-overlay');
        _s = null;
        if (isFinalStage) setTimeout(_showCertificate, 350);
    }

    function closeLevelUp() {
        _closeOverlay('levelup-overlay');
    }

    /* ══════════════════════════════════════════════════════════
       HUD HELPERS
    ══════════════════════════════════════════════════════════ */
    function _renderShieldHUD() {
        const hud = document.getElementById('quiz-shield-hud');
        const count = document.getElementById('quiz-shield-count');
        if (!hud || !count) return;
        const n = (_s && _s.shieldActive) || 0;
        count.textContent = n;
        hud.classList.toggle('hidden', n <= 0);
    }

    function _initHearts() {
        const wrap = document.getElementById('quiz-hearts');
        if (!wrap) return;
        wrap.innerHTML = '';
        for (let i = 0; i < MAX_HP; i++) {
            const icon = document.createElement('i');
            icon.dataset.hp = i;
            wrap.appendChild(icon);
        }
        _renderHearts();
    }

    function _renderHearts() {
        const icons = document.querySelectorAll('#quiz-hearts i[data-hp]');
        icons.forEach(icon => {
            const i = Number(icon.dataset.hp);
            icon.className = i < _s.hp
                ? 'fas fa-heart text-red-500 text-xl'
                : 'fas fa-heart text-slate-700 text-xl';
        });
    }

    function _renderCombo() {
        const badge = document.getElementById('quiz-combo');
        if (!badge) return;
        if (_s.combo >= COMBO_THRESHOLD) {
            badge.textContent = `🔥 ${_s.combo}x Combo!`;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    function _renderQCounter() {
        if (_s.isSurvival) {
            // Survival mode: แสดงหมายเลขคำถามสะสมที่ตอบถูกแล้ว
            _setText('quiz-q-counter', '♾️ #' + (_s.survivalCount + 1));
        } else {
            _setText('quiz-q-counter', `${_s.currentQ + 1} / ${_s.questions.length}`);
        }
    }

    function _renderQProgress() {
        const el = document.getElementById('quiz-q-progress');
        if (!el) return;
        if (_s.isSurvival) {
            // Survival: progress bar วนทุก 10 คำถาม เพื่อแสดง momentum
            el.style.width = ((_s.survivalCount % 10) / 10 * 100) + '%';
        } else {
            el.style.width = `${(_s.currentQ / _s.questions.length) * 100}%`;
        }
    }

    function _floatReward(text, positive) {
        const card = document.getElementById('quiz-card');
        if (!card) return;
        const el = document.createElement('div');
        el.className = `float-reward ${positive ? 'float-good' : 'float-bad'}`;
        el.textContent = text;
        el.setAttribute('aria-hidden', 'true');
        requestAnimationFrame(() => {
            card.appendChild(el);
            setTimeout(() => el.remove(), 1100);
        });
    }

    /* ══════════════════════════════════════════════════════════
       OVERLAY HELPERS
    ══════════════════════════════════════════════════════════ */
    function _openOverlay(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function _closeOverlay(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
        const anyOpen = ['quiz-overlay', 'stageclear-overlay', 'gameover-overlay',
            'levelup-overlay', 'shop-overlay', 'leaderboard-overlay']
            .some(oid => {
                const o = document.getElementById(oid);
                return o && !o.classList.contains('hidden');
            });
        if (!anyOpen) document.body.style.overflow = '';
    }

    /* ══════════════════════════════════════════════════════════
       MISC UTILITIES
    ══════════════════════════════════════════════════════════ */
    function _setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function _appToast(msg, type) {
        if (global.App && typeof global.App.toast === 'function') {
            global.App.toast(msg, type);
        }
    }

    /* ══════════════════════════════════════════════════════════
       EXPOSE INTERNAL HANDLERS TO HTML (data-action attributes)
    ══════════════════════════════════════════════════════════ */

    // เรียกจาก onclick ใน HTML สำหรับ type-in-blank
    global._tibSubmit = _checkTypeInBlank;

    // เรียกจาก onclick ใน HTML สำหรับ sentence-scramble
    global._ssCheck = _checkSentenceScramble;
    global._ssReset = function () {
        if (!_s || _s.answered) return;
        const q = _s.questions[_s.currentQ];
        _s.scrambleRemaining = [...q.words];
        _fisherYates(_s.scrambleRemaining);
        _s.scrambleSelected = [];
        _buildScrambleUI();
    };

    // เรียกจาก onclick ใน HTML สำหรับ true-false
    global._tfAnswer = _handleTrueFalse;

    /* ══════════════════════════════════════════════════════════
       PUBLIC API
    ══════════════════════════════════════════════════════════ */
    global.Game = Object.freeze({
        start,
        startSurvival,
        closeGameOver,
        closeStageClear,
        closeSurvival,
        closeLevelUp,
        closeCertificate,
        useHint,
        activateShield,
        getState,
        refreshSurvivalUI,
    });

}(window));
