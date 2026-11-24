/* =========================================================
   职业选手查询 · 纯静态
   - 基础档案本地常量，不发请求
   - 收藏写回 localStorage['novarise_lol_profile'].favorites，与我的数据共用
   ========================================================= */

(function () {
  'use strict';

  var PROFILE_KEY = 'novarise_lol_profile';
  var APP_KEY = 'Novarise_data';

  /* ---------------------------------------------------------
     选手基础档案（仅保留已核实字段）
     合同到期：查不到就写空字符串，渲染时显示「待核实」
     --------------------------------------------------------- */
  var PLAYERS = [
    {
      id: 'faker',
      name: 'Faker',
      real: '李相赫',
      team: 'T1',
      role: '中单',
      region: 'LCK',
      contract: '',
      source: 'LoL Esports 官方战队页 / Liquipedia',
    },
    {
      id: 'knight',
      name: 'Knight',
      real: '卓定',
      team: 'BLG',
      role: '中单',
      region: 'LPL',
      contract: '2027-11-16',
      source: 'BLG 官方续约公告 / Leaguepedia',
    },
    {
      id: 'chovy',
      name: 'Chovy',
      real: '郑志勋',
      team: 'Gen.G',
      role: '中单',
      region: 'LCK',
      contract: '2027-11-15',
      source: 'Liquipedia / 拳头合同库（2026-11 更新）',
    },
  ];

  /* ---------------- 存档读写 ---------------- */
  function readProfile() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return { favorites: [] };
      var p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return { favorites: [] };
      if (!Array.isArray(p.favorites)) p.favorites = [];
      return p;
    } catch (e) {
      return { favorites: [] };
    }
  }

  function writeFavorites(favs) {
    try {
      var p = readProfile();
      p.favorites = favs;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch (e) { /* 存储不可用时静默跳过 */ }
  }

  function getFavorites() {
    return readProfile().favorites.slice();
  }

  /* ---------------- 主题跟随冉星设置 ---------------- */
  function applyTheme() {
    try {
      var raw = localStorage.getItem(APP_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && typeof d.themeColor === 'string') {
        document.documentElement.style.setProperty('--primary', d.themeColor);
        var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(d.themeColor);
        if (m) {
          document.documentElement.style.setProperty(
            '--primary-rgb',
            parseInt(m[1], 16) + ', ' + parseInt(m[2], 16) + ', ' + parseInt(m[3], 16)
          );
        }
      }
      if (d && d.darkMode) document.documentElement.setAttribute('data-theme', 'dark');
    } catch (e) { /* 主题读不到就保持默认 */ }
  }

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pending() {
    return '<span class="pro-pending">待核实</span>';
  }

  function matchPlayer(p, q) {
    if (!q) return false;
    var pool = [p.name, p.real, p.team, p.role, p.region].filter(Boolean).join(' ').toLowerCase();
    return pool.indexOf(q.toLowerCase()) > -1;
  }

  /* ---------------- 卡片渲染 ---------------- */
  function cardHtml(p, isFav) {
    var meta = [
      (p.team || pending()) + ' · ' + (p.role || pending()),
      p.region ? p.region : pending(),
      '合同 ' + (p.contract ? esc(p.contract) : pending()),
    ].join(' · ');

    return [
      '<div class="pro-card" data-id="' + esc(p.id) + '">',
      '  <div class="pro-avatar" aria-hidden="true">' + esc(p.name.charAt(0)) + '</div>',
      '  <div class="pro-info">',
      '    <div class="pro-name">' + esc(p.name) + (p.real ? '（' + esc(p.real) + '）' : '') + '</div>',
      '    <div class="pro-meta">' + meta + '</div>',
      '  </div>',
      '  <button type="button" class="pro-fav-btn' + (isFav ? ' is-fav' : '') + '" data-fav="' + esc(p.id) + '">' +
      (isFav ? '已收藏' : '收藏') + '</button>',
      '</div>',
    ].join('');
  }

  /* ---------------- 视图 ---------------- */
  var state = { query: '' };

  function renderResults() {
    var box = document.getElementById('proResults');
    var empty = document.getElementById('proEmpty');
    if (!box) return;

    if (!state.query) {
      box.innerHTML = '';
      if (empty) empty.hidden = true;
      return;
    }

    var favs = getFavorites();
    var hits = PLAYERS.filter(function (p) { return matchPlayer(p, state.query); });

    box.innerHTML = hits.map(function (p) { return cardHtml(p, favs.indexOf(p.id) > -1); }).join('');
    if (empty) empty.hidden = hits.length > 0;
  }

  function renderFavorites() {
    var box = document.getElementById('proFavList');
    var empty = document.getElementById('favEmpty');
    var count = document.getElementById('favCount');
    if (!box) return;

    var favs = getFavorites();
    if (count) count.textContent = String(favs.length);

    var items = PLAYERS.filter(function (p) { return favs.indexOf(p.id) > -1; });
    box.innerHTML = items.map(function (p) { return cardHtml(p, true); }).join('');
    if (empty) empty.hidden = items.length > 0;
  }

  function toggleFav(id) {
    var favs = getFavorites();
    var i = favs.indexOf(id);
    if (i > -1) favs.splice(i, 1);
    else favs.push(id);
    writeFavorites(favs);
    renderResults();
    renderFavorites();
  }

  /* ---------------- 事件 ---------------- */
  function bind() {
    var input = document.getElementById('proSearchInput');
    var searchBtn = document.getElementById('proSearchBtn');
    var clearBtn = document.getElementById('proClearBtn');

    function doSearch() {
      state.query = (input && input.value || '').trim();
      renderResults();
    }

    if (input) {
      input.addEventListener('input', doSearch);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
      });
    }
    if (searchBtn) searchBtn.addEventListener('click', doSearch);

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (input) input.value = '';
        state.query = '';
        renderResults();
        if (input) input.focus();
      });
    }

    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-fav]') : null;
      if (!btn) return;
      toggleFav(btn.getAttribute('data-fav'));
    });
  }

  /* ---------------- 启动 ---------------- */
  applyTheme();
  bind();
  renderResults();
  renderFavorites();
})();
