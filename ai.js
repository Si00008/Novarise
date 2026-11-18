/* ============================================
   【新增 B】AI 聊天悬浮窗（本轮已接真实接口）
   - 悬浮球开关面板
   - 发送：用户气泡 + 「AI 正在思考」占位 → 真实请求返回后替换成 AI 气泡 → 自动滚动到底
   - ⚙️ 用 prompt 采集 API Key，存进 localStorage['user_ai_key']
   - 请求发往 DeepSeek（https://api.deepseek.com/chat/completions），model 固定 deepseek-chat
   - 失败不弹框，直接把原因写进对话气泡
   ============================================ */

/* ---- 【本轮重构】平台配置字典：下拉框的 value 直接就是这里的键，想再加平台往下补一条 ---- */
const AI_PROVIDERS = {
  zhipu: {
    name: '智谱',
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
    keyStorage: 'api_key_zhipu',
    keyPrefix: 'sk-',                    // 仅用于 ⚙️ 输入框的提示文案
    note: '免费',
    modelsUrl: '',                       // 智谱没有可靠的公开模型列表接口，留空＝保存 Key 后不自动查模型
    // 智谱端点实测不返回 Access-Control-Allow-Origin，网页直连必被 CORS 拦。
    // 将来若自建了转发层（例如 https://你的代理/api/zhipu），把这一行填上，请求会自动改走代理
    proxyUrl: ''
  },
  doubao: {
    name: '豆包',
    // 火山方舟（Ark）的 OpenAI 兼容端点
    url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    // 【实测修正】截图里的 doubao-smart-router-250928 调不通（404 InvalidEndpointOrModel.NotFound），
    // 它只是模型页上的展示名，不是 API 的 Model ID。这里改用与 UI「豆包 (Seed-2.1-pro)」对应的正式 Model ID；
    // 也可换成你在方舟控制台开通的其他 Model ID，或自建推理接入点 ep-xxx
    model: 'doubao-seed-2-1-pro-260628',
    keyStorage: 'api_key_doubao',
    keyPrefix: 'ark-',                   // 方舟的 Key 形如 ark-xxxx
    note: '火山方舟 Doubao-Smart-Router',
    modelsUrl: '',                       // 方舟没有对外的模型列表接口，模型名以控制台开通的为准
    // 方舟的错误响应（如 401）实测不带 Access-Control-Allow-Origin，浏览器读不到状态码；
    // 若确认 Key 正确仍报跨域，可填一个转发代理地址，请求会自动改走代理
    proxyUrl: ''
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'google/gemini-2.0-flash-exp:free',   // 默认免费模型
    keyStorage: 'api_key_openrouter',
    keyPrefix: 'sk-or-v1-',
    note: '海外免费模型',
    modelsUrl: 'https://openrouter.ai/api/v1/models'   // 公开列表，填了 Key 就能自动查
  },
  // 【本轮新增】魔搭 ModelScope：OpenAI 兼容端点，预检实测 ACAO=* 可浏览器直连
  modelscope: {
    name: '魔搭',
    url: 'https://api-inference.modelscope.cn/v1/chat/completions',
    // 模型 ID 取自 GET /v1/models 的真实可调用列表；想换模型时替换成列表里的其他 id（如
    // Qwen/Qwen3.8-27B、ZhipuAI/GLM-4.7-Flash、deepseek-ai/DeepSeek-V4.1-Flash）即可
    model: 'Qwen/Qwen3.5-27B',
    keyStorage: 'api_key_modelscope',
    keyPrefix: 'ms-',                            // 魔搭的 Key 形如 ms-xxxx
    note: '需先绑定阿里云账号',
    modelsUrl: 'https://api-inference.modelscope.cn/v1/models',   // 实测可用，保存 Key 后自动列出 38 个模型
    proxyUrl: ''
  },
  // 【本轮新增】阿里云百炼（DashScope）：实测本机 Key 可直连且返回 200，预检 ACAO=*
  dashscope: {
    name: '阿里云百炼',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen3.8-flash',              // 默认模型；选了别的会记在 ai_model_dashscope，优先用你选的那个
    keyStorage: 'api_key_dashscope',
    keyPrefix: 'sk-',
    note: '已实测可直连',
    modelsUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/models',   // 实测返回 183 个可用模型
    // 【本轮】开启深度思考：响应流里先推 reasoning_content（思考过程），再推 content（正文）
    extraBody: { enable_thinking: true },
    // 走 SSE 流式解析，才能做到“边想边显示”。不支持流式的平台不要加这一行
    stream: true,
    proxyUrl: ''
  },
  // 以后要接新平台：照上面的结构往下加一条，键名与 index.html 里 option 的 value 保持一致即可
};

