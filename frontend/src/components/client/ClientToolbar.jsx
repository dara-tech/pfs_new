import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useUIStore } from '../../lib/stores/uiStore';
import { cn } from '../../lib/utils';
import flagEn from '@/assets/flags/flag-en.svg?url';
import flagKh from '@/assets/flags/flag-kh.svg?url';

const FLAGS = {
  en: { src: flagEn, alt: 'English' },
  kh: { src: flagKh, alt: 'Khmer' },
};

export default function ClientToolbar({ locale = 'kh' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useUIStore();

  const toggleLocale = () => {
    const newLocale = locale === 'kh' ? 'en' : 'kh';
    navigate(location.pathname.replace(`/${locale}`, `/${newLocale}`));
  };

  const flag = FLAGS[locale] || FLAGS.kh;
  const isKh = locale === 'kh';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-md pt-safe">
      <div className="mx-auto flex max-w-5xl items-center justify-end gap-1.5 px-3 py-2 sm:px-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleLocale}
          className="h-8 gap-1.5 rounded-md px-2"
          title={isKh ? 'Switch to English' : 'ប្តូរទៅភាសាខ្មែរ'}
          aria-label={isKh ? 'Switch to English' : 'Switch to Khmer'}
        >
          <img
            src={flag.src}
            alt={flag.alt}
            className="h-4 w-6 rounded-[2px] border border-border/40 object-cover"
            draggable={false}
          />
          <span className={cn('hidden text-xs font-medium md:inline', isKh ? 'font-khmer' : '')}>
            {isKh ? 'EN' : 'ខ្មែរ'}
          </span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8 rounded-md"
          title={
            theme === 'light'
              ? isKh
                ? 'ប្តូរទៅរបៀបងងឹត'
                : 'Switch to dark mode'
              : isKh
                ? 'ប្តូរទៅរបៀបពន្លឺ'
                : 'Switch to light mode'
          }
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <FaMoon className="h-3.5 w-3.5" /> : <FaSun className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </header>
  );
}
