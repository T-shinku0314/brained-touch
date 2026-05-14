const isTextMode = m => m === 'japanese' || m === 'challenge';

// ── キーボード定義 ──────────────────────────────────────────

const FINGER = {
  q:'lpinky', a:'lpinky', z:'lpinky',
  w:'lring',  s:'lring',  x:'lring',
  e:'lmiddle',d:'lmiddle',c:'lmiddle',
  r:'lindex', f:'lindex', v:'lindex',
  t:'lindex', g:'lindex', b:'lindex',
  y:'rindex', h:'rindex', n:'rindex',
  u:'rindex', j:'rindex', m:'rindex',
  i:'rmiddle',k:'rmiddle',',':'rmiddle',
  o:'rring',  l:'rring',  '.':'rring',
  p:'rpinky', ';':'rpinky','/':'rpinky',
  ' ':'thumb',
};

// 明るい背景色のキーは文字を黒にする
const DARK_TEXT_FINGERS = new Set(['lmiddle','lindex','rindex','rpinky']);

const KB_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l',';'],
  ['z','x','c','v','b','n','m',',','.','/'],
];

const LEGEND_ITEMS = [
  { id:'lpinky',  label:'左小指'     },
  { id:'lring',   label:'左薬指'     },
  { id:'lmiddle', label:'左中指'     },
  { id:'lindex',  label:'左人差し指' },
  { id:'rindex',  label:'右人差し指' },
  { id:'rmiddle', label:'右中指'     },
  { id:'rring',   label:'右薬指'     },
  { id:'rpinky',  label:'右小指'     },
];

// ── ひらがな → ローマ字変換 ───────────────────────────────

const HIRA_MAP = {
  // 拗音（2文字組み合わせ、先にチェック）
  'きゃ':'kya','きゅ':'kyu','きょ':'kyo',
  'しゃ':'sya','しゅ':'syu','しょ':'syo',
  'ちゃ':'tya','ちゅ':'tyu','ちょ':'tyo',
  'にゃ':'nya','にゅ':'nyu','にょ':'nyo',
  'ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo',
  'みゃ':'mya','みゅ':'myu','みょ':'myo',
  'りゃ':'rya','りゅ':'ryu','りょ':'ryo',
  'ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo',
  'じゃ':'zya','じゅ':'zyu','じょ':'zyo',
  'びゃ':'bya','びゅ':'byu','びょ':'byo',
  'ぴゃ':'pya','ぴゅ':'pyu','ぴょ':'pyo',
  // あ行
  'あ':'a','い':'i','う':'u','え':'e','お':'o',
  // か行
  'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
  // さ行
  'さ':'sa','し':'si','す':'su','せ':'se','そ':'so',
  // た行
  'た':'ta','ち':'ti','つ':'tu','て':'te','と':'to',
  // な行
  'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
  // は行
  'は':'ha','ひ':'hi','ふ':'hu','へ':'he','ほ':'ho',
  // ま行
  'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo',
  // や行
  'や':'ya','ゆ':'yu','よ':'yo',
  // ら行
  'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
  // わ行・ん
  'わ':'wa','を':'wo',
  // 濁音
  'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
  'ざ':'za','じ':'zi','ず':'zu','ぜ':'ze','ぞ':'zo',
  'だ':'da','ぢ':'di','づ':'du','で':'de','ど':'do',
  'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
  // 半濁音
  'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po',
};

const VOWEL_SET = new Set(['a','i','u','e','o']);

