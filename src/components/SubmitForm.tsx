import { useState } from 'preact/hooks';
import { platforms } from '../data/platforms';
import { show } from '../data/show';

const FORMSPREE_URL = 'https://formspree.io/f/mjgpynwd';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

function ThanksState({ notified }: { notified: boolean }) {
  return (
    <div class="thanks">
      <div class="thanks-hero">
        <div class="thanks-check" aria-hidden="true">✓</div>
        <h2 class="thanks-title">我们收到了。谢谢你愿意分享。</h2>
        <p class="thanks-lead">
          有些话能说出来，本身就已经很不容易。你的故事会以匿名方式被认真对待。
        </p>
      </div>

      <div class="thanks-card">
        <h3 class="thanks-section-title">接下来会怎样</h3>
        <ol class="thanks-steps">
          <li>
            <strong>我们会认真读</strong>
            <span>每一份投稿主理人小问都会看完，不会被算法随便丢掉。</span>
          </li>
          <li>
            <strong>不一定每一篇都会成片</strong>
            <span>成片需要主题、篇幅与当期选题契合；没被选中，不代表你的感受不重要。</span>
          </li>
          <li>
            <strong>若成片，会匿名改写</strong>
            <span>细节会做保护处理；我们不会公开你的投稿原文。</span>
          </li>
          {notified ? (
            <li>
              <strong>我们会尽量通知你</strong>
              <span>你留下了邮箱；若本篇成片，我们会尽量发信告知。不保证每一篇都能联系到。</span>
            </li>
          ) : (
            <li>
              <strong>想第一时间知道更新？</strong>
              <span>订阅下方邮件或在常用平台关注问情播客，新节目会在那里出现。</span>
            </li>
          )}
        </ol>
      </div>

      <div class="thanks-card thanks-subscribe">
        <h3 class="thanks-section-title">在等待的时候，可以…</h3>
        <p class="thanks-subscribe-copy">
          去听别人也曾经不知道该跟谁说的故事，或订阅更新，不用自己一直刷新。
        </p>
        <div class="thanks-actions">
          <a class="btn btn-primary" href="/episodes">
            浏览全部节目
          </a>
          <a class="btn btn-light" href="/listen">
            本站 / 各平台收听
          </a>
          <a
            class="btn btn-light"
            href={show.substackUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            订阅 Substack 邮件
          </a>
        </div>
        <div class="thanks-platforms">
          {platforms.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              class="thanks-platform"
            >
              {p.name}
            </a>
          ))}
        </div>
      </div>

      <p class="thanks-footer">
        爱是需要学习的能力。你愿意来到这里，就已经迈出了重要的一步。
      </p>

      <style>{`
        .thanks {
          max-width: 720px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }
        .thanks-hero {
          text-align: center;
          padding: 36px 28px 28px;
          background: linear-gradient(180deg, #fff, #f8f1fb);
          border: 1px solid rgba(44, 36, 51, 0.08);
          border-radius: 28px;
          box-shadow: 0 18px 44px rgba(18, 12, 28, 0.08);
        }
        .thanks-check {
          width: 68px;
          height: 68px;
          border-radius: 22px;
          margin: 0 auto 18px;
          display: grid;
          place-items: center;
          font-size: 28px;
          color: white;
          background: linear-gradient(135deg, #8d51bb, #a66cd8);
          box-shadow: 0 16px 34px rgba(141, 81, 187, 0.24);
        }
        .thanks-title {
          margin: 0 0 12px;
          font-size: clamp(26px, 4vw, 36px);
          line-height: 1.2;
          letter-spacing: -0.03em;
          font-weight: 700;
          color: #2c2433;
        }
        .thanks-lead {
          margin: 0 auto;
          max-width: 34ch;
          color: #6d6376;
          font-size: 16px;
          line-height: 1.85;
        }
        .thanks-card {
          padding: 28px 26px;
          background: white;
          border: 1px solid rgba(44, 36, 51, 0.07);
          border-radius: 22px;
          box-shadow: 0 4px 14px rgba(18, 12, 28, 0.04);
        }
        .thanks-section-title {
          margin: 0 0 16px;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #2c2433;
        }
        .thanks-steps {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 16px;
          counter-reset: thanks-step;
        }
        .thanks-steps li {
          display: grid;
          grid-template-columns: 32px 1fr;
          gap: 12px 14px;
          align-items: start;
          counter-increment: thanks-step;
        }
        .thanks-steps li::before {
          content: counter(thanks-step);
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 13px;
          font-weight: 700;
          color: #8d51bb;
          background: rgba(141, 81, 187, 0.1);
          grid-row: 1 / span 2;
        }
        .thanks-steps strong {
          display: block;
          font-size: 15px;
          color: #2c2433;
          margin-bottom: 4px;
        }
        .thanks-steps span {
          display: block;
          font-size: 14px;
          color: #6d6376;
          line-height: 1.7;
        }
        .thanks-subscribe-copy {
          margin: 0 0 20px;
          color: #6d6376;
          font-size: 15px;
          line-height: 1.8;
        }
        .thanks-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 18px;
        }
        .thanks-actions .btn {
          min-height: 48px;
        }
        .thanks-platforms {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .thanks-platform {
          display: inline-flex;
          align-items: center;
          min-height: 40px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(141, 81, 187, 0.14);
          background: rgba(141, 81, 187, 0.05);
          color: #8d6ba3;
          font-size: 13px;
          text-decoration: none;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .thanks-platform:hover {
          background: rgba(141, 81, 187, 0.12);
          border-color: rgba(141, 81, 187, 0.28);
          color: #6f3d9a;
        }
        .thanks-footer {
          margin: 4px 0 0;
          text-align: center;
          color: #9688a3;
          font-size: 14px;
          line-height: 1.8;
        }
        @media (max-width: 520px) {
          .thanks-actions {
            flex-direction: column;
          }
          .thanks-actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default function SubmitForm() {
  const [story, setStory] = useState('');
  const [question, setQuestion] = useState('');
  const [consent, setConsent] = useState(false);
  const [wantNotify, setWantNotify] = useState(false);
  const [email, setEmail] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successNotified, setSuccessNotified] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!story.trim()) e.story = '请写下你的故事';
    else if (story.length < 50) e.story = `请再多写一点（至少 50 字，当前 ${story.length} 字）`;
    if (!question.trim()) e.question = '请写下你最困惑的问题';
    if (wantNotify) {
      const v = email.trim();
      if (!v) e.email = '如需通知，请留下邮箱；或不勾选通知选项';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) e.email = '请输入有效的邮箱地址';
    }
    return e;
  }

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0 || !consent) return;

    setSubmitState('submitting');
    try {
      const body: Record<string, string> = {
        '你的故事': story,
        '最困惑的问题': question,
        '同意匿名改编': '是',
      };
      if (wantNotify && email.trim()) {
        body['成片通知邮箱'] = email.trim();
        body['_replyto'] = email.trim();
      }
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSuccessNotified(wantNotify && !!email.trim());
        setSubmitState('success');
        // Bring the thank-you into view (form is mid-page under the hero).
        if (typeof window !== 'undefined') {
          window.requestAnimationFrame(() => {
            document.getElementById('form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
      } else {
        setSubmitState('error');
      }
    } catch {
      setSubmitState('error');
    }
  }

  if (submitState === 'success') {
    return <ThanksState notified={successNotified} />;
  }

  if (submitState === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{
          width: '68px', height: '68px', borderRadius: '22px', margin: '0 auto 20px',
          display: 'grid', placeItems: 'center', fontSize: '28px', color: 'white',
          background: 'linear-gradient(135deg, #d94444, #e66c6c)',
          boxShadow: '0 16px 34px rgba(217,68,68,0.24)',
        }}>✕</div>
        <h2 style={{ fontSize: '24px', color: '#2c2433', marginBottom: '12px' }}>提交没有成功</h2>
        <p style={{ color: '#6d6376', marginBottom: '24px' }}>
          如果你已经写了很久，建议先复制保存一下，再重新提交。
        </p>
        <button onClick={() => setSubmitState('idle')} class="btn btn-primary">重新提交</button>
      </div>
    );
  }

  return (
    <div class="card card-lg" style={{ padding: '30px' }}>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gap: '18px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#2c2433', marginBottom: '8px' }}>你的故事</div>
            <div style={{ fontSize: '14px', color: '#6d6376', lineHeight: '1.75', marginBottom: '10px' }}>
              发生了什么？最难受的点是什么？默认匿名，不需要写真实姓名。
            </div>
            <textarea
              value={story}
              onInput={(e) => {
                setStory((e.target as HTMLTextAreaElement).value);
                setErrors((prev) => {
                  const n = { ...prev };
                  delete n.story;
                  return n;
                });
              }}
              placeholder="在这里开始写你的故事……"
              style={{
                width: '100%', minHeight: '180px', padding: '18px', borderRadius: '18px',
                border: `1px solid ${errors.story ? '#e88' : 'rgba(141,81,187,0.12)'}`,
                background: 'rgba(141,81,187,0.07)', color: '#2c2433', fontSize: '15px',
                lineHeight: '1.8', resize: 'vertical' as const, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {errors.story && <p style={{ color: '#d94444', fontSize: '13px', marginTop: '6px' }}>{errors.story}</p>}
          </div>

          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#2c2433', marginBottom: '8px' }}>
              你现在最困惑的问题是什么？
            </div>
            <div style={{ fontSize: '14px', color: '#6d6376', lineHeight: '1.75', marginBottom: '10px' }}>
              例如：我到底该不该继续等？
            </div>
            <textarea
              value={question}
              onInput={(e) => {
                setQuestion((e.target as HTMLTextAreaElement).value);
                setErrors((prev) => {
                  const n = { ...prev };
                  delete n.question;
                  return n;
                });
              }}
              placeholder="在这里写下你现在最想问的问题……"
              style={{
                width: '100%', minHeight: '120px', padding: '18px', borderRadius: '18px',
                border: `1px solid ${errors.question ? '#e88' : 'rgba(141,81,187,0.12)'}`,
                background: 'rgba(141,81,187,0.07)', color: '#2c2433', fontSize: '15px',
                lineHeight: '1.8', resize: 'vertical' as const, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {errors.question && (
              <p style={{ color: '#d94444', fontSize: '13px', marginTop: '6px' }}>{errors.question}</p>
            )}
          </div>

          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#2c2433', marginBottom: '10px' }}>
              是否允许匿名用于节目创作
            </div>
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
              padding: '16px 18px', borderRadius: '18px',
              border: '1px solid rgba(141,81,187,0.18)', background: 'rgba(141,81,187,0.07)',
              color: '#594c66', fontSize: '15px', lineHeight: '1.75',
            }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={() => setConsent(!consent)}
                style={{ marginTop: '4px', accentColor: '#8d51bb', width: '18px', height: '18px', flexShrink: 0 }}
              />
              <span>我同意匿名改编成节目</span>
            </label>
          </div>

          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#2c2433', marginBottom: '10px' }}>
              成片通知（可选）
            </div>
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
              padding: '16px 18px', borderRadius: '18px',
              border: '1px solid rgba(141,81,187,0.12)', background: 'rgba(141,81,187,0.04)',
              color: '#594c66', fontSize: '15px', lineHeight: '1.75', marginBottom: wantNotify ? '12px' : 0,
            }}>
              <input
                type="checkbox"
                checked={wantNotify}
                onChange={() => {
                  setWantNotify(!wantNotify);
                  setErrors((prev) => {
                    const n = { ...prev };
                    delete n.email;
                    return n;
                  });
                }}
                style={{ marginTop: '4px', accentColor: '#8d51bb', width: '18px', height: '18px', flexShrink: 0 }}
              />
              <span>成片后如需通知，可留下邮箱（可选）</span>
            </label>
            {wantNotify && (
              <>
                <input
                  type="email"
                  value={email}
                  onInput={(e) => {
                    setEmail((e.target as HTMLInputElement).value);
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.email;
                      return n;
                    });
                  }}
                  placeholder="your@email.com"
                  style={{
                    width: '100%', minHeight: '48px', padding: '14px 16px', borderRadius: '16px',
                    border: `1px solid ${errors.email ? '#e88' : 'rgba(141,81,187,0.12)'}`,
                    background: 'rgba(141,81,187,0.07)', color: '#2c2433', fontSize: '15px',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
                {errors.email && (
                  <p style={{ color: '#d94444', fontSize: '13px', marginTop: '6px' }}>{errors.email}</p>
                )}
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#9688a3', lineHeight: 1.6 }}>
                  邮箱仅用于成片通知，不会公开，也不会用于推销。
                </p>
              </>
            )}
          </div>

          <div style={{ paddingTop: '4px' }}>
            <button
              type="submit"
              disabled={!consent || submitState === 'submitting'}
              class="btn btn-primary"
              style={{ width: '100%', minHeight: '52px' }}
            >
              {submitState === 'submitting' ? '提交中...' : '提交投稿'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
