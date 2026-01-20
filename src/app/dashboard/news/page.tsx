'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  TrendingUp,
  Clock,
  RefreshCw,
  Newspaper,
  ThumbsUp,
  Home,
  Sparkles,
  AlertCircle,
  Eye,
  Wand2,
  Upload,
  ChevronDown,
  ChevronUp,
  LogOut,
  Play,
  User,
  Loader2,
} from 'lucide-react';

// Types
interface NewsItem {
  id: string;
  category: string;
  pillar: string;
  rank: number;
  title: string;
  summary: string;
  why_relevant: string;
  source: string;
  link: string;
  published_at: string;
  status: string;
  created_at: string;
  approved_at?: string;
}

interface ContentPost {
  id: string;
  platform: string;
  content_text: string;
  content_image_url: string | null;
  hashtags: string[];
  status: string;
  created_at: string;
}

interface NewsItemEnhanced extends NewsItem {
  content?: ContentPost[];
  showPreview?: boolean;
}

interface Stats {
  today: number;
  approved: number;
  published: number;
}

// UNSIC Brand Colors
const UNSIC_COLORS = {
  primary: '#002e6d',      // Blu primario UNSIC
  accent: '#ffb71b',       // Giallo/Arancione UNSIC
  dark: '#00193d',         // Blu scuro UNSIC
  lightGray: '#efefef',    // Grigio chiaro
  white: '#fafdfd',        // Bianco UNSIC
};

// Category colors adapted to UNSIC brand - White Cards on Dark Background
const categoryStyles: Record<
  string,
  { gradient: string; border: string; badge: string }
> = {
  fisco: {
    gradient: 'from-white/95 to-white/90',
    border: 'border-[#002e6d]',
    badge: 'bg-[#002e6d] text-white border-[#002e6d] font-bold',
  },
  agricoltura: {
    gradient: 'from-white/95 to-white/90',
    border: 'border-green-500',
    badge: 'bg-green-600 text-white border-green-600 font-bold',
  },
  lavoro: {
    gradient: 'from-white/95 to-white/90',
    border: 'border-[#ffb71b]',
    badge: 'bg-[#ffb71b] text-[#00193d] border-[#ffb71b] font-bold',
  },
  pnrr: {
    gradient: 'from-white/95 to-white/90',
    border: 'border-[#002e6d]',
    badge: 'bg-[#002e6d] text-[#ffb71b] border-[#002e6d] font-bold',
  },
  'made in italy': {
    gradient: 'from-white/95 to-white/90',
    border: 'border-[#ffb71b]',
    badge: 'bg-[#ffb71b] text-[#00193d] border-[#ffb71b] font-bold',
  },
  default: {
    gradient: 'from-white/95 to-white/90',
    border: 'border-gray-400',
    badge: 'bg-gray-700 text-white border-gray-700 font-bold',
  },
};

// Skeleton loader component
const SkeletonCard = () => (
  <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-6 space-y-4 animate-pulse border-2 border-white/50 shadow-xl">
    <div className="flex gap-2">
      <div className="h-6 w-20 bg-gray-300 rounded-full" />
      <div className="h-6 w-24 bg-gray-300 rounded-full" />
    </div>
    <div className="h-8 bg-gray-300 rounded w-3/4" />
    <div className="space-y-2">
      <div className="h-4 bg-gray-300 rounded w-full" />
      <div className="h-4 bg-gray-300 rounded w-5/6" />
    </div>
  </div>
);

