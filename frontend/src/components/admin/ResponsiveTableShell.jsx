import { cn } from '../../lib/utils';

/**
 * Mobile card list + desktop table + pagination footer for admin CRUD pages.
 */
export default function ResponsiveTableShell({
  mobile,
  desktop,
  pagination,
  className,
}) {
  return (
    <div className={cn('min-w-0 space-y-2', className)}>
      <div className="space-y-2 md:hidden">{mobile}</div>
      <div className="hidden md:block min-w-0">{desktop}</div>
      {pagination}
    </div>
  );
}
