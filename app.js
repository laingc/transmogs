/* The site intentionally runs without a build step, network calls, or a framework. */
(() => {
  'use strict';
  const data = window.GALLERY_DATA;
  const entries = data.entries;
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const title = value => value.replace(/(^|[-\s])\S/g, c => c.toUpperCase());
  const swatches = { gold: '#d9b767', yellow: '#e5df74', orange: '#de874e', red: '#c65f5a', pink: '#d798bf', purple: '#ab84d2', blue: '#74a0d5', cyan: '#81c4cb', green: '#9dbb78', white: '#e5e9dc', silver: '#b6bdbb', black: '#292a2d', brown: '#99775b' };
  const strengths = ['subtle', 'moderate', 'bold'];
  const validTags = new Set(entries.flatMap(e => e.tags));
  const sorts = new Set(['name', 'name-desc', 'colour', 'effect', 'strength', 'source']);
  const state = { q: '', tags: new Set(), mode: 'all', sort: 'name', source: '', saved: false };
  let saved;
  try { saved = new Set(JSON.parse(localStorage.getItem('afterglow-saved') || '[]').filter(id => byId.has(id))); }
  catch { saved = new Set(); }
  let current = null;
  let photo = 0;
  let returnFocus = null;

  const swatch = colour => `<span class="colour-dot" style="--swatch:${swatches[colour]}" aria-hidden="true"></span>`;
  const tagButton = (tag, extra = '') => `<button type="button" class="tag ${extra}" data-tag="${escape(tag)}" aria-pressed="${state.tags.has(tag)}">${swatches[tag] ? swatch(tag) : ''}${escape(tag)}</button>`;
  const counts = tag => entries.filter(e => e.tags.includes(tag)).length;

  function filterControls() {
    const query = $('tag-search').value.trim().toLowerCase();
    $('colour-tags').innerHTML = Object.keys(swatches).filter(tag => tag.includes(query)).map(tag => `<button type="button" class="colour-tag" data-tag="${tag}" aria-pressed="${state.tags.has(tag)}">${swatch(tag)}<span>${title(tag)}</span><span class="count">${counts(tag)}</span></button>`).join('');
    const effects = [...new Set(entries.flatMap(e => e.effects))].sort();
    $('effect-tags').innerHTML = effects.filter(tag => tag.includes(query)).map(tag => tagButton(tag)).join('');
    $('strength-tags').innerHTML = strengths.filter(tag => tag.includes(query)).map(tag => tagButton(tag)).join('');
  }

  function matching() {
    const words = state.q.toLowerCase().replace(/#/g, '').trim().split(/[\s,]+/).filter(Boolean);
    const filtered = entries.filter(e => {
      const text = [e.name, e.category, e.acquisition, e.availability, ...e.tags].join(' ').toLowerCase();
      if (!words.every(word => text.includes(word))) return false;
      if (state.source && e.category !== state.source) return false;
      if (state.saved && !saved.has(e.id)) return false;
      const selected = [...state.tags];
      return !selected.length || (state.mode === 'any' ? selected.some(tag => e.tags.includes(tag)) : selected.every(tag => e.tags.includes(tag)));
    });
    const name = (a, b) => a.name.localeCompare(b.name, 'en');
    const comparators = {
      name,
      'name-desc': (a, b) => name(b, a),
      colour: (a, b) => a.colours[0].localeCompare(b.colours[0]) || name(a, b),
      effect: (a, b) => a.effects[0].localeCompare(b.effects[0]) || name(a, b),
      strength: (a, b) => strengths.indexOf(b.strength) - strengths.indexOf(a.strength) || name(a, b),
      source: (a, b) => a.category.localeCompare(b.category) || name(a, b),
    };
    return filtered.sort(comparators[state.sort]);
  }

  function card(e) {
    const displayedTags = [...e.colours.slice(0, 2), ...e.effects.slice(0, 2)];
    return `<article class="card" data-id="${e.id}">
      <div class="card-media"><button class="open-image" data-open="${e.id}" type="button" aria-label="View ${escape(e.name)}, ${e.images.length} pictures"><img src="${e.images[0].src}" alt="${escape(e.name)} weapon appearance" width="${e.images[0].width}" height="${e.images[0].height}" loading="lazy" decoding="async"></button><span class="picture-badge">▧ ${e.images.length} pictures</span><button class="favorite" data-save="${e.id}" aria-label="Save ${escape(e.name)}" aria-pressed="${saved.has(e.id)}" type="button">${saved.has(e.id) ? '♥' : '♡'}</button></div>
      <div class="card-body"><div class="card-topline"><span class="card-category">${escape(e.category)}</span><span class="strength" aria-label="${e.strength} visual strength" title="${title(e.strength)} visual strength">${strengths.map((_, i) => `<i class="${i <= strengths.indexOf(e.strength) ? 'on' : ''}"></i>`).join('')}</span></div><button class="card-title" data-open="${e.id}" type="button">${escape(e.name)}</button><div class="card-tags">${displayedTags.map(tag => tagButton(tag)).join('')}${e.tags.length > displayedTags.length ? `<button class="more-tags" data-open="${e.id}" aria-label="See all tags for ${escape(e.name)}" type="button">+${e.tags.length - displayedTags.length}</button>` : ''}</div><div class="card-bottom"><span>${escape(e.availability)}</span><div class="card-thumbs">${e.images.slice(1).map((image, i) => `<button class="card-thumb" data-open="${e.id}" data-photo="${i + 1}" type="button" aria-label="View ${escape(e.name)}, picture ${i + 2}"><img src="${image.src}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div></div></div></article>`;
  }

  function syncUrl() {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.tags.size) params.set('tags', [...state.tags].sort().join(','));
    if (state.mode === 'any') params.set('mode', state.mode);
    if (state.sort !== 'name') params.set('sort', state.sort);
    if (state.source) params.set('source', state.source);
    if (state.saved) params.set('saved', '1');
    if (current) { params.set('illusion', current.id); if (photo) params.set('photo', String(photo + 1)); }
    const hash = params.toString();
    try { history.replaceState(null, '', location.pathname + location.search + (hash ? '#' + hash : '')); }
    catch { /* Some file:// environments do not allow history changes. */ }
  }

  function render(updateUrl = true) {
    const found = matching();
    $('gallery').innerHTML = found.map(card).join('');
    $('result-count').innerHTML = `Showing <strong>${found.length}</strong> of ${entries.length} illusions${state.tags.size ? ` · matching ${state.mode === 'all' ? 'all' : 'any'} selected tags` : ''}`;
    $('empty').hidden = found.length !== 0;
    $('active-filters').innerHTML = [...state.tags].map(tag => `<button type="button" data-tag="${escape(tag)}" aria-label="Remove ${escape(tag)} filter">${escape(tag)} <span aria-hidden="true">×</span></button>`).join('');
    if (state.q) $('active-filters').innerHTML += `<button type="button" data-clear="q" aria-label="Clear search">Search: ${escape(state.q)} ×</button>`;
    if (state.source) $('active-filters').innerHTML += `<button type="button" data-clear="source">${escape(state.source)} ×</button>`;
    if (state.saved) $('active-filters').innerHTML += '<button type="button" data-clear="saved">Saved only ×</button>';
    $('search').value = state.q;
    $('sort').value = state.sort;
    $('source-filter').value = state.source;
    $('saved-only').checked = state.saved;
    document.querySelector(`input[name="match"][value="${state.mode}"]`).checked = true;
    $('saved-nav').setAttribute('aria-pressed', String(state.saved));
    $('saved-count').textContent = saved.size;
    filterControls();
    if (updateUrl) syncUrl();
  }

  function reset() {
    Object.assign(state, { q: '', tags: new Set(), mode: 'all', sort: 'name', source: '', saved: false });
    $('tag-search').value = '';
    render();
  }

  function toggleSaved(id) {
    saved.has(id) ? saved.delete(id) : saved.add(id);
    try { localStorage.setItem('afterglow-saved', JSON.stringify([...saved])); } catch { /* Saving still works for this session. */ }
    render();
    if (current) renderSaveButton();
  }

  function renderSaveButton() {
    $('viewer-save').textContent = saved.has(current.id) ? '♥  Saved to your collection' : '♡  Save this illusion';
    $('viewer-save').setAttribute('aria-pressed', String(saved.has(current.id)));
  }

  function showPhoto(index, updateUrl = true) {
    if (!current) return;
    photo = (index + current.images.length) % current.images.length;
    const image = current.images[photo];
    $('viewer-image').src = image.src;
    $('viewer-image').alt = `${current.name} — ${image.caption}`;
    $('image-counter').textContent = `${photo + 1} / ${current.images.length}`;
    $('image-caption').textContent = image.caption;
    $('image-credit').textContent = image.credit;
    $('image-source').href = image.source;
    $('image-thumbnails').innerHTML = current.images.map((img, i) => `<button type="button" data-view-photo="${i}" aria-label="Show picture ${i + 1}" aria-pressed="${photo === i}"><img src="${img.src}" alt="${escape(current.name)} picture ${i + 1}"></button>`).join('');
    if (updateUrl) syncUrl();
  }

  function openViewer(id, index = 0, updateUrl = true) {
    if (!byId.has(id)) return;
    returnFocus = document.activeElement;
    current = byId.get(id);
    $('viewer-title').textContent = current.name;
    $('viewer-category').textContent = current.category.toUpperCase();
    $('viewer-appearance').textContent = `${title(current.strength)} · ${current.colours.map(title).join(' / ')} · ${current.effects.map(title).join(', ')}`;
    $('viewer-tags').innerHTML = current.tags.map(tag => tagButton(tag)).join('');
    $('viewer-acquisition').textContent = current.acquisition;
    $('viewer-availability').textContent = current.availability;
    $('viewer-note').textContent = current.note;
    $('viewer-note').hidden = !current.note;
    $('viewer-source').href = current.source;
    renderSaveButton();
    showPhoto(Number.isInteger(index) && index >= 0 && index < current.images.length ? index : 0, updateUrl);
    if (!$('viewer').open) $('viewer').showModal();
  }

  function closeViewer() {
    current = null;
    syncUrl();
    $('viewer').close();
  }

  function restoreUrl() {
    const params = new URLSearchParams(location.hash.slice(1));
    state.q = params.get('q') || '';
    state.tags = new Set((params.get('tags') || '').split(',').filter(tag => validTags.has(tag)));
    state.mode = params.get('mode') === 'any' ? 'any' : 'all';
    state.sort = sorts.has(params.get('sort')) ? params.get('sort') : 'name';
    state.source = entries.some(e => e.category === params.get('source')) ? params.get('source') : '';
    state.saved = params.get('saved') === '1';
    render(false);
    if (byId.has(params.get('illusion'))) openViewer(params.get('illusion'), Number(params.get('photo') || 1) - 1, false);
    else if ($('viewer').open) $('viewer').close();
  }

  function renderLegacy() {
    const query = $('legacy-search').value.toLowerCase().trim();
    const rows = data.legacy.filter(row => `${row.name} ${row.appearance} ${row.slot}`.toLowerCase().includes(query)).sort((a, b) => a.name.localeCompare(b.name));
    $('legacy-rows').innerHTML = rows.map(row => `<tr><td><a href="${escape(row.source)}" target="_blank" rel="noopener noreferrer">${escape(row.name)} ↗</a></td><td>${escape(row.appearance)}</td><td>${escape(row.slot)}</td></tr>`).join('');
    $('legacy-status').textContent = `${rows.length} of ${data.legacy.length} historical recipe references`;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.open) openViewer(button.dataset.open, Number(button.dataset.photo || 0));
    else if (button.dataset.save) {
      const id = button.dataset.save;
      toggleSaved(id);
      document.querySelector(`[data-save="${id}"]`)?.focus({ preventScroll: true });
    } else if (button.dataset.tag) {
      const tag = button.dataset.tag;
      state.tags.has(tag) ? state.tags.delete(tag) : state.tags.add(tag);
      if ($('viewer').open) closeViewer();
      render();
      document.querySelector(`.filters [data-tag="${tag}"]`)?.focus({ preventScroll: true });
    } else if (button.hasAttribute('data-view-photo')) showPhoto(Number(button.dataset.viewPhoto));
    else if (button.dataset.clear) {
      state[button.dataset.clear] = button.dataset.clear === 'saved' ? false : '';
      render();
    } else if (button.classList.contains('close-dialog')) {
      button.closest('dialog').id === 'viewer' ? closeViewer() : button.closest('dialog').close();
    }
  });

  $('search').addEventListener('input', event => { state.q = event.target.value; render(); });
  $('tag-search').addEventListener('input', filterControls);
  $('sort').addEventListener('change', event => { state.sort = event.target.value; render(); });
  $('source-filter').addEventListener('change', event => { state.source = event.target.value; render(); });
  document.querySelectorAll('input[name="match"]').forEach(input => input.addEventListener('change', () => { state.mode = input.value; render(); }));
  $('saved-only').addEventListener('change', event => { state.saved = event.target.checked; render(); });
  $('saved-nav').addEventListener('click', () => { state.saved = !state.saved; render(); $('collection').scrollIntoView(); });
  $('reset').addEventListener('click', reset);
  $('empty-reset').addEventListener('click', reset);
  $('previous-image').addEventListener('click', () => showPhoto(photo - 1));
  $('next-image').addEventListener('click', () => showPhoto(photo + 1));
  $('viewer-save').addEventListener('click', () => toggleSaved(current.id));
  $('legacy-search').addEventListener('input', renderLegacy);
  $('toggle-filters').addEventListener('click', () => {
    const expanded = document.body.classList.toggle('filters-open');
    $('toggle-filters').setAttribute('aria-expanded', String(expanded));
  });
  ['about-button', 'footer-about'].forEach(id => $(id).addEventListener('click', () => $('about').showModal()));
  $('viewer').addEventListener('cancel', event => { event.preventDefault(); closeViewer(); });
  $('viewer').addEventListener('close', () => {
    if ($('viewer').open) return;
    current = null;
    syncUrl();
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  });
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) {
      dialog.id === 'viewer' ? closeViewer() : dialog.close();
    }
  }));
  document.addEventListener('keydown', event => {
    const editing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    if ($('viewer').open && !editing && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); showPhoto(photo + (event.key === 'ArrowRight' ? 1 : -1));
    } else if (event.key === '/' && !editing && !$('viewer').open && !$('about').open) {
      event.preventDefault(); $('search').focus(); $('collection').scrollIntoView();
    }
  });
  window.addEventListener('hashchange', restoreUrl);
  document.querySelector('.nav-current').addEventListener('click', event => { event.preventDefault(); $('collection').scrollIntoView(); });
  $('source-filter').insertAdjacentHTML('beforeend', [...new Set(entries.map(e => e.category))].sort().map(category => `<option value="${escape(category)}">${escape(category)}</option>`).join(''));
  $('total-stat').textContent = entries.length;
  $('collection-total').textContent = entries.length;
  $('picture-stat').textContent = data.imageCount;
  $('legacy-count').textContent = `${data.legacy.length} references`;
  $('scope-copy').textContent = data.scope;
  $('image-note').textContent = data.imageNote;
  $('checked-copy').textContent = `Sources collected: ${data.checked}. Availability is a source restriction, not a live claim that a reward is obtainable today.`;
  renderLegacy();
  restoreUrl();
})();
