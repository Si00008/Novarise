/* ============================================================
   【公共组件层】errors.js  2026.11.27 新增
   全局错误兜底：把「页面已经坏了，但用户只看到一个空白 / 卡住」
   变成「顶部一条黄条写清断在哪，设置里能翻最近 5 条」。

   做三件事：
   1. 接住 window 报错与 Promise 未处理（含图片/脚本加载失败）
   2. 顶部黄条提示，可手动关闭，不自动消失
   3. 最近 5 条存 localStorage（键 Novarise_errors），设置面板可查看 / 清空

   自身不允许抛错：所有入口都包 try/catch。
   加载顺序：必须是第一个 script，越早装上，能接住的错越多。
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'Novarise_errors';
  var MAX = 5;
  var bar = null, barText = null;

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function stamp() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }

  // 消息要能安全塞进 innerHTML：转义后即使报错文本里带 <script> 也只是文本
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function read() {
    try {
      var list = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function save(list) {
    // 配额写满就放弃落盘，不能因为记错误再把页面搞崩
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { }
  }

  function ensureBar() {
    if (!document.body) return;
    if (bar && document.body.contains(bar)) return;
    bar = document.createElement('div');
    bar.className = 'err-bar';
    bar.id = 'errBar';
    bar.setAttribute('role', 'alert');
    bar.innerHTML =
      '<span class="err-bar-text" id="errBarText"></span>' +
      '<button type="button" class="err-bar-close" id="errBarClose" aria-label="关闭提示">✕</button>';
    document.body.appendChild(bar);
    barText = bar.querySelector('#errBarText');
    bar.querySelector('#errBarClose').addEventListener('click', function () {
      bar.classList.remove('show');
    });
  }

  function show(kind, msg) {
    ensureBar();
    if (!bar) return;
    var n = read().length;
    barText.textContent = '[' + kind + '] ' + msg +
      (n > 1 ? '（共 ' + n + ' 条，设置里可查看）' : '');
    bar.classList.add('show');
  }

  function renderPanel() {
    try {
      var desc = document.getElementById('errDesc');
      var listEl = document.getElementById('errList');
      var list = read();
      if (desc) {
        desc.textContent = list.length
          ? ('最近 ' + list.length + ' 条 · ' + list[0].k + '：' + String(list[0].m).slice(0, 30))
          : '没有记录';
      }
      if (listEl) {
        listEl.innerHTML = list.length
          ? list.map(function (x) {
              return '<div class="err-item"><b>' + esc(x.k) + '</b> ' + esc(x.t) +
                '<br>' + esc(x.m) +
                (x.d ? '<br><span class="err-dim">' + esc(x.d) + '</span>' : '') + '</div>';
            }).join('')
          : '<div class="err-item">没有记录</div>';
      }
    } catch (e) { }
  }

  function record(kind, msg, detail) {
    try {
      var list = read();
      list.unshift({
        t: stamp(),
        k: String(kind || '报错').slice(0, 8),
        m: String(msg || '未知错误').slice(0, 200),
        d: String(detail || '').slice(0, 120)
      });
      save(list.slice(0, MAX));
      show(list[0].k, list[0].m);
      renderPanel();
    } catch (e) { }
  }

  function bindPanel() {
    var showBtn = document.getElementById('errShowBtn');
    var clearBtn = document.getElementById('errClearBtn');
    var listEl = document.getElementById('errList');
    if (showBtn && listEl) {
      showBtn.addEventListener('click', function () {
        var open = listEl.style.display !== 'none';
        if (!open) renderPanel();
        listEl.style.display = open ? 'none' : 'block';
        showBtn.textContent = open ? '查看' : '收起';
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        save([]);
        renderPanel();
        if (bar) bar.classList.remove('show');
      });
    }
    renderPanel();
  }

  // ---- 接住三类错误 ----
  window.addEventListener('error', function (e) {
    try {
      // 资源加载失败走这里：e.target 是元素、message 为空，必须和脚本报错分开处理
      if (e.target && e.target !== window && e.target.tagName) {
        record('资源', e.target.tagName.toLowerCase() + ' 加载失败',
          e.target.src || e.target.href || e.target.id || '');
        return;
      }
      var file = String(e.filename || '');
      var short = file ? file.split('/').pop().split('\\').pop() : '未知文件';
      record('报错', e.message || '未知错误', short + ':' + (e.lineno || 0));
    } catch (e1) { }
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    try {
      var r = e.reason;
      var m = (r && r.message) ? r.message : (r == null ? 'Promise 被拒绝（没有给出原因）' : String(r));
      record('未处理', m, '');
    } catch (e2) { }
  });

  function boot() {
    try { ensureBar(); } catch (e) { }
    try { bindPanel(); } catch (e) { }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // 给冒烟测试与以后的控制台排查用
  window.NovariseErrors = {
    list: read,
    clear: function () { save([]); renderPanel(); if (bar) bar.classList.remove('show'); },
    record: record,
    test: function () { record('测试', '这是一条模拟错误，用来确认兜底链路可用', '设置 → 最近错误'); }
  };
})();
