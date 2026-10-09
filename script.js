(function () {
    function syncBody() {
        var dt = document.documentElement.getAttribute('data-theme');
        if (document.body && (dt === 'dark' || dt === 'light')) {
            document.body.classList.toggle('dark-mode', dt === 'dark');
        }
    }
    function syncTheme(theme) {
        if (theme !== 'dark' && theme !== 'light') return;
        document.documentElement.setAttribute('data-theme', theme);
        syncBody();
    }
    if (typeof MutationObserver === 'function') {
        new MutationObserver(syncBody).observe(document.documentElement, {
            attributes: true, attributeFilter: ['data-theme']
        });
    }
    if (typeof document.addEventListener === 'function') {
        document.addEventListener('DOMContentLoaded', syncBody);
    }
    try {
        var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
        if (mq) {
            var cur = document.documentElement.getAttribute('data-theme');
            if (!cur) {
                syncTheme(mq.matches ? 'dark' : 'light');
            } else {
                syncTheme(cur);
            }
            if (mq.addEventListener) {
                mq.addEventListener('change', function (e) {
                    syncTheme(e.matches ? 'dark' : 'light');
                });
            }
        }
    } catch (e) { }
    window.addEventListener('message', function (e) {
        if (e.data && (e.data.type === 'set-theme' || e.data.type === 'APPLY_THEME') && e.data.theme) {
            syncTheme(e.data.theme);
        }
    });
})();

// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand(); // Разворачивает Mini App на весь экран
}

// Game Configuration & State
const SECRET_WORD = "wherethelist".toLowerCase();
const WIN_MESSAGE = "Где твой какашкинский список?"; // Текст сообщения при победе
const SCARY_IMAGE = "https://i.pinimg.com/736x/51/d9/60/51d960a7b3bbf378b446e7a196731135.jpg"; // Ссылка на изображение
const MAX_LIVES = 6;

const state = {
    secretWord: SECRET_WORD,
    guessedLetters: new Set(),
    remainingLives: MAX_LIVES,
    gameStatus: "playing" // "playing" | "won" | "lost"
};

// Keyboard layout rows
const KEYBOARD_ROWS = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["z", "x", "c", "v", "b", "n", "m"]
];

// DOM Elements
const wordContainer = document.getElementById('wordContainer');
const livesText = document.getElementById('livesText');
const endOverlay = document.getElementById('endOverlay');
const endTitle = document.getElementById('endTitle');
const endWord = document.getElementById('endWord');
const playAgainBtn = document.getElementById('playAgainBtn');

// Initialize On-screen Keyboard
function initKeyboard() {
    KEYBOARD_ROWS.forEach((row, index) => {
        const rowContainer = document.getElementById(`row${index + 1}`);
        if (!rowContainer) return;
        rowContainer.innerHTML = '';

        row.forEach(letter => {
            const btn = document.createElement('button');
            btn.className = 'key-btn';
            btn.textContent = letter;
            btn.dataset.letter = letter;
            btn.id = `key-${letter}`;
            btn.addEventListener('click', () => handleGuess(letter));
            rowContainer.appendChild(btn);
        });
    });
}

// Handle a letter guess
function handleGuess(letter) {
    letter = letter.toLowerCase();
    if (state.gameStatus !== 'playing' || state.guessedLetters.has(letter)) {
        return;
    }

    state.guessedLetters.add(letter);

    if (!state.secretWord.includes(letter)) {
        state.remainingLives--;
    }

    checkGameStatus();
    updateUI();
}

// Check Win / Loss condition
function checkGameStatus() {
    if (state.remainingLives <= 0) {
        state.gameStatus = 'lost';

        // Отправка данных боту и закрытие окна игры при поражении
        if (tg) {
            tg.sendData(JSON.stringify({ status: "game_over", reason: "lost" }));
            setTimeout(() => {
                tg.close();
            }, 100);
        }
    } else {
        const allGuessed = state.secretWord.split('').every(char => state.guessedLetters.has(char));
        if (allGuessed) {
            state.gameStatus = 'won';
        }
    }
}

