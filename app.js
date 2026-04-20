const PER_PAGE = 30;

// [FIX 1] : Plus de dépôt par défaut. On démarre avec une liste vide.
let repos = [];
let activeRepoId = null;

const COLL_COLORS = ['#2563eb','#dc2626','#16a34a','#d97706','#7c3aed','#0891b2','#db2777','#65a30d','#ea580c','#0f766e'];

let allServices = [], filtered = [];
let page = 1, seen = new Set(), ratings = {}, hideSeen = false;
let viewMode = 'grid';
let sidebarMode = 'all';
let collections = [];
let openDropdownId = null;

// [FIX 2] : Cache des nœuds DOM des cartes pour le diff.
// La clé = svc.id, la valeur = l'élément DOM .card déjà créé.
const cardCache = new Map();

// [BUG FIX seen] : Données importées à réappliquer APRÈS le fetch du dépôt.
// Problème : handleImport charge seen/ratings, puis appelle switchRepo qui
// fait `seen = new Set()` en début de fonction — effaçant tout.
// Solution : on stocke les données dans pendingState et on les réinjecte
// une fois que le dépôt est chargé, juste avant le premier render().
let pendingState = null;

// ─────────────────────────────────────────────────────────────────────
// SAUVEGARDE AUTOMATIQUE — localStorage
// Clé unique pour ne pas collisionner avec d'autres apps sur le même origin.
// ─────────────────────────────────────────────────────────────────────
const LS_KEY = 'md-board-state';
let saveTimer = null;

function saveState() {
  // Debounce : on attend 800 ms après la dernière action avant d'écrire.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data = {
        seenServices: [...seen],
        ratings,
        collections,
        repos,
        activeRepoId
      };
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      showSaveIndicator();
    } catch (e) {
      // Quota dépassé ou mode privé sans storage → on ignore silencieusement.
      console.warn('localStorage indisponible :', e);
    }
  }, 800);
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (typeof d !== 'object' || d === null || Array.isArray(d)) return false;

    if (d.seenServices && Array.isArray(d.seenServices))
      seen = new Set(d.seenServices.map(String));
    if (d.ratings && typeof d.ratings === 'object' && !Array.isArray(d.ratings))
      Object.keys(d.ratings).forEach(k => { ratings[String(k)] = Number(d.ratings[k]) || 0; });
    if (d.collections && Array.isArray(d.collections))
      collections = d.collections.map(c => ({
        id:    String(c.id   || Date.now()),
        name:  String(c.name || 'Sans Nom'),
        color: String(c.color || '#2563eb'),
        items: Array.isArray(c.items) ? c.items.map(String) : []
      }));
    if (d.repos && Array.isArray(d.repos))
      repos = d.repos.map(r => ({
        id:   String(r.id),
        name: String(r.name),
        url:  sanitizeUrl(r.url)
      }));
    if (d.activeRepoId) activeRepoId = String(d.activeRepoId);
    return true;
  } catch (e) {
    console.warn('Échec lecture localStorage :', e);
    return false;
  }
}

// Petit indicateur visuel discret dans la sidebar
function showSaveIndicator() {
  let el = document.getElementById('save-indicator');
  if (!el) return;
  el.classList.add('visible');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.remove('visible'), 1800);
}

const PALETTE = ['#2563eb','#0891b2','#059669','#7c3aed','#db2777','#ea580c','#ca8a04','#4f46e5','#0f766e','#be123c','#1d4ed8','#0284c7','#15803d','#6d28d9','#9a3412'];
const catColors = {};
function getCatColor(cat) {
  if (!catColors[cat]) catColors[cat] = PALETTE[Object.keys(catColors).length % PALETTE.length];
  return catColors[cat];
}