// ひらがな文字列をローマ字グループ配列に変換
// 戻り値: [{ kana, romaji }, ...]
function hiraToGroups(text) {
  const groups = [];
  let i = 0;
  while (i < text.length) {
    const ch   = text[i];
    const next = text[i + 1] || '';

    // 拗音（2文字）
    if (next && HIRA_MAP[ch + next]) {
      groups.push({ kana: ch + next, romaji: HIRA_MAP[ch + next] });
      i += 2; continue;
    }

    // っ → 次の子音を1文字追加
    if (ch === 'っ') {
      const nr = HIRA_MAP[next] || '';
      groups.push({ kana: ch, romaji: nr[0] || 'x' });
      i++; continue;
    }

    // ん → 次が母音 or n の場合は nn
    if (ch === 'ん') {
      const nr = HIRA_MAP[next] || '';
      const useNN = !nr || VOWEL_SET.has(nr[0]) || nr[0] === 'n';
      groups.push({ kana: ch, romaji: useNN ? 'nn' : 'n' });
      i++; continue;
    }

    // スペース
    if (ch === ' ' || ch === '　') {
      groups.push({ kana: ' ', romaji: ' ' });
      i++; continue;
    }

    // 通常文字
    const roma = HIRA_MAP[ch];
    if (roma) groups.push({ kana: ch, romaji: roma });
    i++;
  }
  return groups;
}

// ── 統計データ (localStorage) ─────────────────────────────

const KEY_STATS_STORAGE = 'typing_key_stats';
let keyStatsCache = null;

function loadKeyStats() {
  if (keyStatsCache) return keyStatsCache;
  try { keyStatsCache = JSON.parse(localStorage.getItem(KEY_STATS_STORAGE) || '{}'); }
  catch { keyStatsCache = {}; }
  return keyStatsCache;
}

function flushKeyStats() {
  if (keyStatsCache) {
    localStorage.setItem(KEY_STATS_STORAGE, JSON.stringify(keyStatsCache));
  }
}

function recordKeyAttempt(expectedKey, isCorrect) {
  const data = loadKeyStats();
  if (!data[expectedKey]) data[expectedKey] = { attempts: 0, misses: 0 };
  data[expectedKey].attempts++;
  if (!isCorrect) data[expectedKey].misses++;
}

window.addEventListener('beforeunload', flushKeyStats);

// ── チャレンジ文章データ ──────────────────────────────────

const CHALLENGE_SENTENCES = [
  { id: 0, text: 'あさごはんをたべてからがっこうにいきます' },
  { id: 1, text: 'にほんごのれんしゅうはとてもたのしいです' },
  { id: 2, text: 'てんきがいいのでこうえんにいきました' },
  { id: 3, text: 'ともだちといっしょにしょくじをしました' },
  { id: 4, text: 'としょかんでしずかにほんをよんでいます' },
  { id: 5, text: 'まいにちれんしゅうするとはやくなれます' },
  { id: 6, text: 'きょうはとてもいいてんきになりました' },
  { id: 7, text: 'がっこうのかえりにともだちとはなしました' },
];

// ── ランキング (localStorage) ─────────────────────────────

const RANKINGS_STORAGE = 'challenge_rankings';

function loadRankings() {
  try { return JSON.parse(localStorage.getItem(RANKINGS_STORAGE) || '{}'); }
  catch { return {}; }
}

function saveRankings(data) {
  localStorage.setItem(RANKINGS_STORAGE, JSON.stringify(data));
}

// 新タイムを追加して上位3件を返す。newRank は0始まりの順位(-1=圏外)
function addToRanking(sentenceId, time) {
  const data = loadRankings();
  const key  = String(sentenceId);
  const list = (data[key] || []).concat(time).sort((a, b) => a - b);
  const newRank = list.indexOf(time); // 追加前ソート済み配列での位置
  data[key] = list.slice(0, 3);
  saveRankings(data);
  return { ranking: data[key], newRank: newRank < 3 ? newRank : -1 };
}

// ── 練習文章データ ────────────────────────────────────────

const SENTENCES = {
  easy: [
    'あいうえお',
    'かきくけこ',
    'さしすせそ',
    'たちつてと',
    'なにぬねの',
    'おはよう',
    'ありがとう',
    'すみません',
    'こんにちは',
    'はじめまして',
    'いただきます',
    'ただいま',
    'いってきます',
    'おやすみ',
    'よろしく',
  ],
  medium: [
    'きょうはいいてんきです',
    'わたしはがくせいです',
    'ありがとうございます',
    'よろしくおねがいします',
    'にほんごをれんしゅうします',
    'まいにちれんしゅうします',
    'あさはやくおきました',
    'がっこうにいきます',
    'としょかんでほんをよみます',
    'おなかがすきました',
  ],
};

