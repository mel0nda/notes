/* ── Textboard — app.js ──────────────────────────────── */

const canvas      = document.getElementById('canvas');
const hint        = document.getElementById('hint');
const fileInput   = document.getElementById('file-input');
const sizeSel     = document.getElementById('size-sel');
const colorSel    = document.getElementById('color-sel');
const styleSel    = document.getElementById('style-sel');
const dropOverlay = document.getElementById('drop-overlay');
const backdrop    = document.getElementById('modal-backdrop');
const modalInput  = document.getElementById('modal-input');

/* ── State ──────────────────────────────────────────── */
let pieces   = [];
let selected = null;
let zTop     = 1;

/* ── Helpers ────────────────────────────────────────── */
function rand(min, max) { return Math.random() * (max - min) + min; }

function showHint() {
  hint.style.opacity = pieces.length ? '0' : '1';
  hint.style.pointerEvents = pieces.length ? 'none' : '';
}

function randomSlant() {
  const deg = rand(-6, 6);
  return deg;
}

/* ── Text splitting ─────────────────────────────────── */
function splitText(text) {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks = [];

  paragraphs.forEach(para => {
    const words = para.split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < words.length) {
      const r = Math.random();
      // mix of single words, short phrases, and longer chunks
      const size = r < 0.35 ? 1 : r < 0.65 ? 2 : r < 0.85 ? 3 : Math.floor(rand(4, 7));
      chunks.push(words.slice(i, i + size).join(' '));
      i += size;
    }
  });

  return chunks;
}

/* ── Create a piece ─────────────────────────────────── */
function createPiece(text, opts = {}) {
  const cW = canvas.offsetWidth;
  const cH = canvas.offsetHeight;

  const x       = opts.x       ?? rand(40, cW - 200);
  const y       = opts.y       ?? rand(40, cH - 80);
  const fs      = opts.size    ?? parseInt(sizeSel.value);
  const color   = opts.color   ?? colorSel.value;
  const style   = opts.style   ?? styleSel.value;
  const slant   = opts.slant   ?? randomSlant();

  const el = document.createElement('div');
  el.className = `piece style-${style} c-${color}`;
  el.style.cssText = `
    left: ${x}px;
    top:  ${y}px;
    font-size: ${fs}px;
    --rot: ${slant}deg;
    transform: rotate(${slant}deg);
    z-index: ${++zTop};
  `;
  el.dataset.slant = slant;
  el.textContent = text;

  /* delete button */
  const del = document.createElement('button');
  del.className = 'piece-del';
  del.innerHTML = '×';
  del.title = 'Remove';
  del.addEventListener('pointerdown', e => {
    e.stopPropagation();
    removePiece(el);
  });

  /* edit button */
  const editBtn = document.createElement('button');
  editBtn.className = 'piece-edit';
  editBtn.innerHTML = '✎';
  editBtn.title = 'Edit (or double-click)';
  editBtn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    startInlineEdit(el);
  });

  el.appendChild(del);
  el.appendChild(editBtn);

  /* drag */
  el.addEventListener('pointerdown', onPieceDown);
  /* double-click to edit */
  el.addEventListener('dblclick', () => startInlineEdit(el));

  canvas.appendChild(el);
  pieces.push(el);
  showHint();
  return el;
}

/* ── Remove piece ───────────────────────────────────── */
function removePiece(el) {
  el.style.transition = 'opacity 0.15s, transform 0.15s';
  el.style.opacity = '0';
  el.style.transform += ' scale(0.8)';
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
    pieces = pieces.filter(p => p !== el);
    if (selected === el) selected = null;
    showHint();
  }, 150);
}

/* ── Place chunks with stagger ──────────────────────── */
const COLORS = ['ink','rust','sage','slate','gold'];
const SIZES  = [10, 14, 20, 28, 40];
const STYLES = ['serif', 'mono', 'italic'];