function escapeHTML(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeUrl(url) {
  if (!url) return '#';
  const safeUrl = url.trim();
  if (/^(javascript|vbscript|data):/i.test(safeUrl)) {
    console.warn("URL bloquée (tentative d'injection) :", safeUrl);
    return '#';
  }
  return safeUrl;
}

function highlight(text, q) {
  const frag = document.createDocumentFragment();
  if (!q || !text) {
    frag.appendChild(document.createTextNode(text || ''));
    return frag;
  }
  const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const regex = new RegExp(`(${safeQ})`, 'gi');
  const parts = text.split(regex);
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      const mark = document.createElement('mark');
      mark.textContent = part;
      frag.appendChild(mark);
    } else if (part) {
      frag.appendChild(document.createTextNode(part));
    }
  });
  return frag;
}

function parseReadme(text) {
  const lines = text.split('\n');
  const svcs = [], cats = new Set();
  let curCat = '';

  for (const ln of lines) {
    if (/^#+\s*(License|Contributing|Code of Conduct|Acknowledgements?|Credits?|Sponsor|Support|Changelog)\b/i.test(ln)) break;

    if (ln.startsWith('## ') || ln.startsWith('### ')) {
      const newCat = ln.replace(/^#+\s*/, '').trim();
      if (newCat) { curCat = newCat; cats.add(curCat); }
      continue;
    }

    const m = ln.match(/^\s*[-*]\s+\[([^\]]+)\]\((https?:\/\/[^)]+)\)\s*(?:[-–—]\s*(.*))?/);
    if (m) {
      const name = m[1].trim();
      const url  = m[2].trim();
      let desc = (m[3] || '').split(/\(\[Source\s*[Cc]ode\]/i)[0].replace(/`[^`]*`/g,'').trim();
      if (desc.endsWith('-') || desc.endsWith('–')) desc = desc.slice(0,-1).trim();
      if (!name || url.startsWith('#')) continue;
      const cat = curCat || 'Général';
      if (!cats.has(cat)) cats.add(cat);
      const id = (cat+'-'+name).toLowerCase().replace(/[^a-z0-9]+/g,'-');
      svcs.push({ id, name, url, category: cat, description: desc });
    }
  }
  return { services: svcs, cats: [...cats].sort() };
}

function getServiceColls(id) { return collections.filter(c => c.items.includes(id)); }

function toggleCollItem(collId, svcId) {
  const c = collections.find(x=>x.id===collId); if (!c) return;
  const idx = c.items.indexOf(svcId);
  if (idx === -1) c.items.push(svcId); else c.items.splice(idx,1);
  renderSidebar(); renderCollDropdown(svcId);
  const card = document.querySelector(`.card[data-id="${svcId}"]`);
  if (card) refreshCardColls(card, svcId);
  saveState();
}

function refreshCardColls(card, id) {
  const existing = card.querySelector('.card-colls');
  if (existing) existing.remove();
  const colls = getServiceColls(id);
  if (colls.length === 0) return;
  const body = card.querySelector('.card-body');
  const actionsRow = card.querySelector('.card-actions');
  body.insertBefore(buildCollPills(id, colls), actionsRow);
}

function buildCollPills(id, colls) {
  const el = document.createElement('div');
  el.className = 'card-colls';
  colls.forEach(c => {
    const pill = document.createElement('span');
    pill.className = 'coll-pill';
    pill.style.cssText = `background:${c.color}16;color:${c.color};border-color:${c.color}30`;
    pill.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:${c.color};display:inline-block"></span>${escapeHTML(c.name)}<span class="pill-x">×</span>`;
    pill.querySelector('.pill-x').addEventListener('click', e => { e.stopPropagation(); toggleCollItem(c.id, id); });
    el.appendChild(pill);
  });
  return el;
}

function renderCollDropdown(cardId) {
  document.querySelectorAll('.coll-dropdown').forEach(d => d.remove());
  if (openDropdownId !== cardId) return;
  const card = document.querySelector(`.card[data-id="${cardId}"]`);
  if (!card) return;
  const actionsRow = card.querySelector('.card-actions');
  const drop = document.createElement('div');
  drop.className = 'coll-dropdown';
  if (collections.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'coll-dropdown-empty';
    empty.textContent = 'Aucune collection créée';
    drop.appendChild(empty);
  } else {
    collections.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'coll-dropdown-item' + (c.items.includes(cardId) ? ' in-coll' : '');
      btn.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${c.color};flex-shrink:0"></span>${escapeHTML(c.name)}${c.items.includes(cardId)?' ✓':''}`;
      btn.addEventListener('click', e => { e.stopPropagation(); toggleCollItem(c.id, cardId); });
      drop.appendChild(btn);
    });
  }
  actionsRow.appendChild(drop);
}