const DEFAULT_PROVIDER = 'zhipu';                     // 页面加载默认选中的平台（index.html 第一个 option 也是它）
const AI_KEY_STORAGE = 'user_ai_key';                 // 上一轮的单个全局 Key，只读兼容，不再写入
const AI_KEY_STORAGE_LEGACY = 'novarise_ai_api_key';  // 更早的设置浮层用过的键，同上只读
const THINKING_TEXT = 'AI 正在思考';                   // 思考占位文案（后面的点由定时器递增）

function openAiChat() {
  const panel = document.getElementById('aiChatPanel');
  const input = document.getElementById('aiChatInput');
  if (!panel) return;
  panel.style.display = 'flex';        // 显隐由脚本控制（CSS 只管尺寸、圆角与弹出动画）
  if (input) setTimeout(() => input.focus(), 60);
}

function closeAiChat() {
  const panel = document.getElementById('aiChatPanel');
  if (panel) panel.style.display = 'none';
}

function toggleAiChat() {
  const panel = document.getElementById('aiChatPanel');
  if (!panel) return;
  if (panel.style.display === 'flex') closeAiChat(); else openAiChat();
}

// 追加一条气泡：只挂类名，配色/对齐/圆角全部交给 style.css 的 .ai-msg 系列
function appendAiMessage(text, who) {
  const box = document.getElementById('aiChatMessages');
  if (!box) return null;
  const row = document.createElement('div');
  row.className = (who === 'user') ? 'ai-msg ai-msg-user' : 'ai-msg ai-msg-ai';
  row.textContent = text;
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;     // 自动滚到底
  return row;
}

// 消息区滚到最底（流式逐字输出时每次追加都要滚）
function scrollAiToBottom() {
  const box = document.getElementById('aiChatMessages');
  if (box) box.scrollTop = box.scrollHeight;
}

/* 【本轮新增】流式 AI 气泡：一个虚线框的可折叠「深度思考过程」面板 + 正文容器
   - 思考阶段 details 展开，reasoning_content 逐字填进 thinkBody
   - 正文第一次出现时由调用方把 details.open 置 false（自动收起） */
function appendAiStream() {
  const box = document.getElementById('aiChatMessages');
  if (!box) return null;

  const row = document.createElement('div');
  row.className = 'ai-msg ai-msg-ai';

  const think = document.createElement('details');
  // 【本轮】类名统一为 .reasoning-panel（style.css 里与 .ai-think 共用同一套样式）
  think.className = 'reasoning-panel';
  think.open = true;                       // 先展开，让人看到它在想
  const summary = document.createElement('summary');
  summary.textContent = '🤔 深度思考过程';
  const thinkBody = document.createElement('div');
  thinkBody.className = 'reasoning-panel-body';
  think.appendChild(summary);
  think.appendChild(thinkBody);

  const replyBody = document.createElement('div');
  replyBody.className = 'ai-reply';

  row.appendChild(think);
  row.appendChild(replyBody);
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;

  return {
    row: row,
    think: think,
    thinkBody: thinkBody,
    replyBody: replyBody,
    replyStarted: false                   // 标记正文是否已经开始输出（只收起一次）
  };
}

// 「正在思考」占位：文字点点由 JS 依次递增，转圈与呼吸动画交给 style.css 的 .ai-msg-thinking
function appendAiThinking() {
  const box = document.getElementById('aiChatMessages');
  if (!box) return null;
  const row = document.createElement('div');
  row.className = 'ai-msg ai-msg-ai ai-msg-thinking';
  row.style.opacity = '0.75';
  row.textContent = THINKING_TEXT;
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
  let dots = 0;
  row.__thinkingTimer = setInterval(() => {
    dots = (dots + 1) % 4;
    row.textContent = THINKING_TEXT + '.'.repeat(dots);
  }, 400);
  return row;
}

function removeAiThinking(row) {
  if (!row) return;
  if (row.__thinkingTimer) clearInterval(row.__thinkingTimer);
  if (row.parentNode) row.parentNode.removeChild(row);
}