function placeChunks(chunks) {
  chunks.forEach((chunk, i) => {
    setTimeout(() => {
      createPiece(chunk, {
        size:  SIZES[Math.floor(Math.random() * SIZES.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        style: STYLES[Math.floor(Math.random() * STYLES.length)],
      });
    }, i * 35);
  });
}

/* ── Inline editing ─────────────────────────────────── */
function startInlineEdit(el) {
  if (el.querySelector('textarea')) return;
  selectPiece(el);

  const orig = el.childNodes[0].nodeType === Node.TEXT_NODE
    ? el.childNodes[0].textContent
    : '';

  // Remove text node
  el.childNodes[0] && el.childNodes[0].nodeType === Node.TEXT_NODE
    && el.removeChild(el.childNodes[0]);

  const ta = document.createElement('textarea');
  ta.value = orig;
  ta.rows = 2;
  ta.style.fontSize = 'inherit';
  ta.style.width = Math.max(120, el.offsetWidth) + 'px';
  el.insertBefore(ta, el.firstChild);
  ta.focus();
  ta.select();

  function finish() {
    const val = ta.value.trim() || orig;
    el.removeChild(ta);
    const tn = document.createTextNode(val);
    el.insertBefore(tn, el.firstChild);
    ta.removeEventListener('blur', finish);
    ta.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(); }
    if (e.key === 'Escape') { ta.value = orig; finish(); }
  }

  ta.addEventListener('blur', finish);
  ta.addEventListener('keydown', onKey);
  ta.addEventListener('pointerdown', e => e.stopPropagation());
}

/* ── Selection ──────────────────────────────────────── */
function selectPiece(el) {
  if (selected && selected !== el) selected.classList.remove('selected');
  selected = el;
  el.classList.add('selected');
  el.style.zIndex = ++zTop;
}

/* ── Drag ────────────────────────────────────────────── */
let dragEl   = null;
let dragOffX = 0;
let dragOffY = 0;
let moved    = false;

function onPieceDown(e) {
  if (e.target.classList.contains('piece-del') ||
      e.target.classList.contains('piece-edit') ||
      e.target.tagName === 'TEXTAREA') return;

  e.stopPropagation();
  dragEl = e.currentTarget;
  selectPiece(dragEl);
  moved = false;

  const rect = dragEl.getBoundingClientRect();
  dragOffX = e.clientX - rect.left;
  dragOffY = e.clientY - rect.top;

  dragEl.style.cursor = 'grabbing';
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup',   onDragEnd);
}

function onDragMove(e) {
  if (!dragEl) return;
  moved = true;
  const cRect = canvas.getBoundingClientRect();
  const nx = e.clientX - cRect.left - dragOffX;
  const ny = e.clientY - cRect.top  - dragOffY;
  dragEl.style.left = nx + 'px';
  dragEl.style.top  = ny + 'px';
}

function onDragEnd() {
  if (dragEl) dragEl.style.cursor = '';
  dragEl = null;
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup',   onDragEnd);
}

/* deselect on canvas click */
canvas.addEventListener('pointerdown', e => {
  if (e.target === canvas || e.target === hint || e.target === hint.parentNode) {
    if (selected) { selected.classList.remove('selected'); selected = null; }
  }
});

/* ── File upload ─────────────────────────────────────── */
function loadFile(file) {
  if (!file.name.match(/\.(txt|md)$/i)) return;
  const reader = new FileReader();
  reader.onload = e => placeChunks(splitText(e.target.result));
  reader.readAsText(file);
}

fileInput.addEventListener('change', e => {
  Array.from(e.target.files).forEach(loadFile);
  fileInput.value = '';
});

/* ── Drag & drop files ───────────────────────────────── */
canvas.addEventListener('dragover', e => {
  e.preventDefault();
  dropOverlay.classList.add('active');
});
canvas.addEventListener('dragleave', e => {
  if (!canvas.contains(e.relatedTarget)) dropOverlay.classList.remove('active');
});
canvas.addEventListener('drop', e => {
  e.preventDefault();
  dropOverlay.classList.remove('active');
  Array.from(e.dataTransfer.files).forEach(loadFile);
});

/* ── Add text modal ──────────────────────────────────── */
document.getElementById('add-btn').addEventListener('click', openModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-confirm').addEventListener('click', () => {
  const text = modalInput.value.trim();
  if (text) placeChunks(splitText(text));
  closeModal();
});

