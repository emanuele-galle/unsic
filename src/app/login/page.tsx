'use client';

/* eslint-disable react-perf/jsx-no-new-function-as-prop */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LogIn, Lock, User, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante il login');
      }

      toast.success(`Benvenuto, ${data.user.displayName}!`);

      // Redirect based on role
      if (data.user.role === 'sviluppatore') {
        router.push('/dashboard/content');
      } else {
        router.push('/dashboard/news');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00193d] via-[#001b42] to-[#002442] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#ffb71b] mb-4 shadow-xl">
            <span className="text-3xl font-bold text-[#00193d]">U</span>
          </div>
          <h1 className="text-3xl font-bold text-white">UNSIC News</h1>
          <p className="text-white/70 mt-2">Dashboard di gestione notizie</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border-2 border-white/50">
          <h2 className="text-2xl font-bold text-[#00193d] mb-6 text-center">
            Accedi
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#002e6d] mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ffb71b] focus:outline-none transition-colors text-[#00193d] font-medium"
                  placeholder="Inserisci username"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#002e6d] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#ffb71b] focus:outline-none transition-colors text-[#00193d] font-medium"
                  placeholder="Inserisci password"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#ffb71b] hover:bg-[#e5a616] text-[#00193d] font-bold transition-all disabled:opacity-50 shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Accesso in corso...
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Accedi
              </>
            )}
          </button>
        </form>

        <p className="text-center text-white/50 text-sm mt-6">
          UNSIC News Management System
        </p>
      </div>
    </div>
  );
}