function renderCard(svc) {
  const color = getCatColor(svc.category);
  const isSeen = seen.has(svc.id);
  const rating = ratings[svc.id] || 0;
  const q = document.getElementById('search').value.trim().toLowerCase();
  const collsOnCard = getServiceColls(svc.id);

  const card = document.createElement('div');
  card.className = 'card' + (isSeen ? ' seen' : '');
  card.dataset.id = svc.id;

  const acc = document.createElement('div');
  acc.className = 'card-accent';
  acc.style.background = `linear-gradient(90deg, ${color}, ${color}55)`;
  card.appendChild(acc);

  const body = document.createElement('div');
  body.className = 'card-body';
  const top = document.createElement('div');
  top.className = 'card-top';
  const info = document.createElement('div');
  info.style.cssText = 'flex:1;min-width:0';

  const tag = document.createElement('span');
  tag.className = 'cat-tag';
  tag.style.cssText = `background:${color}13;color:${color}`;
  tag.textContent = svc.category;
  tag.addEventListener('click', () => { document.getElementById('sel-cat').value = svc.category; applyFilters(); });

  const nameEl = document.createElement('div');
  nameEl.className = 'card-name';
  nameEl.title = svc.name;
  nameEl.appendChild(highlight(svc.name, q));

  info.append(tag, nameEl);

  const seenBtn = document.createElement('button');
  seenBtn.className = 'seen-btn' + (isSeen ? ' active' : '');
  seenBtn.innerHTML = isSeen ? '✓' : '○';
  seenBtn.addEventListener('click', () => toggleSeen(svc.id, card));
  top.append(info, seenBtn);

  const starsEl = document.createElement('div');
  starsEl.className = 'stars';
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement('button');
    s.className = 'star' + (i <= rating ? ' on' : '');
    s.textContent = '★';
    s.addEventListener('click', () => setRating(svc.id, i, starsEl));
    starsEl.appendChild(s);
  }

  const desc = document.createElement('p');
  desc.className = 'card-desc';
  desc.appendChild(highlight(svc.description, q));

  if (collsOnCard.length > 0) {
    body.append(top, starsEl, desc, buildCollPills(svc.id, collsOnCard));
  } else {
    body.append(top, starsEl, desc);
  }

  const actionsRow = document.createElement('div');
  actionsRow.className = 'card-actions';
  const addBtn = document.createElement('button');
  addBtn.className = 'add-coll-btn';
  addBtn.innerHTML = `+ Collection`;
  addBtn.addEventListener('click', e => {
    e.stopPropagation();
    openDropdownId = openDropdownId === svc.id ? null : svc.id;
    renderCollDropdown(svc.id);
  });
  actionsRow.appendChild(addBtn);
  body.appendChild(actionsRow);
  card.appendChild(body);

  const footer = document.createElement('div');
  footer.className = 'card-footer';
  const urlShort = svc.url.replace(/^https?:\/\//, '');
  const link = document.createElement('a');
  link.className = 'card-link';
  link.href = sanitizeUrl(svc.url);
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.innerHTML = `<span class="card-link-text">${escapeHTML(urlShort)}</span> →`;
  footer.appendChild(link);
  card.appendChild(footer);
  return card;
}

