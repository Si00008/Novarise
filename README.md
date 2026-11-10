# Novarise 后端 API（纯 FastAPI）

脱离 NoneBot 的极简后端，只做三件事：CORS 放开、连通性测试、按游戏返回面板数据。

## 文件说明

| 文件 | 作用 |
|---|---|
| `main.py` | FastAPI 应用：CORS 中间件 + 3 个路由 + 5 个游戏的假数据 |
| `requirements.txt` | 依赖（fastapi、uvicorn[standard]） |
| `README.md` | 本文件 |

## 本地运行

在本目录（`F:\Sundries\leisure\agent\Novarise\2.5-后端API`）执行：

```bat
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

启动后：

- 控制台会打印 `Uvicorn running on http://0.0.0.0:8080`
- 自检：浏览器打开 <http://127.0.0.1:8080/> ，应看到 `{"service":"Novarise API","status":"ok",...}`
- 交互式文档：<http://127.0.0.1:8080/docs>

> `--host 0.0.0.0` 是必须的：只写 `127.0.0.1` 时内网穿透（cpolar）连不进来。

## 接口清单

| 方法 | 路径 | 说明 | 示例返回 |
|---|---|---|---|
| GET | `/` | 服务自检，用来判断服务和隧道是否活着 | `{"service":"Novarise API","status":"ok","games":[...]}` |
| GET | `/api/hello` | 连通性测试 | `{"msg": "Hello from Cloud API"}` |
| GET | `/api/get_game_data` | 按游戏取面板数据，`game` 必填 | 见下方结构 |

`game` 可选值：`maimai`、`dancecube`、`lol`、`hok`、`valorant`。传其他值返回 **404** 和可用列表。

直接调用：

```bat
curl "http://127.0.0.1:8080/api/get_game_data?game=maimai"
```

## 返回结构

与前端 `index.html` 里 `mockGameData` 的结构完全一致，所以前端拿到就能直接渲染：

```json
{
  "label": "舞萌 DX",
  "player": { "avatar": "🎵", "name": "NovaRise", "level": "Lv.170", "rank": "rating 14.02", "sub": "稳定型 · 主玩 EXPERT" },
  "stats": [ { "label": "总场次", "value": "1326" } ],
  "matches": [ { "main": "SSS · Glorious Crown", "sub": "100.8% · EXPERT" } ],
  "highlights": [ { "text": "1502 连击", "color": "blue" } ],
  "tip": "数据由 /api/get_game_data 实时返回……"
}
```

- `highlights[].color` 只能写 `blue` / `green` / `amber`，前端只定义了这三种标签配色。
- 前端同时兼容「直接返回游戏对象」和「包一层 `{code:0,data:{...}}`」，这里用的是直接返回，想让接口更规整可以自行加壳。

## 与前端联调

前端 `merged/index.html` 顶部有一行：

```js
const API_BASE = 'https://795eb38d.r1.cpolar.top';
```

把它改成当前能访问的地址即可，其余代码不用动：

- 本地直连：`const API_BASE = 'http://127.0.0.1:8080';`
- 内网穿透：换成 cpolar 给的域名

CORS 已全放开（`allow_origins=["*"]`, `allow_credentials=False`），`file://` 双击打开、本地 http 打开、跨域名访问都能直接请求。

## 内网穿透（cpolar）

```bat
cpolar http 8080
```

拿到形如 `https://xxxx.r1.cpolar.top` 的域名后：

1. 先验证隧道通不通：浏览器打开 `https://xxxx.r1.cpolar.top/`
   - 看到 `{"service":"Novarise API"...}` → 通了，把域名填进前端 `API_BASE`
   - 看到 cpolar 自己的 404 页（标题含 `The page you were looking for domain doesn't exist`）→ **隧道没指向任何服务**，重启隧道
2. 免费版域名会定期更换，换了域名只需改前端 `API_BASE` 这一行。

## 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| 浏览器控制台 `blocked by CORS policy` / `No 'Access-Control-Allow-Origin'` | 本文件的中间件没生效，或被人改成了 `allow_credentials=True` | 确认 `app.add_middleware(CORSMiddleware, ...)` 这段在 `app = FastAPI()` 之后、且 `allow_credentials=False` |
| 前端提示 `HTTP 404` | `game` 参数拼错，或后端根本没加载这份 `main.py` | 用 `/game_data?game=` 的大小写与上面清单核对；`/docs` 里能看到全部路由 |
| 前端提示 `Failed to fetch` | 域名/隧道不通、或后端没启动 | 浏览器直接开 `API_BASE + '/'`，看到 cpolar 404 页就是隧道问题 |
| 隧道连不上但本地能访问 | uvicorn 绑在了 `127.0.0.1` | 启动加 `--host 0.0.0.0` |

## 换成真实数据

