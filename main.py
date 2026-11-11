"""
Novarise 极简后端 —— 纯 FastAPI，不依赖 NoneBot。

数据来源：
    maimai                     → 水鱼查分器 player/records（按请求头 Authorization: Bearer 透传，无状态）
    dancecube / lol / hok / valorant → 内置假数据

启动：
    python -m venv .venv
    .venv\\Scripts\\activate
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8080
"""

from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(
    title="Novarise API",
    description="Novarise 网页的游戏数据接口（多用户透传查分 + 假数据兜底）",
    version="1.2.0",
)

# ---------------------------------------------------------------------------
# CORS
#   allow_credentials=False 是硬约束：allow_origins=["*"] 与 credentials 不能共存，
#   否则浏览器直接拒绝整条策略。
#   allow_headers=["*"] 让请求头 Authorization 能通过预检（OPTIONS）。
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# 水鱼查分器
#   后端不保存任何 Token：每次请求都由前端通过 Authorization: Bearer 头带入，转发后即丢弃。
# ---------------------------------------------------------------------------
DIVING_FISH_RECORDS_URL = "https://www.diving-fish.com/api/maimaidxprober/player/records"
REQUEST_TIMEOUT = 10.0

# level_index 0~4 的难度名（仅在记录缺 level_label 时兜底）
LEVEL_LABELS = ["Basic", "Advanced", "Expert", "Master", "Re:Master"]

REAL_GAMES = ["maimai"]
ALL_GAMES = REAL_GAMES + ["dancecube", "lol", "hok", "valorant"]

# ---------------------------------------------------------------------------
# 非 maimai 游戏的假数据：字段结构与 maimai 的返回完全对齐
#   label / player{avatar,name,level,rank,sub} / stats[{label,value}]
#   matches[{main,sub}] / highlights[{text,color}] / tip
#   color 只允许 blue / green / amber —— 前端标签配色只定义了这三种
# ---------------------------------------------------------------------------
GAME_DATA: dict[str, dict[str, Any]] = {
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


# ---------------------------------------------------------------------------
# 通用小工具
# ---------------------------------------------------------------------------
def _num(value: Any, default: float = 0.0) -> float:
    """把水鱼返回里可能是 int / float / str / None 的数值安全转成 float。"""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _rating_from_achievement(achievement: float) -> str:
    """按业务指定阈值把达成率换算成评级。

    >= 100.5% → SSS+ ; >= 100.0% → SSS ; >= 99.0% → SS ; >= 98.0% → S ; 其余 → A
    """
    if achievement >= 100.5:
        return "SSS+"
    if achievement >= 100.0:
        return "SSS"
    if achievement >= 99.0:
        return "SS"
    if achievement >= 98.0:
        return "S"
    return "A"


def _level_label(record: dict[str, Any]) -> str:
    """难度名：优先用记录自带的 level_label，缺失时按 level_index 兜底。"""
    label = record.get("level_label")
    if isinstance(label, str) and label.strip():
        return label.strip()

    index = record.get("level_index")
    try:
        idx = int(index)  # type: ignore[arg-type]
        if 0 <= idx < len(LEVEL_LABELS):
            return LEVEL_LABELS[idx]
    except (TypeError, ValueError):
        pass

    level = record.get("level")
    return f"Lv.{level}" if level else "未知难度"


def _is_ap(record: dict[str, Any]) -> bool:
    """fc 字段值为 ap / AP 时计为 AP（大小写不敏感）。"""
    return str(record.get("fc") or "").strip().lower() == "ap"


# ---------------------------------------------------------------------------
# 水鱼原始 JSON → 前端固定结构
# ---------------------------------------------------------------------------
def build_maimai_panel(payload: dict[str, Any]) -> dict[str, Any]:
    """把 /player/records 的返回体转换成前端约定的字段结构。

    水鱼原始字段（实测）：
        additional_rating 段位 / nickname 昵称 / plate 牌子 / rating 总 rating
        records[].{title, level_label, level_index, achievements, ra, rate, fc, fs, song_id, type}
    """
    records = payload.get("records") or []
    # 防御：极少数版本把成绩放在 records.best 里
    if isinstance(records, dict):
        records = records.get("best") or []
    if not isinstance(records, list):
        records = []

    nickname = str(payload.get("nickname") or payload.get("username") or "舞萌玩家")
    rating = int(_num(payload.get("rating")))

    # 段位：优先 dan 字段，水鱼实际返回的是 additional_rating（0 表示未定级）
    dan_raw = payload.get("dan")
    if dan_raw is None or dan_raw == "":
        dan_raw = payload.get("additional_rating")
    dan_num = int(_num(dan_raw))
    level_text = f"段位 {dan_num}" if dan_num else "段位 未定"

    # 按单曲 ra 降序：前 5 首给 matches，前 50 首算 B50 平均
    ranked = sorted(records, key=lambda item: _num(item.get("ra")), reverse=True)
    best_50 = ranked[:50]
    avg_ra = (sum(_num(item.get("ra")) for item in best_50) / len(best_50)) if best_50 else 0.0

    sss_count = sum(
        1
        for item in records
        if _rating_from_achievement(_num(item.get("achievements"))) in {"SSS", "SSS+"}
    )
    ap_count = sum(1 for item in records if _is_ap(item))

    matches = [
        {
            "main": f"{item.get('title') or ('谱面 ' + str(item.get('song_id')))} · {_level_label(item)}",
            "sub": (
                f"{_num(item.get('achievements')):.1f}% · "
                f"{_rating_from_achievement(_num(item.get('achievements')))}"
            ),
        }
        for item in ranked[:5]
    ]

    highlights: list[dict[str, str]] = []
    top_ra = int(_num(ranked[0].get("ra"))) if ranked else 0
    highlights.append({"text": f"最高单曲 ra {top_ra}", "color": "blue"})
    highlights.append({"text": f"SSS 及以上 {sss_count} 首", "color": "green"})
    highlights.append({"text": f"AP {ap_count} 首", "color": "amber"})

    return {
        "label": "舞萌 DX",
        "player": {
            "avatar": "🎵",
            "name": nickname,
            "level": level_text,
            "rank": f"rating {rating}",
            "sub": f"B50 平均 ra {avg_ra:.1f}",
        },
        "stats": [
            {"label": "成绩记录", "value": str(len(records))},
            {"label": "B50 平均 ra", "value": f"{avg_ra:.1f}"},
        ],
        "matches": matches,
        "highlights": highlights,
        "tip": "数据来源于水鱼查分器实时获取",
    }


# ---------------------------------------------------------------------------
# 透传请求：前端 Token → 水鱼 Import-Token
# ---------------------------------------------------------------------------
async def fetch_maimai_records(token: str) -> dict[str, Any]:
    """异步请求水鱼 /player/records，所有异常都转成带具体原因的 HTTPException。"""
    headers = {
        "Import-Token": token,
        "User-Agent": "NovaRise/1.2 (+https://modelscope.cn)",
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(REQUEST_TIMEOUT)) as client:
            response = await client.get(DIVING_FISH_RECORDS_URL, headers=headers)
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=500,
            detail=f"请求水鱼查分器超时（{REQUEST_TIMEOUT:.0f} 秒），请稍后重试",
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"请求水鱼查分器失败（网络异常）：{type(exc).__name__}: {exc}",
        )

    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=500,
            detail="水鱼 Import-Token 无效或已过期，请重新生成后重试",
        )
    if response.status_code == 400:
        # 实测：Token 无效 / 过期时水鱼返回 400，body 为 {"message":"导入token有误","status":"error"}
        raise HTTPException(
            status_code=500,
            detail=f"水鱼 Import-Token 无效或已过期（水鱼原文：{response.text[:200]}）",
        )
    if response.status_code == 404:
        raise HTTPException(
            status_code=500,
            detail="该 Token 对应的水鱼账号查不到成绩，请确认已上传过成绩",
        )
    if response.status_code != 200:
        body = response.text[:200].replace("\n", " ")
        raise HTTPException(
            status_code=500,
            detail=f"水鱼查分器返回 HTTP {response.status_code}：{body}",
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"水鱼查分器返回的不是合法 JSON：{exc}",
        )

    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=500,
            detail="水鱼查分器返回结构异常：顶层不是 JSON 对象",
        )

    records = payload.get("records")
    if isinstance(records, dict):
        records = records.get("best")
    if not records:
        raise HTTPException(
            status_code=500,
            detail="水鱼查分器未返回任何有效成绩记录（该账号可能还没有上传成绩）",
        )

    return payload