function toggleSeen(id, cardEl) {
  const marking = !seen.has(id);
  if (seen.has(id)) seen.delete(id); else seen.add(id);
  updateProgress(); updateSidebarCounts();
  if (!cardEl) cardEl = document.querySelector(`.card[data-id="${id}"]`);
  if (!cardEl) return;
  if (hideSeen && marking) {
    cardEl.classList.add('removing');
    setTimeout(() => {
      cardEl.remove();
      // [FIX 2] : On retire aussi la carte du cache quand elle est supprimée visuellement
      cardCache.delete(id);
      filtered = filtered.filter(s => s.id !== id);
      updateBadge();
      if (!document.querySelector('.card:not(.removing)')) document.getElementById('empty').style.display = 'block';
    }, 220);
    saveState();
    return;
  }
  cardEl.classList.toggle('seen', seen.has(id));
  const btn = cardEl.querySelector('.seen-btn');
  btn.classList.toggle('active', seen.has(id));
  btn.innerHTML = seen.has(id) ? '✓' : '○';
  saveState();
}

function setRating(id, star, starsEl) {
  ratings[id] = ratings[id] === star ? 0 : star;
  const r = ratings[id] || 0;
  starsEl.querySelectorAll('.star').forEach((s,i) => s.classList.toggle('on', i+1 <= r));
  updateSidebarCounts();
  saveState();
}

function updateProgress() {
  const pct = allServices.length ? Math.round(seen.size / allServices.length * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = pct + '%';
  document.getElementById('seen-count').textContent = seen.size + ' vus';
}

function updateSidebarCounts() {
  document.getElementById('sb-all-count').textContent = allServices.length;
  document.getElementById('sb-seen-count').textContent = seen.size;
  document.getElementById('sb-unseen-count').textContent = allServices.length - seen.size;
  document.getElementById('sb-rated-count').textContent = Object.values(ratings).filter(r=>r>0).length;
}

function updateBadge() { document.getElementById('count-badge').textContent = `${filtered.length} / ${allServices.length}`; }

function renderSidebar() {
  const listEl = document.getElementById('coll-list');
  listEl.innerHTML = '';
  collections.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'coll-item' + (sidebarMode === 'coll:'+c.id ? ' active' : '');
    btn.innerHTML = `<span class="coll-dot" style="background:${escapeHTML(c.color)}"></span><span class="coll-name">${escapeHTML(c.name)}</span><span class="coll-count">${c.items.length}</span><button class="coll-del" title="Supprimer">×</button>`;
    btn.addEventListener('click', () => { sidebarMode = 'coll:'+c.id; renderSidebar(); applyFilters(); updateSidebarActive(); });
    btn.querySelector('.coll-del').addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm(`Supprimer la collection ?`)) return;
      collections = collections.filter(x=>x.id!==c.id);
      if (sidebarMode === 'coll:'+c.id) { sidebarMode = 'all'; updateSidebarActive(); applyFilters(); }
      renderSidebar();
      saveState();
    });
    listEl.appendChild(btn);
  });
}

function updateSidebarActive() {
  document.querySelectorAll('#sb-all, #sb-seen, #sb-unseen, #sb-rated').forEach(b => b.classList.remove('active'));
  const map = {all:'#sb-all', seen:'#sb-seen', unseen:'#sb-unseen', rated:'#sb-rated'};
  if (map[sidebarMode]) document.querySelector(map[sidebarMode]).classList.add('active');
}

function applyFilters() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const cat = document.getElementById('sel-cat').value;
  const ratingF = document.getElementById('sel-rating').value;
  const sort = document.getElementById('sel-sort').value;

  filtered = allServices.filter(s => {
    if (sidebarMode === 'seen' && !seen.has(s.id)) return false;
    if (sidebarMode === 'unseen' && seen.has(s.id)) return false;
    if (sidebarMode === 'rated' && !(ratings[s.id] > 0)) return false;
    if (sidebarMode.startsWith('coll:')) {
      const c = collections.find(x=>x.id===sidebarMode.slice(5));
      if (!c || !c.items.includes(s.id)) return false;
    }
    if (hideSeen && seen.has(s.id)) return false;
    if (cat && s.category !== cat) return false;
    const r = ratings[s.id] || 0;
    if (ratingF === 'unrated' && r > 0) return false;
    if (ratingF && ratingF !== 'unrated' && r < parseInt(ratingF)) return false;
    if (q) { if (!(s.name+' '+s.description+' '+s.category).toLowerCase().includes(q)) return false; }
    return true;
  });

  if (sort === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));
  else if (sort === 'name-desc') filtered.sort((a,b) => b.name.localeCompare(a.name));
  else if (sort === 'rating-desc') filtered.sort((a,b) => (ratings[b.id]||0)-(ratings[a.id]||0));
  page = 1; render();
}