/* ---------------- API Key 读写（按平台各存一把） ---------------- */

// 当前下拉框选中的平台（value 就是 AI_PROVIDERS 的键）；取值异常时回落到默认平台
function getProvider() {
  const sel = document.getElementById('aiModelSelect');
  const v = (sel && sel.value) ? sel.value.trim() : '';
  return v || DEFAULT_PROVIDER;
}

// 取平台配置。找不到时返回“未配置”占位对象，绝不静默回退到别的平台——
// 否则会出现“选豆包、实际在调智谱”这种错配
function getProviderConfig(provider) {
  if (AI_PROVIDERS[provider]) return AI_PROVIDERS[provider];
  return { name: provider || '未配置平台', url: '', model: '', keyStorage: '', unconfigured: true };
}

// 读取某平台的 Key：优先该平台自己的 keyStorage；没有则借用上一轮的全局 Key（只读、不回写，避免串平台）
function getProviderKey(provider) {
  const cfg = getProviderConfig(provider);
  try {
    if (cfg.keyStorage) {
      const own = localStorage.getItem(cfg.keyStorage);
      if (own && own.trim()) return own.trim();
    }
    const legacy = (localStorage.getItem(AI_KEY_STORAGE) || localStorage.getItem(AI_KEY_STORAGE_LEGACY) || '').trim();
    if (legacy) return legacy;
  } catch (e) { /* 隐私模式或禁用 localStorage */ }
  return '';
}

// 保存某平台的 Key，只写该平台自己的 keyStorage，绝不碰别的平台
function saveProviderKey(provider, key) {
  const cfg = getProviderConfig(provider);
  const v = (key || '').trim();
  if (!cfg.keyStorage) return;
  try {
    if (v) localStorage.setItem(cfg.keyStorage, v);
    else localStorage.removeItem(cfg.keyStorage);
  } catch (e) {
    /* 写不进去就算了，不打断聊天流程 */
  }
  refreshAiKeyDot();
}

/* ---- 【本轮新增】按 Key 自动发现模型 ----
   每个平台的配置里多了一个 modelsUrl（模型列表接口）。点 ⚙️ 存好 Key 后，自动去这个接口拉
   该 Key 能用的模型，列出来让你挑一个；选过的模型记在 localStorage['ai_model_<平台键>']，
   之后发请求优先用它，没选过才用 AI_PROVIDERS 里的默认 model。 */
const AI_MODEL_PREFIX = 'ai_model_';   // 用户为某个平台选定的模型，键名：ai_model_<平台键>
// 列表里夹杂语音/图像/向量等不能聊天的模型，先滤掉让选择项短一些
const AI_MODEL_NOISE = /audio|image|video|tts|asr|embedding|rerank|ocr|realtime|livetranslate|omni|translat/i;

// 取该平台实际要用的模型：优先用户选过的，否则配置里的默认值
function getProviderModel(provider) {
  const cfg = getProviderConfig(provider);
  try {
    const picked = localStorage.getItem(AI_MODEL_PREFIX + provider);
    if (picked && picked.trim()) return picked.trim();
  } catch (e) { /* 隐私模式读不到就用默认 */ }
  return cfg.model || '';
}

// 记住用户为某个平台选定的模型（空值＝清掉，回到默认）
function saveProviderModel(provider, model) {
  try {
    if (model) localStorage.setItem(AI_MODEL_PREFIX + provider, model);
    else localStorage.removeItem(AI_MODEL_PREFIX + provider);
  } catch (e) { /* 写不进去就算了 */ }
}

