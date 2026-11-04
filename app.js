/* ============================================
   冉星 Novarise v4 - 主逻辑
   localStorage 键名: Novarise_data
   本次升级：
   1) 头像支持 emoji / 本地图片(Base64) / 网络URL
   2) 坚持历程改为"时间机器"：选日期可查看并编辑当天详情
   3) 【修改点】习惯与每日打卡合并为一个卡片，新增"新建习惯"弹窗
   4) 【修改点】卡片折叠时标题右侧显示概览数据（待办/习惯/心情）
   5) 【修改点】心情日历显示待办/打卡/心情事件小圆点，点击日期弹出当日详情弹窗
   ============================================ */
const STORAGE_KEY = 'Novarise_data';
const TODO_TYPES = ['工作', '生活', '学习', '其他'];

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

// 判断 avatar 是 emoji 还是图片（Base64 data:image/... 或 http(s) URL）
function isImageAvatar(avatar) {
  if (!avatar) return false;
  return avatar.startsWith('data:image/') || avatar.startsWith('http://') || avatar.startsWith('https://');
}

// ---------- 默认数据 ----------
function defaultData() {
  return {
    nickname: '小伙伴',
    avatar: '😊',           // 可以是 emoji 字符串，也可以是 data:image/... 或 URL
    themeColor: '#6CB4EE', darkMode: false,
    modules: { todo:true, habit:true, mood:true, checkin:true, quote:true, note:true, journey:true },
    todoViewMode: 'date',
    todoSearch: '',
    todos: [],
    checkins: [
      { id:'c1', name:'喝水', emoji:'💧', target:8, count:0, countDate:'', streak:0, lastDate:'' },
      { id:'c2', name:'运动', emoji:'🏃', target:1, count:0, countDate:'', streak:0, lastDate:'' },
      { id:'c3', name:'阅读', emoji:'📚', target:1, count:0, countDate:'', streak:0, lastDate:'' },
      { id:'c4', name:'早睡', emoji:'😴', target:1, count:0, countDate:'', streak:0, lastDate:'' },
    ],
    checkinViewMode: 'list',
    mood: {},
    quote: { currentIdx: 0, favorites: [] },
    note: '',
  };
}

const QUOTES = [
  '今天也要好好吃饭，好好睡觉。','慢慢来，比较快。','你已经做得很好了。',
  '生活明朗，万物可爱。','保持热爱，奔赴山海。','今日事，今日毕。',
  '健康是1，其他都是0。','阅读是一座随身携带的避难所。','运动是治愈一切的良药。',
  '早睡早起，赛过人参补身体。','别着急，你想要的岁月都会给你。','今天的努力，是明天的实力。',
  '温柔半两，从容一生。','愿你眼里有光，心中有梦。','每一天都是新的开始。',
  '好好爱自己，是终身浪漫的开始。','做一个温暖的人，像星星一样。','把日子过成诗，把生活过成画。',
  '心若向阳，无畏悲伤。','你笑起来真好看，像春天的花一样。',
];

// ---------- 数据兼容迁移 ----------
function migrateData(raw) {
  const d = defaultData();
  if (!raw || typeof raw !== 'object') return d;
  const m = { ...d, ...raw };

  // todos
  if (Array.isArray(m.todos)) {
    m.todos = m.todos.map(t => ({
      id: t.id !== undefined ? t.id : 't' + Date.now() + Math.random(),
      text: t.text || '',
      done: !!t.done,
      date: (t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date)) ? t.date : todayStr(),
      type: (t.type && TODO_TYPES.includes(t.type)) ? t.type : '其他',
    }));
  } else m.todos = [];

  // checkins
  let checkins = [];
  if (Array.isArray(m.checkins)) {
    checkins = m.checkins.map(c => ({
      id: c.id || 'c' + Date.now() + Math.random(),
      name: c.name || '习惯', emoji: c.emoji || '⭐',
      target: typeof c.target === 'number' && c.target > 0 ? c.target : 1,
      count: typeof c.count === 'number' ? c.count : 0,
      countDate: c.countDate || '',
      streak: typeof c.streak === 'number' ? c.streak : 0,
      lastDate: c.lastDate || '',
      // 【修改点】保留新建习惯弹窗写入的分类与长期计划天数
      category: typeof c.category === 'string' && c.category ? c.category : '其他',
      planDays: typeof c.planDays === 'number' && c.planDays > 0 ? c.planDays : 0,
    }));
  }
  if (Array.isArray(m.habits)) {
    m.habits.forEach(h => {
      if (checkins.some(c => c.name === h.name)) return;
      checkins.push({
        id: h.id || 'c' + Date.now() + Math.random(),
        name: h.name || '习惯', emoji: h.emoji || '⭐',
        target: 1, count: 0, countDate: '',
        streak: typeof h.streak === 'number' ? h.streak : 0,
        lastDate: h.lastDate || '',
        category: '其他', planDays: 0,
      });
    });
  }
  if (m.water && Array.isArray(m.water.items)) {
    m.water.items.forEach(w => {
      if (checkins.some(c => c.name === w.name)) return;
      checkins.push({
        id: w.id || 'c' + Date.now() + Math.random(),
        name: w.name || '饮品', emoji: w.emoji || '🥤',
        target: typeof w.target === 'number' && w.target > 0 ? w.target : 8,
        count: typeof w.count === 'number' ? w.count : 0,
        countDate: m.water.date || '',
        streak: 0, lastDate: '',
        category: '其他', planDays: 0,
      });
    });
  }
  m.checkins = checkins;
  m.checkinViewMode = m.checkinViewMode === 'stack' ? 'stack' : 'list';
  delete m.habits; delete m.water;

  if (!m.mood || typeof m.mood !== 'object') m.mood = {};

  if (!m.quote || typeof m.quote !== 'object') m.quote = { currentIdx: 0, favorites: [] };
  if (!Array.isArray(m.quote.favorites)) m.quote.favorites = [];
  if (typeof m.quote.currentIdx !== 'number') m.quote.currentIdx = 0;
  if (m.favoriteQuote && typeof m.favoriteQuote === 'string' && m.favoriteQuote) {
    if (!m.quote.favorites.some(f => f.text === m.favoriteQuote)) {
      m.quote.favorites.push({ text: m.favoriteQuote, date: todayStr() });
    }
    delete m.favoriteQuote;
  }
  if (typeof m.currentQuoteIdx === 'number' && !m.quote.currentIdx) {
    m.quote.currentIdx = m.currentQuoteIdx;
    delete m.currentQuoteIdx;
  }

  // avatar 兼容：旧数据一定是 emoji 字符串；如果是图片 URL/base64 也保留
  if (!m.avatar || typeof m.avatar !== 'string') m.avatar = '😊';

  m.modules = { ...d.modules, ...(raw.modules || {}) };
  return m;
}

// ---------- 数据读写 ----------
let data;
let calYear, calMonth, selectedMoodDate;
let journeyDate;  // 坚持历程当前查看的日期

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { data = migrateData(JSON.parse(raw)); return; }
  } catch(e) { console.warn('读取失败', e); }
  data = defaultData();
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch(e) { console.warn('保存失败', e); }
}

