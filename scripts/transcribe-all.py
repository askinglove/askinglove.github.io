#!/usr/bin/env python3
"""
Transcribe all AskingLove episodes with faster-whisper,
write 正文 markdown + YouTube .srt for each.

Usage:
  python3 scripts/transcribe-all.py              # all
  python3 scripts/transcribe-all.py --limit 3    # first 3
  python3 scripts/transcribe-all.py --ids 2664929,3020789
  python3 scripts/transcribe-all.py --model base
"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = Path("/tmp/askinglove-audio")
RAW_DIR = ROOT / "raw" / "transcripts"
TX_DIR = ROOT / "src" / "data" / "transcripts"
SRT_DIR = ROOT / "src" / "data" / "captions"
# also mirror to exports/youtube for local ops convenience
SRT_EXPORT = ROOT / "exports" / "youtube"
FEED = "https://media.rss.com/askinglove/feed.xml"

# Common ASR confusions for this show (post-simplified)
REPLACEMENTS = [
    (r"问情播课", "问情播客"),
    (r"問情播課", "问情播客"),
    (r"问情播客课", "问情播客"),
    (r"卖出了最", "迈出了最"),
    (r"卖出了那", "迈出了那"),
    (r"卖不出", "迈不出"),
    (r"賣出", "迈出"),
    (r"胃腾", "胃疼"),
    (r"未堂", "胃疼"),
    (r"宠无医院", "宠物医院"),
    (r"地东西安浮", "递东西安抚"),
    (r"哄了", "红了"),
    (r"梅大事", "没大事"),
    (r"厨藏室", "储藏室"),
    (r"猫娘", "猫粮"),
    (r"一帮猫", "一包猫"),
    (r"实话的状态", "石化的状态"),
    (r"占了大概", "站了大概"),
    (r"讯息", "信息"),
    (r"離出来", "理出来"),
    (r"不及这给", "不急着给"),
    (r"心理", "心里"),  # careful - 心理学 should stay; apply only common cases below more carefully
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
    # conservative 心理 → 心里 only when not 心理学/心理机制 etc.
    t = re.sub(r"心理(?!学|机制|咨询|治疗|医生|健康|状态分析)", "心里", t)
    for pat, rep in REPLACEMENTS:
        t = re.sub(pat, rep, t)
    t = re.sub(r"[ \t]+", "", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def segments_to_srt(segments: list[dict]) -> str:
    lines = []
    for i, s in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{fmt_srt(s['start'])} --> {fmt_srt(s['end'])}")
        lines.append(clean_text(s["text"]).replace("\n", " ").strip())
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


def body_markdown(title: str, segments: list[dict]) -> str:
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

    lines = [
        "---",
        "source: whisper-base",
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="base", help="whisper model size")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--ids", default="", help="comma-separated rss ids")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    TX_DIR.mkdir(parents=True, exist_ok=True)
    SRT_DIR.mkdir(parents=True, exist_ok=True)
    SRT_EXPORT.mkdir(parents=True, exist_ok=True)

    eps = parse_feed()
    if args.ids:
        want = set(args.ids.split(","))
        eps = [e for e in eps if e["rssId"] in want]
    if args.limit:
        eps = eps[: args.limit]

    print(f"episodes to process: {len(eps)} model={args.model}")
    from faster_whisper import WhisperModel

    print("loading model...")
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    print("model ready")

    ok = fail = 0
    for i, ep in enumerate(eps, 1):
        rid = ep["rssId"]
        md_path = TX_DIR / f"{rid}.md"
        srt_path = SRT_DIR / f"{rid}.srt"
        raw_path = RAW_DIR / f"{rid}.json"

        if not args.force and md_path.exists() and srt_path.exists() and md_path.stat().st_size > 500:
            # Skip if already produced by this pipeline (source whisper) or substantial
            print(f"[{i}/{len(eps)}] skip existing {rid} {ep['title'][:20]}")
            ok += 1
            continue

        print(f"[{i}/{len(eps)}] {rid} {ep['title'][:28]} ...")
        audio = AUDIO_DIR / f"{rid}.mp3"
        try:
            download(ep["audio"], audio)
            t0 = time.time()
            segments_iter, info = model.transcribe(
                str(audio),
                language="zh",
                vad_filter=True,
                beam_size=2,
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

            md = body_markdown(ep["title"], segs).replace("{RSS_ID}", rid)
            # Prefer keeping hand-written transcripts unless --force
            if md_path.exists() and not args.force:
                existing = md_path.read_text(encoding="utf-8")
                if "source: final-script" in existing or "source: whisper" not in existing and len(existing) > 800:
                    # keep editorial if marked final; overwrite only whisper or empty
                    if "source: final-script" in existing:
                        print(f"  keep final-script md, write srt only")
                        srt_path.write_text(segments_to_srt(segs), encoding="utf-8")
                        ok += 1
                        print(f"  done in {elapsed:.1f}s segs={len(segs)} chars={len(full)}")
                        continue
            md_path.write_text(md, encoding="utf-8")
            srt_body = segments_to_srt(segs)
            srt_path.write_text(srt_body, encoding="utf-8")
            (SRT_EXPORT / f"{rid}.srt").write_text(srt_body, encoding="utf-8")
            chars = len(re.sub(r"\s+", "", clean_text(full)))
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
