import { cn } from '../lib/utils';

/** Single bordered shell for list tables — scrolls horizontally on narrow screens */
export default function DataTableSection({ meta, children, className, scroll = true }) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      {meta ? (
        <p className="text-xs text-muted-foreground">{meta}</p>
      ) : null}
      {scroll ? (
        <div className="admin-scroll-x rounded-lg">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
