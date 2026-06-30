const TH_BASE =
  'h-10 px-2 text-left align-middle font-medium text-muted-foreground whitespace-nowrap';

/** Table cell classes — keep START / Site on one line; scroll horizontally for the rest */
export const reportThClass = (col) => {
  if (col === 'START') return `${TH_BASE} min-w-[11rem]`;
  if (col === 'Site') return `${TH_BASE} min-w-[10rem]`;
  return TH_BASE;
};

export const reportCellStart = 'whitespace-nowrap min-w-[11rem] tabular-nums';
export const reportCellSite = 'whitespace-nowrap min-w-[10rem]';

/** Compact single-line datetime for export tables */
export function formatReportStartDate(value) {
  if (value == null || value === '') return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** ACKNOWLEDGE badge for patient / HFS export tables */
export function getAcknowledgeAgree(row) {
  const acknowledge =
    row.ACKNOWLEDGE !== undefined
      ? row.ACKNOWLEDGE
      : row.acknowledge !== undefined
        ? row.acknowledge
        : row.Acknowledge !== undefined
          ? row.Acknowledge
          : null;

  if (acknowledge === null || acknowledge === undefined) return false;
  return acknowledge === 1 || acknowledge === '1' || String(acknowledge).trim() === '1';
}
