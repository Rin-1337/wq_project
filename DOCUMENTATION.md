# WordQuest — เอกสารประกอบระบบ

---

## ระบบจัดการหลังบ้าน (Admin Panel)

### ภาพรวม

Admin Panel คือส่วนจัดการข้อมูลทั้งหมดของแพลตฟอร์ม WordQuest เข้าถึงได้ผ่าน `admin.html` โดยต้องล็อกอินด้วย Credential ของ Admin ก่อนทุกครั้ง ระบบนี้ถูกออกแบบมาให้รองรับโครงสร้าง Multi-Mode Quiz (5 Stage × 5 Sub-level × 5 โหมดเกม) ที่อัปเดตใหม่

---

### 1. การตรวจสอบสิทธิ์ (Authentication)

- ใช้ Credential แบบ hardcode (`admin` / `admin`) สำหรับ demo เท่านั้น
- รหัสผ่านถูก hash ด้วย djb2 + salt ก่อนเปรียบเทียบ (ไม่เก็บ plaintext)
- Session ถูกเก็บใน `localStorage` และมีอายุ **8 ชั่วโมง** หลังจากนั้นจะถูก logout อัตโนมัติ
- Token สร้างด้วย `crypto.getRandomValues()` ทุกครั้งที่ login

---

### 2. ตารางผู้ใช้ (User Table) — อัปเดตใหม่

ตารางแสดงผล 8 คอลัมน์ดังนี้:

| คอลัมน์ | รายละเอียด |
|---|---|
| # | ลำดับที่ |
| ผู้ใช้ | Avatar, Username, Email |
| Level | Level ที่คำนวณจาก totalXP |
| Total XP | XP สะสมทั้งหมด |
| Coins / Shields | Coins ที่มี + จำนวน Shields ใน inventory |
| **Stage Progress** *(ใหม่)* | Mini progress bar ของทั้ง 5 Stage พร้อม Mode Badge |
| สมัครเมื่อ | วันที่ลงทะเบียน |
| Actions | ปุ่มจัดการ |

#### Stage Progress Column

- แสดง progress bar ขนาดเล็ก 5 แถว (1 แถวต่อ Stage)
- แต่ละแถวมี **Mode Badge** แสดงโหมดของ Stage นั้น:
  - 🎯 MCQ — Stage 1 (Multiple Choice)
  - ⌨️ Typing — Stage 2 (Type-in-Blank)
  - 🔀 Scramble — Stage 3 (Sentence Scramble)
  - ⚡ T/F — Stage 4 (True/False Blitz)
  - 🖼️ Image — Stage 5 (Image-to-Word Match)
- แสดงตัวเลข `x/5` (sub-levels ที่ complete แล้ว) หรือ 🔒 ถ้า Stage นั้นยังล็อกอยู่
- **Current Mode Badge** ที่ด้านบนของคอลัมน์แสดง Mode ที่ผู้ใช้กำลังเล่นอยู่ขณะนี้ หรือ ✅ Done ถ้าผ่านทั้งหมดแล้ว

#### ประสิทธิภาพ (Performance)

ตารางใช้ **DocumentFragment** ในการ render ทุกแถวพร้อมกันก่อนแล้วค่อย insert เข้า DOM ครั้งเดียว ทำให้ไม่มี reflow ระหว่างการสร้างแถว เหมาะสำหรับผู้ใช้จำนวนมากโดยไม่มี lag

---

### 3. ปุ่มจัดการผู้ใช้ (Action Buttons) — อัปเดตใหม่

| ปุ่ม | สี | ฟังก์ชัน |
|---|---|---|
| Level | ม่วง | เปิด modal ตั้งค่า Level ใหม่ (XP จะถูกคำนวณอัตโนมัติ) |
| **Stage** *(ใหม่)* | ฟ้า | เปิด Stage Manager modal |
| **Grant** *(ใหม่)* | เขียว | เปิด Grant Items modal |
| Reset | ส้ม | รีเซ็ต XP/Coins/Level กลับเป็น 0 (เก็บ Stage progress) |
| 🗑️ Delete | แดง | ลบผู้ใช้ออกจากระบบ รวมถึง Shields ใน inventory |

---

### 4. Stage Manager Modal *(ใหม่)*

เปิดด้วยปุ่ม **Stage** ในตาราง ให้ Admin จัดการ Stage progress ของผู้ใช้แต่ละคนได้โดยตรง:

