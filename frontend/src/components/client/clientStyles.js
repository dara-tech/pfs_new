import { cn } from '../../lib/utils';

export const CLIENT_CONTAINER =
  'w-full max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto min-w-0 pt-14 pb-6 pb-safe px-3 sm:px-4';

/** Site selection lists (provinces, sites) */
export const CLIENT_OPTION_GRID =
  'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3';

/** Survey radio options (few columns, short labels) */
export const CLIENT_QUESTION_OPTION_GRID =
  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2';

export const CLIENT_OPTION_GRID_TWO =
  'grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl';

/** Checkbox / multi-select — 1 column on phone, 2 from sm up */
export const CLIENT_CHECKBOX_OPTION_GRID =
  'grid grid-cols-1 min-[480px]:grid-cols-2 gap-1.5';

export function getClientOptionGridClass(optionCount, variant = 'radio') {
  if (optionCount <= 2) return CLIENT_OPTION_GRID_TWO;
  if (variant === 'checkbox') return CLIENT_CHECKBOX_OPTION_GRID;
  if (optionCount <= 4) return 'grid grid-cols-1 sm:grid-cols-2 gap-2';
  return CLIENT_QUESTION_OPTION_GRID;
}

export function clientOptionLabelClass(isSelected, { compact = false } = {}) {
  return cn(
    'flex w-full cursor-pointer rounded-lg border transition-all',
    compact
      ? 'items-center gap-2 py-2 px-2.5 min-h-0 [&_input]:mt-0'
      : 'items-start gap-2 p-3 min-h-[44px]',
    isSelected
      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/20'
      : 'border-border hover:border-primary/40 hover:bg-accent/40'
  );
}

export const CLIENT_QUESTION_BLOCK =
  'space-y-2 mb-5 rounded-lg border border-border/50 bg-card/30 p-3 md:p-4';

export const CLIENT_QUESTION_LABEL =
  'text-sm md:text-base font-semibold leading-snug text-foreground';

export const CLIENT_QUESTION_LABEL_ROW =
  'flex flex-wrap items-start gap-x-2 gap-y-1';

export const CLIENT_SECTION_TITLE =
  'text-base md:text-lg font-bold text-primary mb-2';

export const CLIENT_PAGE_TITLE =
  'text-lg md:text-xl font-bold text-primary leading-tight';

export const CLIENT_BULLET = 'text-primary mt-0.5 text-sm shrink-0';

export const CLIENT_CONSENT_BOX =
  'mb-4 rounded-lg border border-border/50 bg-card/30 p-3 md:p-4';

export const CLIENT_CONSENT_TEXT =
  'text-sm md:text-base leading-relaxed text-muted-foreground';

export const CLIENT_INPUT_CLASS = 'mt-1.5 h-9 text-sm md:text-base';

export const CLIENT_SUBMIT_BUTTON =
  'w-full h-10 text-sm font-semibold rounded-lg';

export const CLIENT_RADIO_CHECKBOX =
  'h-4 w-4 md:h-[18px] md:w-[18px] text-primary focus:ring-2 focus:ring-primary cursor-pointer accent-primary shrink-0 mt-0.5';

export const CLIENT_OPTION_TEXT =
  'text-sm flex-1 cursor-pointer leading-snug min-w-0';

export const CLIENT_STICKY_FOOTER =
  'sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm pt-3 pb-safe border-t border-border/50';

export const CLIENT_THANK_CARD =
  'max-w-lg md:max-w-xl w-full mx-4 mt-12 text-center shadow-md border border-primary/20 bg-card rounded-xl';