// 拉该平台的可用模型并让用户挑一个。没有 modelsUrl 的平台直接跳过（不去猜别人的接口）
async function discoverModels(provider) {
  const cfg = getProviderConfig(provider);
  if (!cfg.modelsUrl) return;                 // 这个平台没配列表接口：不打扰用户
  const key = getProviderKey(provider);
  if (!key) return;

  let list = [];
  try {
    const res = await fetch(cfg.modelsUrl, { headers: { 'Authorization': 'Bearer ' + key } });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      window.alert('查询 ' + cfg.name + ' 的模型列表失败（HTTP ' + res.status + '）：' +
        ((data && data.error && (data.error.message || data.error.code)) || 'Key 可能无效'));
      return;
    }
    const arr = (data && (data.data || data.models)) || [];
    list = arr.map(function (x) { return (x && (x.id || x.model || x.name)) || ''; }).filter(Boolean);
  } catch (e) {
    // 这里失败多半是模型列表接口没开跨域
    window.alert('查询 ' + cfg.name + ' 的模型列表失败：' + (e && e.message ? e.message : '网络错误'));
    return;
  }

  if (!list.length) { window.alert(cfg.name + ' 没有返回可用模型列表'); return; }

  const chatLike = list.filter(function (id) { return !AI_MODEL_NOISE.test(id); });
  const pool = chatLike.length ? chatLike : list;          // 全被过滤掉时就退回原始列表
  const show = pool.slice(0, 12);                          // prompt 里只列 12 个，避免弹窗长到看不完
  const current = getProviderModel(provider);
  const tip = '发现 ' + pool.length + ' 个可用模型（先列 ' + show.length + ' 个）：\n' +
    show.map(function (id, i) { return (i + 1) + ') ' + id; }).join('\n') +
    '\n\n注意：列表是官方返回的，但个别模型还需在控制台单独开通，调用报 not activated 时换一个即可。' +
    '\n输入序号或完整模型 ID 选用；直接回车沿用当前的 ' + current + '：';

  const ans = window.prompt(tip, '');
  if (ans === null) return;                    // 取消：模型保持原样
  const v = ans.trim();
  if (!v) return;                              // 直接回车：也保持原样

  let picked = v;
  const n = parseInt(v, 10);
  // 纯数字且落在展示范围内，就按序号取
  if (String(n) === v && n >= 1 && n <= show.length) picked = show[n - 1];
  saveProviderModel(provider, picked);
  window.alert('已选用模型：' + picked);
}

// 头部小圆点：只看“当前选中的平台”配没配 Key（绿=已配，灰=未配）
function refreshAiKeyDot() {
  const dot = document.getElementById('aiKeyDot');
  if (!dot) return;
  const provider = getProvider();
  const cfg = getProviderConfig(provider);
  const has = !!getProviderKey(provider);
  dot.style.background = has ? '#6BCB77' : '#ccc';
  dot.style.boxShadow = has ? '0 0 0 3px rgba(107,203,119,0.18)' : 'none';
  dot.title = (has ? '已配置 ' : '未配置 ') + cfg.name + ' 的 Key';
}

// 点击 ⚙️：为“当前平台”采集 Key。取消(返回 null) 或留空 → 什么都不做；保存成功 → 提示「保存成功」
function promptAiApiKey() {
  const provider = getProvider();
  const cfg = getProviderConfig(provider);
  // 平台名 + 前缀提示（豆包这类没有固定前缀就只说平台名）
  const hint = cfg.keyPrefix ? '（通常以 ' + cfg.keyPrefix + ' 开头）' : '';
  const input = window.prompt('请输入你的 ' + cfg.name + ' API Key' + hint + '：', getProviderKey(provider));
  if (input === null) return;      // 点了取消：原样保留，不动 localStorage
  const v = input.trim();
  if (!v) return;                  // 点了确定但没填内容：同样视为放弃
  saveProviderKey(provider, v);    // 只写当前平台的 keyStorage
  window.alert('保存成功');
  // 【本轮新增】输入 Key 后自动查这个平台能用哪些模型，让你现场挑一个
  discoverModels(provider);
}

/* ---------------- 真实请求 ---------------- */

/* 【本轮新增】读 SSE 流：把 reasoning_content 与 content 分别回调给 UI，最后返回拼好的正文
   兼容格式：每行 data: {json}，末尾 data: [DONE]；reasoning 与正文都是增量（delta） */
