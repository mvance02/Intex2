import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Eye, ExternalLink } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import type { PaginatedResponse, SocialMediaPost } from '../../types/models';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import EmptyState from '../../components/shared/EmptyState';

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'bg-pink-100 text-pink-700',
  Facebook:  'bg-blue-100 text-blue-700',
  Twitter:   'bg-sky-100 text-sky-700',
  YouTube:   'bg-red-100 text-red-700',
  TikTok:    'bg-gray-100 text-gray-700',
};

const PLATFORM_CARD_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  Instagram: { bg: 'bg-pink-50', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-700', text: 'text-pink-700' },
  Facebook:  { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-700' },
  Twitter:   { bg: 'bg-sky-50',  border: 'border-sky-200',  badge: 'bg-sky-100 text-sky-700',   text: 'text-sky-700'  },
  YouTube:   { bg: 'bg-red-50',  border: 'border-red-200',  badge: 'bg-red-100 text-red-700',   text: 'text-red-700'  },
  TikTok:    { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700', text: 'text-gray-700' },
};

const PLATFORMS = ['Instagram', 'Facebook', 'Twitter', 'YouTube', 'TikTok'] as const;

interface PlatformStats {
  platform: string;
  postCount: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagementRate: number;
  bestPostLikes: number;
  bestPostCaption: string | null;
  totalReach: number;
  totalImpressions: number;
}

function computePlatformStats(posts: SocialMediaPost[]): PlatformStats[] {
  return PLATFORMS.map(platform => {
    const platformPosts = posts.filter(p => p.platform === platform);
    const postCount = platformPosts.length;
    const totalLikes = platformPosts.reduce((sum, p) => sum + (p.likes ?? 0), 0);
    const totalComments = platformPosts.reduce((sum, p) => sum + (p.comments ?? 0), 0);
    const totalShares = platformPosts.reduce((sum, p) => sum + (p.shares ?? 0), 0);
    const totalImpressions = platformPosts.reduce((sum, p) => sum + (p.impressions ?? 0), 0);
    const totalReach = platformPosts.reduce((sum, p) => sum + (p.reach ?? 0), 0);

    const avgEngagementRate =
      postCount > 0
        ? platformPosts.reduce((sum, p) => sum + (p.engagementRate ?? 0), 0) / postCount
        : 0;

    const bestPost = platformPosts.reduce<SocialMediaPost | null>((best, p) => {
      if (best === null) return p;
      return (p.likes ?? 0) > (best.likes ?? 0) ? p : best;
    }, null);

    return {
      platform,
      postCount,
      totalLikes,
      totalComments,
      totalShares,
      avgEngagementRate,
      bestPostLikes: bestPost?.likes ?? 0,
      bestPostCaption: bestPost?.caption ?? null,
      totalReach,
      totalImpressions,
    };
  });
}

function PlatformAnalyticsCard({ stats }: { stats: PlatformStats }) {
  const colors = PLATFORM_CARD_COLORS[stats.platform] ?? {
    bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700', text: 'text-gray-700',
  };

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-2xl p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colors.badge}`}>
          {stats.platform}
        </span>
        <span className="text-xs text-gray-400">{stats.postCount} posts</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="flex flex-col">
          <span className={`text-base font-bold ${colors.text}`}>{stats.totalLikes.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400">Likes</span>
        </div>
        <div className="flex flex-col">
          <span className={`text-base font-bold ${colors.text}`}>{stats.totalComments.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400">Comments</span>
        </div>
        <div className="flex flex-col">
          <span className={`text-base font-bold ${colors.text}`}>{stats.totalShares.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400">Shares</span>
        </div>
        <div className="flex flex-col">
          <span className={`text-base font-bold ${colors.text}`}>
            {stats.avgEngagementRate > 0 ? `${stats.avgEngagementRate.toFixed(1)}%` : '—'}
          </span>
          <span className="text-[10px] text-gray-400">Avg. Engagement</span>
        </div>
      </div>

      {stats.bestPostLikes > 0 && (
        <div className="border-t border-gray-200 pt-2">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Best Post</p>
          <p className="text-xs text-gray-600 line-clamp-2">
            {stats.bestPostCaption ?? '—'}
          </p>
          <p className={`text-xs font-semibold mt-0.5 ${colors.text}`}>
            {stats.bestPostLikes.toLocaleString()} likes
          </p>
        </div>
      )}

      {stats.postCount === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">No posts yet</p>
      )}
    </div>
  );
}

function PostCard({ post }: { post: SocialMediaPost }) {
  const platformColor = PLATFORM_COLORS[post.platform ?? ''] ?? 'bg-gray-100 text-gray-600';

  return (
    <article className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${platformColor}`}>
          {post.platform ?? 'Unknown'}
        </span>
        <div className="flex items-center gap-2">
          {post.campaignName && (
            <span className="text-xs text-gray-400">{post.campaignName}</span>
          )}
          {post.postUrl && (
            <a
              href={post.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-teal-600 transition-colors"
              aria-label="View original post"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {post.caption && (
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">{post.caption}</p>
      )}

      {post.contentTopic && (
        <p className="text-xs text-teal-600 font-medium">{post.contentTopic}</p>
      )}

      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-50 text-center">
        <Metric icon={<Heart size={13} />} value={post.likes} label="Likes" />
        <Metric icon={<MessageCircle size={13} />} value={post.comments} label="Comments" />
        <Metric icon={<Share2 size={13} />} value={post.shares} label="Shares" />
        <Metric icon={<Eye size={13} />} value={post.impressions} label="Impressions" />
      </div>

      {post.createdAt && (
        <p className="text-xs text-gray-400">
          {new Date(post.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
      )}
    </article>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: number | null; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-gray-400">{icon}</span>
      <span className="text-xs font-semibold text-gray-700">
        {value != null ? value.toLocaleString() : '—'}
      </span>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  );
}

export default function SocialMediaPage() {
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [allPosts, setAllPosts] = useState<SocialMediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch all posts once for analytics
  useEffect(() => {
    setAnalyticsLoading(true);
    apiFetch<PaginatedResponse<SocialMediaPost>>('/api/socialmediaposts?page=1&pageSize=1000')
      .then(data => setAllPosts(data.items))
      .catch(() => setAllPosts([]))
      .finally(() => setAnalyticsLoading(false));
  }, []);

  // Paginated fetch for the post grid
  useEffect(() => {
    document.title = 'Social Media — Hope Haven';
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: '12' });
    if (platform) params.set('platform', platform);
    apiFetch<PaginatedResponse<SocialMediaPost>>(`/api/socialmediaposts?${params}`)
      .then(data => {
        setPosts(data.items);
        setTotalPages(data.totalPages);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, platform]);

  const platformStats = computePlatformStats(allPosts);
  const totalReach = platformStats.reduce((sum, s) => sum + s.totalReach, 0);
  const totalImpressions = platformStats.reduce((sum, s) => sum + s.totalImpressions, 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Social Media Outreach</h1>
        <p className="text-gray-500">
          Follow our campaigns and help us spread awareness about the work we do to protect and restore the lives of survivors.
        </p>
      </div>

      {/* Platform Analytics Section */}
      {!analyticsLoading && allPosts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Platform Analytics</h2>

          {/* Total Reach & Impressions summary bar */}
          <div className="flex gap-4 flex-wrap mb-5">
            <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-5 py-3">
              <Eye size={18} className="text-teal-600" />
              <div>
                <p className="text-[10px] font-medium text-teal-600 uppercase tracking-wide">Total Reach</p>
                <p className="text-lg font-bold text-teal-700">
                  {totalReach > 0 ? totalReach.toLocaleString() : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3">
              <Share2 size={18} className="text-indigo-600" />
              <div>
                <p className="text-[10px] font-medium text-indigo-600 uppercase tracking-wide">Total Impressions</p>
                <p className="text-lg font-bold text-indigo-700">
                  {totalImpressions > 0 ? totalImpressions.toLocaleString() : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Per-platform cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {platformStats.map(stats => (
              <PlatformAnalyticsCard key={stats.platform} stats={stats} />
            ))}
          </div>
        </section>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-8">
        {['', 'Instagram', 'Facebook', 'Twitter', 'YouTube', 'TikTok'].map(p => (
          <button
            key={p}
            onClick={() => { setPlatform(p); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              platform === p
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p || 'All Platforms'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" label="Loading posts…" />
        </div>
      )}

      {error && <ErrorAlert message={error} />}

      {!loading && !error && posts.length === 0 && (
        <EmptyState title="No posts found" message="Try a different platform filter." />
      )}

      {!loading && !error && posts.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map(post => <PostCard key={post.postId} post={post} />)}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
