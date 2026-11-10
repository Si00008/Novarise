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
