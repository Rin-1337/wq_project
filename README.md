# WordQuest ชื่อนี้คิดไว้ก่อนค่อยเปลี่ยนทีหลัง
# 📚 WordQuest — เกมแบบทดสอบภาษาอังกฤษ (Gamified English Quiz)

> **Single-Page Application (SPA)** ที่สร้างด้วย Vanilla JavaScript ล้วนๆ ไม่พึ่ง Framework ใดๆ  
> มีระบบ Auth, ระดับเลเวล, ร้านค้าไอเทม, และ Leaderboard ครบครัน

---

## สารบัญ

1. [ภาพรวมโปรเจกต์](#1-ภาพรวมโปรเจกต์)
2. [ฟีเจอร์หลัก](#2-ฟีเจอร์หลัก)
3. [โครงสร้างไฟล์](#3-โครงสร้างไฟล์)
4. [เทคโนโลยีที่ใช้](#4-เทคโนโลยีที่ใช้)
5. [วิธีรันโปรเจกต์](#5-วิธีรันโปรเจกต์)
6. [ระบบ Authentication](#6-ระบบ-authentication)
7. [Game Loop — วงจรการเล่นเกม](#7-game-loop--วงจรการเล่นเกม)
8. [ระบบ XP, Combo และ Coins](#8-ระบบ-xp-combo-และ-coins)
9. [สูตรคำนวณเลเวลและยศ (Rank)](#9-สูตรคำนวณเลเวลและยศ-rank)
10. [ระบบ State Management](#10-ระบบ-state-management)
11. [ร้านค้าไอเทม (Item Shop)](#11-ร้านค้าไอเทม-item-shop)
12. [Leaderboard](#12-leaderboard)
13. [ระบบคำถาม (Question Bank)](#13-ระบบคำถาม-question-bank)
14. [การปรับแต่งและเพิ่มคำถามใหม่](#14-การปรับแต่งและเพิ่มคำถามใหม่)
15. [เทคนิค Performance Optimization](#15-เทคนิค-performance-optimization)

---

## 1. ภาพรวมโปรเจกต์

**WordQuest** คือเกมแบบทดสอบภาษาอังกฤษแบบ Gamified ที่ออกแบบมาให้การเรียนรู้เป็นเรื่องสนุก โดยนำกลไกเกม (Game Mechanics) มาผสมผสานกับแบบฝึกหัดทักษะภาษาอังกฤษในระดับต่างๆ ตั้งแต่ผู้เริ่มต้นจนถึงระดับขั้นสูง

**จุดเด่นหลัก:**
- ✅ ไม่ใช้ Framework ใดๆ — เร็ว เบา และเข้าใจง่าย
- ✅ ทุกอย่างทำงานผ่าน Browser เพียงอย่างเดียว ไม่ต้องการ Backend หรือ Server
- ✅ ข้อมูลทั้งหมดเก็บไว้ใน `localStorage`/`sessionStorage` ของ Browser
- ✅ UI ดีไซน์แบบ Dark Mode สไตล์เกม พร้อม Animation ลื่นไหล

---

## 2. ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---|---|
| 🔐 **Auth System** | สมัครสมาชิก / เข้าสู่ระบบ / ออกจากระบบ พร้อม password hashing |
| 🗺️ **Adventure Map** | แผนที่ด่านแบบ Visual 5 Stage × 5 Sub-level = 25 ด่าน |
| ❤️ **HP System** | เริ่มต้น 3 ❤️ ต่อด่าน ตอบผิดเสียเลือด |
| ⚡ **XP & Leveling** | รับ XP ทุกคำตอบถูก บวกเพิ่มเมื่อ Combo สะสม |
| 🪙 **Coins** | ใช้ซื้อไอเทมในร้านค้า |
| 🔥 **Combo System** | ตอบถูก 3 ครั้งติดต่อกัน — รับ XP 2 เท่า |
| 🛒 **Item Shop** | ซื้อ Hint (ตัดตัวเลือกผิด) และ Shield (ป้องกัน HP) |
| 🏆 **Leaderboard** | จัดอันดับผู้เล่นทุกคนตาม XP รวม พร้อม Podium |
| 🔀 **Shuffle Options** | สลับตำแหน่งตัวเลือก A–D ทุกคำถาม ด้วย Fisher-Yates |
| 📊 **Dashboard** | แสดงสถิติ Profile, XP Bar, Stats, แผนที่ด่าน |

---

## 3. โครงสร้างไฟล์

```
pro/
├── index.html        ← SPA Shell: HTML + CSS ทั้งหมด, Modal ทุกอัน
├── auth.js           ← ระบบผู้ใช้: Register, Login, Session, Level Formula
├── questions.js      ← คลังคำถาม 125 ข้อ แบ่งตาม Stage/Sub-level
├── game.js           ← Core Engine: Quiz Loop, HP, XP, Combo, Save Progress
├── shop.js           ← ร้านค้าไอเทม: Hint, Shield
├── leaderboard.js    ← จัดอันดับ XP ผู้เล่นทั้งหมด
└── app.js            ← Controller: View Routing, Dashboard, Stage Map
```

**ลำดับการโหลด Script** (สำคัญมาก — ต้องโหลดตามลำดับนี้เท่านั้น):

```html
<script src="auth.js"></script>
<script src="questions.js"></script>
<script src="game.js"></script>
<script src="shop.js"></script>
<script src="leaderboard.js"></script>
<script src="app.js"></script>
```

### หน้าที่ของแต่ละไฟล์

#### `index.html`
เป็น "เปลือก" ของ SPA ประกอบด้วย:
- Auth View (Login + Register panels)
- Dashboard View (Navbar, Profile, Stats, Stage Map)
- Modal ทั้งหมด: Quiz, Stage Clear, Game Over, Level Up, Shop, Leaderboard
- CSS ทั้งหมด (Tailwind + Custom Styles) อยู่ใน `<style>` block เดียว

#### `auth.js` → `window.Auth`
จัดการทุกอย่างที่เกี่ยวกับผู้ใช้:
- เก็บข้อมูลใน `localStorage` (key: `wq_users`)
- Session ใน `sessionStorage` (key: `wq_session`)
- Password hashing แบบ djb2 (demo only — ไม่ใช่ production crypto)
- Export: `register`, `login`, `logout`, `getCurrentUser`, `updateUser`, `calculateLevel`, `getRank`, `getAvatarIndex`, `STAGE_DEFS`

#### `questions.js` → `window.QUESTIONS`
คลังคำถามแบบ Static Object:
- โครงสร้าง: `QUESTIONS[stageId][subLevelId]` = Array ของ 5 คำถาม
- รวม 125 คำถาม (5 Stage × 5 Sub-level × 5 ข้อ)
- ไม่มี function — เป็นแค่ data object ที่ mount บน `window`

#### `game.js` → `window.Game`
หัวใจหลักของเกม:
- จัดการ State การเล่นทั้งหมดใน `_s` object
- ควบคุม Quiz Loop, การตรวจคำตอบ, การสะสม XP/Coins
- บันทึกความคืบหน้าลง localStorage เมื่อด่านผ่าน
- Export: `start`, `closeGameOver`, `closeStageClear`, `closeLevelUp`, `useHint`, `activateShield`, `getState`

#### `shop.js` → `window.Shop`
ร้านค้าไอเทม:
- อ่านเหรียญจาก `Auth.getCurrentUser()`
- Shield เก็บแยกใน `localStorage` (key: `wq_shields`)
- Export: `open`, `close`, `shieldCount`, `consumeShield`

#### `leaderboard.js` → `window.Leaderboard`
จัดอันดับผู้เล่น:
- อ่านผู้ใช้ทั้งหมดจาก `localStorage` แล้วเรียงตาม `totalXP`
- แสดง Podium (อันดับ 1–3) + รายการอันดับที่เหลือ
- Export: `open`, `close`

#### `app.js` → `window.App`
ควบคุม View และ Dashboard:
- สลับระหว่าง Auth View และ Dashboard View
- Render หน้า Dashboard พร้อม Dirty-check State Manager
- สร้าง Stage Map การ์ด
- จัดการ Event Delegation ทั้งหมด
- Export: `showLogin`, `showRegister`, `togglePwd`, `toast`, `refreshDashboard`

---

## 4. เทคโนโลยีที่ใช้

| เทคโนโลยี | เวอร์ชัน | วัตถุประสงค์ |
|---|---|---|
| Vanilla JavaScript | ES2020+ | Logic ทั้งหมด — ไม่มี Framework |
| [Tailwind CSS (Play CDN)](https://tailwindcss.com/docs/installation/play-cdn) | Latest | Utility-first styling |
| [Font Awesome](https://fontawesome.com/) | 6.5.1 | SVG Icon system (โหลดผ่าน jsDelivr) |
| [Poppins (Google Fonts)](https://fonts.google.com/specimen/Poppins) | 400–900 | Font หลักของ UI |
| localStorage | Browser API | เก็บข้อมูล user และ shield inventory |
| sessionStorage | Browser API | เก็บ session ที่ active อยู่ |

**Pattern ที่ใช้:** IIFE Module Pattern — แต่ละไฟล์ห่อด้วย `(function(global) { ... }(window))` เพื่อ encapsulate scope และ expose API ผ่าน `window` โดยตรง

---

## 5. วิธีรันโปรเจกต์

ไม่ต้องติดตั้งอะไรเพิ่มเติม เพียงเปิดไฟล์ผ่าน Live Server:

```bash
# วิธีที่ 1: VS Code Live Server (แนะนำ)
# คลิกขวาที่ index.html → "Open with Live Server"

# วิธีที่ 2: Python HTTP Server
cd "C:\Users\Nuttavi\Desktop\pro"
python -m http.server 8080
# เปิด http://localhost:8080

# วิธีที่ 3: Node.js
npx serve .
```

> ⚠️ **หมายเหตุ:** ต้องเปิดผ่าน HTTP Server เท่านั้น ไม่สามารถเปิดไฟล์ `index.html` ตรงๆ แบบ `file://` เพราะ Font Awesome SVG-JS จะโหลดไม่ได้จาก cross-origin

---

## 6. ระบบ Authentication

### การสมัครสมาชิก (`Auth.register`)

```
username → ตรวจสอบ 3–20 ตัวอักษร (a-z, 0-9, _, -)
email    → ตรวจสอบ RFC 5322 format
password → ต้องมีอย่างน้อย 6 ตัวอักษร, ไม่เกิน 128 ตัว
         → hash ด้วย djb2 + static salt ก่อนเก็บ
```

**โครงสร้าง User Object:**
```json
{
  "id": "lxyz123abc",
  "username": "HeroPlayer",
  "email": "hero@example.com",
  "password": "a3f8c1d2",
  "totalXP": 340,
  "coins": 150,
  "stages": [ ... ],
  "createdAt": "2026-04-06T10:00:00.000Z",
  "lastLoginAt": "2026-04-06T12:00:00.000Z"
}
```

### การจัดเก็บข้อมูล

```
localStorage:
  wq_users    → JSON array ของ user ทุกคน
  wq_shields  → JSON object { userId: count }

sessionStorage:
  wq_session  → JSON { id: userId, ts: timestamp }
               → ถูกลบอัตโนมัติเมื่อปิด Tab
```

### Security Notes
- Password ที่เก็บในระบบนี้ใช้ djb2 hashing ซึ่ง **ไม่ใช่** cryptographic hash ที่ปลอดภัยสำหรับ Production
- สำหรับระบบจริงควรใช้ bcrypt/Argon2 บน server-side
- ทุก output ที่แสดงบน DOM ผ่านฟังก์ชัน `_esc()` เพื่อป้องกัน XSS

---

## 7. Game Loop — วงจรการเล่นเกม

### Flow ทั้งหมดตั้งแต่กด Stage จนถึงจบด่าน

```
[ผู้เล่นคลิก Sub-level Node]
         │
         ▼
  Game.start(stageIdx, subLevelIdx)
         │
         ├─► โหลดคำถามจาก QUESTIONS[stageId][subLevelId]
         ├─► สุ่มลำดับ pool แล้วตัด 5 ข้อ
         ├─► สร้าง _s (Session State Object)
         └─► เปิด quiz-overlay, _buildQuizHUD()
                          │
                          ▼
              _renderQuestion()  ←──────────────┐
                          │                     │
                          ├─ Fisher-Yates        │
                          │  shuffle options     │
                          ├─ อัปเดต pre-built   │
                          │  button pool         │
                          └─ รอ user click       │
                                   │             │
                          ─────────▼─────────    │
                          _handleAnswer(idx)      │
                                   │             │
                        ┌──────────┴──────────┐  │
                   [ถูก] │                     │ [ผิด]
                        │                     │  │
                 _onCorrect()           _onWrong()│
                 +XP, +Coins,           -HP,     │
                 Combo++                Combo=0  │
                        │                     │  │
                        └──────────┬──────────┘  │
                                   │             │
                          setTimeout(_advance, 1500)
                                   │
                        ┌──────────┴──────────┐
                   [HP=0]│                     │[ข้อถัดไป]
                        │                     │
                  _gameOver()       currentQ++ ──┘
                        │          (หรือ _stageClear() ถ้าครบ 5)
                  Show Game                │
                  Over Modal        [_stageClear()]
                                          │
                                  _saveProgress()
                                  (เขียน localStorage)
                                          │
                                  Show Stage Clear
                                          │
                                  Level Up? → Show Level Up Modal
```

### `_s` — Session State Object

```javascript
_s = {
    stageIdx,        // 0-based index ของ Stage ใน stages array
    subLevelIdx,     // 0-based index ของ Sub-level
    stageId,         // 1-based Stage ID (1–5)
    questions,       // Array 5 คำถามที่สุ่มเลือกมาแล้ว
    shuffledOptions, // Array<{text, isCorrect}> หลัง Fisher-Yates
    currentQ,        // index คำถามปัจจุบัน (0–4)
    hp,              // ชีวิตที่เหลือ (เริ่ม 3)
    combo,           // จำนวนคำตอบถูกติดต่อกัน
    sessionXP,       // XP สะสมในด่านนี้
    sessionCoins,    // Coins สะสมในด่านนี้
    answered,        // flag: ตอบแล้วหรือยัง (ป้องกัน double-click)
    levelBefore,     // Level ก่อนเริ่มด่าน (เช็ค Level Up)
    shieldActive,    // จำนวน Shield ที่ active อยู่
    hintUsed,        // flag: ใช้ Hint แล้วหรือยังในคำถามนี้
}
```

---

## 8. ระบบ XP, Combo และ Coins

### กฎการรับรางวัล

| สถานการณ์ | XP | Coins |
|---|---|---|
| ตอบถูก (ปกติ) | +20 XP | +10 🪙 |
| ตอบถูกระหว่าง Combo ≥ 3 | +40 XP | +10 🪙 |
| ตอบผิด | 0 | 0 |

### Combo System

```
Combo Counter:
  ตอบถูก  → combo++
  ตอบผิด  → combo = 0

เงื่อนไข XP 2× (COMBO_THRESHOLD = 3):
  combo >= 3 → XP_COMBO = 40
  combo <  3 → XP_BASE  = 20
```

### ค่าคงที่ที่ปรับได้ (ใน `game.js`)

```javascript
const MAX_HP          = 3;   // ชีวิตสูงสุดต่อด่าน
const Q_PER_SESSION   = 5;   // จำนวนคำถามต่อ Sub-level
const XP_BASE         = 20;  // XP ปกติต่อคำตอบถูก
const XP_COMBO        = 40;  // XP เมื่อ Combo active
const COINS_CORRECT   = 10;  // เหรียญต่อคำตอบถูก
const COMBO_THRESHOLD = 3;   // ตอบถูกกี่ครั้งติดต่อกันถึงเริ่ม Combo
```

---

## 9. สูตรคำนวณเลเวลและยศ (Rank)

### สูตร XP ต่อเลเวล

XP ที่ต้องการในการขึ้นจาก Level N ไปยัง Level N+1:

$$\text{XP}_{required}(N) = N \times 100$$

**ตัวอย่าง:**

| เลเวล | XP ที่ต้องการ | XP สะสมรวม |
|---|---|---|
| 1 → 2 | 100 XP | 100 XP |
| 2 → 3 | 200 XP | 300 XP |
| 3 → 4 | 300 XP | 600 XP |
| 5 → 6 | 500 XP | 1,500 XP |
| 10 → 11 | 1,000 XP | 5,500 XP |

### ตารางยศ (Ranks)

| ยศ | เลเวล | ไอคอน |
|---|---|---|
| 🥉 Rookie | Lv 1–2 | เริ่มต้นการเดินทาง |
| 🌿 Explorer | Lv 3–5 | นักสำรวจ |
| ⚔️ Adventurer | Lv 6–9 | นักผจญภัย |
| 📚 Scholar | Lv 10–14 | นักวิชาการ |
| 👑 Master | Lv 15+ | ปรมาจารย์ |

---

## 10. ระบบ State Management

### สถาปัตยกรรมการจัดเก็บข้อมูล

```
┌─────────────────────────────────────────────────────────┐
│                     Application State                   │
│                                                         │
│  localStorage                 sessionStorage            │
│  ─────────────                ─────────────             │
│  wq_users (array)             wq_session                │
│  └─ [user1, user2, ...]       └─ { id, ts }             │
│     └─ id                                               │
│     └─ username                                         │
│     └─ password (hashed)                                │
│     └─ totalXP                In-Memory (game.js)       │
│     └─ coins                  ──────────────────        │
│     └─ stages [...]           _s (session state)        │
│                               └─ hp, combo, XP, etc.    │
│  wq_shields                                             │
│  └─ { userId: count }                                   │
└─────────────────────────────────────────────────────────┘
```

### Dirty-Check State Manager (app.js)

เพื่อป้องกัน Dashboard จาก DOM Thrashing ทุกครั้งที่ `refreshDashboard()` ถูกเรียก:

```javascript
// _uiCache เก็บค่าล่าสุดที่เขียนลง DOM
const _uiCache = Object.create(null);

function _setIfChanged(id, val) {
    const s = String(val);
    if (_uiCache[id] === s) return; // ค่าเดิม → ข้ามเลย ไม่แตะ DOM
    _uiCache[id] = s;
    document.getElementById(id).textContent = s;
}
```

**ผลลัพธ์:** เมื่อตอบคำถามถูกและ `refreshDashboard()` ถูกเรียก — มีเพียง `coins`, `totalXP`, และ stat chips เท่านั้นที่ "dirty" ส่วน username, avatar, rank, greeting จะถูก **ข้ามทั้งหมด**

### Stage Map Snapshot Guard

```javascript
let _lastStagesSnapshot = null;

function renderDashboard(user) {
    // ...
    const stagesKey = JSON.stringify(user.stages);
    if (stagesKey !== _lastStagesSnapshot) {
        _lastStagesSnapshot = stagesKey;
        renderStageMap(user); // rebuild เฉพาะเมื่อข้อมูล stage เปลี่ยน
    }
}
```

**ผลลัพธ์:** Stage Map จะ rebuild ก็ต่อเมื่อผู้เล่นผ่านด่านจริงๆ เท่านั้น ไม่ใช่ทุกครั้งที่รับเหรียญ

---

## 11. ร้านค้าไอเทม (Item Shop)

### ไอเทมที่มีจำหน่าย

| ไอเทม | ราคา | การทำงาน |
|---|---|---|
| 💡 Hint | 50 🪙 | ตัดตัวเลือกผิด 1 ข้อในคำถามปัจจุบัน (ใช้ได้ระหว่างเกมเท่านั้น) |
| 🛡️ Shield | 100 🪙 | ป้องกันการเสีย HP ครั้งถัดไป สะสมได้สูงสุด 3 อัน |

### กลไกการทำงานของ Hint

```javascript
// useHint() ใน game.js
// 1. ค้นหาปุ่มที่เป็นตัวเลือกผิด โดยอ้างอิงจาก _s.shuffledOptions
//    (ไม่ใช้ q.answer โดยตรง เพราะ index เปลี่ยนหลัง Fisher-Yates)
const wrong = _optionBtns.filter((btn, idx) => {
    return !_s.shuffledOptions[idx].isCorrect && !btn.disabled;
});
// 2. สุ่มเลือก 1 ตัวเลือกผิดแล้ว disable + fade ออก
```

### กลไกการทำงานของ Shield

```javascript
// เมื่อตอบผิดและมี Shield active:
if (_s.shieldActive > 0) {
    _s.shieldActive--;           // ใช้ Shield 1 อัน
    Shop.consumeShield();        // หัก inventory ใน localStorage
    // → HP ไม่ลด
}
```

---

## 12. Leaderboard

- อ่านผู้ใช้ทั้งหมดจาก `localStorage` (`wq_users`)
- เรียงตาม `totalXP` จากมากไปน้อย
- แสดง **Podium** สำหรับอันดับ 1–3 แบบมีขั้น
- แสดง **รายการ** สำหรับอันดับ 4 ขึ้นไป
- ใช้ `DocumentFragment` สำหรับทั้ง Podium และ List เพื่อลด reflow

---

## 13. ระบบคำถาม (Question Bank)

### โครงสร้างข้อมูล

```javascript
// questions.js
window.QUESTIONS = {
    [stageId: 1–5]: {
        [subLevelId: 1–5]: [
            {
                id:      "1-1-1",      // stageId-subLevelId-questionIdx
                theme:   "Alphabet & Vowels",
                q:       "Which letter is a vowel?",
                options: ["B", "C", "A", "D"],  // ตัวเลือก 4 ข้อ
                answer:  2,             // index ที่ถูกต้อง (0-based)
                hint:    "Vowels are: A, E, I, O, U",
            },
            // ... 4 ข้อเพิ่มเติม
        ]
    }
}
```

### แผนที่เนื้อหาคำถาม

| Stage | Sub-level 1 | Sub-level 2 | Sub-level 3 | Sub-level 4 | Sub-level 5 |
|---|---|---|---|---|---|
| 1 — The Basics | Alphabet & Vowels | Pronouns | Basic Verbs | Simple Sentences | Numbers & Colors |
| 2 — Word Builder | Synonyms & Antonyms | Occupations | Food & Nature | Prefixes & Suffixes | Compound Words |
| 3 — Grammar Gates | Subject-Verb Agreement | Verb Tenses | Articles | Prepositions | Question Formation |
| 4 — Read & Conquer | Simple Inference | Cause & Effect | Sequencing | Main Idea | Complex Comprehension |
| 5 — Master's Hall | Perfect Tenses | Passive Voice | Figurative Language | Advanced Punctuation | Complex Sentences |

### ระบบ Unlock ด่าน

```
Sub-level states:
  0 = ล็อค (Locked)
  1 = ปลดล็อค / กำลังเล่น (Current)
  2 = ผ่านแล้ว (Completed)

กฎการ Unlock:
  ผ่าน Sub-level N   → Sub-level N+1 ในด่านเดิม state: 0→1
  ผ่าน Sub-level 5   → Stage ถัดไปทั้งหมด unlocked: true
                        Sub-level 1 ของ Stage ใหม่ state: 0→1
```

---

## 14. การปรับแต่งและเพิ่มคำถามใหม่

### เพิ่มคำถามใน `questions.js`

ค้นหา Sub-level ที่ต้องการแล้วเพิ่ม object ลงใน array:

```javascript
// ตัวอย่าง: เพิ่มคำถามใน Stage 1, Sub-level 1
window.QUESTIONS[1][1].push({
    id:      "1-1-6",                        // รูปแบบ: "stageId-subLevelId-ลำดับ"
    theme:   "Alphabet & Vowels",            // หัวข้อของ Sub-level นี้
    q:       "How many vowels are in 'EDUCATION'?",
    options: ["4", "5", "6", "3"],           // ตัวเลือก 4 ข้อเสมอ
    answer:  1,                              // index ที่ถูก (0 = "4", 1 = "5", ...)
    hint:    "Count: E-U-A-I-O = 5 vowels", // คำอธิบายหลังตอบ
});
```

> **หมายเหตุ:** `Q_PER_SESSION = 5` หมายความว่าทุกครั้งที่เล่น ระบบจะสุ่มเลือก 5 ข้อจาก pool คำถามทั้งหมด ยิ่งมีคำถามมาก pool ยิ่งหลากหลาย

### ปรับค่าคงที่ของเกม

แก้ไขค่าเหล่านี้ที่ด้านบนของ `game.js`:

```javascript
const MAX_HP          = 3;  // เปลี่ยนเป็น 5 เพื่อเกมง่ายขึ้น
const Q_PER_SESSION   = 5;  // เปลี่ยนเป็น 10 เพื่อด่านยาวขึ้น
const XP_BASE         = 20; // XP ต่อคำตอบถูก
const XP_COMBO        = 40; // XP เมื่อ Combo active
const COINS_CORRECT   = 10; // เหรียญต่อคำตอบถูก
const COMBO_THRESHOLD = 3;  // เริ่ม Combo หลังตอบถูกกี่ครั้งติดต่อกัน
```

### เพิ่ม Stage ใหม่

1. เพิ่ม entry ใน `STAGE_DEFS` array ใน `auth.js`:
```javascript
{ id: 6, name: 'Legend Hall', icon: '⭐', desc: 'Expert Level', accentClass: 'indigo' }
```

2. เพิ่มชุดคำถาม `QUESTIONS[6]` ใน `questions.js`

3. เพิ่ม entry ใน `_defaultStages()` ใน `auth.js`:
```javascript
{ id: 6, unlocked: false, subLevels: [0, 0, 0, 0, 0] }
```

### เพิ่มไอเทมในร้านค้า

เพิ่ม object ลงใน `ITEMS` array ใน `shop.js`:

```javascript
{
    id: 'double-xp',
    name: 'Double XP',
    emoji: '⚡',
    desc: 'รับ XP 2x สำหรับด่านถัดไป',
    cost: 150,
    color: 'rgba(124,58,237,.16)',
    border: 'rgba(139,92,246,.38)',
    textColor: '#C4B5FD',
}
```

จากนั้นเพิ่ม logic การทำงานใน `case 'double-xp':` ใน `_buy()` function

---

## 15. เทคนิค Performance Optimization

### 1. Virtual DOM Button Pool (game.js)

**ปัญหา:** สร้าง DOM Node ใหม่ 4 ปุ่มทุกคำถาม × 5 คำถาม = 20 createElement ต่อด่าน  
**แก้ไข:** สร้างปุ่มครั้งเดียวต่อ session ด้วย `_buildOptionButtons()` แล้ว reuse โดยเขียนเฉพาะ `textContent`

```
ก่อน: createElement × 4 + appendChild × 8 + addEventListener × 4 = 16 ops/คำถาม
หลัง: textContent × 4 + className reset × 4 = 8 ops/คำถาม  (ลด 50%)
```

### 2. Single Event Delegation (app.js, game.js, shop.js)

**ปัญหา:** ผูก event listener บนแต่ละปุ่มโดยตรง → listener สะสมเพิ่มขึ้นเรื่อยๆ  
**แก้ไข:** ใช้ listener เดียวบน parent element ตรวจจาก `e.target.closest()`

```javascript
// หนึ่ง listener บน body ครอบคลุมทุก data-action
document.body.addEventListener('click', function(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    switch (el.dataset.action) { /* ... */ }
});
```

### 3. Dirty-Check State Manager (app.js)

**ปัญหา:** `refreshDashboard()` เขียน DOM ทุก field ทุกครั้ง แม้ค่าไม่เปลี่ยน  
**แก้ไข:** `_uiCache` เก็บค่าล่าสุด — `_setIfChanged()` ข้าม DOM write ถ้าค่าเดิม

### 4. Double-RAF Animation Restart (game.js)

**ปัญหา:** `void el.offsetWidth` บังคับ synchronous layout read ทุกครั้งที่ต้อง restart animation  
**แก้ไข:** `_restartAnim(el, cls)` ใช้ double-RAF แทน

```javascript
function _restartAnim(el, cls) {
    el.classList.remove(cls);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add(cls));
    });
}
```

### 5. RAF-Deferred localStorage Write (game.js)

**ปัญหา:** `Auth.updateUser()` เขียน localStorage ทันทีในขณะที่ stage-clear animation กำลังเริ่ม  
**แก้ไข:** เลื่อน I/O write ออกไป 1 frame

```javascript
// Animation เริ่ม paint ใน current frame
// localStorage write ตามมาใน next frame — ไม่ขัด transition
requestAnimationFrame(() => Auth.updateUser(user));
```

### 6. CSS Performance Hints (index.html)

```css
/* แจ้ง browser สร้าง GPU layer ล่วงหน้าสำหรับ float animation */
.float-reward {
    will-change: transform, opacity;
}

/* ป้องกัน layout reflow กระจายออกนอก quiz card */
#quiz-card {
    contain: layout style;
}
```

### 7. Stage Map DocumentFragment (app.js)

```javascript
function renderStageMap(user) {
    const frag = document.createDocumentFragment();
    user.stages.forEach(stage => {
        const card = document.createElement('div');
        // ... สร้าง card ทั้งหมดใน fragment ก่อน
        frag.appendChild(card);
    });
    container.innerHTML = ''; // clear ครั้งเดียว
    container.appendChild(frag); // flush ครั้งเดียว → 1 reflow เท่านั้น
}
```

---

## สรุปค่าคงที่ทั้งหมด (Quick Reference)

| ค่าคงที่ | ค่า | ไฟล์ | ความหมาย |
|---|---|---|---|
| `MAX_HP` | 3 | game.js | ชีวิตสูงสุดต่อด่าน |
| `Q_PER_SESSION` | 5 | game.js | คำถามต่อ Sub-level |
| `XP_BASE` | 20 | game.js | XP ต่อคำตอบถูก |
| `XP_COMBO` | 40 | game.js | XP ระหว่าง Combo |
| `COINS_CORRECT` | 10 | game.js | Coins ต่อคำตอบถูก |
| `COMBO_THRESHOLD` | 3 | game.js | ตอบถูกกี่ครั้งถึงเริ่ม Combo |
| `USERS_KEY` | `wq_users` | auth.js | localStorage key ของ users |
| `SESSION_KEY` | `wq_session` | auth.js | sessionStorage key |
| Hint Cost | 50 🪙 | shop.js | ราคา Hint |
| Shield Cost | 100 🪙 | shop.js | ราคา Shield |
| Max Shields | 3 | shop.js | Shield สูงสุดที่สะสมได้ |
| Total Questions | 125 | questions.js | 5×5×5 คำถาม |

---

*สร้างด้วย — Project v1.0 | Vanilla JS SPA | ไม่ใช้ Framework ใดๆ*
