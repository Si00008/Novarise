"""
Novarise 极简后端 —— 纯 FastAPI，不依赖 NoneBot。

启动（详见 README.md）：
    python -m venv .venv
    .venv\\Scripts\\activate
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8080 --reload
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(
    title="Novarise API",
    description="Novarise 网页的游戏数据接口（纯 FastAPI 极简后端）",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS：允许任意来源，方便前端（file:// 双击、本地 http、内网穿透域名）直接联调
#   坑：allow_origins=["*"] 时 allow_credentials 必须是 False。
#       开成 True 浏览器会直接拒绝这条策略，报 "has been blocked by CORS policy"。
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# 假数据：字段结构与前端 index.html 里的 mockGameData 完全一致
#   label / player{avatar,name,level,rank,sub} / stats[{label,value}]
#   matches[{main,sub}] / highlights[{text,color}] / tip
# color 只写 blue / green / amber —— 前端标签配色只定义了这三种
# ---------------------------------------------------------------------------
GAME_DATA = {
    "maimai": {
        "label": "舞萌 DX",
        "player": {
            "avatar": "🎵",
            "name": "NovaRise",
            "level": "Lv.170",
            "rank": "rating 14.02",
            "sub": "稳定型 · 主玩 EXPERT",
        },
        "stats": [
            {"label": "总场次", "value": "1326"},
            {"label": "最高评级", "value": "SSS"},
            {"label": "最高连击", "value": "1502"},
            {"label": "平均 rating", "value": "14.02"},
        ],
        "matches": [
            {"main": "SSS · Glorious Crown", "sub": "100.8% · EXPERT"},
            {"main": "SS · BAD∞∞∞", "sub": "99.4% · MASTER"},
            {"main": "SSS · 系ぎて", "sub": "100.5% · EXPERT"},
            {"main": "S · Theme of Sanwa", "sub": "97.2% · MASTER"},
            {"main": "SS · アイ love ポップス", "sub": "99.1% · EXPERT"},
        ],
        "highlights": [
            {"text": "1502 连击", "color": "blue"},
            {"text": "全曲 SSS 41 首", "color": "green"},
            {"text": "本周 rating +0.51", "color": "amber"},
        ],
        "tip": "数据由 /api/get_game_data 实时返回（当前为假数据，接入真实数据源后只改 GAME_DATA）。",
    },
    "dancecube": {
        "label": "舞立方",
        "player": {
            "avatar": "🕺",
            "name": "NovaRise",
            "level": "Lv.42",
            "rank": "钻石 III",
            "sub": "节奏型 · 主玩 8 键",
        },
        "stats": [
            {"label": "总场次", "value": "268"},
            {"label": "最高评级", "value": "SS"},
            {"label": "最高连击", "value": "412"},
            {"label": "通关率", "value": "93.6%"},
        ],
        "matches": [
            {"main": "SS · Neon Drive", "sub": "98.7% · 8 键"},
            {"main": "S · 光の旋律", "sub": "96.4% · 6 键"},
            {"main": "SS · Cyber Waltz", "sub": "99.0% · 8 键"},
            {"main": "A · スターダスト", "sub": "91.2% · 6 键"},
            {"main": "SS · Moonlight", "sub": "97.8% · 8 键"},
        ],
        "highlights": [
            {"text": "412 连击", "color": "blue"},
            {"text": "连续 12 场 SS 以上", "color": "green"},
            {"text": "8 键熟练度 +3", "color": "amber"},
        ],
        "tip": "数据由 /api/get_game_data 实时返回（当前为假数据）。",
    },
    "lol": {
        "label": "LOL",
        "player": {
            "avatar": "🏆",
            "name": "NovaRise#CN1",
            "level": "Lv.184",
            "rank": "大师 214 LP",
            "sub": "中单 · 主玩刺客",
        },
        "stats": [
            {"label": "本赛季场次", "value": "176"},
            {"label": "胜率", "value": "58.5%"},
            {"label": "最高连胜", "value": "11"},
            {"label": "场均 KDA", "value": "4.7"},
        ],
        "matches": [
            {"main": "胜利 · 阿狸 14/2/10", "sub": "排位 · MVP"},
            {"main": "胜利 · 阿卡丽 11/3/7", "sub": "排位"},
            {"main": "失败 · 塞拉斯 6/8/5", "sub": "排位 · SVP"},
            {"main": "胜利 · 劫 13/4/9", "sub": "排位 · MVP"},
            {"main": "胜利 · 阿狸 9/1/14", "sub": "排位"},
        ],
        "highlights": [
            {"text": "连胜 11 场", "color": "blue"},
            {"text": "本赛季大师段位", "color": "green"},
            {"text": "近 20 场胜率 70%", "color": "amber"},
        ],
        "tip": "数据由 /api/get_game_data 实时返回（当前为假数据）。",
    },
    "hok": {
        "label": "王者荣耀",
        "player": {
            "avatar": "👑",
            "name": "NovaRise",
            "level": "Lv.30",
            "rank": "王者 26 星",
            "sub": "中路 · 主玩法师",
        },
        "stats": [
            {"label": "总场次", "value": "932"},
            {"label": "胜率", "value": "61.2%"},
            {"label": "最高连胜", "value": "9"},
            {"label": "MVP 次数", "value": "187"},
        ],
        "matches": [
            {"main": "胜利 · 貂蝉 12/1/8", "sub": "排位 · MVP"},
            {"main": "胜利 · 小乔 9/2/11", "sub": "排位"},
            {"main": "失败 · 王昭君 4/6/7", "sub": "排位"},
            {"main": "胜利 · 貂蝉 10/2/9", "sub": "排位 · MVP"},
            {"main": "胜利 · 不知火舞 8/3/10", "sub": "排位"},
        ],
        "highlights": [
            {"text": "王者 26 星", "color": "blue"},
            {"text": "MVP 187 次", "color": "green"},
            {"text": "貂蝉胜率 72%", "color": "amber"},
        ],
        "tip": "数据由 /api/get_game_data 实时返回（当前为假数据）。",
    },
    "valorant": {
        "label": "瓦罗兰特",
        "player": {
            "avatar": "🎯",
            "name": "NovaRise#VLR",
            "level": "Lv.96",
            "rank": "不朽 II",
            "sub": "决斗者 · 主玩捷风",
        },
        "stats": [
            {"label": "总场次", "value": "412"},
            {"label": "爆头率", "value": "27.4%"},
            {"label": "平均 ACS", "value": "268"},
            {"label": "K/D", "value": "1.42"},
        ],
        "matches": [
            {"main": "胜利 · 捷风 24/12/6", "sub": "排位 · 战斗评分 318"},
            {"main": "胜利 · 雷娜 21/14/4", "sub": "排位"},
            {"main": "失败 · 捷风 18/17/5", "sub": "排位"},
            {"main": "胜利 · 捷风 27/9/8", "sub": "排位 · MVP"},
            {"main": "胜利 · 霓虹 19/11/7", "sub": "排位"},
        ],
        "highlights": [
            {"text": "单场 27 击杀", "color": "blue"},
            {"text": "爆头率 27.4%", "color": "green"},
            {"text": "不朽 II 段位", "color": "amber"},
        ],
        "tip": "数据由 /api/get_game_data 实时返回（当前为假数据）。",
    },
}


@app.get("/", summary="服务自检（用来确认隧道/服务是否活着）")
def root():
    return {
        "service": "Novarise API",
        "status": "ok",
        "docs": "/docs",
        "hello": "/api/hello",
        "games": list(GAME_DATA.keys()),
    }


@app.get("/api/hello", summary="连通性测试")
def hello():
    return {"msg": "Hello from Cloud API"}


@app.get("/api/get_game_data", summary="按游戏取游戏面板数据（player / matches 等字段齐全）")
def get_game_data(
    game: str = Query(..., description="maimai / dancecube / lol / hok / valorant"),
):
    data = GAME_DATA.get(game)
    if data is None:
        # 未知游戏返回 404，前端会把它展示成「HTTP 404」的可排查提示
        return JSONResponse(
            status_code=404,
            content={"detail": "未知游戏：" + game, "available": list(GAME_DATA.keys())},
        )
    return data


# ---------------------------------------------------------------------------
# 直接 `python main.py` 启动的入口。
# Zeabur（以及 Render / Railway 等）检测到 Python 项目时会用 `python main.py`
# 来跑你的应用，端口从平台注入的 $PORT 环境变量读取（拿不到就退回 8080）。
# 少了这段，平台执行 `python main.py` 时只会加载 app 然后立刻退出，部署会一直重启。
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import os

    import uvicorn

    port = int(os.getenv("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)

