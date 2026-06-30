import { t } from './translations/index';

export function buildListMeta(
  locale,
  { total, rangeFrom, rangeTo, safePage, totalPages, emptyLabel }
) {
  if (!total) {
    return emptyLabel || '';
  }
  const parts = [];
  if (emptyLabel) parts.push(emptyLabel);
  if (rangeFrom != null && rangeTo != null) {
    parts.push(t(locale, 'admin.common.showingRange', { from: rangeFrom, to: rangeTo, total }));
  }
  if (safePage != null && totalPages != null) {
    parts.push(t(locale, 'admin.common.pageOf', { page: safePage + 1, total: totalPages }));
  }
  return parts.filter(Boolean).join(' · ');
}
