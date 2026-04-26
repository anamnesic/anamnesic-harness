'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, Activity, ArrowRight, Loader2 } from 'lucide-react';
import { apiFetch } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/components/Toast';

type LoginResponse = {
  user?: { id: string; email: string; fullName: string };
  token?: string;
  data?: {
    user?: { id: string; email: string; fullName: string };
    token?: string;
  };
};

export function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const quickEmail = 'system@kairos.local';
  const quickSenha = 'kairos2026';
  const [email, setEmail] = useState('');
  const [password, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const authenticate = async (loginEmail: string, loginSenha: string) => {
    const res = await apiFetch<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: loginEmail, password: loginSenha }),
    });

    const payload = res?.data ?? res;
    const user = payload?.user;
    const token = payload?.token;

    if (user && token) {
      login(user, token);
      toast('Login realizado com sucesso', 'success');
      return;
    }

    throw new Error('Login response is missing user or token');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast('Preencha todos os campos', 'error');
      return;
    }

    setLoading(true);
    try {
      await authenticate(email, password);
    } catch (error: any) {
      toast(error?.message || 'Falha no login', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-1/2 -right-1/4 w-full h-full bg-accent/20 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 shadow-xl shadow-primary/10 border border-primary/20">
            <Activity className="size-8" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase text-highlight">
            Kairos
          </h1>
          <p className="text-text-dim text-xs font-bold uppercase tracking-[0.3em] mt-2">
            Orquestração de IA Proativa
          </p>
        </div>

        <form id="kairos-login-form" onSubmit={handleSubmit} className="bento-card space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="label-caps px-1">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-text-dim group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-all placeholder:text-text-dim/50"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="label-caps px-1">Senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-text-dim group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-all placeholder:text-text-dim/50"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                Entrar
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setEmail(quickEmail);
                setSenha(quickSenha);
                setLoading(true);
                try {
                  await authenticate(quickEmail, quickSenha);
                } catch (error: any) {
                  toast(error?.message || 'Falha no login', 'error');
                } finally {
                  setLoading(false);
                }
              }}
              className="text-[10px] text-text-dim uppercase tracking-widest font-bold hover:text-primary transition-colors cursor-pointer"
            >
              Login rápido <span className="text-accent">{quickEmail}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
