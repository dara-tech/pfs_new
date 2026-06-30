import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

/**
 * Dashboard / admin page hero header
 */
export default function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  badge,
  actions,
  className,
  khmer = false,
}) {
  const BadgeIcon = badge?.icon;

  return (
    <div
      className={cn(
        'mb-8 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm',
        className
      )}
    >
      <div className="relative px-5 py-6 sm:px-7 sm:py-7 md:px-8">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-background to-background"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-primary/5 blur-2xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {Icon && (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-inner ring-1 ring-primary/15">
                <Icon className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <p
                  className={cn(
                    'mb-1.5 text-xs font-semibold uppercase tracking-widest text-primary',
                    khmer && 'font-khmer'
                  )}
                >
                  {eyebrow}
                </p>
              )}
              <h1
                className={cn(
                  'text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-[2rem] md:leading-tight break-words',
                  khmer && 'font-khmer'
                )}
              >
                {title}
              </h1>
              {description && (
                <p
                  className={cn(
                    'mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg',
                    khmer && 'font-khmer'
                  )}
                >
                  {description}
                </p>
              )}
            </div>
          </div>

          {(badge || actions) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              {badge && (
                <Badge
                  variant="secondary"
                  className="gap-1.5 border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                >
                  {BadgeIcon && <BadgeIcon className="h-3.5 w-3.5" />}
                  {badge.label}
                </Badge>
              )}
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
