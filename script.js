/* ========== 화면 전환 ========== */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ========== 지뢰찾기 ========== */
let mR = 16, mC = 16, mM = 40;
let mBoard = [], mRev = [], mFlag = [];
let mOver = false, mWon = false, mFirst = true;
let mTimer = null, mSec = 0;

function mineSetDiff(r, c, m) {
  mR = r; mC = c; mM = m;
  document.querySelectorAll('#mine-screen .controls button').forEach(b => b.classList.remove('active'));
  document.getElementById(r === 9 ? 'mine-easy' : c === 16 ? 'mine-med' : 'mine-hard').classList.add('active');
  mineInit();
}

function mineInit() {
  clearInterval(mTimer); mSec = 0;
  document.getElementById('mine-timer').textContent = '0';
  document.getElementById('mine-msg').textContent = '';
  document.getElementById('reset-btn').textContent = '🙂';
  document.getElementById('mine-count').textContent = mM;
  mOver = false; mWon = false; mFirst = true;
  mBoard = Array.from({ length: mR }, () => Array(mC).fill(0));
  mRev   = Array.from({ length: mR }, () => Array(mC).fill(false));
  mFlag  = Array.from({ length: mR }, () => Array(mC).fill(false));
  mRender();
}

function mPlaceMines(sr, sc) {
  let p = 0;
  while (p < mM) {
    const r = Math.floor(Math.random() * mR);
    const c = Math.floor(Math.random() * mC);
    if (mBoard[r][c] === -1) continue;
    if (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1) continue;
    mBoard[r][c] = -1; p++;
  }
  for (let r = 0; r < mR; r++)
    for (let c = 0; c < mC; c++)
      if (mBoard[r][c] !== -1) mBoard[r][c] = mAdj(r, c);
}

function mAdj(r, c) {
  let n = 0;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < mR && nc >= 0 && nc < mC && mBoard[nr][nc] === -1) n++;
    }
  return n;
}

function mRender() {
  const el = document.getElementById('board');
  el.style.gridTemplateColumns = `repeat(${mC}, 32px)`;
  el.innerHTML = '';
  for (let r = 0; r < mR; r++)
    for (let c = 0; c < mC; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell hidden';
      cell.dataset.r = r; cell.dataset.c = c;
      cell.addEventListener('click', mClick);
      cell.addEventListener('contextmenu', mFlag2);
      el.appendChild(cell);
    }
}

function mClick() {
  const r = +this.dataset.r, c = +this.dataset.c;
  if (mOver || mWon || mFlag[r][c] || mRev[r][c]) return;
  if (mFirst) {
    mFirst = false;
    mPlaceMines(r, c);
    clearInterval(mTimer);
    mTimer = setInterval(() => {
      mSec++;
      document.getElementById('mine-timer').textContent = mSec;
    }, 1000);
  }
  mReveal(r, c); mCheckWin(); mRefresh();
}

function mFlag2(e) {
  e.preventDefault();
  const r = +this.dataset.r, c = +this.dataset.c;
  if (mOver || mWon || mRev[r][c]) return;
  mFlag[r][c] = !mFlag[r][c];
  document.getElementById('mine-count').textContent = mM - mFlag.flat().filter(Boolean).length;
  mRefresh();
}

function mReveal(r, c) {
  if (r < 0 || r >= mR || c < 0 || c >= mC || mRev[r][c] || mFlag[r][c]) return;
  mRev[r][c] = true;
  if (mBoard[r][c] === -1) {
    mOver = true; clearInterval(mTimer);
    document.getElementById('reset-btn').textContent = '😵';
    document.getElementById('mine-msg').textContent = '💥 게임 오버!';
    return;
  }
  if (mBoard[r][c] === 0)
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        mReveal(r + dr, c + dc);
}

function mCheckWin() {
  let u = 0;
  for (let r = 0; r < mR; r++)
    for (let c = 0; c < mC; c++)
      if (!mRev[r][c]) u++;
  if (u === mM) {
    mWon = true; clearInterval(mTimer);
    document.getElementById('reset-btn').textContent = '😎';
    document.getElementById('mine-msg').textContent = '🎉 클리어!';
  }
}

function mRefresh() {
  for (let r = 0; r < mR; r++)
    for (let c = 0; c < mC; c++) {
      const el = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
      el.className = 'cell'; el.textContent = '';
      if (mRev[r][c]) {
        if (mBoard[r][c] === -1) { el.classList.add('mine-exploded'); el.textContent = '💣'; }
        else { el.classList.add('revealed'); if (mBoard[r][c] > 0) { el.textContent = mBoard[r][c]; el.classList.add('n' + mBoard[r][c]); } }
      } else if (mFlag[r][c]) {
        el.classList.add('flagged'); el.textContent = '🚩';
      } else {
        el.classList.add('hidden');
        if ((mOver || mWon) && mBoard[r][c] === -1) { el.classList.remove('hidden'); el.classList.add('mine-revealed'); el.textContent = '💣'; }
      }
    }
}