async function readAiStream(res, handlers) {
  handlers = handlers || {};
  const onReasoning = handlers.onReasoning || function () {};
  const onContent = handlers.onContent || function () {};

  // 极端情况下浏览器不支持 ReadableStream：退回一次性解析，保证还能出结果
  if (!res.body || !res.body.getReader) {
    const raw = await res.text();
    let data = null;
    try { data = JSON.parse(raw); } catch (e) { data = null; }
    const c = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return c ? String(c).trim() : '';
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let content = '';

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();                 // 最后一行可能是半截，留到下一轮再拼
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();       // 顺带处理 \r\n
        if (!line || line.indexOf('data:') !== 0) continue;   // 忽略空行、注释与 event: 行
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let obj = null;
        try { obj = JSON.parse(payload); } catch (e) { continue; }
        const delta = (obj.choices && obj.choices[0] && obj.choices[0].delta) || {};
        if (delta.reasoning_content) onReasoning(delta.reasoning_content);
        if (delta.content) { content += delta.content; onContent(delta.content); }
      }
    }
    // 流结束时 buffer 里可能还剩最后一行没处理
    const tail = buffer.trim();
    if (tail.indexOf('data:') === 0) {
      const payload = tail.slice(5).trim();
      if (payload && payload !== '[DONE]') {
        try {
          const obj = JSON.parse(payload);
          const delta = (obj.choices && obj.choices[0] && obj.choices[0].delta) || {};
          if (delta.reasoning_content) onReasoning(delta.reasoning_content);
          if (delta.content) { content += delta.content; onContent(delta.content); }
        } catch (e) { /* 收尾行解析失败就忽略 */ }
      }
    }
  } finally {
    try { reader.cancel(); } catch (e) { /* 已结束就忽略 */ }
  }
  return content.trim();
}

// 按当前选中的平台发请求。成功返回回复文本；失败抛出带 code 的 Error，交给 explainAiError 翻译
async function sendToAI(message, handlers) {
  handlers = handlers || {};
  // 1) 当前平台：下拉框的 value 就是 AI_PROVIDERS 的键
  const sel = document.getElementById('aiModelSelect');
  const selectedPlatform = (sel && sel.value) ? sel.value.trim() : DEFAULT_PROVIDER;
  const provider = getProviderConfig(selectedPlatform);

  // 1.5) 【本轮】智谱拦截：官方端点实测不返回 Access-Control-Allow-Origin，
  //     浏览器直连必被跨域拦死。这里直接拦下，不发注定失败的请求。
  if (selectedPlatform === 'zhipu') {
    showToast('智谱接口需在后端部署代理转发');
    const err = new Error('智谱接口需在后端部署代理转发');
    err.code = 'BLOCKED';
    err.silent = true;          // 已经用 Toast 提示过了，别再往对话里塞一条错误气泡
    throw err;
  }

  // 2) 平台没配置：直接说明，绝不拿别的平台顶上
  if (provider.unconfigured) {
    const err = new Error('「' + selectedPlatform + '」还没在 AI_PROVIDERS 里配置接口地址，先在 app.js 补一条再用');
    err.code = 'UNCONFIGURED';
    throw err;
  }

  // 3) 豆包的 model 还是“ep-你的接入点ID”占位，先拦住，别发一条注定失败的请求
  if (provider.placeholderModel) {
    const err = new Error('豆包还用不了：先去火山方舟控制台创建推理接入点，把 ep-xxx 填进 AI_PROVIDERS.doubao.model');
    err.code = 'UNCONFIGURED';
    err.provider = provider.name;
    throw err;
  }

  // 4) 读该平台自己的 Key（各平台互不共用）
  const apiKey = getProviderKey(selectedPlatform);
  if (!apiKey) {
    const err = new Error('请先点击右上角⚙️设置 ' + provider.name + ' 的 API Key');
    err.code = 'NO_KEY';
    throw err;
  }

  // 5) 目标地址：填了 proxyUrl 就走代理（智谱那条留给以后），否则直连官方端点
  const targetUrl = provider.proxyUrl || provider.url;

  const controller = new AbortController();
  // 开了深度思考的流式请求耗时长得多，给它 90 秒；普通请求仍 30 秒
  const timer = setTimeout(() => controller.abort(), provider.stream ? 90000 : 30000);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      signal: controller.signal,
      // 各平台都只认这一组头；OpenRouter 专用的 HTTP-Referer / X-Title 保持不发送
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(Object.assign(
        {
          // 【本轮改造】模型不再写死：优先用「输入 Key 后自动查模型」里你选定的那个，没选过才用平台默认
          model: getProviderModel(selectedPlatform),
          messages: [{ role: 'user', content: message }]
        },
        provider.stream ? { stream: true } : {},   // 流式平台带上 stream，才能边想边显示
        provider.extraBody || {}                   // 平台专属参数（例如百炼的 enable_thinking）
      ))
    });

    // 出错时上游返回的是普通 JSON（不是流），先读文本再解析，直接 .json() 会二次抛出
    if (!res.ok) {
      const errRaw = await res.text();
      let data = null;
      try { data = JSON.parse(errRaw); } catch (e) { data = null; }
      const detail = (data && data.error && (data.error.message || data.error.code)) || errRaw.slice(0, 200) || ('HTTP ' + res.status);
      const err = new Error('请求失败（HTTP ' + res.status + '）：' + detail);
      err.code = 'HTTP_' + res.status;
      err.detail = detail;
      err.provider = provider.name;
      err.platform = selectedPlatform;
      err.upstreamCode = (data && data.error && data.error.code) || '';   // 方舟的上游错误码，比 HTTP 状态码更能指路
      throw err;
    }

    // 【本轮新增】流式平台：reasoning_content / content 边读边回调，正文由 UI 逐字渲染
    if (provider.stream) {
      const streamed = await readAiStream(res, handlers);
      if (!streamed) {
        const err = new Error('接口返回内容为空，模型没有给出正文。');
        err.code = 'EMPTY';
        err.provider = provider.name;
        throw err;
      }
      return streamed;
    }

    // 非流式平台：一次性解析
    const raw = await res.text();
    let data = null;
    try { data = JSON.parse(raw); } catch (e) { data = null; }

    const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) {
      const err = new Error('接口返回内容为空，模型没有给出 choices。');
      err.code = 'EMPTY';
      err.provider = provider.name;
      throw err;
    }
    return String(reply).trim();
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('请求超时（30 秒），请检查网络后重试');
      err.code = 'TIMEOUT';
      throw err;
    }
    if (e.code) throw e;      // 上面已包装好的错误，原样上抛
    // fetch 直接抛 TypeError 基本都是跨域被拦或断网（拿不到状态码）
    const err = new Error('网络请求失败：' + ((e && e.message) || '未知错误'));
    err.code = 'NETWORK';
    err.provider = provider.name;
    err.platform = selectedPlatform;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// 把技术性错误翻译成用户看得懂的一句话（带上平台名，方便定位是哪把 Key 的问题）
