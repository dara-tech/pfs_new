import { useEffect } from 'react';
import { useUIStore } from '../lib/stores/uiStore';
import { Button } from './ui/button';
import { FaMoon, FaSun } from 'react-icons/fa';

export default function ThemeToggle() {
  const { theme, toggleTheme, initTheme, themeLocked } = useUIStore();

  useEffect(() => {
    // Initialize theme on mount
    initTheme();
  }, [initTheme]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      disabled={themeLocked}
      className="h-9 w-9"
      title={themeLocked 
        ? 'Theme change is locked in settings' 
        : (theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode')}
    >
      {theme === 'light' ? (
        <FaMoon className="h-4 w-4" />
      ) : (
        <FaSun className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