// ─────────────────────────────────────────────────────────────────────
// [FIX 2] : render() avec DOM diff léger
// ─────────────────────────────────────────────────────────────────────
let lastQuery = '';

function render(preserveScroll = false) {
  const grid = document.getElementById('grid');
  const lmW  = document.getElementById('load-more-wrap');
  const lmBtn = document.getElementById('load-more');
  const emptyEl = document.getElementById('empty');
  const emptyRepoEl = document.getElementById('empty-repo');

  updateBadge();
  if (!preserveScroll) document.getElementById('main-area').scrollTop = 0;

  // Pas de dépôt chargé → on affiche l'écran d'accueil
  if (allServices.length === 0 && repos.length === 0) {
    emptyRepoEl.classList.add('show');
    grid.style.display = 'none';
    emptyEl.style.display = 'none';
    lmW.style.display = 'none';
    return;
  }
  emptyRepoEl.classList.remove('show');

  const q = document.getElementById('search').value.trim().toLowerCase();
  const queryChanged = q !== lastQuery;
  lastQuery = q;

  emptyEl.style.display = filtered.length === 0 ? 'block' : 'none';

  if (viewMode === 'grid') {
    grid.style.display = 'grid';
    lmW.style.display = 'none';

    const slice = filtered.slice(0, page * PER_PAGE);
    const sliceIds = new Set(slice.map(s => s.id));

    // 1. Retirer les cartes qui ne sont plus dans la tranche
    for (const [id, cardEl] of cardCache) {
      if (!sliceIds.has(id)) {
        cardEl.remove();
        cardCache.delete(id);
      }
    }

    // 2. Créer ou recycler, puis insérer dans l'ordre
    const frag = document.createDocumentFragment();
    slice.forEach((s, i) => {
      let cardEl = cardCache.get(s.id);
      if (!cardEl) {
        cardEl = renderCard(s);
        cardEl.style.animationDelay = Math.min(i % PER_PAGE, 14) * 15 + 'ms';
        cardCache.set(s.id, cardEl);
      } else if (queryChanged) {
        refreshCardHighlight(cardEl, s, q);
      }
      frag.appendChild(cardEl);
    });
    grid.appendChild(frag);

    if (slice.length < filtered.length) {
      lmW.style.display = 'block';
      lmBtn.textContent = `Afficher plus · ${filtered.length - slice.length} restants`;
    }

  } else {
    // Vue catégories : on vide le cache et on reconstruit (sections dépliables)
    cardCache.clear();
    grid.style.display = 'block';
    grid.innerHTML = '';
    lmW.style.display = 'none';

    const byCat = {};
    filtered.forEach(s => { if (!byCat[s.category]) byCat[s.category] = []; byCat[s.category].push(s); });
    Object.entries(byCat).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([cat, svcs]) => {
      const section = document.createElement('div');
      section.className = 'cat-section';
      const hdr = document.createElement('div');
      hdr.className = 'cat-section-header';
      hdr.innerHTML = `<span class="cat-section-title" style="color:${getCatColor(cat)}">${escapeHTML(cat)}</span><span class="cat-section-count">${svcs.length}</span><span class="cat-section-line"></span>`;
      hdr.addEventListener('click', () => section.classList.toggle('collapsed'));
      const catGrid = document.createElement('div');
      catGrid.className = 'cat-section-grid';
      svcs.forEach(s => catGrid.appendChild(renderCard(s)));
      section.append(hdr, catGrid);
      grid.appendChild(section);
    });
  }
}