- **Toggle Unlock/Lock Stage** — คลิกปุ่ม Unlocked/Locked หน้า Stage เพื่อสลับสถานะ
  - Stage 1 ไม่สามารถ Lock ได้ (ต้องมี entry point เสมอ)
- **Cycle Sub-level State** — คลิกปุ่ม Sub-level แต่ละช่องเพื่อสลับสถานะวนซ้ำ:
  - 🔒 Locked (0) → 🔓 Unlocked/Available (1) → ✅ Completed (2) → 🔒
- การเปลี่ยนแปลงบันทึกลง `localStorage` ทันทีทุกครั้งที่คลิก
- กด **บันทึกและปิด** เพื่อ refresh ตารางหลัก

---

### 5. Grant Items Modal *(ใหม่)*

เปิดด้วยปุ่ม **Grant** ในตาราง ใช้มอบ Shields ให้ผู้ใช้โดยตรงโดยไม่ต้องให้ผู้ใช้ซื้อจาก Shop:

- แสดงจำนวน Shields ที่ผู้ใช้มีอยู่ปัจจุบัน
- Admin กรอกจำนวนที่ต้องการมอบ (1–10 ต่อครั้ง)
- บันทึกลงใน `wq_shields` map ใน localStorage โดยตรง (`{ [userId]: count }`)
- จำนวน Shields สูงสุดต่อ user อยู่ที่ 99

---

### 6. Statistics View — อัปเดตใหม่

แสดงสถิติภาพรวมทั้งหมดโดยอ่านข้อมูลสดจาก localStorage ทุกครั้งที่เปิด view:

#### Stat Cards (4 การ์ด)
- 👥 **ผู้ใช้ทั้งหมด** — จำนวน accounts ที่ลงทะเบียน
- ⭐ **XP รวม** — XP สะสมทั้งแพลตฟอร์ม
- 🪙 **Coins รวม** — Coins ทั้งหมดที่ผู้ใช้มี
- 🛡️ **Shields รวม** *(ใหม่)* — Shields ทั้งหมดในระบบ

#### Stage Completion Distribution Chart *(ใหม่)*
- Bar chart แสดงจำนวน sub-level completions แยกตาม Stage 1–5
- แต่ละ bar แสดง Mode Badge ของ Stage นั้นพร้อมสี

#### Top 5 XP Leaderboard
- แสดงผู้ใช้ 5 อันดับแรกที่มี XP มากที่สุด พร้อม Level และ bar chart

---

### 7. Content Preview — อัปเดตใหม่ (Multi-Mode Aware)

แสดงคำถามจาก `questions.js` โดย render layout ตาม **Mode ของแต่ละ Stage**:

| Mode | Schema ที่แสดง |
|---|---|
| Multiple Choice (S1) | ตัวเลือก A–D, highlight ตัวเลือกที่ถูกต้อง |
| Type-in-Blank (S2) | ประโยคที่มีช่องว่าง + badge คำตอบหลัก + คำตอบสำรอง |
| Sentence Scramble (S3) | Word bank ทั้งหมด + ประโยคที่ถูกต้อง |
| True/False (S4) | Statement + badge ✅ TRUE หรือ ❌ FALSE |
| Image-to-Word Match (S5) | Image hint + ตัวเลือก A–D |

- **Mode Banner** แสดงสีและไอคอนของ Mode ที่เลือกอยู่

---

### 8. Danger Zone — อัปเดตใหม่

| ปุ่ม | ผลลัพธ์ |
|---|---|
| Factory Reset | ลบ localStorage ทุกอย่าง (users, progress, shields, sessions) |
| **Reset Stage Progress Only** *(ใหม่)* | รีเซ็ต Stage progress ของผู้ใช้ทุกคน **โดยเก็บ XP และ Coins ไว้** |
| Logout All Admin Sessions | ลบ admin session — admin ทุกคนถูก logout |
| Export User Data | ดาวน์โหลด JSON (ซ่อน password hash, รวม shield count) |

---

### 9. โครงสร้าง localStorage ที่ Admin Panel ใช้

```
wq_users        — Array ของ user objects ทั้งหมด
wq_admin_session — { token, username, ts } ของ admin session
wq_shields       — { [userId]: count } สำหรับ Shield inventory
```

