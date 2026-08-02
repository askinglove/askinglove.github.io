#!/usr/bin/env python3
"""
Transcribe all AskingLove episodes with faster-whisper,
write 正文 markdown + YouTube .srt for each.

Usage:
  python3 scripts/transcribe-all.py              # all (model=small)
  python3 scripts/transcribe-all.py --limit 3
  python3 scripts/transcribe-all.py --ids 2664929,3020789
  python3 scripts/transcribe-all.py --model small --force
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

# Line-buffered logs when piped (nohup/tee)
try:
    sys.stdout.reconfigure(line_buffering=True)  # type: ignore[attr-defined]
    sys.stderr.reconfigure(line_buffering=True)  # type: ignore[attr-defined]
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = Path("/tmp/askinglove-audio")
RAW_DIR = ROOT / "raw" / "transcripts"
TX_DIR = ROOT / "src" / "data" / "transcripts"
SRT_DIR = ROOT / "src" / "data" / "captions"
# Public web URLs: https://askinglove.com/captions/{id}.srt
SRT_PUBLIC = ROOT / "public" / "captions"
# also mirror to exports/youtube for local ops convenience
SRT_EXPORT = ROOT / "exports" / "youtube"
FEED = "https://media.rss.com/askinglove/feed.xml"

DEFAULT_MODEL = "small"

# Bias Whisper toward show vocabulary (Chinese podcast about relationships)
INITIAL_PROMPT = (
    "欢迎收听问情播客。我是小问，问情播客的主持人。"
    "在这里我们一起聊聊爱情里的那些事。我们不急着给答案，而是陪你一起把那些说不清楚的感觉慢慢理出来。"
    "你有没有过这样的时刻，明明知道该怎么做，但就是迈不出那一步。"
    "这是一档关于爱情、关系与情绪的中文播客。"
    "常见词：暗恋、分手、出轨、婚姻、冷战、原生家庭、异地恋、妥协、信任、边界、讨好型人格、安全感、"
    "沉没成本、付出失衡、石墙效应、被动攻击、认知失调、身份剥夺、月子、月子中心、猪蹄汤、"
    "辅食、益生菌、纸尿裤、储奶袋、母乳、抖音、置顶、品牌方、盖瑞·查普曼、爱的五种语言、世界卫生组织。"
)

# Hint phrases for faster-whisper (boosts recognition of show terms)
HOTWORDS = (
    "问情播客 小问 爱情里的那些事 迈不出那一步 慢慢理出来 "
    "暗恋 分手 出轨 婚姻 冷战 原生家庭 安全感 讨好 边界 "
    "沉没成本 石墙效应 被动攻击 认知失调 身份剥夺 爱的语言 "
    "辅食 益生菌 纸尿裤 储奶袋 母乳 抖音 置顶 品牌方 月子 猪蹄汤"
)

# Common ASR confusions for this show (applied after 繁→简)
# Order matters: longer / more specific patterns first.
REPLACEMENTS = [
    # Brand / host / show opener
    (r"问情播课", "问情播客"),
    (r"問情播課", "问情播客"),
    (r"问情播客课", "问情播客"),
    (r"问情博客", "问情播客"),
    (r"问亲播客", "问情播客"),
    (r"闻情播客", "问情播客"),
    (r"问情波可", "问情播客"),
    (r"问情波客", "问情播客"),
    (r"我是你的主持人", "我是小问，问情播客的主持人"),
    (r"聊聊爱情理的那些事", "聊聊爱情里的那些事"),
    (r"聊聊爱情礼的那些事", "聊聊爱情里的那些事"),
    (r"爱情理的那些", "爱情里的那些"),
    (r"爱情礼的那些", "爱情里的那些"),
    # Common openers / 迈出 vs 卖出
    (r"卖出了最", "迈出了最"),
    (r"卖出了那", "迈出了那"),
    (r"就已经卖出了", "就已经迈出了"),
    (r"卖不出哪一步", "迈不出那一步"),
    (r"卖不出那一步", "迈不出那一步"),
    (r"卖不出", "迈不出"),
    (r"邁不出", "迈不出"),
    (r"賣出", "迈出"),
    (r"卖出了", "迈出了"),
    (r"不及这给", "不急着给"),
    (r"慢慢離出来", "慢慢理出来"),
    (r"慢慢离出来", "慢慢理出来"),
    (r"離出来", "理出来"),
    (r"一遍有一遍", "一遍又一遍"),
    (r"迈不出哪一步", "迈不出那一步"),
    # Body / emotion
    (r"胃腾", "胃疼"),
    (r"未堂", "胃疼"),
    (r"胃疼疼", "胃疼"),
    (r"探了一口气", "叹了一口气"),
    (r"叹了一口气", "叹了一口气"),
    (r"牙口无言", "哑口无言"),
    (r"敲敲地", "悄悄地"),
    (r"敲敲的", "悄悄的"),
    (r"那磨一", "那么一"),
    (r"那磨个", "那么个"),
    (r"如果有那磨", "如果有那么"),
    (r"可能再问一个", "可能在问一个"),
    (r"你的报资", "你的抱姿"),
    (r"报资不对", "抱姿不对"),
    # Baby / 月子 / medical / daily (ep-specific + recurring)
    (r"吃腐食", "吃辅食"),
    (r"腐食玩具", "辅食玩具"),
    (r"腐食的", "辅食的"),
    (r"腐食", "辅食"),
    (r"医生军", "益生菌"),
    (r"一款医生", "一款益生"),
    (r"纸尿库", "纸尿裤"),
    (r"纸尿裤", "纸尿裤"),
    (r"制顶那条", "置顶那条"),
    (r"制顶的", "置顶的"),
    (r"制顶", "置顶"),
    (r"母乳除奶袋", "母乳储奶袋"),
    (r"除奶袋", "储奶袋"),
    (r"刚动到冰箱", "刚冻到冰箱"),
    (r"插那个奶粉", "掺那个奶粉"),
    (r"里插那个", "里掺那个"),
    (r"里插了", "里掺了"),
    (r"堆码了", "堆满了"),
    (r"品牌剂的", "品牌方的"),
    (r"品牌剂", "品牌方"),
    (r"宠无医院", "宠物医院"),
    (r"地东西安浮", "递东西安抚"),
    (r"安浮小动物", "安抚小动物"),
    (r"梅大事", "没大事"),
    (r"厨藏室", "储藏室"),
    (r"猫娘", "猫粮"),
    (r"一帮猫", "一包猫"),
    (r"实话的状态", "石化的状态"),
    (r"占了大概", "站了大概"),
    (r"猪提汤", "猪蹄汤"),
    (r"蛋白智", "蛋白质"),
    (r"世界维生组织", "世界卫生组织"),
    (r"牙空气抹", "遥控器"),
    (r"假在中间", "夹在中间"),
    (r"磁猴月子", "伺候月子"),
    (r"盖瑞茶铺漫", "盖瑞·查普曼"),
    (r"盖瑞.?查普曼", "盖瑞·查普曼"),
    (r"爱的五种语言", "爱的五种语言"),
    (r"盾一锅汤", "炖一锅汤"),
    (r"盾六顿", "炖六顿"),
    (r"牙跟松动", "牙根松动"),
    (r"回一辈子", "悔一辈子"),
    (r"落下根", "落下病根"),
    # 溜弯：avoid rewriting 六万粉丝 / 六万块
    (r"去六万", "去溜弯"),
    (r"出去六万", "出去溜弯"),
    (r"洋台", "阳台"),
    (r"断上汤", "端上汤"),
    (r"五得满身废子", "捂得满身痱子"),
    (r"五出一身费子", "捂出一身痱子"),
    (r"捂得满身废子", "捂得满身痱子"),
    (r"满身废子", "满身痱子"),
    (r"一身费子", "一身痱子"),
    (r"全是汉[，,]\s*", ""),
    # Psychology (繁体 leftovers + near-misses)
    (r"沉沒成本", "沉没成本"),
    (r"石牆效應", "石墙效应"),
    (r"認知失調", "认知失调"),
    (r"愛的語言", "爱的语言"),
    (r"冷戰", "冷战"),
    (r"出軌", "出轨"),
    (r"暗戀", "暗恋"),
    (r"身份剥夺", "身份剥夺"),
    # Misc
    (r"讯息", "信息"),
    (r"心里学", "心理学"),
    (r"猛了", "急了"),
    (r"叫进", "较劲"),
    (r"空火若是话", "困惑和实话"),
    (r"空火和", "困惑和"),
]


def parse_feed():
    xml = urllib.request.urlopen(FEED, timeout=120).read().decode("utf-8", "ignore")
    items = re.findall(r"<item>([\s\S]*?)</item>", xml)
    eps = []
    for item in items:
        tm = re.search(r"<title(?:[^>]*)><!\[CDATA\[(.*?)\]\]>|<title(?:[^>]*)>([^<]+)", item)
        title = (tm.group(1) or tm.group(2) if tm else "").strip()
        idm = re.search(r"/askinglove/(\d+)", item)
        rss_id = idm.group(1) if idm else None
        em = re.search(r'enclosure[^>]+url="([^"]+)"', item)
        audio = em.group(1) if em else None
        dm = re.search(r"<itunes:duration>([^<]+)", item)
        duration = dm.group(1).strip() if dm else ""
        epm = re.search(r"<itunes:episode>(\d+)", item)
        epn = int(epm.group(1)) if epm else None
        if rss_id and title and audio:
            eps.append(
                {
                    "rssId": rss_id,
                    "title": title,
                    "audio": audio,
                    "duration": duration,
                    "episodeNumber": epn,
                }
            )
    return eps


def download(url: str, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 10_000:
        return
    urllib.request.urlretrieve(url, dest)


_cc = None


def to_simplified(text: str) -> str:
    global _cc
    try:
        import opencc  # type: ignore

        if _cc is None:
            _cc = opencc.OpenCC("t2s")
        return _cc.convert(text)
    except Exception:
        return text


def clean_text(text: str) -> str:
    t = to_simplified(text)
    # 心理 → 心里 only when not 心理学 / 心理机制 / …
    t = re.sub(
        r"心理(?!学|机制|咨询|治疗|医生|健康|状态|分析|学里|学术|测验|防御)",
        "心里",
        t,
    )
    for pat, rep in REPLACEMENTS:
        t = re.sub(pat, rep, t)
    # Light punctuation spacing for readability in captions
    t = re.sub(r"[ \t]+", "", t)
    t = re.sub(r",", "，", t)
    t = re.sub(r"\?", "？", t)
    t = re.sub(r"!", "！", t)
    t = re.sub(r";", "；", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def refine_segments(segments: list[dict], max_chars: int = 42, max_dur: float = 6.0) -> list[dict]:
    """Split long ASR chunks into caption-friendly cues (by punctuation, time-proportional)."""
    out: list[dict] = []
    for s in segments:
        text = clean_text(s.get("text", "")).replace("\n", " ").strip()
        if not text:
            continue
        start = float(s["start"])
        end = float(s["end"])
        dur = max(0.01, end - start)
        # Already short enough
        if len(text) <= max_chars and dur <= max_dur:
            out.append({"start": start, "end": end, "text": text})
            continue
        # Split on clause boundaries, keep delimiters
        parts = re.split(r"(?<=[。！？!?；;，,、])", text)
        parts = [p for p in parts if p.strip()]
        if len(parts) <= 1:
            # hard wrap by chars
            parts = [text[i : i + max_chars] for i in range(0, len(text), max_chars)]
        # Merge tiny fragments into previous until near max_chars
        merged: list[str] = []
        buf = ""
        for p in parts:
            if not buf:
                buf = p
            elif len(buf) + len(p) <= max_chars:
                buf += p
            else:
                merged.append(buf)
                buf = p
        if buf:
            merged.append(buf)
        total_chars = sum(len(p) for p in merged) or 1
        cursor = start
        for i, p in enumerate(merged):
            share = dur * (len(p) / total_chars)
            seg_end = end if i == len(merged) - 1 else cursor + share
            # keep min 0.4s cue when possible
            if seg_end - cursor < 0.4 and i < len(merged) - 1:
                seg_end = min(end, cursor + 0.4)
            out.append({"start": cursor, "end": seg_end, "text": p.strip()})
            cursor = seg_end
    return out


def segments_to_srt(segments: list[dict]) -> str:
    refined = refine_segments(segments)
    lines = []
    for i, s in enumerate(refined, 1):
        text = s["text"].strip()
        if not text:
            continue
        lines.append(str(i))
        lines.append(f"{fmt_srt(s['start'])} --> {fmt_srt(s['end'])}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


def fmt_srt(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int(round((sec - int(sec)) * 1000))
    if ms == 1000:
        s += 1
        ms = 0
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def body_markdown(title: str, segments: list[dict], model_name: str = "small") -> str:
    """Turn timed transcript into readable 正文 with light structure."""
    texts = [clean_text(s["text"]) for s in segments if s.get("text", "").strip()]
    full = "".join(texts)

    # Split into sentences
    parts = re.split(r"(?<=[。！？!?])", full)
    parts = [p.strip() for p in parts if p.strip()]

    # Group into paragraphs (~3-5 sentences)
    paras: list[str] = []
    buf: list[str] = []
    for p in parts:
        buf.append(p)
        if len(buf) >= 3 or (len(buf) >= 2 and len("".join(buf)) > 120):
            paras.append("".join(buf))
            buf = []
    if buf:
        paras.append("".join(buf))

    # Section split heuristics
    open_end = min(3, len(paras))
    close_start = max(open_end, len(paras) - 2)

    opening = paras[:open_end]
    middle = paras[open_end:close_start]
    closing = paras[close_start:]

    source = f"whisper-{model_name}" if not model_name.startswith("whisper") else model_name
    lines = [
        "---",
        f"source: {source}",
        "disclaimer: 文稿由语音识别整理并转简体，与音频可能略有出入；以表达清晰为准。",
        "---",
        "",
        "## 开场",
        "",
        *sum(([p, ""] for p in opening), []),
        "## 正文",
        "",
        *sum(([p, ""] for p in middle), []),
    ]
    if closing:
        lines += ["## 结尾", ""] + sum(([p, ""] for p in closing), [])

    lines += [
        "",
        "---",
        "",
        f"收听本集：https://askinglove.com/episodes/{{RSS_ID}}/",
        "投稿：https://askinglove.com/submit/",
    ]
    return "\n".join(lines).strip() + "\n"


def write_outputs(rid: str, title: str, segs: list[dict], model_name: str = "small") -> int:
    """Write md + srt (data/public/export). Returns cleaned char count."""
    md_path = TX_DIR / f"{rid}.md"
    srt_path = SRT_DIR / f"{rid}.srt"
    md = body_markdown(title, segs, model_name=model_name).replace("{RSS_ID}", rid)
    md_path.write_text(md, encoding="utf-8")
    srt_body = segments_to_srt(segs)
    srt_path.write_text(srt_body, encoding="utf-8")
    (SRT_PUBLIC / f"{rid}.srt").write_text(srt_body, encoding="utf-8")
    (SRT_EXPORT / f"{rid}.srt").write_text(srt_body, encoding="utf-8")
    full = "".join(s.get("text", "") for s in segs)
    return len(re.sub(r"\s+", "", clean_text(full)))


def reclean_from_raw(ids: set[str] | None = None) -> tuple[int, int]:
    """Re-apply clean_text / body structure from raw JSON (no Whisper)."""
    ok = fail = 0
    paths = sorted(RAW_DIR.glob("*.json"))
    for raw_path in paths:
        rid = raw_path.stem
        if ids is not None and rid not in ids:
            continue
        try:
            data = json.loads(raw_path.read_text(encoding="utf-8"))
            segs = data.get("segments") or []
            if not segs:
                fail += 1
                print(f"  skip empty segments {rid}")
                continue
            title = data.get("title") or rid
            model_name = data.get("model") or "small"
            # Never overwrite hand-edited final scripts
            md_path = TX_DIR / f"{rid}.md"
            if md_path.exists():
                existing = md_path.read_text(encoding="utf-8", errors="ignore")
                if "source: final-script" in existing:
                    # srt only from raw
                    srt_body = segments_to_srt(segs)
                    (SRT_DIR / f"{rid}.srt").write_text(srt_body, encoding="utf-8")
                    (SRT_PUBLIC / f"{rid}.srt").write_text(srt_body, encoding="utf-8")
                    (SRT_EXPORT / f"{rid}.srt").write_text(srt_body, encoding="utf-8")
                    print(f"  reclean srt-only (final-script) {rid}")
                    ok += 1
                    continue
            chars = write_outputs(rid, title, segs, model_name=model_name)
            print(f"  reclean {rid} segs={len(segs)} chars={chars} model={model_name}")
            ok += 1
        except Exception as e:
            fail += 1
            print(f"  FAIL reclean {rid}: {e}")
    return ok, fail


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help="whisper model size (default: small)",
    )
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--ids", default="", help="comma-separated rss ids")
    ap.add_argument("--force", action="store_true")
    ap.add_argument(
        "--reclean",
        action="store_true",
        help="re-apply ASR dictionary + 正文 structure from raw/*.json (no Whisper)",
    )
    ap.add_argument(
        "--beam",
        type=int,
        default=1,
        help="beam size (1=fast CPU default; 3=better quality, slower)",
    )
    args = ap.parse_args()

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    TX_DIR.mkdir(parents=True, exist_ok=True)
    SRT_DIR.mkdir(parents=True, exist_ok=True)
    SRT_PUBLIC.mkdir(parents=True, exist_ok=True)
    SRT_EXPORT.mkdir(parents=True, exist_ok=True)

    id_filter = set(args.ids.split(",")) if args.ids else None

    if args.reclean:
        print("reclean mode: applying dictionary to raw transcripts...")
        ok, fail = reclean_from_raw(id_filter)
        print(f"\nDONE reclean ok={ok} fail={fail}")
        return

    eps = parse_feed()
    if id_filter is not None:
        eps = [e for e in eps if e["rssId"] in id_filter]
    if args.limit:
        eps = eps[: args.limit]

    print(f"episodes to process: {len(eps)} model={args.model} beam={args.beam}")
    from faster_whisper import WhisperModel

    print("loading model...")
    # int8 on CPU; more threads for 8-core hosts
    model = WhisperModel(
        args.model,
        device="cpu",
        compute_type="int8",
        cpu_threads=max(1, (os.cpu_count() or 4) - 1),
    )
    print("model ready")

    ok = fail = 0
    for i, ep in enumerate(eps, 1):
        rid = ep["rssId"]
        md_path = TX_DIR / f"{rid}.md"
        srt_path = SRT_DIR / f"{rid}.srt"
        raw_path = RAW_DIR / f"{rid}.json"

        if not args.force and md_path.exists() and srt_path.exists() and md_path.stat().st_size > 500:
            existing = md_path.read_text(encoding="utf-8", errors="ignore")
            # Re-run if older base model and we're on small+ (quality upgrade path)
            wants_upgrade = (
                args.model in ("small", "medium", "large-v2", "large-v3")
                and "source: whisper-small" not in existing
                and "source: whisper-medium" not in existing
                and "source: final-script" not in existing
            )
            if not wants_upgrade:
                print(f"[{i}/{len(eps)}] skip existing {rid} {ep['title'][:20]}")
                ok += 1
                continue
            print(f"[{i}/{len(eps)}] upgrade {rid} → model {args.model}")

        print(f"[{i}/{len(eps)}] {rid} {ep['title'][:28]} ...")
        audio = AUDIO_DIR / f"{rid}.mp3"
        try:
            download(ep["audio"], audio)
            t0 = time.time()
            segments_iter, info = model.transcribe(
                str(audio),
                language="zh",
                vad_filter=True,
                # beam 1 default on CPU; raise with --beam 3 for tougher eps
                beam_size=max(1, args.beam),
                best_of=max(1, args.beam),
                temperature=0.0,
                condition_on_previous_text=True,
                initial_prompt=INITIAL_PROMPT,
                hotwords=HOTWORDS,
                compression_ratio_threshold=2.4,
                no_speech_threshold=0.5,
            )
            segs = [
                {"start": float(s.start), "end": float(s.end), "text": s.text}
                for s in segments_iter
            ]
            elapsed = time.time() - t0
            full = "".join(s["text"] for s in segs)
            raw_path.write_text(
                json.dumps(
                    {
                        "rssId": rid,
                        "title": ep["title"],
                        "model": args.model,
                        "language": info.language,
                        "duration": info.duration,
                        "elapsed": elapsed,
                        "segments": segs,
                        "full": full,
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )

            # Prefer keeping hand-written transcripts unless --force
            if md_path.exists() and not args.force:
                existing = md_path.read_text(encoding="utf-8")
                if "source: final-script" in existing:
                    print(f"  keep final-script md, write srt only")
                    srt_body = segments_to_srt(segs)
                    srt_path.write_text(srt_body, encoding="utf-8")
                    (SRT_PUBLIC / f"{rid}.srt").write_text(srt_body, encoding="utf-8")
                    (SRT_EXPORT / f"{rid}.srt").write_text(srt_body, encoding="utf-8")
                    ok += 1
                    print(f"  done in {elapsed:.1f}s segs={len(segs)} chars={len(full)}")
                    continue
            chars = write_outputs(rid, ep["title"], segs, model_name=args.model)
            print(f"  done in {elapsed:.1f}s segs={len(segs)} chars={chars}")
            ok += 1
        except Exception as e:
            fail += 1
            print(f"  FAIL {rid}: {e}")

    print(f"\nDONE ok={ok} fail={fail}")
    print(f"正文: {TX_DIR}")
    print(f"字幕: {SRT_DIR}")


if __name__ == "__main__":
    main()
