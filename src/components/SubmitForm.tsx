import { useState } from 'preact/hooks';

const FORMSPREE_URL = 'https://formspree.io/f/mjgpynwd';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function SubmitForm() {
  const [story, setStory] = useState('');
  const [question, setQuestion] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!story.trim()) e.story = '请写下你的故事';
    else if (story.length < 50) e.story = `请再多写一点（至少 50 字，当前 ${story.length} 字）`;
    if (!question.trim()) e.question = '请写下你最困惑的问题';
    return e;
  }

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0 || !consent) return;

    setSubmitState('submitting');
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          '你的故事': story,
          '最困惑的问题': question,
          '同意匿名改编': '是',
        }),
      });
      setSubmitState(res.ok ? 'success' : 'error');
    } catch {
      setSubmitState('error');
    }
  }

  // --- Success ---
  if (submitState === 'success') {
    return (
      <>
        {/* Dark hero for success */}
        <div style={{ textAlign: 'center', paddingBottom: '48px' }}>
          <div style={{
            display: 'inline-block', padding: '7px 12px', borderRadius: '999px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#cec2d9', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' as const,
            marginBottom: '22px',
          }}>Submission Received</div>
          <h1 style={{
            margin: '0 auto 16px', maxWidth: '13ch',
            fontSize: 'clamp(34px, 5.4vw, 56px)', lineHeight: '1.08',
            letterSpacing: '-0.05em', fontWeight: 700, color: '#f6f1fb',
          }}>
            我们收到了。<br />谢谢你愿意分享。
          </h1>
          <p style={{ color: '#cec2d9', fontSize: '17px', lineHeight: '1.85' }}>
            有些话能说出来，本身就已经很不容易。
          </p>
        </div>

        {/* Success card */}
        <div style={{
          maxWidth: '780px', margin: '0 auto', textAlign: 'center', padding: '38px',
          background: 'linear-gradient(180deg, #fff, #f8f1fb)',
          border: '1px solid rgba(44,36,51,0.08)', borderRadius: '30px',
          boxShadow: '0 18px 44px rgba(18,12,28,0.08)',
        }}>
          <div style={{
            width: '68px', height: '68px', borderRadius: '22px', margin: '0 auto 20px',
            display: 'grid', placeItems: 'center', fontSize: '28px', color: 'white',
            background: 'linear-gradient(135deg, #8d51bb, #a66cd8)',
            boxShadow: '0 16px 34px rgba(141,81,187,0.24)',
          }}>✓</div>
          <div style={{
            fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: '1.1',
            letterSpacing: '-0.03em', marginBottom: '14px', fontWeight: 700, color: '#2c2433',
          }}>投稿已提交</div>
          <div style={{
            maxWidth: '34ch', margin: '0 auto', color: '#6d6376',
            fontSize: '16px', lineHeight: '1.88',
          }}>
            谢谢你愿意分享。<br />我们会认真阅读每一个投稿。
          </div>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' as const, marginTop: '28px' }}>
            <a class="btn btn-primary" href="/">返回首页</a>
            <a class="btn btn-light" href="/listen">继续收听</a>
          </div>
        </div>
      </>
    );
  }

  // --- Error ---
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
        <p style={{ color: '#6d6376', marginBottom: '24px' }}>如果你已经写了很久，建议先复制保存一下，再重新提交。</p>
        <button onClick={() => setSubmitState('idle')} class="btn btn-primary">重新提交</button>
      </div>
    );
  }

  // --- Form ---
  return (
    <div class="card card-lg" style={{ padding: '30px' }}>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gap: '18px' }}>
          {/* Story */}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#2c2433', marginBottom: '8px' }}>你的故事</div>
            <div style={{ fontSize: '14px', color: '#6d6376', lineHeight: '1.75', marginBottom: '10px' }}>
              发生了什么？最难受的点是什么？
            </div>
            <textarea
              value={story}
              onInput={(e) => {
                setStory((e.target as HTMLTextAreaElement).value);
                setErrors((prev) => { const n = { ...prev }; delete n.story; return n; });
              }}
              placeholder="在这里开始写你的故事……"
              style={{
                width: '100%', minHeight: '180px', padding: '18px', borderRadius: '18px',
                border: `1px solid ${errors.story ? '#e88' : 'rgba(141,81,187,0.12)'}`,
                background: 'rgba(141,81,187,0.08)', color: '#2c2433', fontSize: '15px',
                lineHeight: '1.8', resize: 'vertical' as const, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {errors.story && <p style={{ color: '#d94444', fontSize: '13px', marginTop: '6px' }}>{errors.story}</p>}
          </div>

          {/* Question */}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#2c2433', marginBottom: '8px' }}>你现在最困惑的问题是什么？</div>
            <div style={{ fontSize: '14px', color: '#6d6376', lineHeight: '1.75', marginBottom: '10px' }}>
              例如：我到底该不该继续等？
            </div>
            <textarea
              value={question}
              onInput={(e) => {
                setQuestion((e.target as HTMLTextAreaElement).value);
                setErrors((prev) => { const n = { ...prev }; delete n.question; return n; });
              }}
              placeholder="在这里写下你现在最想问的问题……"
              style={{
                width: '100%', minHeight: '120px', padding: '18px', borderRadius: '18px',
                border: `1px solid ${errors.question ? '#e88' : 'rgba(141,81,187,0.12)'}`,
                background: 'rgba(141,81,187,0.08)', color: '#2c2433', fontSize: '15px',
                lineHeight: '1.8', resize: 'vertical' as const, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {errors.question && <p style={{ color: '#d94444', fontSize: '13px', marginTop: '6px' }}>{errors.question}</p>}
          </div>

          {/* Consent checkbox */}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#2c2433', marginBottom: '10px' }}>是否允许匿名用于节目创作</div>
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
              padding: '16px 18px', borderRadius: '18px',
              border: '1px solid rgba(141,81,187,0.16)', background: 'rgba(141,81,187,0.08)',
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

          {/* Submit */}
          <div style={{ paddingTop: '4px' }}>
            <button
              type="submit"
              disabled={!consent || submitState === 'submitting'}
              class="btn btn-primary"
              style={{ width: '100%' }}
            >
              {submitState === 'submitting' ? '提交中...' : '提交投稿'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