mineInit();

/* ========== 2048 ========== */
let g = [], score2 = 0, best2 = +localStorage.getItem('best2048') || 0;
const TILE_SIZE = 90, GAP = 10, PAD = 12;

function cellPos(row) { return PAD + row * (TILE_SIZE + GAP); }

function init2048() {
  g = Array.from({ length: 4 }, () => Array(4).fill(0));
  score2 = 0; updateScoreUI();
  document.getElementById('overlay-2048').classList.remove('show');
  document.getElementById('msg-2048').textContent = '';
  addRandom(); addRandom(); drawTiles();
}

function addRandom() {
  const empty = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (g[r][c] === 0) empty.push([r, c]);
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  g[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function tileClass(v) {
  if (v >= 2048) return v === 2048 ? 't2048' : 't-hi';
  return 't' + v;
}

function drawTiles() {
  const grid = document.getElementById('grid-2048');
  grid.querySelectorAll('.tile').forEach(t => t.remove());
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (!g[r][c]) continue;
      const t = document.createElement('div');
      t.className = `tile ${tileClass(g[r][c])}`;
      t.textContent = g[r][c];
      t.style.top  = cellPos(r) + 'px';
      t.style.left = cellPos(c) + 'px';
      grid.appendChild(t);
    }
}

function updateScoreUI() {
  document.getElementById('score').textContent = score2;
  if (score2 > best2) { best2 = score2; localStorage.setItem('best2048', best2); }
  document.getElementById('best').textContent = best2;
}

function slide(row) {
  let arr = row.filter(v => v), merged = false, pts = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    if (!merged && arr[i] === arr[i + 1]) {
      arr[i] *= 2; pts += arr[i]; arr.splice(i + 1, 1); merged = true;
    } else merged = false;
  }
  while (arr.length < 4) arr.push(0);
  return { arr, pts };
}

function move(dir) {
  let changed = false, pts = 0;
  const ng = g.map(r => [...r]);
  if (dir === 'left') {
    for (let r = 0; r < 4; r++) { const { arr, pts: p } = slide(ng[r]); if (arr.join() !== ng[r].join()) changed = true; ng[r] = arr; pts += p; }
  } else if (dir === 'right') {
    for (let r = 0; r < 4; r++) { const rev = ng[r].slice().reverse(); const { arr, pts: p } = slide(rev); const out = arr.reverse(); if (out.join() !== ng[r].join()) changed = true; ng[r] = out; pts += p; }
  } else if (dir === 'up') {
    for (let c = 0; c < 4; c++) { const col = ng.map(r => r[c]); const { arr, pts: p } = slide(col); arr.forEach((v, r) => { if (v !== ng[r][c]) changed = true; ng[r][c] = v; }); pts += p; }
  } else if (dir === 'down') {
    for (let c = 0; c < 4; c++) { const col = ng.map(r => r[c]).reverse(); const { arr, pts: p } = slide(col); arr.reverse().forEach((v, r) => { if (v !== ng[r][c]) changed = true; ng[r][c] = v; }); pts += p; }
  }
  if (!changed) return;
  g = ng; score2 += pts; updateScoreUI(); addRandom(); drawTiles(); checkEnd();
}

function checkEnd() {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (g[r][c] === 2048) { showOverlay('🎉 2048 달성!'); return; }
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (g[r][c] === 0) return;
      if (c < 3 && g[r][c] === g[r][c + 1]) return;
      if (r < 3 && g[r][c] === g[r + 1][c]) return;
    }
  showOverlay('😢 게임 오버');
}

function showOverlay(msg) {
  document.getElementById('overlay-msg').textContent = msg;
  document.getElementById('overlay-2048').classList.add('show');
}

document.addEventListener('keydown', e => {
  if (!document.getElementById('g2048-screen').classList.contains('active')) return;
  const map = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    a: 'left', d: 'right', w: 'up', s: 'down',
    A: 'left', D: 'right', W: 'up', S: 'down'
  };
  if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
});

let touchStart = null;
document.addEventListener('touchstart', e => {
  if (!document.getElementById('g2048-screen').classList.contains('active')) return;
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
document.addEventListener('touchend', e => {
  if (!touchStart || !document.getElementById('g2048-screen').classList.contains('active')) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
  else move(dy > 0 ? 'down' : 'up');
}, { passive: true });
