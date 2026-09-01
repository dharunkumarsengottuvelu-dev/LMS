import React from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  backAction?: { label: string; onClick?: () => void; href?: string };
  actions?: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  backAction,
  actions,
  className,
  badge,
}: PageHeaderProps) {
  return (
    <div className={cn("w-full bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-7 shadow-xs mb-6 overflow-visible", className)}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        {/* Left Column: Breadcrumb / Back Navigation + Title + Description */}
        <div className="min-w-0 flex-1 space-y-2">
          {/* Breadcrumb / Back Row */}
          {(breadcrumbs || backAction) && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
              {backAction && (
                <>
                  {backAction.href ? (
                    <Link
                      href={backAction.href}
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group py-0.5"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                      <span>{backAction.label}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={backAction.onClick}
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group py-0.5"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-400 group-hover:text-blue-600" />
                      <span>{backAction.label}</span>
                    </button>
                  )}
                </>
              )}

              {breadcrumbs && breadcrumbs.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {breadcrumbs.map((bc, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-40" />}
                      {bc.href ? (
                        <Link href={bc.href} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {bc.label}
                        </Link>
                      ) : (
                        <span className="text-slate-700 dark:text-zinc-300">{bc.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Title Row with optional Badge */}
          <div className="flex items-center gap-3 flex-wrap py-0.5">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-normal">
              {title}
            </h1>
            {badge}
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-3xl leading-relaxed font-normal">
              {description}
            </p>
          )}
        </div>

        {/* Right Column: Actions */}
        {actions && (
          <div className="flex items-center gap-3 shrink-0 self-start lg:self-center pt-2 lg:pt-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
