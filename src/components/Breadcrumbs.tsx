'use client';

import { motion } from 'motion/react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface BreadcrumbsProps {
    items: Array<{
        label: string;
        onClick?: () => void;
        active?: boolean;
    }>;
    className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
    return (
        <nav className={cn('flex items-center space-x-1 text-[10px] font-bold uppercase tracking-widest text-text-dim', className)}>
            <button 
                onClick={() => items[0]?.onClick?.()}
                className="hover:text-accent transition-colors flex items-center gap-1"
            >
                <Home className="size-3" />
            </button>
            
            {items.map((item, index) => (
                <div key={index} className="flex items-center space-x-1">
                    <ChevronRight className="size-3 text-border" />
                    <button
                        onClick={item.onClick}
                        disabled={item.active}
                        className={cn(
                            'transition-colors',
                            item.active ? 'text-accent cursor-default' : 'hover:text-accent'
                        )}
                    >
                        {item.label}
                    </button>
                </div>
            ))}
        </nav>
    );
}