function openModal() {
  modalInput.value = '';
  backdrop.classList.add('open');
  setTimeout(() => modalInput.focus(), 50);
}

function closeModal() {
  backdrop.classList.remove('open');
}

backdrop.addEventListener('pointerdown', e => {
  if (e.target === backdrop) closeModal();
});

modalInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    document.getElementById('modal-confirm').click();
  }
  if (e.key === 'Escape') closeModal();
});

/* ── Scatter ─────────────────────────────────────────── */
document.getElementById('scatter-btn').addEventListener('click', () => {
  const cW = canvas.offsetWidth;
  const cH = canvas.offsetHeight;
  pieces.forEach((el, i) => {
    setTimeout(() => {
      const x = rand(40, cW - 200);
      const y = rand(40, cH - 80);
      const slant = randomSlant();
      el.classList.add('scattering');
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      el.style.transform = `rotate(${slant}deg)`;
      el.dataset.slant = slant;
      el.style.setProperty('--rot', slant + 'deg');
      setTimeout(() => el.classList.remove('scattering'), 500);
    }, i * 25);
  });
});

/* ── Clear ───────────────────────────────────────────── */
document.getElementById('clear-btn').addEventListener('click', () => {
  if (!pieces.length) return;
  if (!confirm('Clear all pieces from the canvas?')) return;
  [...pieces].forEach(removePiece);
});

/* ── Export as PNG ───────────────────────────────────── */
document.getElementById('export-btn').addEventListener('click', exportCanvas);

function exportCanvas() {
  // Build an SVG representation of the canvas
  const cW = canvas.offsetWidth;
  const cH = canvas.offsetHeight;

  let svgParts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cW}" height="${cH}">`,
    `<rect width="${cW}" height="${cH}" fill="#ede8e0"/>`,
  ];

  // grid pattern
  svgParts.push(`<defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(26,23,20,0.12)" stroke-width="0.5"/>
    </pattern>
  </defs>`);
  svgParts.push(`<rect width="${cW}" height="${cH}" fill="url(#grid)"/>`);

  const colorMap = {
    ink: '#1a1714', chalk: '#f0ede7', rust: '#b03a18',
    sage: '#3d6b52', slate: '#2e4060', gold: '#8a6120',
  };

  pieces.forEach(el => {
    const rect = el.getBoundingClientRect();
    const cRect = canvas.getBoundingClientRect();
    const x = rect.left - cRect.left;
    const y = rect.top  - cRect.top;
    const fs = parseFloat(el.style.fontSize);
    const slant = parseFloat(el.dataset.slant || 0);
    const color = el.className.match(/c-(\w+)/)?.[1] || 'ink';
    const fill  = colorMap[color] || '#1a1714';

    const textNode = el.childNodes[0];
    const text = textNode && textNode.nodeType === Node.TEXT_NODE
      ? textNode.textContent : el.textContent.replace(/[×✎]/g, '').trim();

    const cx = x + rect.width / 2;
    const cy = y + rect.height / 2;

    svgParts.push(
      `<text transform="rotate(${slant},${cx},${cy})" ` +
      `x="${x}" y="${y + fs}" ` +
      `font-size="${fs}" fill="${fill}" ` +
      `font-family="Georgia,serif">${escapeXml(text)}</text>`
    );
  });

  svgParts.push('</svg>');
  const svgStr = svgParts.join('\n');
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'textboard.svg';
  a.click();
  URL.revokeObjectURL(url);
}

function escapeXml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

/* ── Keyboard shortcuts ──────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

  // Delete selected
  if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
    removePiece(selected);
  }
  // Escape to deselect
  if (e.key === 'Escape' && selected) {
    selected.classList.remove('selected');
    selected = null;
  }
  // Ctrl+Z not implemented (future)
});

/* ── Init ────────────────────────────────────────────── */
showHint();
