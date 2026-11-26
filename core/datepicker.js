/* ============================================================
   【公共组件层】datepicker.js  2026.11.27 新增
   自定义日期选择器：把原生 <input type="date"> 裸露的 yyyy/mm/dd
   占位模板换成「中文标签 + 弹层日历」。

   关键设计：原生 input 仍是唯一数据源，只是视觉上隐藏。
   它的 .value 读写与 change 事件全部保持原样，
   因此 modules/life/app.js 里所有筛选 / 新增 / 清除逻辑一行都不用改。

   2026.11.27 改：单实例 → 工厂多实例。
   待办 #todoDate 与 坚持历程 #journeyDate 各用一份独立状态，
   弹层 id 分别带后缀，互不干扰（同名 id 重复会让 getElementById 取错）。
   加载顺序：在 core/shared.js 之后、modules/life/app.js 之前。
   ============================================================ */
(function () {
  'use strict';

  var WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function isoOf(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function partsOf(iso) {
    var a = String(iso || '').split('-');
    if (a.length !== 3) return null;
    var y = +a[0], m = +a[1], d = +a[2];
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  // 标签文字：同年只写「11月27日」，跨年补年份，空值回占位文案
  function labelOf(iso) {
    var d = partsOf(iso);
    if (!d) return '选择日期';
    var md = (d.getMonth() + 1) + '月' + d.getDate() + '日';
    return d.getFullYear() === new Date().getFullYear() ? md : d.getFullYear() + '年' + md;
  }

  function create(cfg) {
    var input = document.getElementById(cfg.inputId);
    var display = document.getElementById(cfg.displayId);
    var labelEl = document.getElementById(cfg.textId);
    if (!input || !display || !labelEl) return null;

    var sfx = cfg.sfx || '';
    var pop = null, titleEl = null, gridEl = null;
    var viewY = 0, viewM = 0;
    var docBound = false;

    function syncLabel() {
      if (!labelEl || !display) return;
      labelEl.textContent = labelOf(input.value);
      display.classList.toggle('has-value', !!input.value);
    }

    // 把实例的 .value 变成访问器：页面任何 xxx.value = x 都会顺带刷新标签
    function hookValue() {
      var desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (!desc || !desc.get || !desc.set) return false;
      Object.defineProperty(input, 'value', {
        configurable: true,
        get: function () { return desc.get.call(input); },
        set: function (v) { desc.set.call(input, v); syncLabel(); }
      });
      return true;
    }

    function buildPop() {
      pop = document.createElement('div');
      pop.className = 'dp-pop';
      pop.id = cfg.popId;
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-label', '选择日期');
      pop.innerHTML =
        '<div class="dp-head">' +
          '<button type="button" class="dp-nav" data-dp-nav="-1" aria-label="上个月">‹</button>' +
          '<div class="dp-title" id="dpTitle' + sfx + '"></div>' +
          '<button type="button" class="dp-nav" data-dp-nav="1" aria-label="下个月">›</button>' +
        '</div>' +
        '<div class="dp-week">' + WEEK_CN.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
        '<div class="dp-grid" id="dpGrid' + sfx + '"></div>' +
        '<div class="dp-foot">' +
          '<button type="button" class="dp-quick" id="dpToday' + sfx + '">今天</button>' +
          '<button type="button" class="dp-quick" id="dpClear' + sfx + '">清空</button>' +
        '</div>';
      document.body.appendChild(pop);
      titleEl = pop.querySelector('#dpTitle' + sfx);
      gridEl = pop.querySelector('#dpGrid' + sfx);

      gridEl.addEventListener('click', function (e) {
        var cell = e.target.closest ? e.target.closest('.dp-cell') : null;
        if (!cell) return;
        commit(cell.getAttribute('data-iso'));
      });
      pop.querySelectorAll('.dp-nav').forEach(function (b) {
        b.addEventListener('click', function () { turn(+b.getAttribute('data-dp-nav')); });
      });
      pop.querySelector('#dpToday' + sfx).addEventListener('click', function () { commit(isoOf(new Date())); });
      pop.querySelector('#dpClear' + sfx).addEventListener('click', function () {
        input.value = '';
        input.dispatchEvent(new Event('change', { bubbles: true }));
        close();
      });
    }

    function renderGrid() {
      var todayIso = isoOf(new Date());
      var selIso = input.value;
      var startDay = new Date(viewY, viewM, 1).getDay();
      var daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
      var total = Math.ceil((startDay + daysInMonth) / 7) * 7;
      var html = '';
      for (var i = 0; i < total; i++) {
        var dnum = i - startDay + 1;
        var real, out = false;
        if (dnum < 1) {
          real = new Date(viewY, viewM, dnum);                                  // 0/负数 → Date 回退到上月末尾
          out = true;
        } else if (dnum > daysInMonth) {
          real = new Date(viewY, viewM + 1, dnum - daysInMonth);                // 下月开头按偏移算，不能直接传 dnum
          out = true;
        } else {
          real = new Date(viewY, viewM, dnum);
        }
        var iso = isoOf(real);
        var cls = 'dp-cell';
        if (out) cls += ' dp-cell-out';
        var wd = real.getDay();
        if (wd === 0 || wd === 6) cls += ' dp-cell-weekend';
        if (iso === todayIso) cls += ' dp-cell-today';
        if (iso === selIso) cls += ' dp-cell-sel';
        html += '<button type="button" class="' + cls + '" data-iso="' + iso + '">' + real.getDate() + '</button>';
      }
      gridEl.innerHTML = html;
      titleEl.textContent = viewY + '年' + (viewM + 1) + '月';
    }

    function turn(delta) {
      viewM += delta;
      if (viewM < 0) { viewM = 11; viewY--; }
      else if (viewM > 11) { viewM = 0; viewY++; }
      renderGrid();
    }

    function place() {
      var r = display.getBoundingClientRect();
      var w = pop.offsetWidth, h = pop.offsetHeight, gap = 8;
      var left = r.left;
      var top = r.bottom + gap;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - gap);
      if (left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - w - 8);
      pop.style.left = Math.round(left) + 'px';
      pop.style.top = Math.round(top) + 'px';
    }

    function commit(iso) {
      if (!iso) return;
      input.value = iso;                                    // 走 setter → 标签同步
      input.dispatchEvent(new Event('change', { bubbles: true }));
      close();
    }

    function onDocClick(e) {
      if (pop.contains(e.target) || display.contains(e.target)) return;
      close();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    function onViewportChange() { if (pop && pop.classList.contains('show')) place(); }

    function open() {
      var base = partsOf(input.value) || new Date();
      viewY = base.getFullYear();
      viewM = base.getMonth();
      renderGrid();
      pop.classList.add('show');
      place();
      // 首帧布局可能还没落到最终尺寸（窄屏/缩放/无头环境尤其明显），下一帧再校一次位置
      window.requestAnimationFrame(place);
      if (!docBound) {
        // 捕获阶段监听：点弹层外任意位置即关闭，不依赖各模块自己的冒泡逻辑
        document.addEventListener('click', onDocClick, true);
        document.addEventListener('keydown', onKey, true);
        docBound = true;
      }
    }

    function close() {
      if (!pop) return;
      pop.classList.remove('show');
      if (docBound) {
        document.removeEventListener('click', onDocClick, true);
        document.removeEventListener('keydown', onKey, true);
        docBound = false;
      }
    }

    if (!hookValue()) return null;
    buildPop();
    syncLabel();
    display.addEventListener('click', function (e) {
      e.preventDefault();
      if (pop.classList.contains('show')) close(); else open();
    });
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);

    return { input: input, display: display, open: open, close: close, sync: syncLabel };
  }

  function init() {
    // 待办：沿用原来的 id，dpPop / dpTitle / dpGrid / dpToday / dpClear 保持不变
    create({ inputId: 'todoDate', displayId: 'todoDateDisplay', textId: 'todoDateText', popId: 'dpPop', sfx: '' });
    // 坚持历程：独立一套，id 统一带 J 后缀
    create({ inputId: 'journeyDate', displayId: 'journeyDateDisplay', textId: 'journeyDateText', popId: 'dpPopJourney', sfx: 'J' });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