// ── 練習モード定義 ──────────────────────────────────────────

const MODES = {
  home: {
    label: 'ホームポジション',
    chars: ['a','s','d','f','j','k','l'],
  },
  row: {
    label: '行別練習',
    subs: [
      { id:'top',    label:'上段',    keys:'Q W E R T Y U I O P', chars:['q','w','e','r','t','y','u','i','o','p'] },
      { id:'home',   label:'ホーム行', keys:'A S D F G H J K L', chars:['a','s','d','f','g','h','j','k','l'] },
      { id:'bottom', label:'下段',    keys:'Z X C V B N M , .', chars:['z','x','c','v','b','n','m',',','.'] },
      { id:'all',    label:'総合練習', keys:'全行ランダム',         chars:['q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n','m',',','.'] },
    ],
  },
  finger: {
    label: '指別練習',
    subs: [
      { id:'lpinky',  label:'左小指',     keys:'Q A Z',         chars:['q','a','z'],               finger:'lpinky'  },
      { id:'lring',   label:'左薬指',     keys:'W S X',         chars:['w','s','x'],               finger:'lring'   },
      { id:'lmiddle', label:'左中指',     keys:'E D C',         chars:['e','d','c'],               finger:'lmiddle' },
      { id:'lindex',  label:'左人差し指', keys:'R F V T G B',   chars:['r','f','v','t','g','b'],   finger:'lindex'  },
      { id:'rindex',  label:'右人差し指', keys:'Y H N U J M',   chars:['y','h','n','u','j','m'],   finger:'rindex'  },
      { id:'rmiddle', label:'右中指',     keys:'I K ,',         chars:['i','k',','],               finger:'rmiddle' },
      { id:'rring',   label:'右薬指',     keys:'O L .',         chars:['o','l','.'],               finger:'rring'   },
      { id:'rpinky',  label:'右小指',     keys:'P',             chars:['p'],                       finger:'rpinky'  },
    ],
  },
  japanese: {
    label: '日本語文章',
    subs: [
      { id:'easy',   label:'かんたん', desc:'あいさつ・基本単語', sentences: SENTENCES.easy },
      { id:'medium', label:'ふつう',   desc:'短い日常文章',       sentences: SENTENCES.medium },
      { id:'random', label:'ランダム', desc:'両方からランダム',   sentences: [...SENTENCES.easy, ...SENTENCES.medium] },
    ],
  },
  challenge: {
    label: 'チャレンジモード',
    subs: CHALLENGE_SENTENCES,
  },
};

const CHAR_COUNT = 20;

// ── 状態 ──────────────────────────────────────────────────

const state = {
  mode:       null,
  sub:        null,
  sequence:   [],
  kanaGroups: [],   // 日本語モード用: [{ kana, start, end }, ...]
  cursor:     0,
  mistakes:   0,
  keystrokes: 0,
  startTime:  null,
};

// ── 画面切替 ──────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

// ── キーボード構築 ────────────────────────────────────────

function buildKeyboard() {
  const kb = document.getElementById('keyboard');
  kb.innerHTML = '';

  const indents = [0, 26, 46]; // 各行の左インデント(px)

  KB_ROWS.forEach((row, ri) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';
    rowEl.style.paddingLeft = indents[ri] + 'px';

    row.forEach(key => {
      const el = document.createElement('div');
      const fid = FINGER[key];
      el.className = `kb-key f-${fid}`;
      if (DARK_TEXT_FINGERS.has(fid)) el.classList.add('dark-text');
      el.dataset.key = key;
      el.textContent = key.toUpperCase();
      rowEl.appendChild(el);
    });

    kb.appendChild(rowEl);
  });

  // スペースバー行
  const spaceRow = document.createElement('div');
  spaceRow.className = 'kb-row';
  const space = document.createElement('div');
  space.className = 'kb-space';
  space.dataset.key = ' ';
  space.textContent = 'SPACE';
  spaceRow.appendChild(space);
  kb.appendChild(spaceRow);
}

