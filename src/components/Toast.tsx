'use client';

import {
    createContext,
    useContext,
    useState,
    useCallback,
    type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CircleCheck, CircleAlert, Info, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastCtx {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => { } });

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const dismiss = (id: string) =>
        setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-28 right-4 z-[100] flex flex-col gap-2 w-72 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: 60 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 60 }}
                            className={cn(
                                'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium',
                                t.type === 'success' && 'bg-card border-green-500/30 text-green-400',
                                t.type === 'error' && 'bg-card border-red-500/30 text-red-400',
                                t.type === 'info' && 'bg-card border-border text-accent',
                            )}
                        >
                            {t.type === 'success' && <CircleCheck className="size-4 shrink-0" />}
                            {t.type === 'error' && <CircleAlert className="size-4 shrink-0" />}
                            {t.type === 'info' && <Info className="size-4 shrink-0" />}
                            <span className="flex-1">{t.message}</span>
                            <button onClick={() => dismiss(t.id)} className="opacity-50 hover:opacity-100">
                                <X className="size-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
