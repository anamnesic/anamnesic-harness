'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface PaginatorProps {
    total: number;
    limit: number;
    offset: number;
    onPageChange: (newOffset: number) => void;
    className?: string;
}

export function Paginator({ total, limit, offset, onPageChange, className }: PaginatorProps) {
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    if (totalPages <= 1) return null;

    return (
        <div className={cn('flex items-center justify-between px-4 py-3 border-t border-border bg-bg/50', className)}>
            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(Math.max(0, offset - limit))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-text-dim hover:bg-bg disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(Math.min((totalPages - 1) * limit, offset + limit))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-text-dim hover:bg-bg disabled:opacity-50"
                >
                    Next
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs text-text-dim uppercase tracking-widest font-bold">
                        Showing <span className="text-accent">{offset + 1}</span> to <span className="text-accent">{Math.min(offset + limit, total)}</span> of <span className="text-accent">{total}</span> results
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                            onClick={() => onPageChange(Math.max(0, offset - limit))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-text-dim ring-1 ring-inset ring-border hover:bg-bg focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                        
                        {/* Page Numbers - simplified for now */}
                        {[...Array(totalPages)].map((_, i) => {
                            const pageNum = i + 1;
                            // Show first, last, and pages around current
                            if (
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                            ) {
                                return (
                                    <button
                                        key={i}
                                        onClick={() => onPageChange(i * limit)}
                                        className={cn(
                                            'relative inline-flex items-center px-4 py-2 text-xs font-black focus:z-20 focus:outline-offset-0',
                                            currentPage === pageNum
                                                ? 'z-10 bg-primary text-white ring-1 ring-inset ring-primary'
                                                : 'text-text-dim ring-1 ring-inset ring-border hover:bg-bg'
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            }
                            if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                return <span key={i} className="relative inline-flex items-center px-4 py-2 text-xs font-black text-text-dim ring-1 ring-inset ring-border">...</span>;
                            }
                            return null;
                        })}

                        <button
                            onClick={() => onPageChange(Math.min((totalPages - 1) * limit, offset + limit))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-text-dim ring-1 ring-inset ring-border hover:bg-bg focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
}