function buildLegend() {
  const legend = document.getElementById('finger-legend');
  legend.innerHTML = '';
  LEGEND_ITEMS.forEach(({ id, label }) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    const dot = document.createElement('span');
    dot.className = `finger-dot f-${id}`;
    item.appendChild(dot);
    item.appendChild(document.createTextNode(label));
    legend.appendChild(item);
  });
}

// ── キーハイライト ────────────────────────────────────────

function highlightKey(char) {
  const allKeys = document.querySelectorAll('.kb-key, .kb-space');
  allKeys.forEach(k => {
    k.classList.remove('key-hi', 'key-dim');
    if (char !== null) k.classList.add('key-dim');
  });
  if (char === null) return;

  const selector = char === ' '
    ? '.kb-space'
    : `.kb-key[data-key="${CSS.escape(char)}"]`;
  const target = document.querySelector(selector);
  if (target) {
    target.classList.remove('key-dim');
    target.classList.add('key-hi');
  }
}

// ── 出題生成 ──────────────────────────────────────────────

function generateSequence(chars, count) {
  const seq = [];
  let prev = null;
  for (let i = 0; i < count; i++) {
    const pool = chars.length > 1 ? chars.filter(c => c !== prev) : chars;
    const ch = pool[Math.floor(Math.random() * pool.length)];
    seq.push(ch);
    prev = ch;
  }
  return seq;
}

// ── 文字表示 ──────────────────────────────────────────────

function renderChars() {
  const row = document.getElementById('char-row');
  row.innerHTML = '';
  state.sequence.forEach((ch, i) => {
    const el = document.createElement('span');
    el.className = 'char';
    el.dataset.idx = i;
    el.textContent = ch === ' ' ? '·' : ch.toUpperCase();
    if (i < state.cursor) el.classList.add('correct');
    else if (i === state.cursor) el.classList.add('current');
    row.appendChild(el);
  });
}

function updateStats() {
  const pct = state.keystrokes === 0
    ? 100
    : Math.round((state.keystrokes - state.mistakes) / state.keystrokes * 100);
  document.getElementById('stat-accuracy').textContent = pct + '%';

  if (isTextMode(state.mode)) {
    const done  = state.kanaGroups.filter(g => state.cursor >= g.end).length;
    const total = state.kanaGroups.length;
    document.getElementById('stat-progress').textContent = `${done} / ${total} 文字`;
  } else {
    document.getElementById('stat-progress').textContent = `${state.cursor} / ${CHAR_COUNT}`;
  }
}

// ── かな表示（日本語モード専用）─────────────────────────

function renderKana() {
  const row = document.getElementById('kana-row');
  row.innerHTML = '';
  state.kanaGroups.forEach((g, idx) => {
    const el = document.createElement('span');
    el.className = 'kana-char';
    el.dataset.kanaIdx = idx;
    el.textContent = g.kana;
    if (state.cursor >= g.end)   el.classList.add('kana-done');
    else if (state.cursor >= g.start) el.classList.add('kana-current');
    row.appendChild(el);
  });
}

function updateKana() {
  state.kanaGroups.forEach((g, idx) => {
    const el = document.querySelector(`.kana-char[data-kana-idx="${idx}"]`);
    if (!el) return;
    el.classList.remove('kana-done', 'kana-current');
    if (state.cursor >= g.end)        el.classList.add('kana-done');
    else if (state.cursor >= g.start) el.classList.add('kana-current');
  });
}

// ── 練習開始 ──────────────────────────────────────────────

