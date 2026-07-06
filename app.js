/* ══════════════════════════════════════
   DATA & DEFAULTS
══════════════════════════════════════ */
const DEFAULT_CONFIG = {
  title:  '生日驚喜抽獎',
  brand:  '✦ 專屬の一番くじ',
  sub:    '表面の店舗有口を確認の上、商品をお渡し下さい',
  note:   '※ 購入店舗のみ有効',
  prizes: [
    { rank: 'A', name: '大獎',  color: '#e8c840', count: 1 },
    { rank: 'B', name: '二等獎',       color: '#c0a0e8', count: 2 },
    { rank: 'C', name: '三等獎',   color: '#4fa3e8', count: 3 },
    { rank: 'D', name: '四等獎',   color: '#e87040', count: 4 },
    { rank: 'E', name: '五等獎',     color: '#50c878', count: 5 },
  ],
};

const TEAR_EMOJIS = ['🎁','🎀','🎊','🎉','✨','🌟','💝','🎈'];

function loadCfg()     { try { const v = localStorage.getItem('ij_cfg');     return v ? JSON.parse(v) : structuredClone(DEFAULT_CONFIG); } catch { return structuredClone(DEFAULT_CONFIG); } }
function loadTickets() { try { const v = localStorage.getItem('ij_tickets'); return v ? JSON.parse(v) : null; } catch { return null; } }
function saveCfg(c)    { try { localStorage.setItem('ij_cfg', JSON.stringify(c)); } catch {} }
function saveTickets(t){ try { localStorage.setItem('ij_tickets', JSON.stringify(t)); } catch {} }

let cfg     = loadCfg();
let tickets = loadTickets();   // [{prizeIdx, used}] shuffled

