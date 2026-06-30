import { Button } from './ui/button';
import { useUIStore } from '../lib/stores/uiStore';
import { cn } from '../lib/utils';
import flagEn from '@/assets/flags/flag-en.svg?url';
import flagKh from '@/assets/flags/flag-kh.svg?url';

const FLAGS = {
  en: { src: flagEn, alt: 'English' },
  kh: { src: flagKh, alt: 'Khmer' },
};

export default function LanguageToggle({ className, flagClassName }) {
  const { locale, setLocale } = useUIStore();
  const isKh = locale === 'kh';
  const current = FLAGS[locale] || FLAGS.en;

  return (
    <Button
      variant="ghost"
      onClick={() => setLocale(isKh ? 'en' : 'kh')}
      className={cn(
        'h-10 w-12 p-0 bg-background/80 transition-all duration-200',
        'hover:bg-muted/80',
        className
      )}
      aria-label={isKh ? 'Switch to English' : 'Switch to Khmer'}
    >
      <img
        src={current.src}
        alt={current.alt}
        className={cn(
          'h-6 w-9 rounded-[3px] object-cover shadow-sm border border-border/30',
          flagClassName
        )}
        draggable={false}
      />
    </Button>
  );
}