// Post Preview Component
const PostPreview = ({ post }: { post: ContentPost }) => {
  const platformIcons = {
    facebook: '📘',
    instagram: '📷',
    linkedin: '💼',
  };

  const platformColors = {
    facebook: 'from-blue-50 to-white border-[#002e6d]',
    instagram: 'from-pink-50 to-white border-pink-500',
    linkedin: 'from-blue-50 to-white border-[#002e6d]',
  };

  return (
    <div
      className={`p-4 rounded-xl bg-gradient-to-br ${
        platformColors[post.platform as keyof typeof platformColors] || 'from-gray-50 to-white border-gray-400'
      } border-2 shadow-md transition-all`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{platformIcons[post.platform as keyof typeof platformIcons] || '📱'}</span>
        <span className="font-bold capitalize text-[#00193d]">{post.platform}</span>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
          post.status === 'ready' ? 'bg-green-600 text-white' :
          post.status === 'published' ? 'bg-blue-600 text-white' :
          'bg-yellow-500 text-[#00193d]'
        }`}>
          {post.status}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-[#00193d] font-medium leading-relaxed whitespace-pre-wrap">
          {post.content_text}
        </p>

        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {post.hashtags.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-[#002e6d] text-white border-2 border-[#002e6d] font-bold">
                #{tag.replace('#', '')}
              </span>
            ))}
          </div>
        )}

        {post.content_image_url && (
          <div className="mt-3 rounded-lg overflow-hidden border-2 border-gray-300">
            <img
              src={post.content_image_url}
              alt="Post preview"
              className="w-full h-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface CurrentUser {
  id: string;
  username: string;
  role: string;
  displayName: string;
}

export default function UnsicNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [stats, setStats] = useState<Stats>({ today: 0, approved: 0, published: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [triggeringWorkflow, setTriggeringWorkflow] = useState(false);
  const router = useRouter();

  // Fetch current user
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setCurrentUser(data.user);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // Logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // Trigger UNSIC 1 workflow manually
  const triggerWorkflow = async () => {
    setTriggeringWorkflow(true);
    try {
      const response = await fetch('https://n8n.fodivps1.cloud/webhook/unsic-manual-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered_by: currentUser?.displayName }),
      });

      if (response.ok) {
        toast.success('Workflow avviato!', {
          description: 'La raccolta notizie è in corso. Aggiorna tra qualche minuto.',
        });
      } else {
        throw new Error('Errore nell\'avvio del workflow');
      }
    } catch (error) {
      toast.error('Errore nell\'avvio del workflow');
    } finally {
      setTriggeringWorkflow(false);
    }
  };

  // Fetch news
  const fetchNews = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const response = await fetch('/api/news?status=pending,pending_approval,approved,published,rejected');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Ordina per data decrescente (più recenti prima)
      const sortedNews = (data.news || []).sort((a: NewsItem, b: NewsItem) => {
        const dateA = new Date(a.published_at || a.created_at).getTime();
        const dateB = new Date(b.published_at || b.created_at).getTime();
        return dateB - dateA;
      });
      setNews(sortedNews);

      // Calculate stats
      const today = data.news?.filter((item: NewsItem) => {
        const itemDate = new Date(item.created_at).toDateString();
        const todayDate = new Date().toDateString();
        return itemDate === todayDate;
      }).length || 0;

      setStats({
        today,
        approved: data.news?.length || 0,
        published: 0,
      });
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error('Errore nel caricamento delle notizie');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Approve news - FASE 1: Solo genera contenuti
  const approveNews = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      // Step 1: Update status to 'approved' with approver info
      const updateResponse = await fetch(`/api/news/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          approved_by_id: currentUser?.id
        }),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update status: ${updateResponse.status}`);
      }

      // Step 2: Trigger N8N Content Generator
      const n8nResponse = await fetch('https://n8n.fodivps1.cloud/webhook/news-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news_id: id }),
      });

      if (!n8nResponse.ok) {
        console.warn('N8N webhook failed:', n8nResponse.status);
      }

      const n8nData = await n8nResponse.json().catch(() => ({}));

      // Update news status locally
      setNews((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
      );

      toast.success('Notizia approvata!', {
        description: `${n8nData.content_created || 3} post generati. Vai a "Pubblicazione" per gestirli.`,
        icon: <CheckCircle className="h-5 w-5" />,
        duration: 5000,
      });
    } catch (error) {
      console.error('Error approving news:', error);
      toast.error('Errore nella generazione dei contenuti', {
        description: error instanceof Error ? error.message : 'Riprova più tardi',
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Reject news
  const rejectNews = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      const response = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setNews((prev) => prev.filter((item) => item.id !== id));
      setStats((prev) => ({ ...prev, approved: prev.approved - 1 }));

      toast.success('Notizia scartata', {
        description: 'La notizia è stata rimossa dalla coda',
        icon: <XCircle className="h-5 w-5" />,
      });
    } catch (error) {
      console.error('Error rejecting news:', error);
      toast.error('Errore nella rimozione della notizia');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNews();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNews(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Get category style
  const getCategoryStyle = (category: string) => {
    return categoryStyles[category.toLowerCase()] || categoryStyles.default;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00193d] via-[#001b42] to-[#002442] p-6">
        <div className="container mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-10 w-64 bg-white/30 rounded-lg animate-pulse" />
              <div className="h-4 w-96 bg-white/20 rounded animate-pulse" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-white/90 backdrop-blur-sm p-6 animate-pulse border-2 border-white/50 shadow-xl">
                <div className="h-4 w-24 bg-gray-300 rounded mb-4" />
                <div className="h-8 w-16 bg-gray-300 rounded" />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00193d] via-[#001b42] to-[#002442]">
      <div className="container mx-auto max-w-7xl p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2 rounded-lg bg-white/95 hover:bg-white transition-colors border-2 border-[#ffb71b] shadow-lg backdrop-blur-sm"
              >
                <Home className="h-5 w-5 text-[#002e6d]" />
              </Link>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#ffb71b] via-white to-white bg-clip-text text-transparent">
                UNSIC News Dashboard
              </h1>
            </div>
            <p className="text-white/90 text-lg font-semibold">
              Gestisci, visualizza anteprime e pubblica le notizie sui social
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* User Info */}
            {currentUser && (
              <div className="flex items-center gap-2 text-sm text-white bg-[#002e6d]/80 px-4 py-2 rounded-lg border-2 border-white/30 shadow-lg backdrop-blur-sm font-bold">
                <User className="h-4 w-4" />
                <span>{currentUser.displayName}</span>
              </div>
            )}

            {refreshing && (
              <div className="flex items-center gap-2 text-sm text-white bg-[#002e6d]/80 px-4 py-2 rounded-lg border-2 border-[#ffb71b] shadow-lg backdrop-blur-sm font-bold">
                <div className="h-2 w-2 bg-[#ffb71b] rounded-full animate-pulse" />
                <span>Aggiornamento...</span>
              </div>
            )}

            {/* Trigger Manual Button */}
            <button
              onClick={triggerWorkflow}
              disabled={triggeringWorkflow}
              className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors border-2 border-green-500 shadow-lg backdrop-blur-sm disabled:opacity-50 font-bold text-white"
              title="Avvia raccolta notizie manualmente"
            >
              {triggeringWorkflow ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              Raccogli News
            </button>

            <button
              onClick={() => fetchNews(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-3 bg-white/95 rounded-lg hover:bg-white transition-colors border-2 border-[#ffb71b] shadow-lg backdrop-blur-sm disabled:opacity-50 font-bold text-[#002e6d]"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              Aggiorna
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors border-2 border-red-500 shadow-lg backdrop-blur-sm font-bold text-white"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white/95 backdrop-blur-sm p-6 border-2 border-[#ffb71b] hover:border-white transition-all shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#002e6d] mb-1 uppercase tracking-wide">Notizie Oggi</p>
                <p className="text-5xl font-bold text-[#ffb71b]">{stats.today}</p>
                <p className="text-xs text-gray-700 mt-2 font-semibold">Raccolte nelle ultime 24h</p>
              </div>
              <div className="p-4 rounded-xl bg-[#ffb71b] border-2 border-[#ffb71b] shadow-md">
                <Newspaper className="h-8 w-8 text-[#00193d]" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/95 backdrop-blur-sm p-6 border-2 border-[#002e6d] hover:border-[#ffb71b] transition-all shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#002e6d] mb-1 uppercase tracking-wide">In Attesa</p>
                <p className="text-5xl font-bold text-[#002e6d]">{stats.approved}</p>
                <p className="text-xs text-gray-700 mt-2 font-semibold">Da approvare</p>
              </div>
              <div className="p-4 rounded-xl bg-[#002e6d] border-2 border-[#002e6d] shadow-md">
                <Clock className="h-8 w-8 text-[#ffb71b]" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/95 backdrop-blur-sm p-6 border-2 border-green-500 hover:border-green-400 transition-all shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#002e6d] mb-1 uppercase tracking-wide">Pubblicate Oggi</p>
                <p className="text-5xl font-bold text-green-600">{stats.published}</p>
                <p className="text-xs text-gray-700 mt-2 font-semibold">Inviate ai canali</p>
              </div>
              <div className="p-4 rounded-xl bg-green-600 border-2 border-green-600 shadow-md">
                <ThumbsUp className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* News List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-white">
              Notizie in Attesa
              <span className="ml-3 text-lg px-4 py-2 rounded-full bg-[#ffb71b] text-[#00193d] border-2 border-[#ffb71b] font-bold shadow-md">
                {news.length}
              </span>
            </h2>
          </div>

          {news.length === 0 ? (
            <div className="rounded-2xl bg-white/95 backdrop-blur-sm p-12 text-center border-2 border-white/50 shadow-xl">
              <div className="inline-flex p-6 rounded-2xl bg-gray-100 border-2 border-gray-300 mb-6">
                <Sparkles className="h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-[#00193d] mb-2">
                Tutto apposto!
              </h3>
              <p className="text-gray-700 max-w-md mx-auto font-medium">
                Non ci sono notizie in attesa. Tutte le notizie sono state processate.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {news.map((item) => {
                const categoryStyle = getCategoryStyle(item.category);
                const isProcessing = processingIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl bg-gradient-to-br ${categoryStyle.gradient} backdrop-blur-sm border-2 ${categoryStyle.border} hover:border-[#ffb71b] transition-all shadow-xl ${
                      isProcessing ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <div className="p-6 space-y-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-3 py-1.5 rounded-full text-xs border-2 ${categoryStyle.badge}`}>
                            {item.category}
                          </span>
                          <span className="px-3 py-1.5 rounded-full text-xs bg-gray-100 text-[#00193d] border-2 border-gray-400 font-bold">
                            {item.pillar}
                          </span>
                          <span className="px-3 py-1.5 rounded-full text-xs bg-gray-100 text-[#00193d] border-2 border-gray-400 flex items-center gap-1 font-bold">
                            <TrendingUp className="h-3 w-3" />
                            Rank {item.rank}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-1 font-semibold">
                          <Clock className="h-4 w-4" />
                          {new Date(item.published_at).toLocaleString('it-IT', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      {/* Title */}
                      <div>
                        <h3 className="text-2xl font-bold text-[#00193d] leading-tight">
                          {item.title}
                        </h3>
                      </div>

                      {/* Summary */}
                      <div className="space-y-3">
                        <p className="text-[#00193d] leading-relaxed font-medium">{item.summary}</p>
                        <div className="p-4 rounded-xl bg-blue-50 border-2 border-[#002e6d] shadow-md">
                          <div className="flex items-start gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-[#ffb71b] mt-0.5 flex-shrink-0" />
                            <p className="text-xs font-bold text-[#002e6d] uppercase tracking-wide">
                              Perché è rilevante
                            </p>
                          </div>
                          <p className="text-sm text-[#00193d] leading-relaxed font-medium">
                            {item.why_relevant}
                          </p>
                        </div>
                      </div>

                      {/* Source */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-700 font-bold">Fonte:</span>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#002e6d] hover:text-[#ffb71b] hover:underline flex items-center gap-1.5 font-bold transition-colors"
                        >
                          {item.source}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-700 font-bold">Status:</span>
                        <span
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${
                            item.status === 'approved'
                              ? 'bg-green-600 text-white border-green-600'
                              : item.status === 'published'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : item.status === 'rejected'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-[#ffb71b] text-[#00193d] border-[#ffb71b]'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      {/* Actions - FASE 1: Solo Approva */}
                      <div className="flex flex-col gap-3 pt-2">
                        {item.status === 'pending' || item.status === 'pending_approval' ? (
                          <button
                            onClick={() => approveNews(item.id)}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#ffb71b] hover:bg-[#e5a616] text-[#00193d] border-2 border-[#ffb71b] hover:border-[#002e6d] font-bold transition-all disabled:opacity-50 shadow-lg"
                          >
                            {isProcessing ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <CheckCircle className="h-5 w-5" />
                            )}
                            {isProcessing ? 'Generazione in corso...' : 'Approva e Genera Contenuti'}
                          </button>
                        ) : item.status === 'approved' ? (
                          <div className="text-center text-green-600 text-sm py-4 font-bold bg-green-50 rounded-xl border-2 border-green-200">
                            ✅ Approvata - Contenuti in generazione
                          </div>
                        ) : (
                          <div className="text-center text-gray-600 text-sm py-4 font-bold">
                            {item.status === 'published' ? '✅ Pubblicata' : '❌ Scartata'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
