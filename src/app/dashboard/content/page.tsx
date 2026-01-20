'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Home,
  Wand2,
  Upload,
  RefreshCw,
  Eye,
  ExternalLink,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  UserCheck,
  LogOut,
  ImagePlus,
  Send,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';

// Types
interface ContentPost {
  id: string;
  news_id: string;
  platform: string;
  content_text: string;
  content_image_url: string | null;
  hashtags: string[];
  status: string;
  created_at: string;
  news: {
    title: string;
    category: string;
    pillar: string;
    approved_at: string | null;
    approved_by: {
      display_name: string;
      role: string;
    } | null;
  };
}

interface GroupedContent {
  news_id: string;
  news_title: string;
  category: string;
  pillar: string;
  posts: ContentPost[];
  approved_at: string | null;
  approved_by: {
    display_name: string;
    role: string;
  } | null;
}

// UNSIC Brand Colors
const UNSIC_COLORS = {
  primary: '#002e6d',
  accent: '#ffb71b',
  dark: '#00193d',
  lightGray: '#efefef',
  white: '#fafdfd',
};

// Post Preview Component
const PostPreview = ({ post }: { post: ContentPost }) => {
  const platformIcons: Record<string, string> = {
    facebook: '📘',
    instagram: '📷',
    linkedin: '💼',
  };

  const platformColors: Record<string, string> = {
    facebook: 'border-[#1877f2] bg-[#1877f2]/5',
    instagram: 'border-pink-500 bg-pink-500/5',
    linkedin: 'border-[#0077b5] bg-[#0077b5]/5',
  };

  return (
    <div
      className={`p-4 rounded-xl bg-white ${
        platformColors[post.platform] || 'border-gray-300 bg-gray-50'
      } border-2 shadow-md`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{platformIcons[post.platform] || '📱'}</span>
          <span className="font-bold capitalize text-[#00193d]">{post.platform}</span>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            post.status === 'ready'
              ? 'bg-green-100 text-green-700 border border-green-300'
              : post.status === 'published'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
          }`}
        >
          {post.status}
        </span>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-[#00193d] leading-relaxed font-medium whitespace-pre-wrap">
          {post.content_text}
        </p>

        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {post.hashtags.map((tag, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 rounded-full bg-[#002e6d] text-white font-semibold"
              >
                #{tag.replace('#', '')}
              </span>
            ))}
          </div>
        )}

        {post.content_image_url && (
          <div className="mt-3 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
            <img src={post.content_image_url} alt="Post preview" className="w-full h-auto" />
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

export default function ContentPublishPage() {
  const [groupedContent, setGroupedContent] = useState<GroupedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [generatingImageIds, setGeneratingImageIds] = useState<Set<string>>(new Set());
  const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const router = useRouter();

  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setCurrentUser(data.user);
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Logout effettuato');
      router.push('/login');
    } catch (error) {
      toast.error('Errore durante il logout');
    }
  };

  // Fetch content ready to publish
  const fetchContent = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const response = await fetch('/api/content?status=ready');
      if (!response.ok) throw new Error('Failed to fetch content');

      const data = await response.json();

      // Group by news_id
      const grouped: Record<string, GroupedContent> = {};
      data.content.forEach((post: ContentPost) => {
        if (!grouped[post.news_id]) {
          grouped[post.news_id] = {
            news_id: post.news_id,
            news_title: post.news.title,
            category: post.news.category,
            pillar: post.news.pillar,
            posts: [],
            approved_at: post.news.approved_at,
            approved_by: post.news.approved_by,
          };
        }
        grouped[post.news_id].posts.push(post);
      });

      setGroupedContent(Object.values(grouped));
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Errore nel caricamento dei contenuti');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 1. CREA IMMAGINE - Generate images with NanoBanana
  const generateImages = async (newsId: string) => {
    setGeneratingImageIds((prev) => new Set(prev).add(newsId));
    try {
      toast.info('Generazione immagini in corso...', {
        description: 'NanoBanana sta creando le grafiche per ogni piattaforma',
        duration: 5000,
      });

      const response = await fetch('/api/content/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news_id: newsId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate images');
      }

      toast.success('Immagini generate con successo!', {
        description: `${data.generated || 0} immagini create per le piattaforme social`,
        icon: <ImageIcon className="h-5 w-5" />,
      });

      // Refresh list to show new images
      fetchContent(true);
    } catch (error: any) {
      console.error('Error generating images:', error);
      toast.error('Errore nella generazione immagini', {
        description: error.message || 'Riprova più tardi',
      });
    } finally {
      setGeneratingImageIds((prev) => {
        const next = new Set(prev);
        next.delete(newsId);
        return next;
      });
    }
  };

  // 2. PUBBLICAZIONE AUTOMATICA - Publish to social channels
  const publishAutomatic = async (newsId: string) => {
    setPublishingIds((prev) => new Set(prev).add(newsId));
    try {
      toast.info('Pubblicazione automatica in corso...', {
        description: 'Invio ai canali social collegati...',
        duration: 5000,
      });

      const response = await fetch('/api/content/auto-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news_id: newsId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish');
      }

      toast.success('Pubblicazione completata!', {
        description: `${data.published || 0} post pubblicati sui social`,
        icon: <Send className="h-5 w-5" />,
      });

      // Refresh list
      fetchContent(true);
    } catch (error: any) {
      console.error('Error publishing automatically:', error);
      toast.error('Errore nella pubblicazione automatica', {
        description: error.message || 'Riprova più tardi',
      });
    } finally {
      setPublishingIds((prev) => {
        const next = new Set(prev);
        next.delete(newsId);
        return next;
      });
    }
  };

  // 3. PUBBLICAZIONE MANUALE - Just mark as published
  const publishManual = async (newsId: string) => {
    setProcessingIds((prev) => new Set(prev).add(newsId));
    try {
      const response = await fetch('/api/content/manual-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news_id: newsId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark as published');
      }

      toast.success('Contenuti marcati come pubblicati!', {
        description: 'L\'operatore si occuperà della pubblicazione manuale',
        icon: <CheckCircle className="h-5 w-5" />,
      });

      // Refresh list
      fetchContent(true);
    } catch (error: any) {
      console.error('Error marking as published:', error);
      toast.error('Errore nell\'aggiornamento', {
        description: error.message || 'Riprova più tardi',
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(newsId);
        return next;
      });
    }
  };

  // Check if group has images
  const hasImages = (group: GroupedContent) => {
    return group.posts.some(post => post.content_image_url);
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchContent();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchContent(true), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00193d] via-[#001b42] to-[#002442] p-6">
        <div className="container mx-auto max-w-7xl space-y-6">
          <div className="h-16 bg-white/30 rounded-xl animate-pulse" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/90 backdrop-blur-sm rounded-xl p-6 h-64 animate-pulse border-2 border-white/50 shadow-xl" />
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
                className="p-2 rounded-xl bg-white/95 hover:bg-white border-2 border-[#ffb71b] hover:border-white transition-all shadow-lg backdrop-blur-sm"
              >
                <Home className="h-5 w-5 text-[#002e6d]" />
              </Link>
              <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-[#ffb71b] via-white to-white bg-clip-text text-transparent">
                FASE 2: Pubblicazione Contenuti
              </h1>
            </div>
            <p className="text-white/90 text-lg font-semibold">
              Gestisci e pubblica i contenuti approvati
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* User Info */}
            {currentUser && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-xl border-2 border-white/50 shadow-lg">
                <div className="w-8 h-8 rounded-full bg-[#002e6d] flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {currentUser.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-[#00193d]">{currentUser.displayName}</p>
                  <p className="text-xs text-gray-600 capitalize">{currentUser.role}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => fetchContent(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-6 py-3 bg-white/95 hover:bg-white border-2 border-[#ffb71b] hover:border-white rounded-xl transition-all font-bold text-[#002e6d] shadow-lg backdrop-blur-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              Aggiorna
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 border-2 border-red-500 hover:border-red-600 rounded-xl transition-all font-bold text-white shadow-lg"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 border-2 border-[#ffb71b] shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#002e6d] uppercase tracking-wide mb-1">
                Contenuti Pronti
              </p>
              <p className="text-4xl font-bold text-[#ffb71b]">{groupedContent.length}</p>
              <p className="text-sm text-gray-700 mt-1 font-semibold">
                Notizie con contenuti da pubblicare
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#ffb71b] border-2 border-[#ffb71b] shadow-lg">
              <Sparkles className="h-10 w-10 text-[#00193d]" />
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="space-y-6">
          {groupedContent.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-12 text-center border-2 border-white/50 shadow-xl">
              <div className="inline-flex p-6 rounded-2xl bg-gray-100 border-2 border-gray-300 mb-6">
                <Eye className="h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-[#00193d] mb-2">
                Nessun contenuto da pubblicare
              </h3>
              <p className="text-gray-700 font-semibold">
                Approva delle notizie dalla Fase 1 per generare contenuti
              </p>
              <Link
                href="/dashboard/news"
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#002e6d] hover:bg-[#00193d] text-white border-2 border-[#002e6d] hover:border-[#ffb71b] font-bold transition-all shadow-lg"
              >
                <ArrowLeft className="h-5 w-5" />
                Vai a Selezione Notizie
              </Link>
            </div>
          ) : (
            groupedContent.map((group) => {
              const isProcessing = processingIds.has(group.news_id);

              return (
                <div
                  key={group.news_id}
                  className={`bg-white/95 backdrop-blur-sm rounded-2xl p-6 border-2 border-[#002e6d] hover:border-[#ffb71b] transition-all shadow-xl ${
                    isProcessing ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {/* Header */}
                  <div className="mb-6 pb-4 border-b-2 border-gray-200">
                    <h2 className="text-2xl font-bold text-[#00193d] mb-2">{group.news_title}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#002e6d] text-[#ffb71b] border-2 border-[#002e6d]">
                        {group.category}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-[#00193d] border-2 border-gray-400">
                        {group.pillar}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white border-2 border-green-500">
                        {group.posts.length} post pronti
                      </span>
                      {group.approved_by && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border-2 border-purple-300">
                          <UserCheck className="h-3.5 w-3.5" />
                          Approvato da {group.approved_by.display_name}
                          {group.approved_at && (
                            <span className="text-purple-600">
                              ({new Date(group.approved_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Posts Grid */}
                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                    {group.posts.map((post) => (
                      <PostPreview key={post.id} post={post} />
                    ))}
                  </div>

                  {/* Actions - FASE 2 - 3 Pulsanti */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t-2 border-gray-200">
                    {/* 1. CREA IMMAGINE - NanoBanana */}
                    <button
                      onClick={() => generateImages(group.news_id)}
                      disabled={isProcessing || generatingImageIds.has(group.news_id)}
                      className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 font-bold transition-all disabled:opacity-50 shadow-lg ${
                        hasImages(group)
                          ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-400 hover:border-green-600'
                          : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-400 hover:border-purple-600'
                      }`}
                    >
                      {generatingImageIds.has(group.news_id) ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : hasImages(group) ? (
                        <ImageIcon className="h-5 w-5" />
                      ) : (
                        <ImagePlus className="h-5 w-5" />
                      )}
                      <div className="text-left">
                        <div className="text-sm">{hasImages(group) ? 'Rigenera' : 'Crea'} Immagine</div>
                        <div className="text-xs opacity-70">NanoBanana AI</div>
                      </div>
                    </button>

                    {/* 2. PUBBLICAZIONE AUTOMATICA - Social Channels */}
                    <button
                      onClick={() => publishAutomatic(group.news_id)}
                      disabled={isProcessing || publishingIds.has(group.news_id)}
                      className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-[#ffb71b] hover:bg-[#e5a616] text-[#00193d] border-2 border-[#ffb71b] hover:border-[#002e6d] font-bold transition-all disabled:opacity-50 shadow-lg"
                    >
                      {publishingIds.has(group.news_id) ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                      <div className="text-left">
                        <div className="text-sm">Pubblica Auto</div>
                        <div className="text-xs opacity-70">
                          {hasImages(group) ? 'Img + Testo' : 'Solo Testo'}
                        </div>
                      </div>
                    </button>

                    {/* 3. PUBBLICAZIONE MANUALE - Solo status */}
                    <button
                      onClick={() => publishManual(group.news_id)}
                      disabled={isProcessing}
                      className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-[#002e6d] hover:bg-[#00193d] text-white border-2 border-[#002e6d] hover:border-[#ffb71b] font-bold transition-all disabled:opacity-50 shadow-lg"
                    >
                      {processingIds.has(group.news_id) ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle className="h-5 w-5" />
                      )}
                      <div className="text-left">
                        <div className="text-sm">Pubblica Manuale</div>
                        <div className="text-xs opacity-70">Operatore umano</div>
                      </div>
                    </button>
                  </div>

                  {/* Info Box */}
                  <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-200 shadow-sm">
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                      <div className="flex items-start gap-1.5">
                        <ImagePlus className="h-3.5 w-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Crea Immagine:</strong> Genera grafiche AI ottimizzate per ogni piattaforma</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <Send className="h-3.5 w-3.5 text-[#ffb71b] mt-0.5 flex-shrink-0" />
                        <span><strong>Pubblica Auto:</strong> Invia automaticamente ai social collegati</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-[#002e6d] mt-0.5 flex-shrink-0" />
                        <span><strong>Pubblica Manuale:</strong> Segna come pubblicato (operatore pubblica)</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