function startPractice(mode, sub) {
  state.mode       = mode;
  state.sub        = sub;
  state.cursor     = 0;
  state.mistakes   = 0;
  state.keystrokes = 0;
  state.startTime  = null;
  state.kanaGroups = [];

  let label;

  if (isTextMode(mode)) {
    const sentence = mode === 'challenge'
      ? sub.text
      : sub.sentences[Math.floor(Math.random() * sub.sentences.length)];
    const groups   = hiraToGroups(sentence);

    let pos = 0;
    state.sequence = [];
    state.kanaGroups = groups.map(({ kana, romaji }) => {
      const chars = romaji.split('');
      const start = pos;
      chars.forEach(c => state.sequence.push(c));
      pos += chars.length;
      return { kana, start, end: pos };
    });

    label = mode === 'challenge'
      ? `チャレンジ — お題 ${sub.id + 1}`
      : `${MODES.japanese.label} — ${sub.label}`;
    renderKana();
    document.getElementById('kana-row').style.display = 'flex';
  } else {
    const chars = mode === 'home' ? MODES.home.chars : sub.chars;
    label = mode === 'home'
      ? MODES.home.label
      : `${MODES[mode].label} — ${sub.label}`;

    state.sequence = generateSequence(chars, CHAR_COUNT);
    document.getElementById('kana-row').style.display = 'none';
  }

  document.getElementById('mode-label').textContent = label;

  const notice = document.getElementById('practice-notice');
  if (mode === 'challenge') {
    notice.textContent = '⏱ タイマーは最初のキーを押した瞬間にスタートします';
    notice.style.display = 'block';
  } else {
    notice.style.display = 'none';
  }

  renderChars();
  updateStats();
  highlightKey(state.sequence[0]);

  showScreen('practice');
}

// ── キー入力処理 ──────────────────────────────────────────

function handleKey(key) {
  if (state.cursor >= state.sequence.length) return;

  if (!state.startTime) state.startTime = Date.now();

  const expected = state.sequence[state.cursor];
  state.keystrokes++;
  recordKeyAttempt(expected, key === expected);

  const currentEl = document.querySelector(`.char[data-idx="${state.cursor}"]`);

  if (key === expected) {
    currentEl.classList.remove('current');
    currentEl.classList.add('correct');
    state.cursor++;

    if (state.cursor >= state.sequence.length) {
      showResult();
      return;
    }

    document.querySelector(`.char[data-idx="${state.cursor}"]`).classList.add('current');
    highlightKey(state.sequence[state.cursor]);
    if (isTextMode(state.mode)) updateKana();
  } else {
    state.mistakes++;
    currentEl.classList.add('wrong');
    setTimeout(() => currentEl.classList.remove('wrong'), 260);
  }

  updateStats();
}

// ── 結果表示 ──────────────────────────────────────────────

function showResult() {
  flushKeyStats();
  highlightKey(null);
  const elapsed = parseFloat(((Date.now() - state.startTime) / 1000).toFixed(1));
  const pct = state.keystrokes === 0
    ? 100
    : Math.round((state.keystrokes - state.mistakes) / state.keystrokes * 100);

  document.getElementById('res-accuracy').textContent = pct + '%';
  document.getElementById('res-misses').textContent   = state.mistakes;
  document.getElementById('res-time').textContent     = elapsed + '秒';

  const rankingEl = document.getElementById('result-ranking');
  if (state.mode === 'challenge') {
    const { ranking, newRank } = addToRanking(state.sub.id, elapsed);
    renderRanking(ranking, newRank);
    rankingEl.style.display = 'block';
  } else {
    rankingEl.style.display = 'none';
  }

  showScreen('result');
}

function renderRanking(ranking, newRank) {
  const MEDALS = ['🥇', '🥈', '🥉'];
  const list = document.getElementById('ranking-list');
  list.innerHTML = '';
  ranking.forEach((time, i) => {
    const li = document.createElement('li');
    li.className = 'ranking-item' + (i === newRank ? ' is-new' : '');

    const medal = document.createElement('span');
    medal.className = 'ranking-medal';
    medal.textContent = MEDALS[i];

    const t = document.createElement('span');
    t.className = 'ranking-time';
    t.textContent = time.toFixed(1) + '秒';

    li.appendChild(medal);
    li.appendChild(t);

    if (i === newRank) {
      const badge = document.createElement('span');
      badge.className = 'ranking-badge';
      badge.textContent = 'NEW';
      li.appendChild(badge);
    }

    list.appendChild(li);
  });
}