function explainAiError(e) {
  if (!e) return '⚠️ 请求失败，请稍后重试。';
  const code = e.code || '';
  const name = e.provider || '';
  if (code === 'NO_KEY' || code === 'UNCONFIGURED') return '⚠️ ' + e.message;   // 已是中文提示
  // 方舟特有的上游错误码，比 HTTP 状态码更能说明下一步该做什么
  if (e.upstreamCode === 'ModelNotOpen') {
    return '⚠️ ' + (name || '豆包') + ' 的模型还没开通（ModelNotOpen）：请到火山方舟控制台「开通管理」页开通该模型服务后再试。';
  }
  if (e.upstreamCode === 'InvalidEndpointOrModel.NotFound' || e.upstreamCode === 'InvalidEndpointOrModel.ModelIDAccessDisabled') {
    return '⚠️ ' + (name || '豆包') + ' 的 model 名不可用：请确认 AI_PROVIDERS.doubao.model 与控制台的 Model ID 完全一致，或改用它创建的推理接入点 ep-xxx。';
  }
  // 魔搭：Key 本身有效但没绑阿里云账号时，返回 401 + "Please bind your Alibaba Cloud account"
  if (e.detail && /bind your Alibaba Cloud account/i.test(e.detail)) {
    return '⚠️ 魔搭的 Key 有效，但账号还没绑定阿里云账号（Please bind your Alibaba Cloud account）。到 modelscope.cn 控制台完成阿里云账号绑定后即可调用。';
  }
  // 百炼：模型在列表里能查到，但所属产品没开通时会 400 InvalidParameter + not activated
  if (e.detail && /product is not activated|not activated/i.test(e.detail)) {
    return '⚠️ ' + (name || '当前平台') + ' 的这个模型还没开通（The product is not activated）：到控制台开通该模型，或点 ⚙️ 换回默认的 qwen3.8-flash。';
  }
  // Key 无效 / 额度不足：统一用这一句，用户看得懂下一步该干什么
  if (code === 'HTTP_401' || code === 'HTTP_402' || code === 'HTTP_403') {
    return '⚠️ ' + (name || '当前平台') + ' 请求失败，请检查 Key 是否有效或余额是否充足' +
           (e.detail ? '（' + e.detail + '）' : '');
  }
  if (code === 'HTTP_404') return '⚠️ ' + (name || '当前平台') + ' 返回 404：模型 ID / 接入点不对，检查 AI_PROVIDERS 里这个平台的 model，或点 ⚙️ 重新选一个模型。';
  if (code === 'HTTP_429') return '⚠️ ' + (name || '当前平台') + ' 请求太频繁，等十几秒再发。';
  if (code === 'HTTP_400') return '⚠️ ' + (name || '当前平台') + ' 拒绝了这次请求：' + (e.detail || '参数或模型 ID 有误。');
  if (code === 'TIMEOUT') return '⚠️ 请求超时，网络可能不通，稍后重试。';
  if (code === 'NETWORK') {
    // 智谱端点实测不返回 ACAO，浏览器直连必被 CORS 拦，这里点名说清可行解
    if (e.platform === 'zhipu') {
      return '⚠️ 智谱请求失败：浏览器被跨域(CORS)拦截。智谱官方端点不允许网页直连，需要把 AI_PROVIDERS.zhipu.proxyUrl 填成自己的转发代理地址后才能用。';
    }
    // 火山方舟的错误响应不带跨域头：Key 填错同样会表现成“跨域失败”，别让用户误判成网络问题
    if (e.platform === 'doubao') {
      return '⚠️ 豆包请求失败：可能是 Key 不对或不完整（方舟的 401 响应不带跨域头，浏览器只能报跨域失败）。请先用 ⚙️ 核对 Key 是否为 ark- 开头的完整值；Key 正确仍失败，就把 AI_PROVIDERS.doubao.proxyUrl 填成转发代理地址。';
    }
    return '⚠️ ' + (name || '当前平台') + ' 请求失败：可能是跨域限制或网络不通（' + (e.message || '') + '）。';
  }
  return '⚠️ ' + e.message;
}