// Render / Update UI
function updateUI() {
    // Update Word Display
    if (wordContainer) {
        wordContainer.innerHTML = '';
        const wordChars = state.secretWord.split('');

        wordChars.forEach(char => {
            const slot = document.createElement('div');
            slot.className = 'letter-slot';

            if (state.guessedLetters.has(char)) {
                slot.textContent = char;
                slot.classList.add('revealed');
            } else if (state.gameStatus === 'lost') {
                slot.textContent = char;
                slot.classList.add('lost-reveal');
            } else {
                slot.textContent = '';
            }
            wordContainer.appendChild(slot);
        });
    }

    // Update Lives Badge
    if (livesText) {
        livesText.textContent = `${state.remainingLives} / ${MAX_LIVES} Lives`;
    }

    // Update Hangman Drawing
    const wrongCount = MAX_LIVES - state.remainingLives;
    for (let i = 1; i <= MAX_LIVES; i++) {
        const part = document.getElementById(`part-${i}`);
        if (part) {
            if (i <= wrongCount) {
                part.classList.add('visible');
            } else {
                part.classList.remove('visible');
            }
        }
    }

    // Update Keyboard buttons
    const allKeys = document.querySelectorAll('.key-btn');
    allKeys.forEach(btn => {
        const letter = btn.dataset.letter;
        if (state.guessedLetters.has(letter)) {
            btn.disabled = true;
            if (state.secretWord.includes(letter)) {
                btn.className = 'key-btn correct';
            } else {
                btn.className = 'key-btn wrong';
            }
        } else {
            btn.disabled = state.gameStatus !== 'playing';
            btn.className = 'key-btn';
        }
    });

    // Update Victory / Defeat Overlay
    if (endOverlay) {
        if (state.gameStatus === 'won') {
            if (endTitle) endTitle.textContent = ""; 
            if (endWord) endWord.textContent = WIN_MESSAGE; 
            endOverlay.classList.add('visible');
            
            // Устанавливаем ссылку на картинку в CSS-переменную и добавляем класс
            document.body.style.setProperty('--scary-bg-img', `url("${SCARY_IMAGE}")`);
            document.body.classList.add('scary-win-bg');
        } else if (state.gameStatus === 'lost') {
            if (endTitle) endTitle.textContent = ""; 
            if (endWord) endWord.textContent = "В этот раз у тебя не вышло"; 
            endOverlay.classList.add('visible');
            document.body.classList.remove('scary-win-bg');
        } else {
            endOverlay.classList.remove('visible');
            document.body.classList.remove('scary-win-bg');
        }
    }
}

// Reset Game
function resetGame() {
    state.guessedLetters.clear();
    state.remainingLives = MAX_LIVES;
    state.gameStatus = 'playing';
    document.body.classList.remove('scary-win-bg');
    updateUI();
}

// Physical Keyboard Listener
document.addEventListener('keydown', (e) => {
    if (state.gameStatus !== 'playing') return;
    const key = e.key.toLowerCase();
    if (/^[a-z]$/.test(key)) {
        handleGuess(key);
    }
});

// Play Again Button Listener
if (playAgainBtn) {
    playAgainBtn.addEventListener('click', resetGame);
}

// Initialize
initKeyboard();
updateUI();

// Theme & Iframe Resize Handling
const applyTheme = t => {
    document.documentElement.setAttribute('data-theme', t);
};
if (!document.documentElement.hasAttribute('data-theme') && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
}
window.addEventListener('message', e => {
    if (e.data?.type === 'set-theme' || e.data?.type === 'APPLY_THEME') {
        applyTheme(e.data.theme);
    }
});

(function autoResize() {
    function notifyHeight() {
        const c = document.querySelector('.widget-container') || document.body;
        if (!c) return;
        const h = Math.ceil(Math.max(c.getBoundingClientRect().bottom, c.scrollHeight));
        window.parent.postMessage({ type: 'widget-resize', height: h }, '*');
    }
    window.addEventListener('load', () => setTimeout(notifyHeight, 120));
    new ResizeObserver(() => notifyHeight()).observe(document.querySelector('.widget-container') || document.body);
})();

(function () {
    function f(r) {
        if (!r || r.type !== 'range') return;
        var mn = parseFloat(r.min || '0'), mx = parseFloat(r.max || '100'), v = parseFloat(r.value);
        if (isNaN(v)) v = (mn + mx) / 2;
        var p = mx > mn ? ((v - mn) / (mx - mn)) * 100 : 50;
        r.style.setProperty('--progress', p + '%');
        r.style.removeProperty('--slider-fill');
    }
    function all() {
        document.querySelectorAll('input[type="range"], .lumi-slider').forEach(f);
    }
    document.addEventListener('input', function (e) { f(e.target); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all);
    else all();
})();