// 跨天清零 count
function normalizeCheckins() {
  const today = todayStr();
  data.checkins.forEach(c => {
    if (c.countDate !== today) {
      c.count = 0;
      c.countDate = today;
    }
  });
}

// ---------- 头像渲染（统一处理 emoji / 图片） ----------
function renderAvatar(el) {
  if (!el) return;
  const a = data.avatar || '😊';
  if (isImageAvatar(a)) {
    el.innerHTML = `<img src="${escapeHtml(a)}" alt="头像" onerror="this.parentElement.textContent='😊'">`;
  } else {
    el.textContent = a;
  }
}

// ---------- 顶部 ----------
function renderHeader() {
  const h = new Date().getHours();
  let g = '你好';
  if (h<6) g='夜深了'; else if (h<11) g='早上好'; else if (h<14) g='中午好';
  else if (h<18) g='下午好'; else g='晚上好';
  document.getElementById('greetingText').textContent = g + '，' + data.nickname;
  renderAvatar(document.getElementById('avatar'));
  const d = new Date(), w = ['日','一','二','三','四','五','六'];
  document.getElementById('dateText').textContent =
    `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 星期${w[d.getDay()]}`;
}

// ---------- 主题 ----------
function applyTheme() {
  document.documentElement.style.setProperty('--primary', data.themeColor);
  const rgb = hexToRgb(data.themeColor);
  document.documentElement.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  if (data.darkMode) {
    document.documentElement.style.setProperty('--primary-light', `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`);
    document.documentElement.setAttribute('data-theme','dark');
    document.getElementById('themeToggle').textContent = '☀️';
  } else {
    document.documentElement.style.setProperty('--primary-light', `rgba(${rgb.r},${rgb.g},${rgb.b},0.13)`);
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('themeToggle').textContent = '🌙';
  }
}

/* ============================================
   待办
   ============================================ */
function getVisibleTodos() {
  const q = (data.todoSearch || '').trim().toLowerCase();
  if (q) return data.todos.filter(t => t.text.toLowerCase().includes(q));

  const y = document.getElementById('filterYear').value.trim();
  const m = document.getElementById('filterMonth').value.trim();
  const d = document.getElementById('filterDay').value.trim();

  // 1) 如果什么都没填，默认显示今天及未来
  if (!y && !m && !d) {
    return data.todos.filter(t => t.date >= todayStr());
  }

  // 2) 模糊匹配逻辑
  return data.todos.filter(t => {
    const parts = t.date.split('-'); // [YYYY, MM, DD]
    if (y && parts[0] !== y) return false;
    if (m && parts[1] !== m.padStart(2, '0')) return false;
    if (d && parts[2] !== d.padStart(2, '0')) return false;
    return true;
  });
}
function renderTodos() {
  const c = document.getElementById('todoContainer');
  const list = getVisibleTodos();
  const searching = !!(data.todoSearch || '').trim();
  if (list.length === 0) {
    c.innerHTML = `<div class="empty-state"><span class="emoji">${searching?'🔍':'🎉'}</span>${searching?'没有找到匹配的待办':'今天还没有待办，享受轻松时光'}</div>`;
  } else if (searching) {
    c.innerHTML = list.map(t => `
      <div class="search-result-item">
        <div class="todo-checkbox ${t.done?'checked':''}" data-todo-id="${t.id}"></div>
        <span class="todo-text ${t.done?'done':''}">${escapeHtml(t.text)}</span>
        <span class="todo-date-tag">${t.date.slice(5)} · ${escapeHtml(t.type)}</span>
        <button class="todo-del" data-todo-del="${t.id}">✕</button>
      </div>`).join('');
  } else if (data.todoViewMode === 'date') {
    c.innerHTML = renderByDate(list);
  } else {
    c.innerHTML = renderByType(list);
  }
  const all = data.todos.filter(t => t.date >= todayStr());
  const total = all.length, done = all.filter(t => t.done).length;
  const pct = total === 0 ? 0 : Math.round(done/total*100);
  document.getElementById('todoProgress').style.width = pct + '%';
  document.getElementById('todoProgressText').textContent = `${done} / ${total}（${pct}%）`;
}
function renderByDate(todos) {
  const byDate = {};
  todos.forEach(t => { if (!byDate[t.date]) byDate[t.date] = []; byDate[t.date].push(t); });
  return Object.keys(byDate).sort().map(date => {
    const list = byDate[date];
    const doneCount = list.filter(t => t.done).length;
    const isToday = date === todayStr();
    const label = isToday ? '今天' : formatDateCN(date);
    const byType = {};
    list.forEach(t => { if (!byType[t.type]) byType[t.type] = []; byType[t.type].push(t); });
    const subs = TODO_TYPES.filter(type => byType[type]).map(type =>
      `<div class="todo-subgroup"><div class="todo-subgroup-title"># ${type}</div>${byType[type].map(todoItemHtml).join('')}</div>`
    ).join('');
    return `<div class="todo-group" data-group="${date}">
      <div class="todo-group-header" data-toggle="${date}">
        <span class="todo-group-title">📅 ${label}${isToday?'':' <span style="font-weight:400;color:var(--text-secondary);font-size:11px">'+date+'</span>'}</span>
        <span class="todo-group-meta"><span class="todo-group-badge">${doneCount}/${list.length}</span><span data-toggle-icon="${date}">▸</span></span>
      </div>
      <div class="todo-group-body">${subs}</div>
    </div>`;
  }).join('');
}
function renderByType(todos) {
  const byType = {};
  todos.forEach(t => { if (!byType[t.type]) byType[t.type] = []; byType[t.type].push(t); });
  const icons = { '工作':'💼','生活':'🏠','学习':'📖','其他':'📌' };
  return TODO_TYPES.filter(type => byType[type]).map(type => {
    const list = byType[type];
    const doneCount = list.filter(t => t.done).length;
    const byDate = {};
    list.forEach(t => { if (!byDate[t.date]) byDate[t.date] = []; byDate[t.date].push(t); });
    const subs = Object.keys(byDate).sort().map(date => {
      const isToday = date === todayStr();
      return `<div class="todo-subgroup"><div class="todo-subgroup-title">🗓 ${isToday?'今天':formatDateCN(date)}</div>${byDate[date].map(todoItemHtml).join('')}</div>`;
    }).join('');
    return `<div class="todo-group" data-group="type_${type}">
      <div class="todo-group-header" data-toggle="type_${type}">
        <span class="todo-group-title">${icons[type]||'📌'} ${type}</span>
        <span class="todo-group-meta"><span class="todo-group-badge">${doneCount}/${list.length}</span><span data-toggle-icon="type_${type}">▸</span></span>
      </div>
      <div class="todo-group-body">${subs}</div>
    </div>`;
  }).join('');
}
function todoItemHtml(t) {
  return `<div class="todo-item">
    <div class="todo-checkbox ${t.done?'checked':''}" data-todo-id="${t.id}"></div>
    <span class="todo-text ${t.done?'done':''}">${escapeHtml(t.text)}</span>
    <button class="todo-del" data-todo-del="${t.id}">✕</button>
  </div>`;
}
function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();
  if (!text) return;
  const dateInput = document.getElementById('todoDate');
  const date = (dateInput && dateInput.value) ? dateInput.value : todayStr();
  data.todos.push({ id:'t'+Date.now(), text, done:false, date, type:document.getElementById('todoTypeSelect').value });
  input.value = ''; input.blur();
  // 【修改点】实时刷新：新增待办后同步刷新打卡卡片与日历圆点
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
  showToast('已添加');
}
const debouncedAddFromBlur = debounce(() => {
  const input = document.getElementById('todoInput');
  if (input.value.trim()) addTodo();
}, 400);
function handleTodoClick(e) {
  const ck = e.target.closest('[data-todo-id]');
  if (ck) {
    const t = data.todos.find(x => String(x.id) === String(ck.dataset.todoId));
    if (t) { t.done = !t.done; saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney(); }
    return;
  }
  const del = e.target.closest('[data-todo-del]');
  if (del) {
    data.todos = data.todos.filter(x => String(x.id) !== String(del.dataset.todoDel));
    // 【修改点】实时刷新：待办删除后同步日历圆点
    saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
  }
}
function handleGroupToggle(e) {
  const hdr = e.target.closest('[data-toggle]');
  if (!hdr) return;
  const g = hdr.parentElement;
  g.classList.toggle('expanded');
  const icon = g.querySelector('[data-toggle-icon]');
  if (icon) icon.textContent = g.classList.contains('expanded') ? '▾' : '▸';
}
function clearDone() {
  const today = todayStr();
  data.todos = data.todos.filter(t => !(t.date === today && t.done));
  // 【修改点】实时刷新
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
  showToast('已清空今日已完成');
}