// Rafraîchit uniquement le texte highlighté dans une carte déjà rendue.
function refreshCardHighlight(cardEl, svc, q) {
  const nameEl = cardEl.querySelector('.card-name');
  const descEl = cardEl.querySelector('.card-desc');
  if (nameEl) { nameEl.innerHTML = ''; nameEl.appendChild(highlight(svc.name, q)); }
  if (descEl) { descEl.innerHTML = ''; descEl.appendChild(highlight(svc.description, q)); }
}

let selectedColor = COLL_COLORS[0];
function setupModal() {
  const picker = document.getElementById('color-picker');
  COLL_COLORS.forEach(col => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (col === selectedColor ? ' selected' : '');
    sw.style.background = col;
    sw.addEventListener('click', () => {
      selectedColor = col;
      picker.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('selected'));
      sw.classList.add('selected');
    });
    picker.appendChild(sw);
  });
  document.getElementById('modal-cancel').addEventListener('click', () => document.getElementById('modal-overlay').classList.remove('show'));
  document.getElementById('modal-confirm').addEventListener('click', () => {
    const name = document.getElementById('modal-name').value.trim();
    if (!name) return;
    collections.push({ id: Date.now().toString(), name, color: selectedColor, items: [] });
    renderSidebar(); document.getElementById('modal-overlay').classList.remove('show');
    saveState();
  });
}

function renderRepoList() {
  const listEl = document.getElementById('repo-list');
  listEl.innerHTML = '';
  if (repos.length === 0) {
    const hint = document.createElement('p');
    hint.style.cssText = 'font-size:11px;color:var(--text3);padding:4px 10px 8px;line-height:1.5;font-family:var(--mono)';
    hint.textContent = 'Aucun dépôt ajouté.';
    listEl.appendChild(hint);
    updateExportBtn();
    return;
  }
  repos.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'repo-item' + (r.id === activeRepoId ? ' active' : '');
    btn.innerHTML = `<span class="repo-name">${escapeHTML(r.name)}</span><button class="repo-del" title="Supprimer">×</button>`;
    btn.addEventListener('click', e => { if (!e.target.classList.contains('repo-del')) switchRepo(r.id); });
    btn.querySelector('.repo-del').addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm(`Supprimer le dépôt "${r.name}" ?`)) return;
      repos = repos.filter(x => x.id !== r.id);
      if (activeRepoId === r.id) {
        activeRepoId = null;
        allServices = []; filtered = [];
        cardCache.clear();
        render();
      }
      renderRepoList();
      saveState();
    });
    listEl.appendChild(btn);
  });
  updateExportBtn();
}

