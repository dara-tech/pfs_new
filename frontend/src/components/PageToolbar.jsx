import { cn } from '../lib/utils';
import { MOBILE_TOOLBAR_CLASS } from '../lib/layout';

/** Optional action row below navbar (export, add, etc.) */
export default function PageToolbar({ children, className }) {
  if (!children) return null;
  return (
    <div
      className={cn(
        'mb-2 flex w-full flex-wrap items-center justify-end gap-1.5',
        MOBILE_TOOLBAR_CLASS,
        className
      )}
    >
      {children}
    </div>
  );
}
