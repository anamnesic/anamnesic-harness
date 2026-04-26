'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, Bot, Shield, Zap, X, ChevronRight, LayoutDashboard } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export function OnboardingModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem('kairos-onboarding-seen');
        if (!hasSeenOnboarding) {
            setIsOpen(true);
        }
    }, []);

    const closeOnboarding = () => {
        localStorage.setItem('kairos-onboarding-seen', 'true');
        setIsOpen(false);
    };

    const steps = [
        {
            title: 'Welcome to KAIROS',
            description: 'Your proactive AI orchestration platform. Kairos autonomously plans, executes, and monitors complex workflows.',
            icon: Rocket,
            color: 'text-primary',
        },
        {
            title: 'Autonomous Agents',
            description: 'Create specialized agents with reasoning capabilities to handle research, coding, and analysis tasks.',
            icon: Bot,
            color: 'text-accent',
        },
        {
            title: 'Safety & Security',
            description: 'Built-in AI security scanning and policy enforcement. Every sensitive operation is audited and requires approval.',
            icon: Shield,
            color: 'text-green-400',
        },
        {
            title: 'Ready to Start?',
            description: 'Begin by creating your first workspace and assigning tasks to your new AI team.',
            icon: Zap,
            color: 'text-yellow-400',
        }
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bento-card w-full max-w-lg overflow-hidden !p-0 flex flex-col shadow-2xl border-primary/20"
                >
                    <div className="relative h-48 bg-primary/10 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                        <motion.div
                            key={step}
                            initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={{ type: 'spring', damping: 12 }}
                        >
                            {(() => {
                                const Icon = steps[step].icon;
                                return <Icon className={cn('size-24', steps[step].color)} />;
                            })()}
                        </motion.div>
                        
                        <button 
                            onClick={closeOnboarding}
                            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white/60 hover:bg-black/40 hover:text-white transition-colors"
                        >
                            <X className="size-4" />
                        </button>
                    </div>

                    <div className="p-8 flex-1 flex flex-col text-center">
                        <h2 className="text-2xl font-black tracking-tight uppercase mb-4 tracking-tighter">
                            {steps[step].title}
                        </h2>
                        <p className="text-text-dim leading-relaxed mb-8">
                            {steps[step].description}
                        </p>

                        <div className="mt-auto space-y-6">
                            {/* Progress dots */}
                            <div className="flex justify-center gap-2">
                                {steps.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={cn(
                                            'h-1.5 rounded-full transition-all duration-300',
                                            i === step ? 'w-8 bg-primary' : 'w-2 bg-border'
                                        )}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-3">
                                {step > 0 && (
                                    <button
                                        onClick={() => setStep(s => s - 1)}
                                        className="flex-1 px-6 py-3 rounded-xl border border-border text-sm font-bold uppercase tracking-widest text-text-dim hover:bg-white/5 transition-colors"
                                    >
                                        Back
                                    </button>
                                )}
                                <button
                                    onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : closeOnboarding()}
                                    className="flex-1 px-6 py-3 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
                                >
                                    {step < steps.length - 1 ? (
                                        <>
                                            Next
                                            <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                                        </>
                                    ) : (
                                        "Get Started"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
