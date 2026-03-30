import { useState } from 'preact/hooks';
import {
  ageRanges,
  relationshipStatuses,
  topicTags,
  permissionOptions,
} from '../data/formOptions';

const FORMSPREE_URL = 'https://formspree.io/f/mjgpynwd';

interface FormData {
  storyTitle: string;
  story: string;
  question: string;
  permission: string;
  nickname: string;
  contact: string;
  ageRange: string;
  relationship: string;
  tags: string[];
  privacyConsent: boolean;
}

interface FormErrors {
  [key: string]: string;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function SubmitForm() {
  const [form, setForm] = useState<FormData>({
    storyTitle: '',
    story: '',
    question: '',
    permission: '',
    nickname: '',
    contact: '',
    ageRange: '',
    relationship: '',
    tags: [],
    privacyConsent: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!form.storyTitle.trim()) e.storyTitle = '请先填写故事标题';
    else if (form.storyTitle.length > 100) e.storyTitle = '标题不能超过 100 字';

    if (!form.story.trim()) e.story = '请把你的故事再写详细一点';
    else if (form.story.length < 100) e.story = `请把你的故事再写详细一点（至少 100 字，当前 ${form.story.length} 字）`;

    if (!form.question.trim()) e.question = '请填写你现在最困惑的问题';
    else if (form.question.length < 20) e.question = `请再多写一点（至少 20 字，当前 ${form.question.length} 字）`;

    if (!form.permission) e.permission = '请先选择是否允许匿名用于节目创作';
    if (!form.privacyConsent) e.privacyConsent = '请勾选隐私确认后再提交';

    return e;
  }

  function handleFieldBlur(field: keyof FormData) {
    const allErrors = validate();
    if (allErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: allErrors[field] }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function toggleTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitState('submitting');

    try {
      const body = {
        '故事标题': form.storyTitle,
        '你的故事': form.story,
        '最困惑的问题': form.question,
        '是否允许匿名改编': form.permission === 'allow' ? '可以' : '不可以',
        '称呼': form.nickname || '（未填写）',
        '联系方式': form.contact || '（未填写）',
        '年龄范围': form.ageRange || '（未选择）',
        '关系阶段': form.relationship || '（未选择）',
        '主题标签': form.tags.length > 0 ? form.tags.join(', ') : '（未选择）',
      };

      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSubmitState('success');
      } else {
        setSubmitState('error');
      }
    } catch {
      setSubmitState('error');
    }
  }