/* ============================================
   打卡（习惯已合并进每日打卡，统一渲染到 checkinContainer）
   ============================================ */
function checkStreakOnCount(item, oldCount, newCount) {
  const today = todayStr();
  const wasDone = oldCount >= item.target;
  const nowDone = newCount >= item.target;
  if (!wasDone && nowDone) {
    if (item.lastDate === today) return;
    item.streak = (item.lastDate === yesterdayStr()) ? item.streak + 1 : 1;
    item.lastDate = today;
  } else if (wasDone && !nowDone) {
    if (item.lastDate === today) {
      item.lastDate = '';
      if (item.streak <= 1) item.streak = 0;
    }
  }
}
// 【删除】renderHabits / tapHabit / addCheckin 已随"习惯打卡"卡片合并而移除
function deleteCheckin(id) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item) return;
  if (confirm(`确定删除「${item.name}」吗？连续打卡记录将一并清除。`)) {
    data.checkins = data.checkins.filter(x => String(x.id) !== String(id));
    // 【修改点】实时刷新：删除后同步日历圆点
    saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
    showToast('已删除');
  }
}
function clearAllCheckins() {
  if (!confirm('确定清空所有打卡项吗？此操作不可恢复。')) return;
  data.checkins = [];
  // 【修改点】实时刷新
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
  showToast('已清空所有打卡项');
}
function renderCheckins() {
  normalizeCheckins();
  const c = document.getElementById('checkinContainer');
  if (data.checkins.length === 0) {
    // 【修改点】文案更新：习惯与打卡已合并，引导使用"新建习惯"按钮
    c.innerHTML = '<div class="empty-state"><span class="emoji">✅</span>还没有习惯，点击下方「＋ 新建习惯」添加</div>';
    return;
  }
  c.innerHTML = data.checkinViewMode === 'stack' ? renderCheckinStack() : renderCheckinList();
}
function renderCheckinList() {
  return data.checkins.map(item => {
    const pct = Math.min(100, item.count/item.target*100);
    return `<div class="checkin-item">
      <div class="checkin-item-header">
        <span class="checkin-item-name">${item.emoji} ${escapeHtml(item.name)}</span>
        <span>
          <span class="checkin-item-count" data-target-edit="${item.id}" title="点击修改目标">${item.count} / ${item.target}</span>
          <button class="checkin-target-btn" data-target-edit="${item.id}" title="修改目标">改目标</button>
        </span>
      </div>
      <div class="water-bar"><div class="water-fill" style="width:${pct}%"></div></div>
      <div class="checkin-controls">
        <button class="btn" data-checkin-add="${item.id}">+1</button>
        <button class="btn btn-ghost" data-checkin-minus="${item.id}">-1</button>
        <button class="checkin-remove" data-checkin-del="${item.id}" title="删除">✕</button>
      </div>
    </div>`;
  }).join('');
}
function renderCheckinStack() {
  const totalCount = data.checkins.reduce((s,i)=>s+i.count,0);
  const totalTarget = data.checkins.reduce((s,i)=>s+i.target,0);
  const pct = Math.min(100, totalCount/totalTarget*100);
  const tags = data.checkins.map(item => {
    const done = item.count >= item.target;
    return `<span class="checkin-tag ${done?'done':''}" data-tag-id="${item.id}">${item.emoji} ${escapeHtml(item.name)} ${item.count}/${item.target}</span>`;
  }).join('');
  return `<div class="water-summary">
      <div class="water-summary-count">${totalCount}</div>
      <div class="water-summary-target">今日目标 ${totalTarget} 次</div>
    </div>
    <div class="water-bar"><div class="water-fill" style="width:${pct}%"></div></div>
    <div class="checkin-tags">${tags}</div>
    <div style="font-size:11px;color:var(--text-secondary);text-align:center;margin-top:6px">点击标签展开操作</div>`;
}
function checkinAdd(id) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item) return;
  const old = item.count;
  item.count++; item.countDate = todayStr();
  checkStreakOnCount(item, old, item.count);
  // 【修改点】实时刷新：打卡变化同步更新日历圆点
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
}
function checkinMinus(id) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item || item.count <= 0) return;
  const old = item.count;
  item.count--; item.countDate = todayStr();
  checkStreakOnCount(item, old, item.count);
  // 【修改点】实时刷新
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
}
function editTarget(id) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item) return;
  const input = prompt(`修改「${item.name}」的每日目标次数（当前 ${item.target}）：`, item.target);
  if (input === null) return;
  const n = parseInt(input, 10);
  if (isNaN(n) || n < 1 || n > 50) { showToast('请输入 1-50 的数字'); return; }
  item.target = n;
  // 【修改点】实时刷新
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
  showToast('目标已修改');
}

/* ============================================
   新建习惯弹窗
   ============================================ */