// ── サブモード選択画面 ────────────────────────────────────

function showSubSelect(mode) {
  const modeData = MODES[mode];
  document.getElementById('sub-title').textContent =
    `${modeData.label} — 種類を選んでください`;

  const container = document.getElementById('sub-options');
  container.innerHTML = '';

  const existing = document.getElementById('challenge-timer-note');
  if (existing) existing.remove();

  if (mode === 'challenge') {
    const note = document.createElement('p');
    note.id = 'challenge-timer-note';
    note.className = 'challenge-timer-note';
    note.textContent = '⏱ タイマーは最初のキーを押した瞬間にスタートします';
    document.getElementById('sub-title').insertAdjacentElement('afterend', note);
    container.classList.add('is-list');
    const ranking = loadRankings();
    modeData.subs.forEach(sub => {
      const el = document.createElement('div');
      el.className = 'sub-option challenge-option';

      const left = document.createElement('div');

      const label = document.createElement('h4');
      label.textContent = `お題 ${sub.id + 1}`;
      left.appendChild(label);

      const text = document.createElement('div');
      text.className = 'sub-keys';
      text.textContent = sub.text;
      left.appendChild(text);

      const best = (ranking[String(sub.id)] || [])[0];
      const right = document.createElement('div');
      right.className = 'challenge-best';
      right.textContent = best !== undefined ? `ベスト ${best.toFixed(1)}秒` : '未挑戦';

      el.appendChild(left);
      el.appendChild(right);
      el.addEventListener('click', () => startPractice(mode, sub));
      container.appendChild(el);
    });
  } else {
    container.classList.remove('is-list');
    modeData.subs.forEach(sub => {
      const el = document.createElement('div');
      el.className = 'sub-option';

      if (mode === 'finger') {
        const dot = document.createElement('span');
        dot.className = `finger-dot-lg f-${sub.finger}`;
        el.appendChild(dot);
      }

      const h4 = document.createElement('h4');
      h4.textContent = sub.label;
      el.appendChild(h4);

      const detail = document.createElement('div');
      detail.className = 'sub-keys';
      detail.textContent = mode === 'japanese' ? sub.desc : sub.keys;
      el.appendChild(detail);

      el.addEventListener('click', () => startPractice(mode, sub));
      container.appendChild(el);
    });
  }

  showScreen('sub');
}

// ── イベント登録 ──────────────────────────────────────────

// 物理キーコード → 文字マッピング（IMEをバイパスするため e.code を使う）
const KEY_CODE_MAP = {
  KeyA:'a', KeyB:'b', KeyC:'c', KeyD:'d', KeyE:'e',
  KeyF:'f', KeyG:'g', KeyH:'h', KeyI:'i', KeyJ:'j',
  KeyK:'k', KeyL:'l', KeyM:'m', KeyN:'n', KeyO:'o',
  KeyP:'p', KeyQ:'q', KeyR:'r', KeyS:'s', KeyT:'t',
  KeyU:'u', KeyV:'v', KeyW:'w', KeyX:'x', KeyY:'y',
  KeyZ:'z',
  Semicolon:';', Comma:',', Period:'.', Slash:'/',
  Space:' ',
};

// document レベルで拾うことで IME が割り込めない
document.addEventListener('keydown', e => {
  if (document.getElementById('screen-practice').classList.contains('active')) {
    if (e.code === 'Escape') { showScreen('menu'); return; }
    e.preventDefault();
    const char = KEY_CODE_MAP[e.code];
    if (char !== undefined) handleKey(char);
    return;
  }

  if (document.getElementById('screen-result').classList.contains('active')) {
    if (e.code === 'Space')  { e.preventDefault(); startPractice(state.mode, state.sub); }
    if (e.code === 'Escape') { showScreen('menu'); }
  }
});

// モードカード
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    const mode = card.dataset.mode;
    if (mode === 'home') startPractice('home', null);
    else showSubSelect(mode);
  });
});

