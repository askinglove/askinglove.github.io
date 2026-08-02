# 正文 / 文稿（source of truth）

每个文件：`{rssId}.md`（RSS.com 集数数字 id，如 `2664929.md`）。

## 工作流（每一集）

1. 定稿 **简体** 阅读版正文（约 1,200–2,000 字）
2. 保存为 `src/data/transcripts/{rssId}.md`
3. 部署站点 → 自动生成  
   - 节目页：`/episodes/{id}/`（含「阅读全文」）  
   - 正文页：`/episodes/{id}/transcript/`
4. YouTube  
   - **描述**：短 hook + 要点 + 链到正文/节目页（可用 `npm run transcript:youtube -- {rssId}`）  
   - **字幕**：同一文稿的时间轴版（`npm run transcript:srt -- {rssId}`）  
   - **不要**把 1200 字全文贴进 YouTube 描述框

## 文件格式

```md
---
source: final-script
disclaimer: 文稿经整理，与音频可能略有出入；以表达清晰为准。
---

## 开场

……

## 故事

……

## 想一想

……
```

- 正文用 `##` 小标题 + 自然段即可  
- 会在构建时转成简体并渲染  
- **≥ 约 400 字** 才显示「阅读全文」（完整成稿建议 1200+）

## 从音频批量生成（faster-whisper）

```bash
# 需要: pip install faster-whisper opencc-python-reimplemented, ffmpeg
npm run transcript:all                 # 全部集
python3 scripts/transcribe-all.py --ids 2664929 --force
```

产出：
- `src/data/transcripts/{id}.md` — 正文（阅读版，简体）
- `src/data/captions/{id}.srt` — 源文件
- **公开下载：** `https://askinglove.com/captions/{id}.srt`（`public/captions/`）
- `raw/transcripts/{id}.json` — 原始识别结果（本地调试，默认不提交）

## 脚手架 / 导出

```bash
npm run transcript:new -- 2664929
npm run transcript:srt -- 2664929      # 若无 whisper 时的均匀估时字幕
npm run transcript:youtube -- 2664929  # 短描述（含阅读全文链接）
```

**注意：** Whisper 识别会有错字，上线前建议人工通读关键集；字幕可在 YouTube Studio 再微调。