// 发送主流程：用户气泡 → 清空输入 → 思考占位 → 真实请求（流式则逐字渲染）→ 收尾
async function sendAiMessage() {
  const input = document.getElementById('aiChatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  appendAiMessage(text, 'user');     // 1) 先落用户气泡，内容不会因为请求失败而丢
  input.value = '';                  // 2) 清空输入框
  input.focus();

  const thinking = appendAiThinking();   // 3) 「AI 正在思考」占位
  let panel = null;                      // 流式气泡（含思考面板），收到第一段数据时才创建

  const ensurePanel = () => {
    if (!panel) {
      removeAiThinking(thinking);        // 真正开始输出后删掉占位
      panel = appendAiStream();
    }
    return panel;
  };

  try {
    const reply = await sendToAI(text, {
      // 思考过程：逐字追加到可折叠面板里
      onReasoning: (t) => {
        const p = ensurePanel();
        if (!p) return;
        p.thinkBody.textContent += t;
        scrollAiToBottom();
      },
      // 正文：第一次出现时把思考面板自动收起，然后逐字追加正文
      onContent: (t) => {
        const p = ensurePanel();
        if (!p) return;
        if (!p.replyStarted) {
          p.replyStarted = true;
          if (p.think) p.think.open = false;    // 自动收起
        }
        p.replyBody.textContent += t;
        scrollAiToBottom();
      }
    });

    if (!panel) {
      // 非流式平台：一次性落成气泡
      removeAiThinking(thinking);
      appendAiMessage(reply || '（模型没有返回内容）', 'ai');
      return;
    }

    // 流式结束：没产生思考内容就把空面板删掉，正文为空则给个提示
    if (panel.think && !panel.thinkBody.textContent.trim()) panel.think.remove();
    if (!panel.replyBody.textContent.trim()) panel.replyBody.textContent = '（模型没有返回正文）';
    scrollAiToBottom();
  } catch (e) {
    removeAiThinking(thinking);
    // 【本轮】被主动拦下的平台（如智谱）已经用 Toast 提示过，不再往对话里塞一条错误气泡
    if (e && e.silent) return;
    if (panel) {
      // 已经开始流式了：保住已显示的思考过程，把错误补在同一条气泡里
      const errLine = document.createElement('div');
      errLine.className = 'ai-reply';
      errLine.textContent = explainAiError(e);
      panel.row.appendChild(errLine);
      if (panel.think && !panel.thinkBody.textContent.trim()) panel.think.remove();
      scrollAiToBottom();
    } else {
      appendAiMessage(explainAiError(e), 'ai');   // 4) 失败也落在对话里，不弹框打断
    }
  }
}