/**
 * questions.js — Question Bank for WordQuest
 * ============================================
 * Nested structure: QUESTIONS[stageId][subLevelId] = Array of 5 questions
 *
 * Stages & Game Modes:
 *   1 — The Basics       → mode: "multiple-choice"   (4-choice MCQ)
 *   2 — Word Builder     → mode: "type-in-blank"     (พิมพ์คำตอบที่หายไป)
 *   3 — Grammar Gates    → mode: "sentence-scramble" (เรียงคำให้ถูกต้อง)
 *   4 — Read & Conquer   → mode: "true-false"        (ถูก/ผิด รวดเร็ว)
 *   5 — Master's Hall    → mode: "image-word-match"  (จับคู่ hint กับคำศัพท์)
 *
 * Common fields (all modes):
 *   id      → unique string  "stageId-subLevelId-questionIdx"
 *   theme   → short label for the sub-level topic
 *   hint    → explanation shown after answering
 *
 * mode-specific fields:
 *   multiple-choice   → q, options[4], answer (index 0-3)
 *   type-in-blank     → blank (sentence with ___), answer (correct string), acceptAlt[] (optional)
 *   sentence-scramble → words[] (shuffled), sentence (correct joined string)
 *   true-false        → statement, answer (true | false)
 *   image-word-match  → imageHint (emoji/description), q, options[4], answer (index 0-3)
 */

/**
 * STAGE_MODES — กำหนด game mode ของแต่ละ stage (1–5)
 * ใช้โดย game.js ผ่าน renderGameMode() เพื่อเลือก UI layout ที่เหมาะสม
 */
window.STAGE_MODES = {
    1: 'multiple-choice',    // Stage 1: Classic Quiz — 4 ตัวเลือก
    2: 'type-in-blank',      // Stage 2: Type-in-the-Blank — พิมพ์คำที่หายไป
    3: 'sentence-scramble',  // Stage 3: Sentence Scramble — เรียงคำให้ถูกลำดับ
    4: 'true-false',         // Stage 4: True/False Blitz — ตัดสินใจเร็ว
    5: 'image-word-match',   // Stage 5: Image-to-Word Match — จับคู่ hint กับคำ
};