#### โครงสร้าง `user.stages`
```json
[
  { "id": 1, "unlocked": true,  "subLevels": [2, 2, 1, 0, 0] },
  { "id": 2, "unlocked": true,  "subLevels": [2, 0, 0, 0, 0] },
  { "id": 3, "unlocked": false, "subLevels": [0, 0, 0, 0, 0] },
  { "id": 4, "unlocked": false, "subLevels": [0, 0, 0, 0, 0] },
  { "id": 5, "unlocked": false, "subLevels": [0, 0, 0, 0, 0] }
]
```
`subLevels[i]`: `0` = ล็อก, `1` = ปลดล็อก/ยังไม่ผ่าน, `2` = ผ่านแล้ว

---

### 10. ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | บทบาท |
|---|---|
| `admin.html` | UI หน้า Admin Panel (Login + Dashboard) |
| `admin.js` | Logic ทั้งหมดของ Admin Panel |
| `questions.js` | Question bank สำหรับ Content Preview |
| `auth.js` | โครงสร้าง user data และ `_defaultStages()` |
| `shop.js` | `wq_shields` key ที่ใช้ร่วมกับ Grant Items |

---

## Post-Game Content & Feature Update (เพิ่มเติม)

---

### 11. Infinite Survival Mode (โหมดไม่สิ้นสุด)

#### เงื่อนไขการปลดล็อก
- ปุ่ม **"Start Survival"** จะปรากฏใน Dashboard ส่วน **♾️ Infinite Survival**
- ปุ่มจะ **active** (คลิกได้) ก็ต่อเมื่อ `user.stages` ทั้ง 5 Stage มี `subLevels` ทุกช่องเป็น `2` (completed) เท่านั้น
- ก่อนปลดล็อก ปุ่มจะแสดง 🔒 Locked และถูก disabled

#### Logic การทำงาน
1. **`_buildSurvivalPool()`** — รวบรวมคำถามจาก `window.QUESTIONS` ทุก Stage และทุก Sub-level แล้ว annotate `.mode` ลงในแต่ละข้อ จากนั้น Fisher-Yates shuffle
2. **`startSurvival()`** — สร้าง `_s` session object ที่มี `isSurvival: true` และ `survivalCount: 0` แล้วเปิด quiz overlay ตามปกติ
3. **Mode switching** — `_renderQuestion()` ตรวจ `_s.isSurvival` และอัปเดต `_s.mode = question._mode` ก่อน render ทุกข้อ เพื่อให้คำถามแต่ละข้อ render ในรูปแบบที่ถูกต้อง
4. **Pool exhaustion** — เมื่อ `currentQ >= questions.length` ระบบจะ re-shuffle แล้ว reset `currentQ = 0` เล่นต่อไปไม่มีที่สิ้นสุด
5. **จบเกม** — เมื่อ HP = 0, `_survivalEnd()` จะ:
   - บันทึก XP และ Coins ที่ได้รับลงใน user object
   - อัปเดต `user.survivalHighScore = Math.max(prev, count)`
   - เรียก `Auth.updateUser(user)` และ `App.refreshDashboard(user)`
   - แสดง `survival-result-overlay` พร้อมผลลัพธ์

#### localStorage ที่เกี่ยวข้อง
- `user.survivalHighScore` — เก็บอยู่ใน user object ภายใน `wq_users`

---

### 12. Achievement System (ระบบ Achievement)

#### Achievement ที่มีทั้งหมด (3 รายการ)

| Achievement | Trigger | เก็บใน |
|---|---|---|
| 🎯 **Perfect Streak** | `_s.combo >= 10` ขณะตอบถูก | `wq_achievements[userId].perfectStreak` |
| 💰 **Coin Hoarder** | `user.coins >= 1000` หลังบันทึก progress | `wq_achievements[userId].coinHoarder` |
| 👑 **English Master** | stage ทุก Stage มี `subLevels = [2,2,2,2,2]` หลัง clear | `wq_achievements[userId].englishMaster` |

#### การทำงานของ `_tryUnlockAchievement(id)`
1. อ่าน `wq_achievements[userId]` จาก localStorage
2. ถ้า `id` ยังไม่ถูก set เป็น `true` → บันทึก + แสดง toast
3. Achievement ที่ได้รับแล้วจะไม่แสดง toast ซ้ำ (idempotent)

#### Toast Notification
- ใช้ CSS class `.achievement-toast` — แตกต่างจาก toast ปกติ ด้วยสีน้ำตาลทองและมีเวลาแสดง 5 วินาที
- แสดงไอคอน 🏅 หัวข้อ "New Achievement Unlocked!" และชื่อ Achievement

