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
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  backAction,
  actions,
}: PageHeaderProps) {
  return (
    <div className="w-full">
      {/* Breadcrumb / Back Row */}
      {(breadcrumbs || backAction) && (
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground/80 font-medium">
          {backAction && (
            <>
              {backAction.href ? (
                <Link
                  href={backAction.href}
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> {backAction.label}
                </Link>
              ) : (
                <button
                  onClick={backAction.onClick}
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> {backAction.label}
                </button>
              )}
            </>
          )}

          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-2">
              {breadcrumbs.map((bc, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="h-4 w-4 opacity-50" />}
                  {bc.href ? (
                    <Link href={bc.href} className="hover:text-foreground transition-colors">
                      {bc.label}
                    </Link>
                  ) : (
                    <span className="text-foreground">{bc.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Title & Actions Row */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="max-w-3xl">
          <h1 className="text-[28px] md:text-[36px] lg:text-[40px] xl:text-[44px] font-bold tracking-tight text-foreground leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-2 md:mt-3 text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mt-6 md:mt-8 pb-8 border-b border-border" />
    </div>
  );
}