  // --- Success State ---
  if (submitState === 'success') {
    return (
      <div class="text-center py-16 animate-fade-in">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-brand-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-text-primary mb-4">我们收到了你的故事</h2>
        <div class="max-w-md mx-auto space-y-4 text-text-secondary text-sm">
          <p>谢谢你愿意把这些讲给我们听。</p>
          <p>
            有些故事写下来的那一刻，已经很不容易了。<br />
            我们会认真阅读你的投稿，也会尊重你的隐私。
          </p>
          <p>
            如果你的故事适合被进一步联系或改编，我们会通过你留下的方式联系你（如果你填写了联系方式）。
          </p>
          <p class="text-brand-400 italic mt-6">你愿意把这些说出来，已经很勇敢了。</p>
        </div>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <a href="/" class="btn-outline text-sm">返回首页</a>
          <a href="/episodes" class="btn-primary text-sm">去听最新一集</a>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (submitState === 'error') {
    return (
      <div class="text-center py-16 animate-fade-in">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-text-primary mb-3">提交没有成功，请稍后再试一次。</h2>
        <p class="text-text-secondary text-sm mb-8">如果你已经写了很久，建议先复制保存一下，再重新提交。</p>
        <button onClick={() => setSubmitState('idle')} class="btn-primary text-sm">
          重新提交
        </button>
      </div>
    );
  }

  // --- Form ---
  return (
    <form onSubmit={handleSubmit} noValidate class="space-y-10">
      {/* Required Section */}
      <div class="space-y-8">
        {/* Story Title */}
        <div>
          <label class="block text-sm font-semibold text-text-primary mb-2">
            故事标题 / 一句话概括 <span class="text-brand-500">*</span>
          </label>
          <input
            type="text"
            value={form.storyTitle}
            onInput={(e) => setForm({ ...form, storyTitle: (e.target as HTMLInputElement).value })}
            onBlur={() => handleFieldBlur('storyTitle')}
            placeholder="例如：喜欢了很久的人，突然喜欢上了别人"
            maxLength={100}
            class={`w-full px-4 py-3 rounded-xl border bg-white text-text-primary placeholder:text-text-secondary/40 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 ${errors.storyTitle ? 'border-red-300' : 'border-brand-100'}`}
          />
          <div class="flex justify-between mt-1.5">
            {errors.storyTitle && <p class="text-xs text-red-500">{errors.storyTitle}</p>}
            <p class="text-xs text-text-secondary/50 ml-auto">{form.storyTitle.length}/100</p>
          </div>
        </div>

        {/* Story Body */}
        <div>
          <label class="block text-sm font-semibold text-text-primary mb-2">
            你的故事 <span class="text-brand-500">*</span>
          </label>
          <p class="text-xs text-text-secondary/60 mb-2">
            匿名投稿完全可以，我们更在意的是你的真实感受。
          </p>
          <textarea
            value={form.story}
            onInput={(e) => setForm({ ...form, story: (e.target as HTMLTextAreaElement).value })}
            onBlur={() => handleFieldBlur('story')}
            placeholder="把事情慢慢讲给我们听。发生了什么？你最难受的点是什么？你现在最放不下的是什么？"
            rows={10}
            class={`w-full px-4 py-3 rounded-xl border bg-white text-text-primary placeholder:text-text-secondary/40 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 resize-y ${errors.story ? 'border-red-300' : 'border-brand-100'}`}
          />
          <div class="flex justify-between mt-1.5">
            {errors.story && <p class="text-xs text-red-500">{errors.story}</p>}
            <p class="text-xs text-text-secondary/50 ml-auto">{form.story.length}/5000</p>
          </div>
        </div>

        {/* Question */}
        <div>
          <label class="block text-sm font-semibold text-text-primary mb-2">
            你现在最困惑的问题是什么？ <span class="text-brand-500">*</span>
          </label>
          <textarea
            value={form.question}
            onInput={(e) => setForm({ ...form, question: (e.target as HTMLTextAreaElement).value })}
            onBlur={() => handleFieldBlur('question')}
            placeholder="例如：我到底该不该继续等？我是不是只是舍不得？"
            rows={4}
            class={`w-full px-4 py-3 rounded-xl border bg-white text-text-primary placeholder:text-text-secondary/40 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 resize-y ${errors.question ? 'border-red-300' : 'border-brand-100'}`}
          />
          <div class="flex justify-between mt-1.5">
            {errors.question && <p class="text-xs text-red-500">{errors.question}</p>}
            <p class="text-xs text-text-secondary/50 ml-auto">{form.question.length}/1000</p>
          </div>
        </div>

        {/* Permission */}
        <div>
          <label class="block text-sm font-semibold text-text-primary mb-3">
            是否允许匿名用于节目创作 <span class="text-brand-500">*</span>
          </label>
          <p class="text-xs text-text-secondary/60 mb-3">
            如果你不希望故事被节目改编，也可以只把它当作一次认真说出来的机会。
          </p>
          <div class="space-y-3">
            {permissionOptions.map((opt) => (
              <label class="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="permission"
                  value={opt.value}
                  checked={form.permission === opt.value}
                  onChange={() => {
                    setForm({ ...form, permission: opt.value });
                    setErrors((prev) => { const next = { ...prev }; delete next.permission; return next; });
                  }}
                  class="w-4 h-4 text-brand-500 border-brand-200 focus:ring-brand-400"
                />
                <span class="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
          {errors.permission && <p class="text-xs text-red-500 mt-2">{errors.permission}</p>}
        </div>
      </div>

      {/* Divider */}
      <div class="border-t border-brand-100 pt-10">
        <p class="text-sm text-text-secondary/60 mb-8">以下内容为选填，可以帮助我们更好地理解你的故事。</p>

        {/* Nickname */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label class="block text-sm font-semibold text-text-primary mb-2">
              你希望我们如何称呼你
            </label>
            <input
              type="text"
              value={form.nickname}
              onInput={(e) => setForm({ ...form, nickname: (e.target as HTMLInputElement).value })}
              placeholder="可留空，也可以写一个昵称"
              maxLength={40}
              class="w-full px-4 py-3 rounded-xl border border-brand-100 bg-white text-text-primary placeholder:text-text-secondary/40 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400"
            />
          </div>

          {/* Contact */}
          <div>
            <label class="block text-sm font-semibold text-text-primary mb-2">
              联系方式（可选）
            </label>
            <input
              type="text"
              value={form.contact}
              onInput={(e) => setForm({ ...form, contact: (e.target as HTMLInputElement).value })}
              placeholder="Email / Instagram / 其他可联系你的方式"
              maxLength={120}
              class="w-full px-4 py-3 rounded-xl border border-brand-100 bg-white text-text-primary placeholder:text-text-secondary/40 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400"
            />
          </div>
        </div>

        {/* Age + Relationship */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label class="block text-sm font-semibold text-text-primary mb-2">
              年龄范围（可选）
            </label>
            <select
              value={form.ageRange}
              onChange={(e) => setForm({ ...form, ageRange: (e.target as HTMLSelectElement).value })}
              class="w-full px-4 py-3 rounded-xl border border-brand-100 bg-white text-text-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400"
            >
              <option value="">请选择</option>
              {ageRanges.map((age) => (
                <option value={age}>{age}</option>
              ))}
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold text-text-primary mb-2">
              当前关系阶段（可选）
            </label>
            <select
              value={form.relationship}
              onChange={(e) => setForm({ ...form, relationship: (e.target as HTMLSelectElement).value })}
              class="w-full px-4 py-3 rounded-xl border border-brand-100 bg-white text-text-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400"
            >
              <option value="">请选择</option>
              {relationshipStatuses.map((status) => (
                <option value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Topic Tags */}
        <div class="mb-8">
          <label class="block text-sm font-semibold text-text-primary mb-3">
            主题标签（可选，可多选）
          </label>
          <div class="flex flex-wrap gap-2">
            {topicTags.map((tag) => (
              <button
                type="button"
                onClick={() => toggleTag(tag)}
                class={`text-sm px-4 py-2 rounded-full border transition-all duration-200 ${
                  form.tags.includes(tag)
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-text-secondary border-brand-200 hover:border-brand-400 hover:text-brand-500'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Privacy Consent */}
      <div class="border-t border-brand-100 pt-8">
        <label class="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={form.privacyConsent}
            onChange={() => {
              setForm({ ...form, privacyConsent: !form.privacyConsent });
              setErrors((prev) => { const next = { ...prev }; delete next.privacyConsent; return next; });
            }}
            class="mt-0.5 w-4 h-4 text-brand-500 border-brand-200 rounded focus:ring-brand-400"
          />
          <span class="text-sm text-text-secondary leading-relaxed">
            我知道投稿内容可能会被匿名编辑后用于节目创作，且问情播客不会公开我的真实身份信息。
          </span>
        </label>
        {errors.privacyConsent && <p class="text-xs text-red-500 mt-2">{errors.privacyConsent}</p>}
      </div>

      {/* Submit Button */}
      <div class="pt-4">
        <button
          type="submit"
          disabled={submitState === 'submitting'}
          class="btn-primary w-full sm:w-auto text-base px-12 py-4 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitState === 'submitting' ? '提交中...' : '提交我的故事'}
        </button>
      </div>
    </form>
  );
}
