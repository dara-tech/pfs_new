import { useVirtualRows } from '../hooks/use-virtual-rows';
import { cn } from '../lib/utils';

/**
 * Scrollable table body that only mounts visible rows.
 */
export default function VirtualScrollTable({
  rows,
  rowHeight = 40,
  maxHeight = 'min(65vh, 520px)',
  header,
  renderRow,
  getRowKey,
  className,
  containerClassName,
}) {
  const count = rows?.length ?? 0;
  const {
    containerRef,
    onScroll,
    start,
    end,
    paddingTop,
    paddingBottom,
    totalHeight,
  } = useVirtualRows(count, rowHeight);

  const visible = count > 0 ? rows.slice(start, end) : [];

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={cn('admin-scroll-x overflow-auto overscroll-contain', containerClassName)}
      style={{ maxHeight }}
    >
      <div style={{ minHeight: count > 0 ? totalHeight : undefined }}>
        <table className={cn('w-full caption-bottom text-sm min-w-max border-collapse', className)}>
          {header}
          <tbody className="[&_tr:last-child]:border-0">
            {paddingTop > 0 && (
              <tr aria-hidden className="border-0 hover:bg-transparent">
                <td colSpan={100} style={{ height: paddingTop, padding: 0, border: 0 }} />
              </tr>
            )}
            {visible.map((row, i) => {
              const index = start + i;
              const key = getRowKey ? getRowKey(row, index) : index;
              return renderRow(row, index, key);
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden className="border-0 hover:bg-transparent">
                <td colSpan={100} style={{ height: paddingBottom, padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
