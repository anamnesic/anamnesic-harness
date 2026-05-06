import { cn } from '@/src/lib/utils';

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('animate-pulse rounded-lg bg-border/60', className)} />;
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
    return (
        <div className="bento-card space-y-3">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-7 w-28 mt-1" />
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className={cn('h-2.5', i % 2 === 0 ? 'w-full' : 'w-3/4')} />
            ))}
        </div>
    );
}

export function SkeletonRow() {
    return (
        <div className="flex items-center gap-3 py-2">
            <Skeleton className="size-8 rounded-lg shrink-0" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-2.5 w-10 shrink-0" />
        </div>
    );
}