# ---------------------------------------------------------------------------
# 路由
# ---------------------------------------------------------------------------
@app.get("/", summary="服务自检（确认隧道 / 服务是否活着）")
def root():
    return {
        "service": "Novarise API",
        "status": "ok",
        "docs": "/docs",
        "hello": "/api/hello",
        "games": ALL_GAMES,
    }


@app.get("/api/hello", summary="连通性测试")
def hello():
    return {"msg": "Hello from Cloud API"}


@app.get("/api/get_game_data", summary="按游戏取游戏面板数据（maimai 为水鱼实时数据）")
async def get_game_data(
    request: Request,
    game: str = Query(..., description="maimai / dancecube / lol / hok / valorant"),
):
    if game == "maimai":
        # 前端发标准头 Authorization: Bearer <水鱼 Import-Token>；后端只拆包，不存储
        auth = request.headers.get("Authorization")
        if not auth:
            raise HTTPException(
                status_code=401,
                detail=(
                    "缺少 Authorization 请求头：maimai 查分需要 "
                    "Authorization: Bearer <你的水鱼 Import-Token>"
                ),
            )
        prefix = "bearer "
        if not auth.strip().lower().startswith(prefix):
            raise HTTPException(
                status_code=401,
                detail=(
                    "Authorization 请求头格式不对：必须是 "
                    "Authorization: Bearer <你的水鱼 Import-Token>"
                ),
            )
        token = auth.strip()[len(prefix):].strip()
        if not token:
            raise HTTPException(
                status_code=401,
                detail="Authorization 请求头里没有 Token：Bearer 后面是空的",
            )
        payload = await fetch_maimai_records(token)
        return build_maimai_panel(payload)

    data = GAME_DATA.get(game)
    if data is None:
        return JSONResponse(
            status_code=404,
            content={"detail": "未知游戏：" + game, "available": ALL_GAMES},
        )
    return data


# ---------------------------------------------------------------------------
# 直接 `python main.py` 启动的入口（端口从 $PORT 读，拿不到用 8080）
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)