#### Format ข้อมูลใน localStorage
```json
{
  "userId_abc123": {
    "perfectStreak": true,
    "coinHoarder": true,
    "englishMaster": false
  }
}
```

---

### 13. Sound Manager (ระบบเสียง)

#### URLs ที่ใช้ (Pixabay CDN — royalty-free)
| เสียง | URL | เวลาที่เล่น |
|---|---|---|
| Correct | `audio_c8c8a7351d.mp3` | ตอบถูกทุกข้อ |
| Wrong | `audio_22678685ba.mp3` | ตอบผิด / HP หมด |
| Victory | `audio_0625c15396.mp3` | ผ่าน Stage สำเร็จ |

#### การทำงาน (Lazy-load + Clone strategy)
1. **Lazy-load** — `Audio` object ถูกสร้างครั้งแรกเมื่อเสียงนั้นถูกเรียกเล่น ไม่โหลดล่วงหน้า
2. **Clone** — ในแต่ละครั้งที่เล่น ใช้ `audioEl.cloneNode()` เพื่อให้เสียงซ้อนกันได้ (เช่น คอมโบหลายข้อ)
3. **Autoplay Policy** — `.play()` ห่อด้วย `.catch(() => {})` เพื่อป้องกัน console error เมื่อ browser บล็อก autoplay
4. **Toggle** — `SoundManager.toggle()` สลับ `_on` flag และบันทึกลง `wq_sound` key ใน localStorage
5. **UI Sync** — `_updateSoundBtn(on)` ใน `app.js` อัปเดตไอคอน (🔊/🔇) และ tooltip ของปุ่มใน navbar

#### การบันทึกค่า
- `localStorage.setItem('wq_sound', 'on' | 'off')`
- อ่านค่าตอน SoundManager เริ่มต้น: `_on = (localStorage.getItem('wq_sound') !== 'off')`
- Default = **เปิดเสียง** (กรณีที่ยังไม่เคยตั้งค่า)

---

### 14. Certificate of Completion (ใบรับรอง)

#### Trigger Condition
- หลัง `closeStageClear()` ถูกเรียกขณะที่ `_s.stageIdx === 4` และ `_s.subLevelIdx === 4` (Stage 5 Sub-level 5)
- ระบบจะ `setTimeout(_showCertificate, 350)` เพื่อให้ Animation ต่างๆ เสร็จสิ้นก่อน

#### ข้อมูลที่แสดงใน Certificate
| Element | ที่มา |
|---|---|
| ชื่อผู้เล่น (`cert-username`) | `user.username` |
| Rank (`cert-rank`) | `Auth.getRank(lvData.level).icon + name` |
| Level (`cert-level`) | `Auth.calculateLevel(user.totalXP).level` |
| วันที่ (`cert-date`) | `new Date().toLocaleDateString('en-GB', {...})` |

#### CSS Design
- `.certificate-card` — dark gradient background (navy) + gold border glow
- `.cert-outer-border` — inner decorative border + corner ornaments
- `.cert-gold-text` — gradient text สีทอง
- `.cert-stamp` — rotating dashed circle + counter-rotating inner stamp

---

### 15. Admin Panel Updates (เพิ่มจาก Feature ใหม่)

#### ตาราง User Management (9 คอลัมน์)
คอลัมน์ที่ 7 (ใหม่): **"Survival / Awards"**
- แถวบน: ♾️ สถิติ Best run (จาก `user.survivalHighScore`) หรือ `—` ถ้ายังไม่เคยเล่น
- แถวล่าง: Achievement badge emojis (🎯 💰 👑) ที่ปลดล็อกแล้ว หรือ "No achievements"

#### Statistics View (เพิ่มเติม)
| Stat Card | ID Element | ข้อมูล |
|---|---|---|
| 🏆 Achievements | `stat-total-achievements` | จำนวน achievement ทั้งหมดที่ปลดล็อกในระบบ |
| ♾️ Survival | `stat-survival-players` | จำนวน user ที่เล่น Survival อย่างน้อย 1 ครั้ง |
| Survival Best | `stat-survival-top` | High score สูงสุดในระบบ |

#### localStorage Key ใหม่ที่ Admin อ่าน
- `wq_achievements` — ผ่าน `_loadAllAchievements()` ใน admin.js