/* ══════════════════════════════════════
   TICKET POOL
══════════════════════════════════════ */
function buildTickets() {
  const pool = [];
  cfg.prizes.forEach((p, pi) => {
    for (let i = 0; i < p.count; i++) pool.push({ prizeIdx: pi, used: false });
  });
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function ensureTickets() {
  if (!tickets || tickets.length === 0) {
    tickets = buildTickets();
    saveTickets(tickets);
  }
}

/* ══════════════════════════════════════
   VIEW SWITCHER
══════════════════════════════════════ */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ══════════════════════════════════════
   LOBBY
══════════════════════════════════════ */
function renderLobby() {
  ensureTickets();
  document.getElementById('lobbyTitle').textContent = cfg.title;

  // Prize summary chips
  const sumEl = document.getElementById('prizeSummary');
  sumEl.innerHTML = '';
  cfg.prizes.forEach(p => {
    const chip = document.createElement('div');
    chip.className = 'prize-chip';
    chip.style.background = p.color + '22';
    chip.style.color = p.color;
    chip.innerHTML = `<span class="prize-chip-dot" style="background:${p.color}"></span>${p.rank}賞 ${p.name}`;
    sumEl.appendChild(chip);
  });

  // Tickets grid
  const area = document.getElementById('ticketsArea');
  const remaining = tickets.filter(t => !t.used).length;
  document.getElementById('remainCount').textContent = remaining;

  if (tickets.length === 0) {
    area.innerHTML = `
      <div class="lobby-empty">
        <div class="lobby-empty-icon">🎊</div>
        <p>請先在設定中新增獎項</p>
      </div>`;
    return;
  }

  area.innerHTML = '<div class="tickets-grid" id="ticketsGrid"></div>';
  const grid = document.getElementById('ticketsGrid');

  tickets.forEach((t, idx) => {
    const card = document.createElement('div');
    card.className = 'mini-ticket' + (t.used ? ' used' : '');
    const num = String(idx + 1).padStart(2, '0');

    card.innerHTML = `
      <div class="mini-ticket-front">
        <div class="mini-ticket-top">${escHtml(cfg.brand)}</div>
        <div class="mini-ticket-body">
          <span class="mini-ticket-num">${num}</span>
        </div>
      </div>
      ${t.used ? `<div class="mini-ticket-used-label">已抽</div>` : ''}
    `;

    if (!t.used) card.onclick = () => openTicket(idx);
    grid.appendChild(card);
  });
}

function confirmReset() {
  if (confirm('確定重置所有抽獎券？')) {
    tickets = buildTickets();
    saveTickets(tickets);
    renderLobby();
  }
}

/* ══════════════════════════════════════
   TICKET TEAR VIEW
══════════════════════════════════════ */
let currentTicketIdx = null;
let tearStartY = 0;
let tearCurrentY = 0;
let isTearing = false;
let tearRevealed = false;

function openTicket(idx) {
  currentTicketIdx = idx;
  tearRevealed = false;
  tearCurrentY = 0;

  const t = tickets[idx];
  const prize = cfg.prizes[t.prizeIdx];
  const num = String(idx + 1).padStart(2, '0');
  const emoji = TEAR_EMOJIS[idx % TEAR_EMOJIS.length];

  const stage = document.getElementById('ticketStage');
  stage.innerHTML = `
    <div class="full-ticket" id="fullTicket">
      <!-- Prize content underneath -->
      <div class="ticket-header-band">
        <div class="ticket-brand">${escHtml(cfg.brand)}</div>
        <div class="ticket-sub">${escHtml(cfg.sub)}</div>
      </div>
      <div class="ticket-prize-band" style="background:${prize.color}18">
        <div class="ticket-rank" style="color:${prize.color}">${escHtml(prize.rank)}</div>
        <div class="ticket-prize-name">${escHtml(prize.name)}</div>
      </div>
      <div class="ticket-footer-band" style="background:#111">
        ${escHtml(cfg.note)}
      </div>

      <!-- Tear-off overlay on top -->
      <div class="tear-overlay" id="tearOverlay">
        <div class="tear-top" id="tearTop">
          <div class="tear-brand-text">${escHtml(cfg.brand)}</div>
          <div class="tear-arrow-row">
            <div class="tear-arrow"></div>
            <span style="font-size:10px;color:#1a3a60;font-weight:700">ここからゆっくりめぐる</span>
          </div>
          <div class="tear-img-area">${emoji}</div>
          <div class="tear-bottom-text">HAPPY BIRTHDAY</div>
          <div class="tear-edge"></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('tearHint').classList.remove('hidden');

  // Wire up drag events
  const ticket = document.getElementById('fullTicket');
  ticket.addEventListener('touchstart', onTearStart, { passive: false });
  ticket.addEventListener('touchmove',  onTearMove,  { passive: false });
  ticket.addEventListener('touchend',   onTearEnd,   { passive: false });
  ticket.addEventListener('mousedown',  onTearStartM);
  document.addEventListener('mousemove', onTearMoveM);
  document.addEventListener('mouseup',   onTearEndM);

  showView('viewTicket');
}

function onTearStart(e) {
  e.preventDefault();
  isTearing = true;
  tearStartY = e.touches[0].clientY;
  tearCurrentY = 0;
}
function onTearMove(e) {
  e.preventDefault();
  if (!isTearing) return;
  const dy = tearStartY - e.touches[0].clientY;
  updateTear(dy);
}
function onTearEnd(e) {
  e.preventDefault();
  isTearing = false;
  finishTear();
}
function onTearStartM(e) {
  isTearing = true;
  tearStartY = e.clientY;
  tearCurrentY = 0;
}
function onTearMoveM(e) {
  if (!isTearing) return;
  const dy = tearStartY - e.clientY;
  updateTear(dy);
}
function onTearEndM() {
  if (!isTearing) return;
  isTearing = false;
  finishTear();
}

function updateTear(dy) {
  if (tearRevealed) return;
  const overlay = document.getElementById('tearOverlay');
  if (!overlay) return;

  const clamped = Math.max(0, dy);
  tearCurrentY = clamped;

  // Move overlay upward
  overlay.style.transform = `translateY(-${clamped}px)`;
  overlay.style.opacity   = Math.max(0, 1 - clamped / 180);

  if (clamped > 10) {
    document.getElementById('tearHint').classList.add('hidden');
  }
}

function finishTear() {
  const ticket = document.getElementById('fullTicket');
  if (!ticket || tearRevealed) return;

  if (tearCurrentY > 80) {
    // Enough — animate rest of the way
    tearRevealed = true;
    const overlay = document.getElementById('tearOverlay');
    if (overlay) {
      overlay.style.transition = 'transform 0.35s ease-in, opacity 0.3s ease-in';
      overlay.style.transform = 'translateY(-300px)';
      overlay.style.opacity = '0';
    }
    // Remove listeners
    ticket.removeEventListener('touchstart', onTearStart);
    ticket.removeEventListener('touchmove',  onTearMove);
    ticket.removeEventListener('touchend',   onTearEnd);
    ticket.removeEventListener('mousedown',  onTearStartM);
    document.removeEventListener('mousemove', onTearMoveM);
    document.removeEventListener('mouseup',   onTearEndM);

    setTimeout(() => revealPrize(currentTicketIdx), 400);
  } else {
    // Snap back
    const overlay = document.getElementById('tearOverlay');
    if (overlay) {
      overlay.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
      overlay.style.transform = 'translateY(0)';
      overlay.style.opacity   = '1';
      setTimeout(() => { if (overlay) overlay.style.transition = ''; }, 260);
    }
    tearCurrentY = 0;
  }
}

/* ══════════════════════════════════════
   REVEAL
══════════════════════════════════════ */
function revealPrize(idx) {
  const t = tickets[idx];
  const prize = cfg.prizes[t.prizeIdx];

  // Mark used
  tickets[idx].used = true;
  saveTickets(tickets);

  // Render reveal card
  document.getElementById('revealCard').innerHTML = `
    <div class="reveal-ticket-top" style="background:${prize.color}dd">
      <div class="reveal-ticket-rank" style="color:rgba(0,0,0,0.25)">${escHtml(prize.rank)}</div>
      <div class="reveal-ticket-rank" style="color:#fff;margin-top:-40px">${escHtml(prize.rank)}</div>
      <div class="reveal-ticket-prize">${escHtml(prize.name)}</div>
    </div>
    <div class="reveal-ticket-note">${escHtml(cfg.note)}</div>
  `;

  // Confetti
  launchConfetti(prize.color);

  showView('viewReveal');
}

function launchConfetti(mainColor) {
  const burst = document.getElementById('revealBurst');
  burst.innerHTML = '';
  const colors = [mainColor, '#fff', '#ffd700', '#ff8080', '#80ffb0'];
  for (let i = 0; i < 55; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.top  = '-12px';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width  = (6 + Math.random() * 8) + 'px';
    piece.style.height = (8 + Math.random() * 12) + 'px';
    piece.style.animationDuration = (1.2 + Math.random() * 2) + 's';
    piece.style.animationDelay    = (Math.random() * 0.5) + 's';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    burst.appendChild(piece);
  }
}

function backToLobby() {
  showView('viewLobby');
  renderLobby();
}

/* ══════════════════════════════════════
   SETTINGS MODAL
══════════════════════════════════════ */
function openSettings() {
  // Populate fields
  document.getElementById('cfgTitle').value = cfg.title;
  document.getElementById('cfgBrand').value = cfg.brand;
  document.getElementById('cfgSub').value   = cfg.sub;
  document.getElementById('cfgNote').value  = cfg.note;
  renderPrizeEditor();
  openModal('modalSettings');
}

function renderPrizeEditor() {
  const editor = document.getElementById('prizesEditor');
  editor.innerHTML = '';
  cfg.prizes.forEach((p, i) => {
    editor.appendChild(makePrizeRow(p, i));
  });
}

function makePrizeRow(p, i) {
  const row = document.createElement('div');
  row.className = 'prize-row';
  row.dataset.idx = i;
  row.innerHTML = `
    <div class="prize-color-btn" style="background:${p.color}">
      <input type="color" value="${p.color}" oninput="updatePrizeColor(${i},this.value,this.parentElement)">
    </div>
    <input class="prize-rank-input" type="text" value="${escHtml(p.rank)}" maxlength="3" placeholder="A" oninput="cfg.prizes[${i}].rank=this.value">
    <input class="prize-name-input" type="text" value="${escHtml(p.name)}" maxlength="16" placeholder="獎項名稱" oninput="cfg.prizes[${i}].name=this.value">
    <input class="prize-count-input" type="number" value="${p.count}" min="1" max="99" oninput="cfg.prizes[${i}].count=Math.max(1,parseInt(this.value)||1)">
    <span class="prize-count-label">張</span>
    <button class="prize-del-btn" onclick="deletePrizeRow(${i})">✕</button>
  `;
  return row;
}

function updatePrizeColor(i, color, btn) {
  cfg.prizes[i].color = color;
  btn.style.background = color;
}

function addPrizeRow() {
  const ranks = ['A','B','C','D','E','F','G','H'];
  const used  = cfg.prizes.map(p => p.rank);
  const rank  = ranks.find(r => !used.includes(r)) || String.fromCharCode(65 + cfg.prizes.length);
  const colors = ['#e8c840','#c0a0e8','#4fa3e8','#e87040','#50c878','#ff80c0','#80ffe0'];
  cfg.prizes.push({ rank, name: '', color: colors[cfg.prizes.length % colors.length], count: 1 });
  renderPrizeEditor();
}

function deletePrizeRow(i) {
  if (cfg.prizes.length <= 1) return;
  cfg.prizes.splice(i, 1);
  renderPrizeEditor();
}

function saveSettings() {
  cfg.title = document.getElementById('cfgTitle').value.trim() || DEFAULT_CONFIG.title;
  cfg.brand = document.getElementById('cfgBrand').value.trim() || DEFAULT_CONFIG.brand;
  cfg.sub   = document.getElementById('cfgSub').value.trim()   || DEFAULT_CONFIG.sub;
  cfg.note  = document.getElementById('cfgNote').value.trim()  || DEFAULT_CONFIG.note;
  // Prizes already mutated live in cfg.prizes

  // Validate
  cfg.prizes = cfg.prizes.filter(p => p.name.trim() || p.rank.trim());
  if (!cfg.prizes.length) cfg.prizes = structuredClone(DEFAULT_CONFIG.prizes);

  saveCfg(cfg);
  tickets = buildTickets();
  saveTickets(tickets);
  closeModal('modalSettings');
  renderLobby();
}

/* ══════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeIfBg(e, id) { if (e.target === document.getElementById(id)) closeModal(id); }

/* ══════════════════════════════════════
   UTILS
══════════════════════════════════════ */
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
ensureTickets();
renderLobby();
showView('viewLobby');