// 【修改点】打开"新建习惯"弹窗并重置表单
function openHabitForm() {
  const mask = document.getElementById('habitFormMask');
  if (!mask) return;
  const name = document.getElementById('hfName');
  const target = document.getElementById('hfTarget');
  const planDays = document.getElementById('hfPlanDays');
  const category = document.getElementById('hfCategory');
  if (name) name.value = '';
  if (target) target.value = '';
  if (planDays) planDays.value = '';
  if (category) category.value = '健康';
  document.querySelectorAll('#habitIconPicker .habit-icon-option').forEach(el => el.classList.remove('active'));
  mask.style.display = 'flex';
  setTimeout(() => { if (name) name.focus(); }, 60);
}
// 【修改点】关闭"新建习惯"弹窗
function closeHabitForm() {
  const mask = document.getElementById('habitFormMask');
  if (mask) mask.style.display = 'none';
}
// 【修改点】提交新建习惯：读取表单数据 → push 到 data.checkins → 保存并实时刷新
function submitHabitForm() {
  const nameEl = document.getElementById('hfName');
  if (!nameEl) return;
  const name = nameEl.value.trim();
  if (!name) { showToast('请输入习惯名称'); nameEl.focus(); return; }

  const targetRaw = parseInt(document.getElementById('hfTarget').value, 10);
  const target = (!isNaN(targetRaw) && targetRaw >= 1) ? targetRaw : 1;

  const iconEl = document.querySelector('#habitIconPicker .habit-icon-option.active');
  const emoji = iconEl ? iconEl.dataset.e : '⭐';

  const category = document.getElementById('hfCategory').value || '其他';

  const planRaw = parseInt(document.getElementById('hfPlanDays').value, 10);
  const planDays = (!isNaN(planRaw) && planRaw >= 1) ? planRaw : 0;

  data.checkins.push({
    id: 'c' + Date.now(), name, emoji, target,
    count: 0, countDate: todayStr(), streak: 0, lastDate: '',
    category, planDays,
  });
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
  closeHabitForm();
  showToast('已添加习惯「' + name + '」');
}

/* ============================================
   心情月历
   ============================================ */
function renderMoodCalendar() {
  const today = new Date();
  if (calYear === undefined) {
    calYear = today.getFullYear(); calMonth = today.getMonth();
    selectedMoodDate = todayStr();
  }
  document.getElementById('calTitle').textContent = `${calYear}年${calMonth+1}月`;
  const grid = document.getElementById('calGrid');
  let html = ['日','一','二','三','四','五','六'].map(w => `<div class="cal-weekday">${w}</div>`).join('');
  const startWd = new Date(calYear, calMonth, 1).getDay();
  const dim = new Date(calYear, calMonth+1, 0).getDate();
  const dpm = new Date(calYear, calMonth, 0).getDate();
  for (let i = 0; i < 42; i++) {
    const dn = i - startWd + 1;
    let cy = calYear, cm = calMonth, cd = dn;
    if (dn < 1) { cm--; if (cm<0){cm=11;cy--;} cd = dpm + dn; }
    else if (dn > dim) { cm++; if (cm>11){cm=0;cy++;} cd = dn - dim; }
    const ds = `${cy}-${String(cm+1).padStart(2,'0')}-${String(cd).padStart(2,'0')}`;
    const mood = data.mood[ds];
    const isToday = ds === todayStr();
    const isSel = ds === selectedMoodDate;
    const other = (cy !== calYear || cm !== calMonth);

    // 【修改点】统计当天事件：待办 / 打卡 / 心情
    const todoCnt = data.todos.filter(t => t.date === ds).length;
    const checkinCnt = data.checkins.filter(c => c.countDate === ds && c.count > 0).length;
    const tips = [];
    if (todoCnt) tips.push(`待办 ${todoCnt}`);
    if (checkinCnt) tips.push(`打卡 ${checkinCnt}`);
    if (mood) tips.push(`心情 ${mood.emoji}`);
    const tipTitle = tips.length ? `${formatDateCN(ds)}：${tips.join(' · ')}` : '';
    // 【修改点】事件小圆点：多个时并排显示在日期数字下方
    const dots = [
      [todoCnt, 'dot-todo'],
      [checkinCnt, 'dot-checkin'],
      [mood, 'dot-mood'],
    ].filter(([cnt]) => cnt).map(([, cls]) =>
      `<span class="event-dot ${cls}" style="position:static;transform:none;"></span>`
    ).join('');
    const dotsWrap = dots
      ? `<span class="event-dots" style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);display:flex;gap:2px;line-height:0;">${dots}</span>`
      : '';

    html += `<div class="cal-day ${other?'other-month':''} ${isToday?'today':''} ${isSel?'selected':''} ${mood?'has-mood':''}" data-date="${ds}"${tipTitle?` title="${escapeHtml(tipTitle)}"`:''}>
      ${mood?`<span class="mood-emoji-small">${mood.emoji}</span>`:''}
      <span class="day-num">${cd}</span>
      ${dotsWrap}
    </div>`;
  }
  grid.innerHTML = html;
  renderMoodEditor();
  // 【修改点】renderMoodEditor 会重写心情标题，折叠概览数据需在此恢复
  updateCardOverviews();
}
function renderMoodEditor() {
  const m = data.mood[selectedMoodDate] || { emoji:'', note:'' };
  document.querySelectorAll('#moodEmojis .mood-emoji').forEach(el =>
    el.classList.toggle('selected', el.dataset.mood === m.emoji)
  );
  document.getElementById('moodNote').value = m.note || '';
  const isToday = selectedMoodDate === todayStr();
  const label = isToday ? '今天' : formatDateCN(selectedMoodDate);
  document.querySelector('#card-mood .card-title').innerHTML =
    `<span><span class="icon">💭</span>心情记录 <span style="font-size:11px;color:var(--text-secondary);font-weight:400">（编辑：${label}）</span></span>`;
}
function selectMoodDate(ds) { selectedMoodDate = ds; renderMoodCalendar(); }
function selectMoodEmoji(emoji) {
  if (!data.mood[selectedMoodDate]) data.mood[selectedMoodDate] = { emoji, note:'' };
  else data.mood[selectedMoodDate].emoji = emoji;
  // 【修改点】实时刷新：心情变化同步更新日历圆点与打卡卡片
  saveData(); renderTodos(); renderMoodCalendar(); renderCheckins(); renderJourney();
}
function saveMoodNote() {
  const note = document.getElementById('moodNote').value.trim();
  if (!data.mood[selectedMoodDate]) {
    if (!note) return;
    data.mood[selectedMoodDate] = { emoji:'🙂', note };
  } else {
    data.mood[selectedMoodDate].note = note;
  }
  // 【修改点】实时刷新
  saveData(); renderTodos(); renderMoodCalendar(); renderCheckins(); renderJourney();
}

