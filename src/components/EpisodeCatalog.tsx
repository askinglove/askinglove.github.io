import { useMemo, useState } from 'preact/hooks';
import type { EpisodeCardData } from '../lib/episodes';

type Props = {
  episodes: EpisodeCardData[];
  /** Tags with episode counts (for filter chips / linkability). */
  tags: { tag: string; count: number }[];
};

type SortMode = 'newest' | 'oldest';

function tagPath(tag: string): string {
  return `/tags/${encodeURIComponent(tag)}`;
}

export default function EpisodeCatalog({ episodes, tags }: Props) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = episodes.slice();

    if (q) {
      list = list.filter(
        (ep) =>
          ep.title.toLowerCase().includes(q) ||
          ep.summary.toLowerCase().includes(q) ||
          ep.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    list.sort((a, b) => {
      const ta = new Date(a.pubDateIso).getTime();
      const tb = new Date(b.pubDateIso).getTime();
      return sort === 'newest' ? tb - ta : ta - tb;
    });

    return list;
  }, [episodes, query, sort]);

  /** Tags used on more than one episode → linkable collection pages. */
  const multiTags = tags.filter((t) => t.count > 1);

  return (
    <div class="catalog">
      <div class="catalog-toolbar">
        <label class="catalog-search">
          <span class="sr-only">搜索节目</span>
          <input
            type="search"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="搜索标题或关键词…"
            autocomplete="off"
          />
        </label>
        <div class="catalog-sort" role="group" aria-label="排序">
          <button
            type="button"
            class={sort === 'newest' ? 'active' : ''}
            onClick={() => setSort('newest')}
          >
            最新
          </button>
          <button
            type="button"
            class={sort === 'oldest' ? 'active' : ''}
            onClick={() => setSort('oldest')}
          >
            最早
          </button>
        </div>
      </div>

      {multiTags.length > 0 && (
        <div class="catalog-tags" role="list">
          <span class="catalog-tags-label">按主题</span>
          {multiTags.map(({ tag, count }) => (
            <a
              href={tagPath(tag)}
              role="listitem"
              class="catalog-tag-link"
              key={tag}
            >
              #{tag}
              <span class="catalog-tag-count">{count}</span>
            </a>
          ))}
        </div>
      )}

      <p class="catalog-count">
        {query ? `找到 ${filtered.length} 集` : `共 ${episodes.length} 集`}
      </p>

      {filtered.length > 0 ? (
        <div class="catalog-list">
          {filtered.map((episode) => (
            <a href={episode.href} class="episode-card" key={episode.slug}>
              <div class="episode-cover">
                {episode.coverImage ? (
                  <img src={episode.coverImage} alt="" loading="lazy" width="72" height="72" />
                ) : (
                  <span class="episode-cover-fallback">问</span>
                )}
              </div>
              <div class="episode-content">
                <strong>{episode.title}</strong>
                <p>{episode.summary}</p>
                <div class="episode-meta">
                  {episode.episodeNumber != null && <span>第 {episode.episodeNumber} 集</span>}
                  {episode.duration && <span>{episode.duration}</span>}
                  <span>{episode.pubDateLabel}</span>
                </div>
                {episode.tags.length > 0 && (
                  <div class="episode-tags">
                    {episode.tags.map((t) => {
                      const count = tags.find((x) => x.tag === t)?.count ?? 1;
                      if (count > 1) {
                        return (
                          <span
                            key={t}
                            class="tag-pill tag-pill-link"
                            role="link"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = tagPath(t);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                window.location.href = tagPath(t);
                              }
                            }}
                          >
                            #{t}
                          </span>
                        );
                      }
                      return (
                        <span key={t} class="tag-pill">
                          #{t}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div class="episode-arrow" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div class="catalog-empty">
          <p>没有找到匹配的节目。</p>
          <button
            type="button"
            class="btn btn-light"
            onClick={() => setQuery('')}
          >
            清除搜索
          </button>
        </div>
      )}

      <style>{`
        .catalog-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }
        .catalog-search {
          flex: 1 1 220px;
        }
        .catalog-search input {
          width: 100%;
          min-height: 48px;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid rgba(44, 36, 51, 0.1);
          background: white;
          color: #2c2433;
          font-size: 15px;
          font-family: inherit;
          outline: none;
        }
        .catalog-search input:focus {
          border-color: rgba(141, 81, 187, 0.4);
          box-shadow: 0 0 0 3px rgba(141, 81, 187, 0.12);
        }
        .catalog-sort {
          display: inline-flex;
          padding: 4px;
          border-radius: 14px;
          background: rgba(141, 81, 187, 0.06);
          gap: 4px;
        }
        .catalog-sort button {
          min-height: 40px;
          min-width: 64px;
          padding: 8px 14px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: #6d6376;
          font-size: 14px;
          font-family: inherit;
          cursor: pointer;
        }
        .catalog-sort button.active {
          background: white;
          color: #2c2433;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(18, 12, 28, 0.06);
        }
        .catalog-tags {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .catalog-tags-label {
          font-size: 13px;
          color: #9688a3;
          margin-right: 4px;
        }
        .catalog-tag-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 40px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(141, 81, 187, 0.12);
          background: rgba(141, 81, 187, 0.05);
          color: #8d6ba3;
          font-size: 13px;
          text-decoration: none;
          font-family: inherit;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .catalog-tag-link:hover {
          background: rgba(141, 81, 187, 0.12);
          border-color: rgba(141, 81, 187, 0.28);
          color: #6f3d9a;
        }
        .catalog-tag-count {
          font-size: 11px;
          opacity: 0.75;
        }
        .catalog-count {
          margin: 0 0 18px;
          font-size: 14px;
          color: #9688a3;
        }
        .catalog-list {
          display: grid;
          gap: 16px;
        }
        .episode-card {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px 24px;
          background: white;
          border: 1px solid rgba(44, 36, 51, 0.07);
          border-radius: 20px;
          box-shadow: 0 4px 14px rgba(18, 12, 28, 0.04);
          text-decoration: none;
          color: #2c2433;
          transition: all 0.2s ease;
        }
        .episode-cover {
          width: 72px;
          height: 72px;
          border-radius: 16px;
          background: radial-gradient(circle at 30% 20%, rgba(255,132,124,0.12), transparent 40%), linear-gradient(135deg, #161021, #1d1428);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }
        .episode-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .episode-cover-fallback {
          font-size: 24px;
          color: rgba(199, 155, 230, 0.5);
        }
        .episode-content {
          flex: 1;
          min-width: 0;
        }
        .episode-content strong {
          display: block;
          font-size: 18px;
          line-height: 1.3;
          margin-bottom: 6px;
          letter-spacing: -0.01em;
        }
        .episode-content p {
          margin: 0;
          color: #6d6376;
          font-size: 14px;
          line-height: 1.7;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .episode-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
          font-size: 12px;
          color: #9688a3;
        }
        .episode-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .tag-pill {
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(141, 81, 187, 0.06);
          color: #b49cc8;
          font-size: 12px;
        }
        .tag-pill-link {
          cursor: pointer;
        }
        .tag-pill-link:hover {
          background: rgba(141, 81, 187, 0.14);
          color: #8d51bb;
        }
        .episode-arrow {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(141, 81, 187, 0.07);
          color: #8d51bb;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .episode-card:hover {
          border-color: rgba(141, 81, 187, 0.20);
          box-shadow: 0 10px 28px rgba(18, 12, 28, 0.09);
          transform: translateY(-2px);
        }
        .episode-card:hover .episode-arrow {
          background: rgba(141, 81, 187, 0.14);
          transform: translateX(2px);
        }
        .catalog-empty {
          text-align: center;
          padding: 48px 16px;
          color: #6d6376;
        }
        .catalog-empty p {
          margin: 0 0 16px;
          font-size: 16px;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }
        @media (max-width: 600px) {
          .episode-cover { width: 56px; height: 56px; border-radius: 14px; }
          .episode-content strong { font-size: 16px; }
          .episode-card { padding: 16px; gap: 14px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .episode-card, .episode-arrow { transition: none; }
        }
      `}</style>
    </div>
  );
}