window.QUESTIONS = {

    /* ════════════════════════════════════════════════════════════
       STAGE 1 — The Basics  (Classic Quiz — Multiple Choice)
       Mode: multiple-choice
       Difficulty: Beginner → Foundational literacy
    ════════════════════════════════════════════════════════════ */
    1: {

        /* ── Sub-level 1 · Theme: Alphabet & Vowels ─────────── */
        1: [
            {
                id: '1-1-1',
                theme: 'Alphabet & Vowels',
                q: 'Which word starts with a vowel?',
                options: ['cat', 'bag', 'ant', 'dog'],
                answer: 2,
                hint: 'Vowels are A, E, I, O, U. "ant" starts with the vowel A.',
            },
            {
                id: '1-1-2',
                theme: 'Alphabet & Vowels',
                q: 'How many letters are in the English alphabet?',
                options: ['24', '25', '26', '27'],
                answer: 2,
                hint: 'The English alphabet runs from A to Z — 26 letters in total.',
            },
            {
                id: '1-1-3',
                theme: 'Alphabet & Vowels',
                q: 'Which of these is a vowel?',
                options: ['b', 'c', 'e', 'g'],
                answer: 2,
                hint: 'The five vowels are A, E, I, O, U. "e" is a vowel.',
            },
            {
                id: '1-1-4',
                theme: 'Alphabet & Vowels',
                q: 'Which word rhymes with "cat"?',
                options: ['dog', 'sat', 'pen', 'run'],
                answer: 1,
                hint: '"sat" and "cat" both end in the -at sound.',
            },
            {
                id: '1-1-5',
                theme: 'Alphabet & Vowels',
                q: 'Which is the correct spelling for a place to live?',
                options: ['hous', 'house', 'howse', 'hause'],
                answer: 1,
                hint: 'The correct spelling is H-O-U-S-E.',
            },
        ],

        /* ── Sub-level 2 · Theme: Pronouns ─────────────────── */
        2: [
            {
                id: '1-2-1',
                theme: 'Pronouns',
                q: 'Which pronoun refers to a female person?',
                options: ['he', 'it', 'they', 'she'],
                answer: 3,
                hint: '"She" is the singular female pronoun. "He" is male, "it" is for things, and "they" is plural.',
            },
            {
                id: '1-2-2',
                theme: 'Pronouns',
                q: 'Fill in the blank: "___ am very hungry."',
                options: ['He', 'She', 'I', 'They'],
                answer: 2,
                hint: '"I" is the first-person singular subject pronoun used for yourself.',
            },
            {
                id: '1-2-3',
                theme: 'Pronouns',
                q: 'Which pronoun is used for a group of people?',
                options: ['he', 'she', 'it', 'they'],
                answer: 3,
                hint: '"They" is the third-person plural pronoun used for groups.',
            },
            {
                id: '1-2-4',
                theme: 'Pronouns',
                q: 'Fill in the blank: "The dog wagged ___ tail."',
                options: ['his', 'her', 'its', 'our'],
                answer: 2,
                hint: '"Its" is the possessive pronoun for animals and things (no apostrophe).',
            },
            {
                id: '1-2-5',
                theme: 'Pronouns',
                q: 'Which of these is a SUBJECT pronoun?',
                options: ['me', 'him', 'her', 'we'],
                answer: 3,
                hint: 'Subject pronouns go before the verb: I, you, he, she, it, we, they. "We" is the only subject pronoun here.',
            },
        ],

        /* ── Sub-level 3 · Theme: Basic Verbs ──────────────── */
        3: [
            {
                id: '1-3-1',
                theme: 'Basic Verbs',
                q: 'Which word is a verb (action word)?',
                options: ['big', 'happy', 'jump', 'red'],
                answer: 2,
                hint: 'Verbs express actions or states. "Jump" is an action, while the others are adjectives.',
            },
            {
                id: '1-3-2',
                theme: 'Basic Verbs',
                q: 'Fill in the blank: "Birds ___ in the sky."',
                options: ['jumps', 'runs', 'fly', 'eats'],
                answer: 2,
                hint: '"Birds" is plural, so the verb has no -s. "Fly" is the correct present simple form.',
            },
            {
                id: '1-3-3',
                theme: 'Basic Verbs',
                q: 'What is the verb in: "The dog chases the cat."?',
                options: ['dog', 'chases', 'the', 'cat'],
                answer: 1,
                hint: 'Verbs show the action. "Chases" is what the dog is doing.',
            },
            {
                id: '1-3-4',
                theme: 'Basic Verbs',
                q: 'Which of these is NOT a verb?',
                options: ['eat', 'sleep', 'apple', 'run'],
                answer: 2,
                hint: '"Apple" is a noun (a thing). Eat, sleep, and run are all action words.',
            },
            {
                id: '1-3-5',
                theme: 'Basic Verbs',
                q: 'Fill in the blank: "She ___ her hands before eating."',
                options: ['wash', 'washing', 'washes', 'washed'],
                answer: 2,
                hint: 'For he/she/it in present simple, add -s or -es. "She washes" is correct.',
            },
        ],

        /* ── Sub-level 4 · Theme: Simple Sentences ──────────── */
        4: [
            {
                id: '1-4-1',
                theme: 'Simple Sentences',
                q: 'Which of these is a complete sentence?',
                options: ['Runs fast.', 'The dog.', 'The dog runs fast.', 'Fast running dog.'],
                answer: 2,
                hint: 'A complete sentence needs a subject (the dog) AND a verb (runs). "The dog runs fast." has both.',
            },
            {
                id: '1-4-2',
                theme: 'Simple Sentences',
                q: 'What is the SUBJECT in: "Mary drinks milk."?',
                options: ['drinks', 'milk', 'Mary', 'drinks milk'],
                answer: 2,
                hint: 'The subject is WHO or WHAT does the action. Mary is the one drinking.',
            },
            {
                id: '1-4-3',
                theme: 'Simple Sentences',
                q: 'Which word order is correct in English?',
                options: ['Like I cats.', 'Cats I like.', 'I like cats.', 'Like cats I.'],
                answer: 2,
                hint: 'Basic English sentence order is Subject → Verb → Object. "I (S) like (V) cats (O)."',
            },
            {
                id: '1-4-4',
                theme: 'Simple Sentences',
                q: 'Choose the CORRECT sentence.',
                options: ['I has a pen.', 'I haves a pen.', 'I have a pen.', 'Me have a pen.'],
                answer: 2,
                hint: '"Have" is used with I, you, we, they. "I have a pen." is correct.',
            },
            {
                id: '1-4-5',
                theme: 'Simple Sentences',
                q: 'What is the OBJECT in: "Tom reads a book."?',
                options: ['Tom', 'reads', 'a book', 'Tom reads'],
                answer: 2,
                hint: 'The object receives the action. Tom reads WHAT? — a book.',
            },
        ],

        /* ── Sub-level 5 · Theme: Numbers & Colors ──────────── */
        5: [
            {
                id: '1-5-1',
                theme: 'Numbers & Colors',
                q: 'How do you spell the number 4?',
                options: ['for', 'fore', 'four', 'fower'],
                answer: 2,
                hint: 'The number 4 is spelled F-O-U-R. "For" and "fore" are different words.',
            },
            {
                id: '1-5-2',
                theme: 'Numbers & Colors',
                q: 'What color do you get by mixing blue and yellow?',
                options: ['red', 'purple', 'orange', 'green'],
                answer: 3,
                hint: 'Blue + yellow = green. This is one of the secondary colors.',
            },
            {
                id: '1-5-3',
                theme: 'Numbers & Colors',
                q: 'How many sides does a triangle have?',
                options: ['2', '3', '4', '5'],
                answer: 1,
                hint: 'A triangle (tri = three) always has exactly 3 sides.',
            },
            {
                id: '1-5-4',
                theme: 'Numbers & Colors',
                q: 'Which number comes after nineteen?',
                options: ['eighteen', 'eleven', 'twenty', 'thirty'],
                answer: 2,
                hint: 'The sequence is: seventeen, eighteen, nineteen, twenty.',
            },
            {
                id: '1-5-5',
                theme: 'Numbers & Colors',
                q: 'What color is a ripe banana?',
                options: ['red', 'green', 'blue', 'yellow'],
                answer: 3,
                hint: 'A fully ripe banana turns yellow. Unripe bananas are green.',
            },
        ],
    },

    /* ════════════════════════════════════════════════════════════
       STAGE 2 — Word Builder  (Type-in-the-Blank)
       Mode: type-in-blank
       แต่ละข้อจะมีประโยคที่ขาดคำ ผู้เล่นต้องพิมพ์คำตอบที่ถูกต้อง
       Fields: blank (ประโยคที่มี ___), answer (คำตอบที่ถูกต้อง),
               acceptAlt[] (คำตอบสำรองที่ยอมรับได้)
    ════════════════════════════════════════════════════════════ */
    2: {

        /* ── Sub-level 1 · Theme: Synonyms & Antonyms ──────── */
        1: [
            {
                id: '2-1-1',
                theme: 'Synonyms & Antonyms',
                blank: 'The opposite of "happy" is ___.',
                answer: 'sad',
                acceptAlt: [],
                hint: '"Sad" is the antonym (opposite) of "happy".',
            },
            {
                id: '2-1-2',
                theme: 'Synonyms & Antonyms',
                blank: 'Another word for "very big" is ___.',
                answer: 'huge',
                acceptAlt: ['large', 'giant'],
                hint: '"Huge" means extremely large — it is a synonym for very big.',
            },
            {
                id: '2-1-3',
                theme: 'Synonyms & Antonyms',
                blank: 'A synonym of "fast" is ___.',
                answer: 'quick',
                acceptAlt: ['swift', 'rapid', 'speedy'],
                hint: '"Quick" and "fast" both mean moving with speed.',
            },
            {
                id: '2-1-4',
                theme: 'Synonyms & Antonyms',
                blank: 'The opposite of "day" is ___.',
                answer: 'night',
                acceptAlt: [],
                hint: '"Night" is the antonym of "day".',
            },
            {
                id: '2-1-5',
                theme: 'Synonyms & Antonyms',
                blank: 'A word that means "very small" is ___.',
                answer: 'tiny',
                acceptAlt: ['mini', 'little'],
                hint: '"Tiny" means extremely small in size.',
            },
        ],

        /* ── Sub-level 2 · Theme: Occupations ──────────────── */
        2: [
            {
                id: '2-2-1',
                theme: 'Occupations',
                blank: 'A person who writes books is called an ___.',
                answer: 'author',
                acceptAlt: ['writer'],
                hint: 'An "author" creates written works such as novels and stories.',
            },
            {
                id: '2-2-2',
                theme: 'Occupations',
                blank: 'The person who cooks in a restaurant is called a ___.',
                answer: 'chef',
                acceptAlt: ['cook'],
                hint: 'A "chef" is a professional cook, especially in a restaurant.',
            },
            {
                id: '2-2-3',
                theme: 'Occupations',
                blank: 'A person who teaches students is called a ___.',
                answer: 'teacher',
                acceptAlt: ['tutor', 'instructor'],
                hint: 'Teachers educate students, usually in a school or university.',
            },
            {
                id: '2-2-4',
                theme: 'Occupations',
                blank: 'A person who defends people in court is called a ___.',
                answer: 'lawyer',
                acceptAlt: ['attorney'],
                hint: 'A "lawyer" provides legal advice and represents clients in court.',
            },
            {
                id: '2-2-5',
                theme: 'Occupations',
                blank: 'A person who flies an aeroplane is called a ___.',
                answer: 'pilot',
                acceptAlt: [],
                hint: 'A "pilot" is trained to operate an aircraft.',
            },
        ],

        /* ── Sub-level 3 · Theme: Food & Nature ─────────────── */
        3: [
            {
                id: '2-3-1',
                theme: 'Food & Nature',
                blank: 'A baby cat is called a ___.',
                answer: 'kitten',
                acceptAlt: [],
                hint: 'A kitten is a young cat. Puppies are baby dogs, cubs are baby bears.',
            },
            {
                id: '2-3-2',
                theme: 'Food & Nature',
                blank: 'Cheese is a dairy product made from ___.',
                answer: 'milk',
                acceptAlt: [],
                hint: 'Cheese is a dairy product produced from milk.',
            },
            {
                id: '2-3-3',
                theme: 'Food & Nature',
                blank: 'A large ocean animal that breathes air and is a mammal: ___.',
                answer: 'whale',
                acceptAlt: ['dolphin'],
                hint: 'Mammals breathe air and feed their young with milk. Whales are mammals.',
            },
            {
                id: '2-3-4',
                theme: 'Food & Nature',
                blank: 'A sweet tropical fruit that is yellow when ripe: ___.',
                answer: 'mango',
                acceptAlt: ['banana'],
                hint: 'Mango is a sweet tropical fruit. A ripe banana is also yellow.',
            },
            {
                id: '2-3-5',
                theme: 'Food & Nature',
                blank: 'Apples grow on a ___.',
                answer: 'tree',
                acceptAlt: ['apple tree'],
                hint: 'Apples grow on apple trees. Carrots and potatoes grow underground.',
            },
        ],

        /* ── Sub-level 4 · Theme: Prefixes & Suffixes ──────── */
        4: [
            {
                id: '2-4-1',
                theme: 'Prefixes & Suffixes',
                blank: 'Add "un-" to "happy" to make a word meaning NOT happy: ___.',
                answer: 'unhappy',
                acceptAlt: [],
                hint: '"Un-" reverses the meaning: unhappy = not happy.',
            },
            {
                id: '2-4-2',
                theme: 'Prefixes & Suffixes',
                blank: 'Add "-ness" to "sad" to make a noun: ___.',
                answer: 'sadness',
                acceptAlt: [],
                hint: '"-ness" turns adjectives into nouns: sad → sadness.',
            },
            {
                id: '2-4-3',
                theme: 'Prefixes & Suffixes',
                blank: 'The prefix "re-" in "rewrite" means to write ___.',
                answer: 'again',
                acceptAlt: ['once more'],
                hint: '"Re-" = again: rewrite means to write again.',
            },
            {
                id: '2-4-4',
                theme: 'Prefixes & Suffixes',
                blank: 'Adding "-er" to "teach" gives us ___.',
                answer: 'teacher',
                acceptAlt: [],
                hint: '"-er" creates a person who does something: teach → teacher.',
            },
            {
                id: '2-4-5',
                theme: 'Prefixes & Suffixes',
                blank: 'The prefix "pre-" in "preview" means ___.',
                answer: 'before',
                acceptAlt: ['prior', 'earlier'],
                hint: '"Pre-" means before: preview = view before, preheat = heat before.',
            },
        ],

        /* ── Sub-level 5 · Theme: Compound Words ────────────── */
        5: [
            {
                id: '2-5-1',
                theme: 'Compound Words',
                blank: '"Sun" + "shine" = ___.',
                answer: 'sunshine',
                acceptAlt: [],
                hint: '"Sunshine" = sun + shine. It means the light and warmth from the sun.',
            },
            {
                id: '2-5-2',
                theme: 'Compound Words',
                blank: '"Book" + "shelf" = ___.',
                answer: 'bookshelf',
                acceptAlt: [],
                hint: '"Bookshelf" = book + shelf. A piece of furniture for storing books.',
            },
            {
                id: '2-5-3',
                theme: 'Compound Words',
                blank: '"Rain" + "bow" = ___.',
                answer: 'rainbow',
                acceptAlt: [],
                hint: '"Rainbow" = rain + bow. A rainbow appears in the sky after rain.',
            },
            {
                id: '2-5-4',
                theme: 'Compound Words',
                blank: 'The compound word meaning "a room where you sleep" is ___.',
                answer: 'bedroom',
                acceptAlt: [],
                hint: '"Bedroom" = bed + room.',
            },
            {
                id: '2-5-5',
                theme: 'Compound Words',
                blank: '"Foot" + "ball" = ___.',
                answer: 'football',
                acceptAlt: ['soccer'],
                hint: '"Football" = foot + ball. A sport played with a round ball.',
            },
        ],
    },

    /* ════════════════════════════════════════════════════════════
       STAGE 3 — Grammar Gates  (Sentence Scramble)
       Mode: sentence-scramble
       แต่ละข้อมี words[] ที่ถูกสับเปลี่ยนแล้ว ผู้เล่นต้องคลิกเรียงให้ถูกลำดับ
       Fields: words[] (คำที่สุ่มลำดับ), sentence (ประโยคที่ถูกต้อง),
               q (คำอธิบาย/ธีม), hint
    ════════════════════════════════════════════════════════════ */
    3: {

        /* ── Sub-level 1 · Theme: Subject-Verb Agreement ────── */
        1: [
            {
                id: '3-1-1',
                theme: 'Subject-Verb Agreement',
                q: 'Arrange the words to form a correct sentence.',
                words: ['She', 'goes', 'to', 'school', 'every', 'day'],
                sentence: 'She goes to school every day',
                hint: 'Third-person singular (she/he/it) uses "goes" in the present simple.',
            },
            {
                id: '3-1-2',
                theme: 'Subject-Verb Agreement',
                q: 'Arrange the words to form a correct sentence.',
                words: ['They', 'are', 'eating', 'lunch', 'right', 'now'],
                sentence: 'They are eating lunch right now',
                hint: '"They" is plural so it takes "are" in the present continuous.',
            },
            {
                id: '3-1-3',
                theme: 'Subject-Verb Agreement',
                q: 'Arrange the words to form a correct sentence.',
                words: ['He', 'does', 'not', 'like', 'spicy', 'food'],
                sentence: 'He does not like spicy food',
                hint: 'With he/she/it in negatives, use "doesn\'t / does not".',
            },
            {
                id: '3-1-4',
                theme: 'Subject-Verb Agreement',
                q: 'Arrange the words to form a correct sentence.',
                words: ['The', 'boys', 'play', 'football', 'together'],
                sentence: 'The boys play football together',
                hint: '"Boys" is plural, so the verb has no -s.',
            },
            {
                id: '3-1-5',
                theme: 'Subject-Verb Agreement',
                q: 'Arrange the words to form a correct sentence.',
                words: ['My', 'sister', 'listens', 'to', 'music', 'every', 'evening'],
                sentence: 'My sister listens to music every evening',
                hint: '"Sister" = she → third-person singular → add -s: "listens".',
            },
        ],

        /* ── Sub-level 2 · Theme: Verb Tenses ──────────────── */
        2: [
            {
                id: '3-2-1',
                theme: 'Verb Tenses',
                q: 'Arrange the words to form a correct sentence.',
                words: ['She', 'ate', 'dinner', 'at', 'seven', "o'clock"],
                sentence: "She ate dinner at seven o'clock",
                hint: '"Ate" is the simple past of "eat".',
            },
            {
                id: '3-2-2',
                theme: 'Verb Tenses',
                q: 'Arrange the words to form a correct sentence.',
                words: ['She', 'will', 'go', 'to', 'the', 'party', 'tomorrow'],
                sentence: 'She will go to the party tomorrow',
                hint: 'Future simple uses "will + base verb".',
            },
            {
                id: '3-2-3',
                theme: 'Verb Tenses',
                q: 'Arrange the words to form a correct sentence.',
                words: ['He', 'is', 'running', 'in', 'the', 'park'],
                sentence: 'He is running in the park',
                hint: 'Present continuous: is/am/are + verb-ing.',
            },
            {
                id: '3-2-4',
                theme: 'Verb Tenses',
                q: 'Arrange the words to form a correct sentence.',
                words: ['He', 'walked', 'to', 'school', 'yesterday'],
                sentence: 'He walked to school yesterday',
                hint: '"Walked" is the past simple form with -ed.',
            },
            {
                id: '3-2-5',
                theme: 'Verb Tenses',
                q: 'Arrange the words to form a correct sentence.',
                words: ['She', 'wrote', 'a', 'letter', 'to', 'her', 'friend'],
                sentence: 'She wrote a letter to her friend',
                hint: '"Wrote" is the simple past of "write".',
            },
        ],

        /* ── Sub-level 3 · Theme: Articles ─────────────────── */
        3: [
            {
                id: '3-3-1',
                theme: 'Articles',
                q: 'Arrange the words to form a correct sentence.',
                words: ['An', 'apple', 'a', 'day', 'keeps', 'the', 'doctor', 'away'],
                sentence: 'An apple a day keeps the doctor away',
                hint: 'Use "an" before words starting with a vowel sound.',
            },
            {
                id: '3-3-2',
                theme: 'Articles',
                q: 'Arrange the words to form a correct sentence.',
                words: ['I', 'saw', 'an', 'elephant', 'at', 'the', 'zoo'],
                sentence: 'I saw an elephant at the zoo',
                hint: '"Elephant" starts with a vowel sound, so use "an".',
            },
            {
                id: '3-3-3',
                theme: 'Articles',
                q: 'Arrange the words to form a correct sentence.',
                words: ['She', 'is', 'a', 'very', 'good', 'teacher'],
                sentence: 'She is a very good teacher',
                hint: 'Use "a" before consonant sounds: "teacher" starts with /t/.',
            },
            {
                id: '3-3-4',
                theme: 'Articles',
                q: 'Arrange the words to form a correct sentence.',
                words: ['The', 'sun', 'rises', 'in', 'the', 'east'],
                sentence: 'The sun rises in the east',
                hint: 'Use "the" for unique nouns — there is only one sun.',
            },
            {
                id: '3-3-5',
                theme: 'Articles',
                q: 'Arrange the words to form a correct sentence.',
                words: ['I', 'want', 'a', 'biscuit', 'please'],
                sentence: 'I want a biscuit please',
                hint: 'Use "a" for any single unspecified item starting with a consonant.',
            },
        ],

        /* ── Sub-level 4 · Theme: Prepositions ─────────────── */
        4: [
            {
                id: '3-4-1',
                theme: 'Prepositions',
                q: 'Arrange the words to form a correct sentence.',
                words: ['The', 'book', 'is', 'on', 'the', 'table'],
                sentence: 'The book is on the table',
                hint: '"On" expresses a surface position.',
            },
            {
                id: '3-4-2',
                theme: 'Prepositions',
                q: 'Arrange the words to form a correct sentence.',
                words: ['She', 'was', 'born', 'in', '1998'],
                sentence: 'She was born in 1998',
                hint: 'Use "in" with years, months, and seasons.',
            },
            {
                id: '3-4-3',
                theme: 'Prepositions',
                q: 'Arrange the words to form a correct sentence.',
                words: ['He', 'lives', 'in', 'London', 'with', 'his', 'family'],
                sentence: 'He lives in London with his family',
                hint: 'Use "in" with cities and countries.',
            },
            {
                id: '3-4-4',
                theme: 'Prepositions',
                q: 'Arrange the words to form a correct sentence.',
                words: ['The', 'meeting', 'starts', 'at', 'nine', 'am'],
                sentence: 'The meeting starts at nine am',
                hint: 'Use "at" with specific times.',
            },
            {
                id: '3-4-5',
                theme: 'Prepositions',
                q: 'Arrange the words to form a correct sentence.',
                words: ['The', 'cat', 'is', 'hiding', 'under', 'the', 'sofa'],
                sentence: 'The cat is hiding under the sofa',
                hint: '"Under" means below or beneath.',
            },
        ],

        /* ── Sub-level 5 · Theme: Question Formation ────────── */
        5: [
            {
                id: '3-5-1',
                theme: 'Question Formation',
                q: 'Arrange the words to form a correct question.',
                words: ['Is', 'she', 'a', 'doctor', '?'],
                sentence: 'Is she a doctor ?',
                hint: 'For "to be" questions, swap subject and verb.',
            },
            {
                id: '3-5-2',
                theme: 'Question Formation',
                q: 'Arrange the words to form a correct question.',
                words: ['Where', 'does', 'he', 'live', '?'],
                sentence: 'Where does he live ?',
                hint: 'Wh- questions: Where + does + subject + base verb?',
            },
            {
                id: '3-5-3',
                theme: 'Question Formation',
                q: 'Arrange the words to form a correct question.',
                words: ['Why', 'are', 'you', 'late', 'today', '?'],
                sentence: 'Why are you late today ?',
                hint: '"Why" asks for a reason or explanation.',
            },
            {
                id: '3-5-4',
                theme: 'Question Formation',
                q: 'Arrange the words to form a correct question.',
                words: ['She', 'sings', 'well', ',', "doesn't", 'she', '?'],
                sentence: "She sings well , doesn't she ?",
                hint: 'Present simple positive → negative tag: "doesn\'t she?"',
            },
            {
                id: '3-5-5',
                theme: 'Question Formation',
                q: 'Arrange the words to form a correct question.',
                words: ['When', 'does', 'the', 'train', 'leave', '?'],
                sentence: 'When does the train leave ?',
                hint: '"When" asks about time.',
            },
        ],
    },

    /* ════════════════════════════════════════════════════════════
       STAGE 4 — Read & Conquer  (True/False Blitz)
       Mode: true-false
       แต่ละข้อมีประโยคที่ต้องตัดสินว่าถูกหรือผิด ภายในเวลาจำกัด
       Fields: statement (ประโยคที่ให้ตัดสิน), answer (true | false), hint
    ════════════════════════════════════════════════════════════ */
    4: {

        /* ── Sub-level 1 · Theme: Simple Inference ──────────── */
        1: [
            {
                id: '4-1-1',
                theme: 'Simple Inference',
                statement: '"The cat sat on the mat." — The cat is on the mat.',
                answer: true,
                hint: 'The sentence directly states "sat on the mat".',
            },
            {
                id: '4-1-2',
                theme: 'Simple Inference',
                statement: 'Tom is 10. His sister is 3 years older. Therefore his sister is 12.',
                answer: false,
                hint: '10 + 3 = 13, not 12.',
            },
            {
                id: '4-1-3',
                theme: 'Simple Inference',
                statement: '"It was raining, so Mary took her umbrella." Mary took her umbrella because it was raining.',
                answer: true,
                hint: 'The word "so" signals the result: raining → she took an umbrella.',
            },
            {
                id: '4-1-4',
                theme: 'Simple Inference',
                statement: 'A shop open 9 am–6 pm is open for 8 hours.',
                answer: false,
                hint: '6 pm minus 9 am = 9 hours, not 8.',
            },
            {
                id: '4-1-5',
                theme: 'Simple Inference',
                statement: '"Ben trains every Monday and Wednesday." Ben trains 3 times a week.',
                answer: false,
                hint: 'Monday + Wednesday = 2 days per week, not 3.',
            },
        ],

        /* ── Sub-level 2 · Theme: Cause & Effect ────────────── */
        2: [
            {
                id: '4-2-1',
                theme: 'Cause & Effect',
                statement: '"Therefore" is a word that typically signals cause and effect.',
                answer: true,
                hint: '"Therefore" introduces a result or consequence.',
            },
            {
                id: '4-2-2',
                theme: 'Cause & Effect',
                statement: '"It was dark, so she turned on the light." The word "so" here shows a contrast.',
                answer: false,
                hint: '"So" here means "as a result", not contrast.',
            },
            {
                id: '4-2-3',
                theme: 'Cause & Effect',
                statement: '"Because it rained heavily, the match was cancelled." The rain caused the cancellation.',
                answer: true,
                hint: '"Because" introduces the cause/reason.',
            },
            {
                id: '4-2-4',
                theme: 'Cause & Effect',
                statement: '"She likes blue and green." This sentence shows a cause-and-effect relationship.',
                answer: false,
                hint: 'This sentence just lists preferences — no cause or effect is shown.',
            },
            {
                id: '4-2-5',
                theme: 'Cause & Effect',
                statement: '"The river flooded due to heavy rain." Heavy rain is the cause of the flood.',
                answer: true,
                hint: '"Due to" introduces the cause.',
            },
        ],

        /* ── Sub-level 3 · Theme: Sequencing ───────────────── */
        3: [
            {
                id: '4-3-1',
                theme: 'Sequencing',
                statement: 'The word "firstly" indicates the first step in a sequence.',
                answer: true,
                hint: '"Firstly" signals the beginning of an ordered sequence.',
            },
            {
                id: '4-3-2',
                theme: 'Sequencing',
                statement: '"Finally" is used to introduce the middle step in a sequence.',
                answer: false,
                hint: '"Finally" marks the LAST action in a series.',
            },
            {
                id: '4-3-3',
                theme: 'Sequencing',
                statement: '"After finishing lunch, she washed the dishes." She washed the dishes before eating.',
                answer: false,
                hint: '"After finishing lunch" means she ate first, THEN washed the dishes.',
            },
            {
                id: '4-3-4',
                theme: 'Sequencing',
                statement: '"Then" is commonly used to show the next step in a time sequence.',
                answer: true,
                hint: '"Then" connects sequential steps: First…, Then…, Finally…',
            },
            {
                id: '4-3-5',
                theme: 'Sequencing',
                statement: 'The correct ordering is: "First → Finally → Next".',
                answer: false,
                hint: 'The correct order is: First → Next → Finally.',
            },
        ],

        /* ── Sub-level 4 · Theme: Main Idea ─────────────────── */
        4: [
            {
                id: '4-4-1',
                theme: 'Main Idea',
                statement: '"Tom loves cooking. He tries new recipes every weekend. He owns five cookbooks." The main idea is that Tom is a professional chef.',
                answer: false,
                hint: 'The main idea is Tom\'s passion for cooking, not that he is a professional chef.',
            },
            {
                id: '4-4-2',
                theme: 'Main Idea',
                statement: '"Bees make honey. They live in hives. They help flowers grow." The best summary is that bees are important and useful insects.',
                answer: true,
                hint: 'All three facts highlight the usefulness of bees.',
            },
            {
                id: '4-4-3',
                theme: 'Main Idea',
                statement: '"Alex exercises daily, eats vegetables, and sleeps 8 hours." The main idea is that Alex has a healthy lifestyle.',
                answer: true,
                hint: 'Exercise, diet, and sleep are all markers of a healthy lifestyle.',
            },
            {
                id: '4-4-4',
                theme: 'Main Idea',
                statement: '"The pyramids were built 4,000 years ago and were tombs for pharaohs." This text is mainly about modern buildings.',
                answer: false,
                hint: 'The text is about ancient Egyptian pyramids, not modern buildings.',
            },
            {
                id: '4-4-5',
                theme: 'Main Idea',
                statement: '"Recycling saves energy, reduces waste, and helps the environment." This text is mainly about the benefits of recycling.',
                answer: true,
                hint: 'Each sentence lists a benefit of recycling — that is the central message.',
            },
        ],

        /* ── Sub-level 5 · Theme: Complex Comprehension ─────── */
        5: [
            {
                id: '4-5-1',
                theme: 'Complex Comprehension',
                statement: '"Only animals like penguins survive in the Antarctic." This implies that many types of animals live there.',
                answer: false,
                hint: '"Only" strongly implies very limited life — not many types of animals.',
            },
            {
                id: '4-5-2',
                theme: 'Complex Comprehension',
                statement: '"Sam was so nervous he forgot everything in the exam." Nervousness most likely caused his poor result.',
                answer: true,
                hint: '"So nervous he forgot everything" directly tells us anxiety caused the poor result.',
            },
            {
                id: '4-5-3',
                theme: 'Complex Comprehension',
                statement: '"The novel was gripping from start to finish." "Gripping" here means physically tight.',
                answer: false,
                hint: 'In this context, "gripping" means totally captivating or exciting.',
            },
            {
                id: '4-5-4',
                theme: 'Complex Comprehension',
                statement: '"Although she was exhausted, she continued working." The word "although" introduces a contrast.',
                answer: true,
                hint: '"Although" shows contrast: exhausted, yet she still worked.',
            },
            {
                id: '4-5-5',
                theme: 'Complex Comprehension',
                statement: '"A city described as a concrete jungle" is an example of a simile.',
                answer: false,
                hint: 'This is a metaphor — it says the city IS a jungle directly, without "like" or "as".',
            },
        ],
    },

    /* ════════════════════════════════════════════════════════════
       STAGE 5 — Master's Hall  (Image-to-Word Match)
       Mode: image-word-match
       แต่ละข้อมี imageHint (emoji หรือคำอธิบายภาพ) ผู้เล่นต้องเลือกคำที่ตรงกัน
       Fields: imageHint (emoji/description), q (คำถาม),
               options[4], answer (index 0-3), hint
    ════════════════════════════════════════════════════════════ */
    5: {

        /* ── Sub-level 1 · Theme: Perfect Tenses ────────────── */
        1: [
            {
                id: '5-1-1',
                theme: 'Perfect Tenses',
                imageHint: '⏳ A timeline showing an action that started in the past and continues to NOW',
                q: 'Which tense describes an action that started in the past and continues to now?',
                options: ['Simple Past', 'Present Perfect', 'Future Simple', 'Past Continuous'],
                answer: 1,
                hint: 'Present perfect (have/has + past participle) links past actions to the present.',
            },
            {
                id: '5-1-2',
                theme: 'Perfect Tenses',
                imageHint: '📅 Two past events — one happening BEFORE the other',
                q: 'Which tense shows an action completed BEFORE another past action?',
                options: ['Present Perfect', 'Simple Past', 'Past Perfect', 'Past Continuous'],
                answer: 2,
                hint: 'Past perfect (had + past participle) shows something finished before another past event.',
            },
            {
                id: '5-1-3',
                theme: 'Perfect Tenses',
                imageHint: '🎯 "She ___ already eaten when we called."',
                q: 'Choose the correct auxiliary verb to complete the sentence.',
                options: ['has', 'have', 'had', 'was'],
                answer: 2,
                hint: 'Past perfect uses "had" for all subjects.',
            },
            {
                id: '5-1-4',
                theme: 'Perfect Tenses',
                imageHint: '👯 Two friends standing together — caption: "friends since childhood"',
                q: '"They ___ been friends since childhood." — Correct auxiliary?',
                options: ['was', 'had', 'have', 'are'],
                answer: 2,
                hint: 'Present perfect with "since": have/has + been.',
            },
            {
                id: '5-1-5',
                theme: 'Perfect Tenses',
                imageHint: '🕐 Person waiting — caption: "over an hour"',
                q: '"She has ___ waiting for over an hour." — Correct word?',
                options: ['be', 'being', 'been', 'was'],
                answer: 2,
                hint: '"Has been" is the present perfect continuous. "Been" is the past participle of "be".',
            },
        ],

        /* ── Sub-level 2 · Theme: Passive Voice ─────────────── */
        2: [
            {
                id: '5-2-1',
                theme: 'Passive Voice',
                imageHint: '🪟 A broken window — the window did not break itself',
                q: 'Which sentence is in the PASSIVE voice?',
                options: [
                    'The dog chased the cat.',
                    'She wrote the letter.',
                    'The window was broken by the ball.',
                    'He is eating lunch.',
                ],
                answer: 2,
                hint: 'Passive voice: the subject receives the action. "The window was broken."',
            },
            {
                id: '5-2-2',
                theme: 'Passive Voice',
                imageHint: '📖 An old book with "1984" on the cover',
                q: '"The book ___ written in 1984." — Correct auxiliary?',
                options: ['is', 'has', 'was', 'were'],
                answer: 2,
                hint: 'Past passive uses "was" (singular). "The book was written" is correct.',
            },
            {
                id: '5-2-3',
                theme: 'Passive Voice',
                imageHint: '🏫 Teacher in front of a class explaining a lesson',
                q: 'Change to PASSIVE: "The teacher explains the lesson."',
                options: [
                    'The lesson explains the teacher.',
                    'The lesson is explaining the teacher.',
                    'The lesson is explained by the teacher.',
                    'The lesson has explained by the teacher.',
                ],
                answer: 2,
                hint: 'Present passive: is/are + past participle.',
            },
            {
                id: '5-2-4',
                theme: 'Passive Voice',
                imageHint: '🌍 A globe with speech bubbles in many languages',
                q: '"English ___ spoken all over the world." — Correct form?',
                options: ['speaks', 'spoke', 'is spoke', 'is spoken'],
                answer: 3,
                hint: 'Present passive: is + past participle. "Is spoken" is correct.',
            },
            {
                id: '5-2-5',
                theme: 'Passive Voice',
                imageHint: '🏆 A trophy with "Project Completed" engraved on it',
                q: '"The project was ___ by the team." — Correct participle?',
                options: ['complete', 'completes', 'completing', 'completed'],
                answer: 3,
                hint: 'Passive voice = was/were + past participle. "Completed" is the past participle.',
            },
        ],

        /* ── Sub-level 3 · Theme: Figurative Language ────────── */
        3: [
            {
                id: '5-3-1',
                theme: 'Figurative Language',
                imageHint: '💨 A runner racing beside the wind — "He ran like the wind"',
                q: 'What figure of speech is used in: "He ran like the wind"?',
                options: ['Metaphor', 'Simile', 'Personification', 'Hyperbole'],
                answer: 1,
                hint: 'A simile compares using "like" or "as". "Like the wind" is a simile.',
            },
            {
                id: '5-3-2',
                theme: 'Figurative Language',
                imageHint: '⛈️ Storm cloud with a face looking angry',
                q: '"The thunder roared angrily." — This is an example of?',
                options: ['Simile', 'Metaphor', 'Personification', 'Alliteration'],
                answer: 2,
                hint: 'Personification gives human qualities to non-human things.',
            },
            {
                id: '5-3-3',
                theme: 'Figurative Language',
                imageHint: '👀 Two shining stars drawn inside a pair of eyes',
                q: '"Her eyes were stars." — This is an example of?',
                options: ['Simile', 'Metaphor', 'Personification', 'Hyperbole'],
                answer: 1,
                hint: 'A metaphor says one thing IS another directly, without "like" or "as".',
            },
            {
                id: '5-3-4',
                theme: 'Figurative Language',
                imageHint: '🍽️ A mountain made entirely of food on a plate',
                q: '"He ate a mountain of food." — What figure of speech is this?',
                options: ['Personification', 'Alliteration', 'Simile', 'Hyperbole'],
                answer: 3,
                hint: 'Hyperbole is an extreme exaggeration for effect.',
            },
            {
                id: '5-3-5',
                theme: 'Figurative Language',
                imageHint: '🐝 Three bees, all starting with the letter B — "buzzed busily"',
                q: '"The bees buzzed busily." — What sound device is used?',
                options: ['Rhyme', 'Assonance', 'Alliteration', 'Personification'],
                answer: 2,
                hint: 'Alliteration: repeating the same consonant sound at the start of nearby words.',
            },
        ],

        /* ── Sub-level 4 · Theme: Advanced Punctuation ────────── */
        4: [
            {
                id: '5-4-1',
                theme: 'Advanced Punctuation',
                imageHint: '📝 A sentence with a sunlit morning — "It\'s a nice day"',
                q: 'Which sentence is correctly punctuated?',
                options: [
                    "its a nice day",
                    "Its a nice day",
                    "It's a nice day",
                    "its' a nice day",
                ],
                answer: 2,
                hint: '"It\'s" is a contraction of "it is". The apostrophe replaces the missing "i".',
            },
            {
                id: '5-4-2',
                theme: 'Advanced Punctuation',
                imageHint: '🌙 Person walking after dinner — introductory phrase with comma',
                q: 'Which sentence uses a COMMA correctly?',
                options: [
                    'After dinner we went for, a walk.',
                    'After dinner, we went for a walk.',
                    'After, dinner we went for a walk.',
                    'After dinner we, went for a walk.',
                ],
                answer: 1,
                hint: 'A comma is used after an introductory phrase.',
            },
            {
                id: '5-4-3',
                theme: 'Advanced Punctuation',
                imageHint: '🎒 A bag with items listed — tent, sleeping bag, food',
                q: 'Which sentence uses a COLON correctly?',
                options: [
                    'She brought: everything a tent and food.',
                    'She: brought everything a tent and food.',
                    'She brought everything: a tent, a sleeping bag, and food.',
                    'She brought everything a tent, a sleeping bag: and food.',
                ],
                answer: 2,
                hint: 'A colon introduces a list or explanation after a complete clause.',
            },
            {
                id: '5-4-4',
                theme: 'Advanced Punctuation',
                imageHint: '📚 Many school books belonging to multiple boys',
                q: '"The boys books were left on the desk." — Where should the apostrophe go?',
                options: [
                    "The boy's books",
                    "The boys' books",
                    "The boys books'",
                    "The boy's book's",
                ],
                answer: 1,
                hint: '"Boys" is plural → possessive plural adds apostrophe AFTER the s: boys\'.',
            },
            {
                id: '5-4-5',
                theme: 'Advanced Punctuation',
                imageHint: '📖 Two complete sentences joined by a semicolon',
                q: 'Which sentence uses a SEMICOLON correctly?',
                options: [
                    'I love reading; it relaxes my mind.',
                    'I love; reading it relaxes my mind.',
                    'I love reading it; relaxes my mind.',
                    'I; love reading it relaxes my mind.',
                ],
                answer: 0,
                hint: 'A semicolon joins two related independent clauses.',
            },
        ],

        /* ── Sub-level 5 · Theme: Complex Sentences & Connectives */
        5: [
            {
                id: '5-5-1',
                theme: 'Complex Sentences & Connectives',
                imageHint: '⚡ Two lightning bolts — one labelled "brilliant", one labelled "lacks confidence"',
                q: '"He is brilliant; ___, he lacks confidence." — Best connective?',
                options: ['moreover', 'in addition', 'however', 'similarly'],
                answer: 2,
                hint: '"However" shows the contrast: brilliant (positive) vs. lacks confidence (negative).',
            },
            {
                id: '5-5-2',
                theme: 'Complex Sentences & Connectives',
                imageHint: '🔀 Two arrows pointing in opposite directions — contrast',
                q: 'Which connecting word shows CONTRAST?',
                options: ['therefore', 'moreover', 'however', 'furthermore'],
                answer: 2,
                hint: '"However" introduces a contrasting or opposing idea.',
            },
            {
                id: '5-5-3',
                theme: 'Complex Sentences & Connectives',
                imageHint: '🎓 Student studying hard then receiving an exam result',
                q: '"She passed the exam ___ she studied very hard." — Shows CAUSE?',
                options: ['so', 'but', 'because', 'although'],
                answer: 2,
                hint: '"Because" introduces the reason/cause.',
            },
            {
                id: '5-5-4',
                theme: 'Complex Sentences & Connectives',
                imageHint: '🔧 A mechanic fixing a car — relative clause: "who fixed my car"',
                q: 'Which sentence contains a RELATIVE CLAUSE?',
                options: [
                    'She is very talented.',
                    'He runs every morning.',
                    'The man who fixed my car is very skilled.',
                    'They arrived late yesterday.',
                ],
                answer: 2,
                hint: 'A relative clause begins with who, which, or that.',
            },
            {
                id: '5-5-5',
                theme: 'Complex Sentences & Connectives',
                imageHint: '🌧️ Person walking in rain despite it — "Despite the rain"',
                q: '"Despite the rain, ___ went for a walk." — Best continuation?',
                options: ['but they', 'however they', 'they still', 'yet they'],
                answer: 2,
                hint: '"They still" is the most natural continuation after "Despite the rain,".',
            },
        ],
    },
};