// 【修改点】点击日历日期：弹出该天的详情弹窗（待办/打卡/心情）
function openMoodDetail(ds) {
  const modal = document.getElementById('moodDetailModal');
  if (!modal) return;
  const isToday = ds === todayStr();
  document.getElementById('mdTitle').textContent = '心情详情 · ' + (isToday ? '今天' : formatDateCN(ds));

  const todos = data.todos.filter(t => t.date === ds);
  const dayCheckins = data.checkins.filter(c => c.countDate === ds && c.count > 0);
  const mood = data.mood[ds];
  const itemStyle = 'padding:4px 0;font-size:13px;';

  let html = '';
  // 待办
  html += `<div style="margin-bottom:14px"><div style="font-size:13px;font-weight:600;margin-bottom:4px">📋 待办（${todos.length}）</div>`;
  html += todos.length
    ? todos.map(t => `<div style="${itemStyle}">${t.done ? '✅' : '⬜'} ${escapeHtml(t.text)}</div>`).join('')
    : `<div style="font-size:12px;color:var(--text-secondary)">无待办记录</div>`;
  html += `</div>`;
  // 打卡
  html += `<div style="margin-bottom:14px"><div style="font-size:13px;font-weight:600;margin-bottom:4px">✅ 打卡（${dayCheckins.length}）</div>`;
  html += dayCheckins.length
    ? dayCheckins.map(c => `<div style="${itemStyle}">${c.emoji} ${escapeHtml(c.name)}：${c.count}/${c.target}${c.count >= c.target ? ' ✅' : ''}</div>`).join('')
    : `<div style="font-size:12px;color:var(--text-secondary)">无打卡记录</div>`;
  html += `</div>`;
  // 心情
  html += `<div><div style="font-size:13px;font-weight:600;margin-bottom:4px">💭 心情</div>`;
  html += mood
    ? `<div style="font-size:18px">${mood.emoji || ''}${mood.note ? ' <span style="font-size:13px;color:var(--text-secondary)">' + escapeHtml(mood.note) + '</span>' : ''}</div>`
    : `<div style="font-size:12px;color:var(--text-secondary)">未记录心情</div>`;
  html += `</div>`;

  document.getElementById('mdContent').innerHTML = html;
  modal.style.display = 'flex';
}
// 【修改点】关闭心情详情弹窗
function closeMoodDetail() {
  const modal = document.getElementById('moodDetailModal');
  if (modal) modal.style.display = 'none';
}

/* ============================================
   每日一句
   ============================================ */
function renderQuote() {
  document.getElementById('quoteText').textContent = QUOTES[data.quote.currentIdx];
  const list = document.getElementById('favoritesList');
  const items = document.getElementById('favoritesItems');
  if (data.quote.favorites.length === 0) { list.style.display = 'none'; }
  else {
    list.style.display = 'block';
    items.innerHTML = data.quote.favorites.map((f, i) => `
      <div class="favorite-item">
        <span class="favorite-text">"${escapeHtml(f.text)}"</span>
        <span style="text-align:right">
          <div class="favorite-date">${escapeHtml(f.date)}</div>
          <button class="favorite-del" data-fav-del="${i}">✕</button>
        </span>
      </div>`).join('');
  }
}
function nextQuote() {
  data.quote.currentIdx = (data.quote.currentIdx + 1) % QUOTES.length;
  saveData(); renderQuote();
}
function favoriteCurrentQuote() {
  const text = QUOTES[data.quote.currentIdx];
  if (data.quote.favorites.some(f => f.text === text)) { showToast('已经收藏过了'); return; }
  data.quote.favorites.unshift({ text, date: todayStr() });
  saveData(); renderQuote(); showToast('已收藏');
}
function deleteFavorite(idx) {
  data.quote.favorites.splice(idx, 1);
  saveData(); renderQuote();
}

/* ============================================
   便签
   ============================================ */
function renderNote() { document.getElementById('noteArea').value = data.note; }
function saveNote() {
  data.note = document.getElementById('noteArea').value; saveData();
  document.getElementById('noteSaved').textContent =
    '✓ 已自动保存 ' + new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
}

/* ============================================
   坚持历程（时间机器）
   - 顶部日期选择器选择任意历史日期
   - 下方显示该日期的待办/打卡/心情详情，可直接编辑
   ============================================ */
function renderJourney() {
  if (!journeyDate) journeyDate = todayStr();
  const dateInput = document.getElementById('journeyDate');
  if (dateInput.value !== journeyDate) dateInput.value = journeyDate;

  const date = journeyDate;
  const isToday = date === todayStr();
  const label = isToday ? '今天' : formatDateCN(date);

  // --- 汇总标签 ---
  const todos = data.todos.filter(t => t.date === date);
  const td = todos.filter(t => t.done).length;
  // 打卡：当天 countDate === date 的项
  const dayCheckins = data.checkins.filter(c => c.countDate === date);
  const totalCups = dayCheckins.reduce((s,c) => s + c.count, 0);
  const doneCheckins = dayCheckins.filter(c => c.count >= c.target).length;
  const mood = data.mood[date];

  const summaryEl = document.getElementById('journeySummary');
  const stats = [];
  if (todos.length > 0) stats.push(`<span class="journey-stat ${td===todos.length?'highlight':''}">📋 待办 ${td}/${todos.length}</span>`);
  if (dayCheckins.length > 0) stats.push(`<span class="journey-stat">✅ 达标 ${doneCheckins}/${dayCheckins.length} 项</span>`);
  if (totalCups > 0) stats.push(`<span class="journey-stat">💧 累计 ${totalCups} 次</span>`);
  if (mood) stats.push(`<span class="journey-stat highlight">${mood.emoji}</span>`);
  summaryEl.innerHTML = stats.length > 0
    ? `<span style="font-size:12px;color:var(--text-secondary);margin-right:6px">${label}：</span>` + stats.join('')
    : `<span class="journey-detail-empty">${label} 还没有任何记录</span>`;

  // --- 详情编辑区 ---
  const detailEl = document.getElementById('journeyDetail');
  let html = '';

  // 1) 待办
  html += `<div class="journey-detail-section">
    <div class="journey-detail-title">📋 待办（${todos.length}）</div>`;
  if (todos.length === 0) {
    html += `<div class="journey-detail-empty">这一天没有待办</div>`;
  } else {
    html += todos.map(t => `
      <div class="journey-detail-item">
        <div class="todo-checkbox ${t.done?'checked':''}" data-journey-todo="${t.id}"></div>
        <span class="todo-text ${t.done?'done':''}">${escapeHtml(t.text)}</span>
        <span style="font-size:10px;color:var(--text-secondary)">${escapeHtml(t.type)}</span>
      </div>`).join('');
  }
  html += `</div>`;

  // 2) 打卡
  html += `<div class="journey-detail-section">
    <div class="journey-detail-title">✅ 打卡（${data.checkins.length}）</div>`;
  if (data.checkins.length === 0) {
    html += `<div class="journey-detail-empty">没有打卡项</div>`;
  } else {
    html += data.checkins.map(c => {
      // 历史日期的 count：如果 countDate === date 用真实值，否则显示 0
      const cnt = (c.countDate === date) ? c.count : 0;
      return `<div class="journey-detail-item">
        <span>${c.emoji}</span>
        <span style="flex:1">${escapeHtml(c.name)}</span>
        <span style="font-size:12px;color:var(--text-secondary)">${cnt}/${c.target}</span>
        <span class="checkin-mini-controls">
          <button class="btn btn-ghost" data-journey-check-minus="${c.id}" data-date="${date}">-</button>
          <button class="btn" data-journey-check-add="${c.id}" data-date="${date}">+</button>
        </span>
      </div>`;
    }).join('');
  }
  html += `</div>`;

  // 3) 心情
  const m = data.mood[date] || { emoji:'', note:'' };
  html += `<div class="journey-detail-section">
    <div class="journey-detail-title">💭 心情</div>
    <div class="journey-mood-editor">`;
  ['😄','🙂','😐','😔','😢'].forEach(e => {
    html += `<span class="mood-emoji ${m.emoji===e?'selected':''}" data-journey-mood="${e}" data-date="${date}">${e}</span>`;
  });
  html += `<textarea data-journey-mood-note="${date}" rows="2" placeholder="写点什么...">${escapeHtml(m.note||'')}</textarea>`;
  html += `</div></div>`;

  detailEl.innerHTML = html;
}