// 戻るボタン
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.dataset.target));
});

// 結果ボタン
document.getElementById('btn-retry').addEventListener('click', () => {
  startPractice(state.mode, state.sub);
});
document.getElementById('btn-menu').addEventListener('click', () => showScreen('menu'));

// ── 統計画面 ──────────────────────────────────────────────

// ミス率(0-100)をグリーン→レッドの色に変換。50%以上は最大赤
function heatmapColor(missRate) {
  if (missRate === null) return null;
  const t = Math.min(missRate / 50, 1);
  const r = Math.round(74  + 174 * t);
  const g = Math.round(222 - 109 * t);
  const b = Math.round(128 -  15 * t);
  return `rgb(${r},${g},${b})`;
}

function showStatsScreen() {
  const stats = loadKeyStats();
  renderHeatmapKeyboard(stats);
  renderFingerBars(stats);
  showScreen('stats');
}

function renderHeatmapKeyboard(stats) {
  const kb = document.getElementById('heatmap-keyboard');
  kb.innerHTML = '';
  const indents = [0, 26, 46];

  KB_ROWS.forEach((row, ri) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';
    rowEl.style.paddingLeft = indents[ri] + 'px';

    row.forEach(key => {
      const el  = document.createElement('div');
      el.className = 'hm-key';

      const s        = stats[key];
      const missRate = s && s.attempts > 0 ? (s.misses / s.attempts * 100) : null;
      const color    = heatmapColor(missRate);
      if (color) el.style.background = color;

      const label = document.createElement('div');
      label.className = 'hm-key-label';
      label.textContent = key === ';' ? ';' : key.toUpperCase();
      if (color) label.style.color = missRate < 25 ? '#1a1a2e' : '#fff';
      el.appendChild(label);

      if (missRate !== null) {
        const pct = document.createElement('div');
        pct.className = 'hm-key-pct';
        pct.textContent = Math.round(missRate) + '%';
        pct.style.color = missRate < 25 ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)';
        el.appendChild(pct);
      }

      rowEl.appendChild(el);
    });
    kb.appendChild(rowEl);
  });
}

function renderFingerBars(stats) {
  const container = document.getElementById('finger-bars');
  container.innerHTML = '';

  LEGEND_ITEMS.forEach(({ id, label }) => {
    const keys = Object.keys(FINGER).filter(k => FINGER[k] === id);
    let totalAttempts = 0, totalMisses = 0;
    keys.forEach(k => {
      const s = stats[k];
      if (s) { totalAttempts += s.attempts; totalMisses += s.misses; }
    });
    const missRate = totalAttempts > 0 ? (totalMisses / totalAttempts * 100) : null;

    const row = document.createElement('div');
    row.className = 'finger-bar-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'finger-bar-label';
    labelEl.textContent = label;

    const track = document.createElement('div');
    track.className = 'finger-bar-track';
    const fill = document.createElement('div');
    fill.className = `finger-bar-fill f-${id}`;
    fill.style.width = missRate !== null ? Math.min(missRate, 100) + '%' : '0%';
    track.appendChild(fill);

    const pct = document.createElement('span');
    pct.className = 'finger-bar-pct';
    pct.textContent = missRate !== null ? Math.round(missRate) + '%' : '—';

    const count = document.createElement('span');
    count.className = 'finger-bar-count';
    count.textContent = totalAttempts > 0 ? totalAttempts + '打' : '';

    row.appendChild(labelEl);
    row.appendChild(track);
    row.appendChild(pct);
    row.appendChild(count);
    container.appendChild(row);
  });
}

document.getElementById('btn-show-stats').addEventListener('click', showStatsScreen);

document.getElementById('btn-reset-stats').addEventListener('click', () => {
  if (confirm('統計データをリセットします。よろしいですか？')) {
    localStorage.removeItem(KEY_STATS_STORAGE);
    keyStatsCache = null;
    showStatsScreen();
  }
});

// ── 初期化 ────────────────────────────────────────────────

buildKeyboard();
buildLegend();
showScreen('menu');