`GAME_DATA` 是唯一的数据来源，后面接数据库、爬虫或第三方 API 时，只需在 `get_game_data()` 里返回同样结构的 `dict`，**路由路径和字段结构保持不变，前端不用改**。

---

# 部署到 Zeabur（免费方案）

## 前提：代码里已经有的三样东西

| 必需项 | 状态 | 说明 |
|---|---|---|
| `main.py` 末尾的 `if __name__ == "__main__":` 启动块 | ✅ 已有 | Zeabur 对 Python 项目执行 `python main.py`，没有这段会加载完 app 就退出，服务反复重启 |
| 端口读 `$PORT` 环境变量 | ✅ 已有 | Zeabur 用 `PORT` 决定转发端口，Git 服务默认注入 `8080`；代码里已经 `os.getenv("PORT", "8080")` |
| `requirements.txt` | ✅ 已有 | Zeabur 构建时自动 `pip install` |

## 一、把代码推到 GitHub

仓库名按你的习惯，比如 `novarise-api`。**仓库根目录就是本项目**（`main.py`、`requirements.txt` 直接在根下）。如果 `main.py` 埋在子目录里，部署时要在服务设置里填 **Root Directory**，否则找不到入口。

```bat
cd F:\Sundries\leisure\agent\Novarise\2.5-后端API
git init
git add main.py requirements.txt README.md
git commit -m "init: Novarise FastAPI backend"
git branch -M main
git remote add origin https://github.com/<你的账号>/novarise-api.git
git push -u origin main
```

推送前建议加 `.gitignore`（至少写 `.venv/`、`__pycache__/`），别把虚拟环境推上去。

## 二、注册 Zeabur 并授权 GitHub

1. 打开 <https://zeabur.com/>，点 **Sign in / Get Started**。
2. 选 **Continue with GitHub**（用 GitHub 账号登录，省掉后面再绑定一次的步骤）。免费版不需要填信用卡。
3. 首次授权时 GitHub 会弹 **Install Zeabur** 页面，选择 **Only select repositories** 并勾上 `novarise-api`，比授权全部仓库安全。

## 三、创建项目并部署

1. 进入控制台，点 **Create Project**（或 New Project）。
2. 项目名随便填（如 `novarise`），**Region / 集群** 选离你近的，如 `Hong Kong`、`Singapore`（国内访问延迟低）。
3. 在项目里点 **Add Service** → 选 **GitHub**。
4. 从列表里选 `novarise-api` → 点 **Import / Deploy**。
5. Zeabur 会自动识别语言与框架并开始构建，在 **Logs / Build Logs** 里能看到 Python 依赖安装过程和 `Uvicorn running on http://0.0.0.0:8080`。

> 部署完如果服务一直反复重启，99% 是 `main.py` 缺 `__main__` 启动块，或者端口没读 `$PORT`。

## 四、环境变量（本项目可跳过）

本项目的假数据写在代码里，不需要任何密钥，可以完全不配。

若要配：服务 → **Variables / Configuration** 标签页 → **Add Variable**（多个变量可用 **Edit as Raw** 按 `.env` 格式一次贴入）。Zeabur 会自动注入 `PORT` 等变量，不用手填。

## 五、生成公网域名

1. 服务页展开 **Domains / 域名** 区块。
2. 点 **Generate Domain（生成域名）**，输入前缀（如 `novarise-api`），得到 `https://novarise-api.zeabur.app`。
3. 想用自己的域名就选 **Custom Domain**，按提示在 DNS 加 CNAME 记录（Cloudflare 注意 SSL 模式不能选 Full (Strict)）。

## 六、验证部署

```bat
curl https://novarise-api.zeabur.app/api/hello
curl "https://novarise-api.zeabur.app/api/get_game_data?game=maimai"
```

期望：前者返回 `{"msg":"Hello from Cloud API"}`，后者返回完整游戏数据；浏览器打开 `<域名>/docs` 能看到 Swagger 文档。

## 七、前端接上去

改 `merged/index.html` 一行：

```js
const API_BASE = 'https://novarise-api.zeabur.app';
```

CORS 已在 `main.py` 放开，前端不用再处理。

## 八、免费版的真实边界（重要）

| 项 | Free Plan（$0） |
|---|---|
| 域名 | 一直有效，`*.zeabur.app` 免费生成 |
| 服务运行 | **空闲一段时间自动休眠，下次请求才唤醒**，首个请求有几秒冷启动 |
| SLA | 无 |
| 日志保留 | 48 小时 |
| 持续在线 | 需要 Dev Plan（$5/月，14 天试用）才会常驻不休眠 |

也就是说：**免费版做不到「24 小时不休眠常驻」**，但域名随时可访问、有人访问就自动醒，对个人项目的前端调数据完全够用。如果真的要求秒级响应、不能冷启动，再考虑升级。