// 在"时间机器"里修改待办完成状态
function journeyToggleTodo(id) {
  const t = data.todos.find(x => String(x.id) === String(id));
  if (!t) return;
  t.done = !t.done;
  saveData();
  renderTodos();        // 同步主待办列表
  renderCheckins();     // 【修改点】实时刷新打卡卡片
  renderMoodCalendar(); // 【修改点】实时刷新日历圆点
  renderJourney();      // 同步历程自身
}

// 在"时间机器"里给某天的打卡项 +1/-1
// 注意：历史日期的 count 存在 checkin.count，但 countDate 记录是哪天
function journeyCheckAdd(id, date) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item) return;
  // 如果当前 countDate 不是目标日期，先把 count 重置为该日期的值
  if (item.countDate !== date) {
    item.count = 0;
    item.countDate = date;
  }
  item.count++;
  // 如果达到目标且 lastDate 不是今天，更新 streak（仅限目标日期=今天时）
  if (date === todayStr()) {
    const oldCount = item.count - 1;
    checkStreakOnCount(item, oldCount, item.count);
  }
  saveData();
  // 【修改点】实时刷新：同步日历圆点
  renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
}
function journeyCheckMinus(id, date) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item) return;
  if (item.countDate !== date) {
    item.count = 0; item.countDate = date;
  }
  if (item.count <= 0) return;
  item.count--;
  if (date === todayStr()) {
    const oldCount = item.count + 1;
    checkStreakOnCount(item, oldCount, item.count);
  }
  saveData();
  // 【修改点】实时刷新
  renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
}

// 在"时间机器"里选心情
function journeySelectMood(emoji, date) {
  if (!data.mood[date]) data.mood[date] = { emoji, note:'' };
  else data.mood[date].emoji = emoji;
  saveData();
  renderMoodCalendar();
  renderTodos(); // 【修改点】实时刷新待办
  renderCheckins(); // 【修改点】实时刷新打卡卡片
  renderJourney();
}
function journeySaveMoodNote(date, note) {
  if (!data.mood[date]) {
    if (!note.trim()) return;
    data.mood[date] = { emoji:'🙂', note };
  } else {
    data.mood[date].note = note;
  }
  saveData();
  renderMoodCalendar();
  renderTodos(); // 【修改点】实时刷新待办
  renderCheckins(); // 【修改点】实时刷新打卡卡片
  renderJourney();
}

/* ============================================
   模块显隐
   ============================================ */
function applyModuleVisibility() {
  // 【修改点】习惯卡已合并进"习惯与打卡"（card-checkin），map 中移除 habit；
  // card-checkin 只要 checkin 或 habit 任一开启即显示
  const map = { todo:'card-todo', mood:'card-mood', checkin:'card-checkin', quote:'card-quote', note:'card-note', journey:'card-journey' };
  Object.keys(map).forEach(k => {
    const el = document.getElementById(map[k]);
    if (el) el.style.display = data.modules[k] ? '' : 'none';
  });
  const checkinEl = document.getElementById('card-checkin');
  if (checkinEl) checkinEl.style.display = (data.modules.checkin || data.modules.habit) ? '' : 'none';
  document.querySelectorAll('.toggle[data-module]').forEach(el => el.classList.toggle('on', !!data.modules[el.dataset.module]));
}

/* ============================================
   折叠概览数据：折叠时在标题右侧显示数据摘要
   ============================================ */
// 【修改点】根据卡片类型计算概览文本
function getCardOverviewData(card) {
  if (card.id === 'card-todo') {
    const all = data.todos.filter(t => t.date >= todayStr());
    return `${all.filter(t => t.done).length}/${all.length}`;
  }
  if (card.id === 'card-checkin') {
    const done = data.checkins.filter(c => c.count >= c.target).length;
    return `${done}/${data.checkins.length}`;
  }
  if (card.id === 'card-mood') {
    const m = data.mood[todayStr()];
    return m ? m.emoji : '—';
  }
  return null;
}
// 【修改点】插入/更新/移除某张卡片的概览数据（展开时移除，折叠时插入）
function updateCardOverview(card) {
  const title = card.querySelector(':scope > .card-title');
  if (!title) return;
  const anchor = title.querySelector('.card-title-right') || title;
  let chip = anchor.querySelector('.overview-data');
  if (!card.classList.contains('collapsed')) {
    if (chip) chip.remove();
    return;
  }
  const text = getCardOverviewData(card);
  if (text == null) { if (chip) chip.remove(); return; }
  if (!chip) {
    chip = document.createElement('span');
    chip.className = 'overview-data';
    anchor.appendChild(chip);
  }
  chip.textContent = text;
}
// 【修改点】批量刷新所有卡片的概览数据
function updateCardOverviews() {
  document.querySelectorAll('.card').forEach(updateCardOverview);
}

/* ============================================
   全局卡片折叠：动态包裹 .card-title 之后的兄弟节点
   ============================================ */
const COLLAPSE_KEY = 'Novarise_card_state'; // localStorage 键：{ cardId: true/false }

function loadCardStates() {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY)) || {}; }
  catch(e) { return {}; }
}
function saveCardState(cardId, collapsed) {
  const s = loadCardStates();
  s[cardId] = collapsed;
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(s)); } catch(e) {}
}

