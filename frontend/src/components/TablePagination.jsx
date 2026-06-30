import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { t } from '../lib/translations/index';

export default function TablePagination({
  locale,
  total,
  safePage,
  totalPages,
  rangeFrom,
  rangeTo,
  onPrev,
  onNext,
}) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        {t(locale, 'admin.common.showingRange', { from: rangeFrom, to: rangeTo, total })}
        {' · '}
        {t(locale, 'admin.common.pageOf', { page: safePage + 1, total: totalPages })}
      </p>
      <div className="flex w-full items-center gap-1.5 sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={safePage === 0}
          className="h-8 flex-1 gap-1 px-2 sm:h-7 sm:flex-none"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {t(locale, 'admin.common.previousPage')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={safePage >= totalPages - 1}
          className="h-8 flex-1 gap-1 px-2 sm:h-7 sm:flex-none"
        >
          {t(locale, 'admin.common.nextPage')}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
