'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Mail, Lock, User, Activity, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import { useToast } from '@/src/components/Toast';

type SignupResponse = {
  user?: { id: string; email: string; fullName: string };
  token?: string;
  data?: {
    user?: { id: string; email: string; fullName: string };
    token?: string;
  };
};

interface SignupProps {
  onBackToLogin: () => void;
}

export function Signup({ onBackToLogin }: SignupProps) {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast('Preencha todos os campos', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<SignupResponse>('/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName }),
      });

      const payload = res?.data ?? res;
      const user = payload?.user;
      const token = payload?.token;

      if (user && token) {
        login(user, token);
        toast('Conta criada com sucesso', 'success');
        return;
      } else {
        throw new Error('Signup response is missing user or token');
      }
    } catch (error: any) {
      toast(error?.message || 'Falha no cadastro', 'error');
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
        <div className="flex flex-col items-center mb-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 shadow-xl shadow-primary/10 border border-primary/20">
            <UserPlus className="size-8" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase text-highlight">
            Cadastro
          </h1>
          <p className="text-text-dim text-xs font-bold uppercase tracking-[0.3em] mt-2">
            Crie sua conta no Kairos
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bento-card space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="label-caps px-1">Nome Completo</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-text-dim group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-all placeholder:text-text-dim/50"
                  placeholder="Seu nome"
                  required
                />
              </div>
            </div>

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
                  onChange={(e) => setPassword(e.target.value)}
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
                Cadastrar
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-[10px] text-text-dim uppercase tracking-widest font-bold hover:text-primary transition-colors cursor-pointer flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft className="size-3" />
              Já tem uma conta? Entrar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
