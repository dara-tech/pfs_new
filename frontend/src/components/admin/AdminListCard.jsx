import { cn } from '../../lib/utils';

/** Compact card row for admin list pages on mobile */
export default function AdminListCard({
  title,
  badge,
  subtitle,
  meta,
  children,
  actions,
  className,
  titleClassName,
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-card/50 p-3 space-y-2',
        className
      )}
    >
      {(title || badge) && (
        <div className="flex items-start justify-between gap-2">
          {title ? (
            <div className={cn('min-w-0 flex-1 font-medium text-sm leading-snug', titleClassName)}>
              {title}
            </div>
          ) : (
            <span className="flex-1" />
          )}
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
      )}
      {subtitle ? (
        <p className="text-sm text-muted-foreground leading-snug line-clamp-3">{subtitle}</p>
      ) : null}
      {children}
      {meta ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{meta}</div>
      ) : null}
      {actions ? (
        <div className="flex justify-end gap-0.5 border-t border-border/40 pt-2">{actions}</div>
      ) : null}
    </div>
  );
}