function initCollapsibleCards() {
  const states = loadCardStates();
  const cards = document.querySelectorAll('.card');
  cards.forEach((card, idx) => {
    // 给卡片一个唯一 id（没有就自动生成）
    const cardId = card.id || ('card-' + idx);
    if (!card.id) card.id = cardId;

    // 已经处理过就跳过
    if (card.dataset.collapseInit) return;

    // 兼容旧的 <details> 结构：把 summary 提到顶层，把 details-body 内容展开
    const oldDetails = card.querySelector(':scope > details');
    if (oldDetails) {
      const summary = oldDetails.querySelector(':scope > summary');
      const bodyInner = oldDetails.querySelector(':scope > .details-body') || oldDetails;
      // 把 summary 包装成统一的 .card-title（如果它还不是）
      if (summary) {
        summary.classList.add('card-title');
        summary.style.cursor = 'pointer';
        // 把 summary 插到 details 之前
        card.insertBefore(summary, oldDetails);
      }
      // 把 details 内部所有节点（除 summary）移到临时 fragment
      const frag = document.createDocumentFragment();
      Array.from(bodyInner.childNodes).forEach(n => frag.appendChild(n));
      // 删除 details
      card.removeChild(oldDetails);
      // 把 fragment 中的节点暂存，稍后统一包裹
      // 我们用一个临时 marker 记录这些节点
      card.__pendingBodyNodes = frag;
    }

    // 找到标题元素（.card-title）
    const title = card.querySelector(':scope > .card-title');
    if (!title) return;

    // 在标题右侧（card-title-right，否则整个 title 末尾）插入箭头
    let arrowAnchor = title.querySelector('.card-title-right') || title;
    const arrow = document.createElement('span');
    arrow.className = 'card-fold-arrow';
    arrow.textContent = '▾';
    arrowAnchor.appendChild(arrow);

    // 收集标题之后的所有兄弟节点，包进 .card-body
    const body = document.createElement('div');
    body.className = 'card-body';
    // 先把 details 解构出来的 pending 节点放进去
    if (card.__pendingBodyNodes) body.appendChild(card.__pendingBodyNodes);
    // 再把标题之后的兄弟节点移过来
    let node = title.nextSibling;
    while (node) {
      const next = node.nextSibling;
      body.appendChild(node);
      node = next;
    }
    // 把 body 追加到卡片末尾
    card.appendChild(body);

    // 还原折叠状态
    const collapsed = !!states[cardId];
    if (collapsed) card.classList.add('collapsed');
    // 【修改点】折叠状态恢复后立即补上概览数据
    updateCardOverview(card);

    // 点击标题切换折叠（click + touchend 双绑定）
    const toggle = (e) => {
      // 避免点到标题内的按钮/输入框时误触发（如视图切换 tab、清空按钮）
      if (e.target.closest('button, input, select, textarea, a, .view-tab, [data-nofold]')) return;
      const isCollapsed = card.classList.toggle('collapsed');
      saveCardState(cardId, isCollapsed);
      // 【修改点】折叠/展开时同步插入或移除概览数据
      updateCardOverview(card);
    };
    bindTap(title, toggle);

    card.dataset.collapseInit = '1';
  });
}

/* ============================================
   总刷新
   ============================================ */
function refreshAll() {
  normalizeCheckins();
  applyTheme(); renderHeader(); renderTodos();
  renderCheckins(); renderMoodCalendar(); renderQuote(); renderNote();
  renderJourney(); applyModuleVisibility();
  // 【修改点】折叠中的卡片概览数据也随数据变化实时刷新
  updateCardOverviews();
  document.querySelectorAll('#todoViewTabs .view-tab').forEach(el => el.classList.toggle('active', el.dataset.view === data.todoViewMode));
  document.querySelectorAll('#checkinViewTabs .view-tab').forEach(el => el.classList.toggle('active', el.dataset.mode === data.checkinViewMode));
  document.getElementById('todoSearch').value = data.todoSearch || '';
  // 强制给日期输入框赋值为今天，避免出现 yyyy/mm/日 的“伪乱码”
  // 默认填入今天的年月日
  const today = todayStr().split('-');
  const yEl = document.getElementById('filterYear');
  const mEl = document.getElementById('filterMonth');
  const dEl = document.getElementById('filterDay');
  if (yEl && !yEl.value && !mEl.value && !dEl.value) {
    yEl.value = today[0];
    mEl.value = today[1];
    dEl.value = today[2];
  }
  if (!journeyDate) journeyDate = todayStr();
  document.getElementById('journeyDate').value = journeyDate;
}

/* ============================================
   事件绑定
   ============================================ */
function bindTap(el, handler) {
  let touched = false;
  el.addEventListener('touchend', function(e) {
    touched = true; e.preventDefault(); handler(e);
    setTimeout(() => { touched = false; }, 350);
  }, { passive: false });
  el.addEventListener('click', function(e) { if (touched) return; handler(e); });
}

