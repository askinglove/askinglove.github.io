import { useState } from 'preact/hooks';

type Props = {
  episodeUrl: string;
  episodeTitle: string;
  shareText: string;
  showUrl: string;
  showShareText: string;
  submitUrl: string;
};

type CopyKey = 'episode' | 'notes' | 'show' | null;

export default function ShareBar({
  episodeUrl,
  episodeTitle,
  shareText,
  showUrl,
  showShareText,
  submitUrl,
}: Props) {
  const [copied, setCopied] = useState<CopyKey>(null);

  async function copy(text: string, key: CopyKey) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
    }
  }

  async function nativeShare(title: string, text: string, url: string) {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* user cancelled or share failed — fall through to copy */
      }
    }
    await copy(`${text}\n${url}`, 'episode');
  }

  return (
    <div class="share-bar">
      <h2 class="share-title">分享</h2>
      <p class="share-lead">把这一集或整个问情播客，转给也需要被好好听一听的人。</p>

      <div class="share-block">
        <div class="share-block-label">这一集</div>
        <div class="share-actions">
          <button
            type="button"
            class="share-btn primary"
            onClick={() =>
              nativeShare(episodeTitle, `推荐问情播客：${episodeTitle}`, episodeUrl)
            }
          >
            分享本集
          </button>
          <button
            type="button"
            class="share-btn"
            onClick={() => copy(episodeUrl, 'episode')}
          >
            {copied === 'episode' ? '已复制链接' : '复制本集链接'}
          </button>
          <button
            type="button"
            class="share-btn"
            onClick={() => copy(shareText, 'notes')}
          >
            {copied === 'notes' ? '已复制文案' : '复制节目笔记'}
          </button>
        </div>
      </div>

      <div class="share-block">
        <div class="share-block-label">问情播客</div>
        <div class="share-actions">
          <button
            type="button"
            class="share-btn primary"
            onClick={() =>
              nativeShare(
                '问情播客 AskingLove',
                '一档关于爱情、关系与情绪的中文播客',
                showUrl,
              )
            }
          >
            分享播客
          </button>
          <button type="button" class="share-btn" onClick={() => copy(showUrl, 'show')}>
            {copied === 'show' ? '已复制链接' : '复制官网链接'}
          </button>
          <a class="share-btn" href={submitUrl}>
            投稿你的故事
          </a>
        </div>
      </div>

      <style>{`
        .share-bar {
          padding: 28px 24px;
          background: white;
          border: 1px solid rgba(44, 36, 51, 0.07);
          border-radius: 22px;
          box-shadow: 0 4px 14px rgba(18, 12, 28, 0.04);
        }
        .share-title {
          margin: 0 0 8px;
          font-family: var(--font-serif);
          font-size: var(--text-3xl);
          letter-spacing: 0.02em;
          color: #2c2433;
          font-weight: 600;
        }
        .share-lead {
          margin: 0 0 22px;
          color: #6d6376;
          font-family: var(--font-sans);
          font-size: var(--text-base);
          line-height: 1.75;
        }
        .share-block + .share-block {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid rgba(44, 36, 51, 0.06);
        }
        .share-block-label {
          font-size: 13px;
          font-weight: 600;
          color: #9688a3;
          letter-spacing: 0.04em;
          margin-bottom: 12px;
        }
        .share-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .share-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 10px 16px;
          border-radius: 14px;
          border: 1px solid rgba(44, 36, 51, 0.1);
          background: #fbf8fd;
          color: #2c2433;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          text-decoration: none;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, transform 0.15s;
        }
        .share-btn:hover {
          border-color: rgba(141, 81, 187, 0.28);
          background: rgba(141, 81, 187, 0.06);
        }
        .share-btn.primary {
          background: linear-gradient(135deg, #8d51bb, #a66cd8);
          border-color: transparent;
          color: white;
          box-shadow: 0 6px 16px rgba(141, 81, 187, 0.18);
        }
        .share-btn.primary:hover {
          background: linear-gradient(135deg, #8d51bb, #a66cd8);
          transform: translateY(-1px);
        }
        @media (prefers-reduced-motion: reduce) {
          .share-btn { transition: none; }
        }
      `}</style>
    </div>
  );
}
