"""
Novarise 极简后端 —— 纯 FastAPI，不依赖 NoneBot。

数据来源：
    maimai                     → 水鱼查分器 player/records（按请求头 X-Import-Token 透传，无状态）
    dancecube                  → 舞立方 GetMyRankNew（按 X-Dancecube-Token / X-Dancecube-UserID 透传，
                                 拉取失败自动降级为内置假数据）
    lol / hok / valorant       → 内置假数据

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
    version="1.3.0",
)

# ---------------------------------------------------------------------------
# CORS
#   allow_credentials=False 是硬约束：allow_origins=["*"] 与 credentials 不能共存，
#   否则浏览器直接拒绝整条策略。
#   allow_headers=["*"] 让自定义请求头 X-Import-Token 能通过预检（OPTIONS）。
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
#   后端不保存任何 Token：每次请求都由前端通过 X-Import-Token 头带入，转发后即丢弃。
# ---------------------------------------------------------------------------
DIVING_FISH_RECORDS_URL = "https://www.diving-fish.com/api/maimaidxprober/player/records"
REQUEST_TIMEOUT = 10.0

# level_index 0~4 的难度名（仅在记录缺 level_label 时兜底）
LEVEL_LABELS = ["Basic", "Advanced", "Expert", "Master", "Re:Master"]

REAL_GAMES = ["maimai", "dancecube"]
ALL_GAMES = REAL_GAMES + ["lol", "hok", "valorant"]

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
# 舞立方（dancecube）
#   前端用 X-Dancecube-Token / X-Dancecube-UserID 两个头带凭证，后端转成舞立方
#   自己要求的 Authorization 头 + userId 查询参数，转发完即丢弃，不落库。
#
#   实测结论（2026-11-13，无需有效凭证即可确认的部分）：
#     · GET 不带 userId          → HTTP 400（.NET 参数绑定失败，说明 userId 必填）
#     · GET 带 userId 但凭证无效 → HTTP 500 {"Message":"出现错误。"}
#     · POST                     → HTTP 405，确认只支持 GET
#   所以 userId 要作为查询参数传，而不是请求头。
#   成功返回体结构尚未用有效凭证验证，下面的解析对字段名做了多候选兼容；
#   一旦取不到歌曲列表，抛异常交给路由降级成内置假数据，不会吐半成品给前端。
# ---------------------------------------------------------------------------
DANCECUBE_RANK_URL = "https://dancedemo.shenghuayule.com/Dance/api/User/GetMyRankNew"
DANCECUBE_MUSIC_INDEX = 3
# 舞立方单独的超时（8 秒）：比水鱼的 10 秒短，避免第三方接口挂死拖住整个请求。
# 刻意不共用 REQUEST_TIMEOUT —— 那个是水鱼的，改了会连带影响 maimai 分支。
DANCECUBE_TIMEOUT = 8.0


def _pick(source: dict[str, Any], *keys: str, default: Any = None) -> Any:
    """按多个候选键名取值（舞立方返回体大小写不统一，如 score / Score）。"""
    for key in keys:
        if key in source:
            value = source[key]
            if value is not None and value != "":
                return value
    return default


def _dc_song_list(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """逐层找出歌曲列表：顶层可能是列表，也可能包在 Data / list / musicList 里。"""
    def as_list(value: Any) -> list[dict[str, Any]]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, dict)]

    wrappers = ("data", "Data", "list", "List", "musicList", "MusicList",
                "rankList", "RankList", "songs", "Songs", "items", "Items",
                "rows", "Rows", "result", "Result")
    queue: list[Any] = [payload]
    while queue:
        node = queue.pop(0)
        if isinstance(node, dict):
            for key in wrappers:
                if key not in node:
                    continue
                value = node[key]
                found = as_list(value)
                if found:
                    return found
                if isinstance(value, dict):
                    queue.append(value)
            # 兜底：任何值是「元素都像记录的列表」就认作歌曲列表
            for value in node.values():
                found = as_list(value)
                if found and any(len(item) >= 2 for item in found):
                    return found
        elif isinstance(node, list):
            found = as_list(node)
            if found:
                return found
    return []


def build_dancecube_panel(payload: dict[str, Any],
                          user_id: str = "") -> dict[str, Any]:
    """舞立方原始 JSON → 与 build_maimai_panel 完全同构的面板数据。

    字段结构与 maimai 保持一致：label / player{avatar,name,level,rank,sub}
    stats[{label,value}] / matches[{main,sub}] / highlights[{text,color}] / tip
    color 只允许 blue / green / amber —— 前端标签配色只定义了这三种。
    """
    songs = _dc_song_list(payload)
    if not songs:
        raise ValueError("返回体里找不到歌曲列表")

    def score_of(song: dict[str, Any]) -> float:
        return _num(_pick(song, "score", "Score", "totalScore", "TotalScore",
                          "points", "Points", "achievement", "Achievement"), 0.0)

    def combo_of(song: dict[str, Any]) -> int:
        return int(_num(_pick(song, "maxCombo", "MaxCombo", "maxComboCount",
                             "MaxComboCount", "combo", "Combo", "combos", "Combos"), 0))

    def name_of(song: dict[str, Any]) -> str:
        return str(_pick(song, "musicName", "MusicName", "songName", "SongName",
                         "name", "Name", "title", "Title") or "未命名曲目")

    def diff_of(song: dict[str, Any]) -> str:
        raw_level = _pick(song, "difficulty", "Difficulty", "diff", "Diff",
                          "musicLevel", "MusicLevel", "level", "Level")
        return str(raw_level) if raw_level not in (None, "") else "未知难度"

    ranked = sorted(songs, key=score_of, reverse=True)
    top5 = ranked[:5]
    total = len(songs)

    top_score = score_of(ranked[0]) if ranked else 0.0
    max_combo = max(combo_of(song) for song in songs)
    avg_score = (sum(score_of(song) for song in songs) / total) if total else 0.0

    nickname = str(
        _pick(payload, "nickName", "NickName", "nickname", "userName",
              "UserName", "name", "Name")
        or (f"玩家 {user_id}" if user_id else "舞立方玩家")
    )

    matches = [
        {
            "main": f"{name_of(song)} · {diff_of(song)}",
            "sub": f"{score_of(song):.0f} 分 · 最高连击 {combo_of(song)}",
        }
        for song in top5
    ]

    return {
        "label": "舞立方",
        "player": {
            "avatar": "🕺",
            "name": nickname,
            "level": f"收录 {total} 首",
            "rank": f"最高分 {top_score:.0f}",
            "sub": f"musicIndex {DANCECUBE_MUSIC_INDEX}",
        },
        "stats": [
            {"label": "曲目数", "value": str(total)},
            {"label": "最高分", "value": f"{top_score:.0f}"},
            {"label": "平均分", "value": f"{avg_score:.0f}"},
            {"label": "最高连击", "value": str(max_combo)},
        ],
        "matches": matches,
        "highlights": [
            {"text": f"最高分 {top_score:.0f}", "color": "blue"},
            {"text": f"最高连击 {max_combo}", "color": "green"},
            {"text": f"收录曲目 {total} 首", "color": "amber"},
        ],
        "tip": "数据来源于舞立方实时获取",
    }


async def fetch_dancecube_data(token: str, user_id: str) -> dict[str, Any]:
    """异步拉取舞立方 GetMyRankNew 并转成面板结构。

    失败一律向上抛 HTTPException，不再吞异常返回假数据 —— 让前端能按状态码
    区分「凭证失效」和「接口异常」，给出准确提示。

    状态码约定（前端据此分支）：
        401 → 凭证失效 / 过期（固定文案）
        504 → 请求超时（8 秒）
        502 → 上游异常：网络错误、非 200、业务失败码、返回体不合法、解析失败
    """
    headers = {
        "Authorization": token,
        "Accept": "application/json",
        "User-Agent": "NovaRise/1.3 (+https://modelscope.cn)",
    }
    params = {"musicIndex": DANCECUBE_MUSIC_INDEX, "userId": user_id}

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(DANCECUBE_TIMEOUT)) as client:
            response = await client.get(
                DANCECUBE_RANK_URL, headers=headers, params=params
            )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail=f"请求舞立方超时（{DANCECUBE_TIMEOUT:.0f} 秒未响应），请稍后重试",
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"请求舞立方失败（网络异常）：{type(exc).__name__}: {exc}",
        )
    except Exception as exc:  # 兜底：绝不让原始异常冒到 FastAPI 默认 500 页面
        raise HTTPException(
            status_code=502,
            detail=f"请求舞立方失败（未知异常）：{type(exc).__name__}: {exc}",
        )

    if response.status_code in (401, 403):
        # 固定文案：前端按这句 + 401 直接提示解绑重绑
        raise HTTPException(
            status_code=401,
            detail="舞立方凭证失效/过期，请解绑后重新绑定",
        )
    if response.status_code != 200:
        body = response.text[:200].replace("\n", " ")
        raise HTTPException(
            status_code=502,
            detail=f"舞立方接口返回 HTTP {response.status_code}：{body}",
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"舞立方接口返回的不是合法 JSON：{exc}",
        )

    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=502,
            detail="舞立方接口返回结构异常：顶层不是 JSON 对象",
        )

    # 成功标记：.NET 风格常见 Code=200 / Code=0；没有标记字段时不强求，
    # 交给 build_dancecube_panel 用「有没有歌曲列表」来判断。
    code = _pick(payload, "code", "Code")
    if code is not None:
        try:
            code_num: int | None = int(float(code))
        except (TypeError, ValueError):
            code_num = None
        if code_num is not None and code_num not in (0, 200):
            # 业务失败码：优先判断是不是凭证问题，否则按上游业务异常上报
            message = str(_pick(payload, "Message", "message", "msg", "Msg") or "")
            if 401 <= code_num <= 403 or "凭证" in message or "登录" in message \
                    or "token" in message.lower():
                raise HTTPException(
                    status_code=401,
                    detail="舞立方凭证失效/过期，请解绑后重新绑定",
                )
            raise HTTPException(
                status_code=502,
                detail=f"舞立方接口返回业务失败码 {code}：{message or '无描述'}",
            )

    try:
        return build_dancecube_panel(payload, user_id)
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(
            status_code=502,
            detail=f"舞立方数据解析失败：{exc}",
        )


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
    x_import_token: str | None = Header(
        default=None,
        alias="X-Import-Token",
        description="水鱼查分器个人 Import-Token，仅 maimai 需要；后端不存储，请求完即丢弃",
    ),
):
    if game == "maimai":
        token = (x_import_token or "").strip()
        if not token:
            raise HTTPException(
                status_code=401,
                detail="缺少 X-Import-Token 请求头：maimai 查分需要你的水鱼 Import-Token",
            )
        payload = await fetch_maimai_records(token)
        return build_maimai_panel(payload)

    if game == "dancecube":
        token = (request.headers.get("X-Dancecube-Token") or "").strip()
        user_id = (request.headers.get("X-Dancecube-UserID") or "").strip()
        if not token or not user_id:
            raise HTTPException(
                status_code=401,
                detail="缺少舞立方凭证头：dancecube 查分需要 X-Dancecube-Token 与 X-Dancecube-UserID",
            )
        # 移除外层 try-except：异常直接向上抛出，由前端按状态码精确提示
        return await fetch_dancecube_data(token, user_id)

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