function bindEvents() {
  // 待办
  bindTap(document.getElementById('addTodoBtn'), addTodo);
  document.getElementById('todoInput').addEventListener('keydown', e => { if (e.key==='Enter'){e.preventDefault();addTodo();} });
  document.getElementById('todoInput').addEventListener('blur', debouncedAddFromBlur);
  document.getElementById('todoSearch').addEventListener('input', debounce(e => {
    data.todoSearch = e.target.value; saveData(); renderTodos();
  }, 200));
  const tc = document.getElementById('todoContainer');
  tc.addEventListener('click', handleTodoClick);
  tc.addEventListener('click', handleGroupToggle);
  document.getElementById('clearDoneBtn').addEventListener('click', clearDone);

    // --- 自定义模糊日期联动逻辑 ---
  const yInput = document.getElementById('filterYear');
  const mInput = document.getElementById('filterMonth');
  const dInput = document.getElementById('filterDay');
  const hiddenPicker = document.getElementById('hiddenDatePicker');

  // 用户手动输入时触发过滤
  [yInput, mInput, dInput].forEach(el => {
    el.addEventListener('input', () => { renderTodos(); });
  });

  // 点击日历图标，唤起原生选择器
  document.getElementById('openCalendarBtn').addEventListener('click', () => {
    if (hiddenPicker.showPicker) hiddenPicker.showPicker(); // 现代浏览器API
    else hiddenPicker.click(); // 兼容旧版
  });

  // 从日历选择后，拆解填入三个输入框
  hiddenPicker.addEventListener('change', (e) => {
    const val = e.target.value; // 格式为 YYYY-MM-DD
    if (val) {
      const [y, m, d] = val.split('-');
      yInput.value = y;
      mInput.value = m;
      dInput.value = d;
      renderTodos();
    }
  });

  // 【删除】原"习惯"卡片的 addHabitBtn / habitInput 绑定已随卡片合并移除

  // 每日打卡
  document.getElementById('checkinContainer').addEventListener('click', e => {
    const a = e.target.closest('[data-checkin-add]'); if (a) { checkinAdd(a.dataset.checkinAdd); return; }
    const m = e.target.closest('[data-checkin-minus]'); if (m) { checkinMinus(m.dataset.checkinMinus); return; }
    const d = e.target.closest('[data-checkin-del]'); if (d) { deleteCheckin(d.dataset.checkinDel); return; }
    const t = e.target.closest('[data-target-edit]'); if (t) { editTarget(t.dataset.targetEdit); return; }
    const tag = e.target.closest('[data-tag-id]');
    if (tag) {
      const id = tag.dataset.tagId;
      const item = data.checkins.find(x => String(x.id) === String(id));
      if (item) {
        const op = confirm(`「${item.name}」当前 ${item.count}/${item.target}\n\n确定 = +1\n取消 = -1`);
        if (op) checkinAdd(id); else checkinMinus(id);
      }
    }
  });
  document.getElementById('checkinViewTabs').addEventListener('click', e => {
    const tab = e.target.closest('.view-tab'); if (!tab) return;
    data.checkinViewMode = tab.dataset.mode; saveData();
    document.querySelectorAll('#checkinViewTabs .view-tab').forEach(el => el.classList.toggle('active', el===tab));
    renderCheckins();
  });

  // 【修改点】新建习惯弹窗绑定（元素来自升级版 index.html，缺失时跳过）
  safeBind('openHabitFormBtn', 'click', openHabitForm);
  safeBind('hfSubmit', 'click', submitHabitForm);
  safeBind('hfCancel', 'click', closeHabitForm);
  safeBind('hfClose', 'click', closeHabitForm);
  safeBind('habitFormMask', 'click', e => { if (e.target === e.currentTarget) closeHabitForm(); });
  safeBind('hfName', 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitHabitForm(); } });
  safeBind('habitIconPicker', 'click', e => {
    const opt = e.target.closest('.habit-icon-option');
    if (!opt) return;
    opt.parentElement.querySelectorAll('.habit-icon-option').forEach(el => el.classList.remove('active'));
    opt.classList.add('active');
  });

  // 心情
  document.getElementById('moodEmojis').addEventListener('click', e => {
    if (e.target.classList.contains('mood-emoji')) selectMoodEmoji(e.target.dataset.mood);
  });
  document.getElementById('moodNote').addEventListener('input', saveMoodNote);
  document.getElementById('calPrev').addEventListener('click', () => {
    calMonth--; if (calMonth<0){calMonth=11;calYear--;} renderMoodCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    calMonth++; if (calMonth>11){calMonth=0;calYear++;} renderMoodCalendar();
  });
  document.getElementById('calGrid').addEventListener('click', e => {
    const day = e.target.closest('.cal-day'); if (!day) return;
    const ds = day.dataset.date;
    selectMoodDate(ds);   // 更新选中态（选中态仍保留）
    openMoodDetail(ds);   // 【修改点】点击日期弹出当天详情
  });

  // 【修改点】心情详情弹窗绑定（元素来自升级版 index.html，缺失时跳过）
  safeBind('mdClose', 'click', closeMoodDetail);
  safeBind('moodDetailModal', 'click', e => { if (e.target === e.currentTarget) closeMoodDetail(); });

  // 每日一句
  document.getElementById('newQuoteBtn').addEventListener('click', nextQuote);
  document.getElementById('favoriteQuoteBtn').addEventListener('click', favoriteCurrentQuote);
  document.getElementById('favoritesItems').addEventListener('click', e => {
    const del = e.target.closest('[data-fav-del]'); if (del) deleteFavorite(Number(del.dataset.favDel));
  });

  // 便签
  document.getElementById('noteArea').addEventListener('input', debounce(saveNote, 500));

  // 主题
  document.getElementById('themeToggle').addEventListener('click', () => {
    data.darkMode = !data.darkMode; saveData(); applyTheme();
    document.getElementById('darkModeToggle').classList.toggle('on', data.darkMode);
  });

  // 设置面板
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('closeSettings').addEventListener('click', closeSettings);
  document.getElementById('settingsOverlay').addEventListener('click', e => { if (e.target===e.currentTarget) closeSettings(); });

  // 昵称（失焦保存 + Toast）
  document.getElementById('nicknameInput').addEventListener('change', e => {
    data.nickname = e.target.value.trim() || '小伙伴';
    saveData(); renderHeader();
    showToast('个人信息已保存');
  });

  // 头像 emoji 选择
  document.getElementById('avatarPicker').addEventListener('click', e => {
    if (e.target.classList.contains('emoji-option')) {
      applyAvatar(e.target.dataset.emoji, 'emoji');
    }
  });

  // 上传本地图片
  document.getElementById('uploadAvatarBtn').addEventListener('click', () => {
    document.getElementById('avatarFileInput').click();
  });
  document.getElementById('avatarFileInput').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('图片不能超过 2MB'); e.target.value=''; return; }
    const reader = new FileReader();
    reader.onload = ev => {
      applyAvatar(ev.target.result, 'local');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // 网络图片 URL
  document.getElementById('avatarUrlInput').addEventListener('change', e => {
    const url = e.target.value.trim();
    if (!url) return;
    if (!/^https?:\/\/.+/i.test(url)) { showToast('请输入以 http(s):// 开头的链接'); return; }
    applyAvatar(url, 'url');
  });

  // 点击顶部头像打开设置
  document.getElementById('avatar').addEventListener('click', openSettings);

  // 主题色
  document.getElementById('colorPicker').addEventListener('click', e => {
    if (e.target.classList.contains('color-dot')) {
      data.themeColor = e.target.dataset.color; saveData(); applyTheme();
      document.querySelectorAll('.color-dot').forEach(el => el.classList.toggle('active', el===e.target));
      showToast('主题色已保存');
    }
  });
  document.getElementById('darkModeToggle').addEventListener('click', () => {
    data.darkMode = !data.darkMode; saveData(); applyTheme();
    document.getElementById('darkModeToggle').classList.toggle('on', data.darkMode);
  });
  document.querySelectorAll('.toggle[data-module]').forEach(el => {
    el.addEventListener('click', () => {
      const k = el.dataset.module; data.modules[k] = !data.modules[k]; saveData(); applyModuleVisibility();
    });
  });
  document.getElementById('clearCheckinsBtn').addEventListener('click', clearAllCheckins);
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', importData);
  document.getElementById('resetBtn').addEventListener('click', resetData);

  // 坚持历程日期选择
  document.getElementById('journeyDate').addEventListener('change', e => {
    journeyDate = e.target.value || todayStr();
    renderJourney();
  });

  // 坚持历程详情区的事件委托
  document.getElementById('journeyDetail').addEventListener('click', e => {
    const todoCk = e.target.closest('[data-journey-todo]');
    if (todoCk) { journeyToggleTodo(todoCk.dataset.journeyTodo); return; }
    const addBtn = e.target.closest('[data-journey-check-add]');
    if (addBtn) { journeyCheckAdd(addBtn.dataset.journeyCheckAdd, addBtn.dataset.date); return; }
    const minusBtn = e.target.closest('[data-journey-check-minus]');
    if (minusBtn) { journeyCheckMinus(minusBtn.dataset.journeyCheckMinus, minusBtn.dataset.date); return; }
    const moodBtn = e.target.closest('[data-journey-mood]');
    if (moodBtn) { journeySelectMood(moodBtn.dataset.journeyMood, moodBtn.dataset.date); return; }
  });
  // 心情笔记输入
  document.getElementById('journeyDetail').addEventListener('input', debounce(e => {
    if (e.target.matches('[data-journey-mood-note]')) {
      journeySaveMoodNote(e.target.dataset.journeyMoodNote, e.target.value);
    }
  }, 500));
}

// ---------- 启动 ----------
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  selectedMoodDate = todayStr();
  journeyDate = todayStr();
  initCollapsibleCards();  // 先动态包裹所有卡片，再绑定事件和渲染内容
  bindEvents();
  refreshAll();
});
