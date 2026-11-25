/* ============================================================
   【公共工具层】shared.js
   全局工具：日期 / Toast / 转义 / 防抖 / 颜色 / 安全绑定
   加载顺序：必须在 game.js / ai.js / app.js 之前
   2026.11.25 步骤2：整块从 app.js 搬出，函数体一字未改
   ============================================================ */

// ========== 【分区 1】全局工具函数（Toast / 存储 / 日期 / 转义等公共方法） ==========
// ---------- 工具 ----------
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function parseDate(str) {
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}
function dateToStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function formatDateCN(str) {
  const d = parseDate(str);
  return (d.getMonth()+1) + '月' + d.getDate() + '日';
}
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate()-1);
  return dateToStr(d);
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2000);
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  return r ? { r:parseInt(r[1],16), g:parseInt(r[2],16), b:parseInt(r[3],16) } : {r:108,g:180,b:238};
}
function debounce(fn, delay) {
  let timer = null;
  return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); };
}
// 【修改点】安全绑定：以下元素来自升级版 index.html，缺失时跳过绑定，避免脚本报错
function safeBind(id, event, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, fn);
}