async function switchRepo(repoId) {
  const repo = repos.find(r => r.id === repoId);
  if (!repo) return;
  activeRepoId = repoId;
  renderRepoList();

  // [BUG FIX seen] : On ne réinitialise seen/ratings QUE si on n'a pas
  // de données en attente issues d'un import.
  const restoring = pendingState !== null;
  allServices = []; filtered = [];
  if (!restoring) { seen = new Set(); ratings = {}; }
  sidebarMode = 'all';
  cardCache.clear();
  document.getElementById('search').value = '';
  document.getElementById('sel-cat').innerHTML = '<option value="">Toutes les catégories</option>';

  const loadingEl = document.getElementById('repo-loading');
  loadingEl.classList.add('show');

  try {
    const res = await fetch(repo.url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const { services, cats } = parseReadme(await res.text());
    allServices = services; filtered = services.slice();

    // [BUG FIX seen] : Réinjection du pendingState après le fetch.
    if (restoring && pendingState) {
      seen    = pendingState.seen;
      ratings = pendingState.ratings;
      pendingState = null;
    }

    cats.forEach(c => { const o = document.createElement('option'); o.value=c; o.textContent=c; document.getElementById('sel-cat').appendChild(o); });
    updateProgress(); updateSidebarCounts(); updateSidebarActive(); renderSidebar(); render();
    saveState();
  } catch(e) {
    pendingState = null;
    console.error(e);
    alert('Impossible de charger ce dépôt. Vérifiez l\'URL et votre connexion.');
  } finally {
    setTimeout(() => loadingEl.classList.remove('show'), 1200);
  }
}

function setupRepoModal() {
  document.getElementById('repo-modal-cancel').addEventListener('click', () => document.getElementById('repo-modal-overlay').classList.remove('show'));

  document.getElementById('repo-modal-confirm').addEventListener('click', () => {
    let url = document.getElementById('repo-modal-url').value.trim();
    if (!url) return;
    // Conversion URL GitHub normale → URL raw
    url = url.replace(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/, 'https://raw.githubusercontent.com/$1/$2/$3');
    url = url.replace(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/, 'https://raw.githubusercontent.com/$1/$2/master/README.md');

    const name = document.getElementById('repo-modal-name').value.trim() || url.split('/').slice(-3,-1).join('/');
    const existing = repos.find(r => r.url === url);
    if (existing) { switchRepo(existing.id); document.getElementById('repo-modal-overlay').classList.remove('show'); return; }

    const id = 'repo-' + Date.now();
    repos.push({ id, name, url });
    renderRepoList();
    document.getElementById('repo-modal-overlay').classList.remove('show');
    document.getElementById('repo-modal-url').value = '';
    document.getElementById('repo-modal-name').value = '';
    saveState();
    switchRepo(id);
  });
}

function handleExport() {
  if (repos.length === 0) return;
  const data = { seenServices:[...seen], ratings, collections, repos, activeRepoId };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = Object.assign(document.createElement('a'), {href:URL.createObjectURL(blob), download:'selfhosted-catalog-progression.json'});
  a.click();
}

function updateExportBtn() {
  document.getElementById('btn-export').disabled = repos.length === 0;
  document.getElementById('btn-export').title = repos.length === 0
    ? 'Ajoutez d\'abord un dépôt pour pouvoir exporter'
    : 'Exporter la progression';
}

// ─────────────────────────────────────────────────────────────────────
// [FIX 3] : Validation stricte du Content-Type à l'import JSON
// ─────────────────────────────────────────────────────────────────────
const ALLOWED_JSON_MIME = new Set(['application/json', 'text/plain', 'text/json', '']);

function handleImport(e) {
  const f = e.target.files[0];
  if (!f) return;

  // Vérification de l'extension
  if (!f.name.toLowerCase().endsWith('.json')) {
    alert('Fichier invalide : seuls les fichiers .json sont acceptés.');
    e.target.value = null;
    return;
  }

  // Vérification du type MIME
  const mime = (f.type || '').toLowerCase().split(';')[0].trim();
  if (!ALLOWED_JSON_MIME.has(mime)) {
    alert(`Fichier rejeté : type MIME non autorisé (${f.type || 'inconnu'}).\nUtilisez un fichier .json exporté depuis cette application.`);
    e.target.value = null;
    return;
  }

  const fr = new FileReader();
  fr.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);

      // Vérification que la racine est bien un objet
      if (typeof d !== 'object' || d === null || Array.isArray(d)) {
        throw new TypeError('La racine du JSON doit être un objet.');
      }

      if (d.seenServices && Array.isArray(d.seenServices)) {
        seen = new Set(d.seenServices.map(String));
      }
      if (d.ratings && typeof d.ratings === 'object' && !Array.isArray(d.ratings)) {
        Object.keys(d.ratings).forEach(k => { ratings[String(k)] = Number(d.ratings[k]) || 0; });
      }
      if (d.collections && Array.isArray(d.collections)) {
        collections = d.collections.map(c => ({
          id:    String(c.id   || Date.now()),
          name:  String(c.name || 'Sans Nom'),
          color: String(c.color || '#2563eb'),
          items: Array.isArray(c.items) ? c.items.map(String) : []
        }));
      }
      if (d.repos && Array.isArray(d.repos)) {
        repos = d.repos.map(r => ({
          id:   String(r.id),
          name: String(r.name),
          url:  sanitizeUrl(r.url)
        }));
      }
      if (d.activeRepoId) activeRepoId = String(d.activeRepoId);

      // [BUG FIX seen]
      pendingState = { seen, ratings };

      cardCache.clear();
      renderRepoList(); updateProgress(); updateSidebarCounts(); renderSidebar();

      if (activeRepoId && repos.find(r => r.id === activeRepoId)) {
        switchRepo(activeRepoId);
      } else {
        pendingState = null;
        applyFilters();
      }
      saveState();
    } catch (err) {
      alert('Fichier invalide ou corrompu.\n' + err.message);
      console.error('Import JSON échoué :', err);
    }
  };
  fr.onerror = () => {
    alert('Impossible de lire le fichier.');
  };
  fr.readAsText(f);
  e.target.value = null;
}

