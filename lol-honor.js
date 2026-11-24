/* =========================================================
   我的数据 · 页面脚本（纯静态）
   · 只读 localStorage['novarise_lol_profile']，不发任何请求
   · 八维雷达在未接入真实数据前 value 留空
   ========================================================= */

(function () {
  'use strict';

  var PROFILE_KEY = 'novarise_lol_profile';

  /* ---- 与冉星面板共用的种子档（本页无存档时也能正常显示） ---- */
  var SEED = {
    riotId: 'Si00008#74097',
    region: '艾欧尼亚',
    login: 'QQ',
    lolRank: '不屈白银 IV',
    lolmRank: '铂金 II',
    season: 'S16 三赛段',
    totals: { matches: 133, winRate: 45.1, mvpSvp: 7 },
    modes: [
      { name: '经典模式', matches: 0, winRate: 0 },
      { name: '海斗(经典)', matches: 0, winRate: 0 },
      { name: '海克斯大乱斗', matches: 16, winRate: 43.7 },
      { name: '灵活排位', matches: 49, winRate: 32.6 },
      { name: '单双排', matches: 68, winRate: 54.4 },
    ],
    matches: [
      { result: 'win', kda: '9/17/33', score: '11.0', mode: '海克斯大乱斗', queue: '—', time: '11-20 21:40' },
      { result: 'win', kda: '5/7/11', score: '8.3', mode: '灵活组排', queue: '白银 IV 34', time: '11-20 21:08' },
      { result: 'lose', kda: '1/6/6', score: '6.8', mode: '灵活组排', queue: '白银 IV 13', time: '11-20 20:30' },
      { result: 'lose', kda: '1/7/0', score: '9.0', mode: '灵活组排', queue: '白银 IV 32', time: '11-20 20:05' },
      { result: 'win', kda: '5/6/7', score: '9.6', mode: '灵活组排', queue: '白银 IV 50', time: '11-17 19:02' },
      { result: 'win', kda: '2/10/12', score: '7.8', mode: '单双排', queue: '黑铁 I 23', time: '11-17 18:23' },
      { result: 'lose', kda: '5/11/8', score: '7.8', mode: '灵活组排', queue: '白银 IV 28', time: '11-15 17:17' },
      { result: 'lose', kda: '3/7/2', score: '6.6', mode: '灵活组排', queue: '白银 IV', time: '11-15 16:40' },
    ],
    favorites: [],
  };

  /* ---- 八维雷达维度（顺序与上限固定） ---- */
  var DIMENSIONS = [
    { name: 'KDA', max: 10 },
    { name: '参团率', max: 100 },
    { name: '分均伤害', max: 2000 },
    { name: '分均承伤', max: 3000 },
    { name: '分均经济', max: 800 },
    { name: '视野得分', max: 100 },
    { name: '补刀数', max: 300 },
    { name: '推塔参与率', max: 100 },
  ];

  function readProfile() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(SEED));
      var p = JSON.parse(raw);
      return Object.assign(JSON.parse(JSON.stringify(SEED)), p || {});
    } catch (e) {
      return JSON.parse(JSON.stringify(SEED));
    }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  /* ---------------- 渲染 ---------------- */
  function renderProfile(p) {
    setText('myRegion', p.region || '未设置');
    setText('myName', p.riotId || '未设置召唤师');
    setText('mySub', (p.region || '') + ' · ' + (p.login ? p.login + ' 登录' : '登录方式待设置'));
    setText('myLolRank', p.lolRank || '待核实');
    setText('myLolmRank', p.lolmRank || '待核实');
    var av = document.getElementById('myAvatar');
    if (av) av.textContent = 'L';
  }

  function renderStats(p) {
    var box = document.getElementById('myStats');
    if (!box) return;
    var cells = [
      { label: '赛段总场次', value: String(p.totals.matches) },
      { label: '赛段总胜率', value: p.totals.winRate + '%' },
      { label: 'MVP / SVP', value: String(p.totals.mvpSvp) },
      { label: '当前赛季', value: p.season },
    ];
    box.innerHTML = cells.map(function (c) {
      return '<div class="my-stat"><div class="my-stat-label">' + esc(c.label) + '</div>' +
        '<div class="my-stat-value">' + esc(c.value) + '</div></div>';
    }).join('');
  }

  function renderModes(p) {
    var box = document.getElementById('myModes');
    if (!box) return;
    setText('myModeTotal', p.totals.matches + ' 场');

    var max = Math.max.apply(null, p.modes.map(function (m) { return m.matches; }).concat([1]));
    box.innerHTML = p.modes.map(function (m) {
      var w = Math.round((m.matches / max) * 100);
      return '<div class="my-mode-row">' +
        '<div class="my-mode-top"><span class="my-mode-name">' + esc(m.name) + '</span>' +
        '<span>' + m.matches + ' 场 · ' + m.winRate + '%</span></div>' +
        '<div class="my-mode-bar"><div class="my-mode-fill" style="width:' + w + '%"></div></div>' +
        '</div>';
    }).join('');
  }

  function renderMatches(p) {
    var box = document.getElementById('myMatches');
    if (!box) return;
    setText('myMatchCount', p.matches.length + ' 场');

    box.innerHTML = p.matches.map(function (m) {
      var win = (m.result === 'win');
      return '<div class="my-match ' + (win ? 'is-win' : 'is-lose') + '">' +
        '<div class="my-match-left">' +
        '<span class="my-match-result">' + (win ? '胜利' : '失败') + '</span>' +
        '<span class="my-match-kda">' + esc(m.kda) + '</span>' +
        '</div>' +
        '<div class="my-match-right">' +
        '<span>' + esc(m.mode) + '</span>' +
        (m.queue && m.queue !== '—' ? '<span>' + esc(m.queue) + '</span>' : '') +
        '<span>' + esc(m.time) + '</span>' +
        '<span>评分 ' + esc(m.score) + '</span>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  /* ---------------- 八维雷达 ---------------- */
  function renderRadar() {
    var box = document.getElementById('myRadar');
    if (!box) return;

    if (typeof echarts === 'undefined') {
      box.innerHTML = '<div class="my-tip" style="padding:12px 0;">图表库加载失败（ECharts CDN 不可达），框架暂不显示。</div>';
      return;
    }

    var primary = cssVar('--primary', '#5B8FF9');
    var rgb = cssVar('--primary-rgb', '91, 143, 249');
    var textColor = cssVar('--text', '#333');
    var axisColor = cssVar('--border', '#e5e7eb');

    var chart = echarts.init(box);
    chart.setOption({
      radar: {
        indicator: DIMENSIONS,
        radius: '66%',
        center: ['50%', '52%'],
        splitNumber: 4,
        axisName: { color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: axisColor } },
        splitArea: { areaStyle: { color: ['rgba(' + rgb + ',0.04)', 'transparent'] } },
        axisLine: { lineStyle: { color: axisColor } },
      },
      series: [{
        type: 'radar',
        symbolSize: 4,
        lineStyle: { width: 2, color: primary },
        itemStyle: { color: primary },
        areaStyle: { color: 'rgba(' + rgb + ',0.22)' },
        // 【接入位置】拿到真实数据后，把 8 个数值按上面 DIMENSIONS 顺序填进 value
        data: [{ value: [], name: '我的数据' }],
      }],
    });

    window.addEventListener('resize', function () { chart.resize(); });
  }

  /* ---------------- 启动 ---------------- */
  var profile = readProfile();
  renderProfile(profile);
  renderStats(profile);
  renderModes(profile);
  renderMatches(profile);
  renderRadar();
})();