document.addEventListener('click', () => {
  if (openDropdownId !== null) {
    openDropdownId = null;
    document.querySelectorAll('.coll-dropdown').forEach(d=>d.remove());
  }
});

function initTheme() {
  const saved = localStorage.getItem('md-board-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('btn-theme');
  btn.textContent = theme === 'dark' ? '☽' : '☀︎';
  btn.title = theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre';
  localStorage.setItem('md-board-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function init() {
  initTheme();
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);
  setupModal();
  setupRepoModal();

  // ── Restauration depuis localStorage ──
  const restored = loadState();
  renderRepoList();
  updateSidebarCounts();
  renderSidebar();

  if (restored && activeRepoId && repos.find(r => r.id === activeRepoId)) {
    // On a des données sauvegardées avec un dépôt actif → on recharge le dépôt.
    // pendingState permet de réinjecter seen/ratings APRÈS le fetch (bug fix existant).
    pendingState = { seen, ratings };
    switchRepo(activeRepoId);
  }

  // Bouton dans l'écran vide → ouvre la modale d'ajout de dépôt
  document.getElementById('btn-new-repo-empty').addEventListener('click', () => {
    document.getElementById('repo-modal-overlay').classList.add('show');
  });

  document.getElementById('search').addEventListener('input', applyFilters);
  document.getElementById('sel-cat').addEventListener('change', applyFilters);
  document.getElementById('sel-rating').addEventListener('change', applyFilters);
  document.getElementById('sel-sort').addEventListener('change', applyFilters);
  document.getElementById('load-more').addEventListener('click', () => { page++; render(true); });
  document.getElementById('btn-export').addEventListener('click', handleExport);
  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('file-input').addEventListener('change', handleImport);
  document.getElementById('btn-new-coll').addEventListener('click', () => {
    document.getElementById('modal-name').value = '';
    document.getElementById('modal-overlay').classList.add('show');
  });
  document.getElementById('btn-new-repo').addEventListener('click', () => {
    document.getElementById('repo-modal-overlay').classList.add('show');
  });

  ['all','seen','unseen','rated'].forEach(mode => {
    document.getElementById('sb-'+mode).addEventListener('click', () => {
      sidebarMode = mode; updateSidebarActive(); renderSidebar(); applyFilters();
    });
  });

  document.getElementById('vb-grid').addEventListener('click', () => {
    viewMode = 'grid';
    document.getElementById('vb-grid').classList.add('active');
    document.getElementById('vb-cat').classList.remove('active');
    render();
  });
  document.getElementById('vb-cat').addEventListener('click', () => {
    viewMode = 'cat';
    document.getElementById('vb-cat').classList.add('active');
    document.getElementById('vb-grid').classList.remove('active');
    render();
  });

  document.getElementById('btn-hide-seen').addEventListener('click', () => {
    hideSeen = !hideSeen;
    document.getElementById('btn-hide-seen').classList.toggle('active', hideSeen);
    applyFilters();
  });

  // Afficher l'appli, masquer le splash
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('app').style.display = 'flex';

  // Rendu initial : écran vide (pas de dépôt)
  render();
}

init();
