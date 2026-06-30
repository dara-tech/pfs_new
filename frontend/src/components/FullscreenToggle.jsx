import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { useUIStore } from '../lib/stores/uiStore';
import { t } from '../lib/translations/index';

export default function FullscreenToggle() {
  const { locale } = useUIStore();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Check if fullscreen is active on mount
    const checkFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('mozfullscreenchange', checkFullscreen);
    document.addEventListener('MSFullscreenChange', checkFullscreen);

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
      document.removeEventListener('mozfullscreenchange', checkFullscreen);
      document.removeEventListener('MSFullscreenChange', checkFullscreen);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          await document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
          await document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.msRequestFullscreen) {
          await document.documentElement.msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFullscreen}
      className="h-9 w-9"
      title={isFullscreen 
        ? t(locale, 'admin.common.exitFullscreen') 
        : t(locale, 'admin.common.enterFullscreen')}
    >
      {isFullscreen ? (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          <path d="M4 4h4v4H4V4z" />
          <path d="M16 4h4v4h-4V4z" />
          <path d="M4 16h4v4H4v-4z" />
          <path d="M16 16h4v4h-4v-4z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M4 4h4v4H4V4z" />
          <path d="M16 4h4v4h-4V4z" />
          <path d="M4 16h4v4H4v-4z" />
          <path d="M16 16h4v4h-4v-4z" />
        </svg>
      )}
      <span className="sr-only">{isFullscreen ? t(locale, 'admin.common.exitFullscreen') : t(locale, 'admin.common.enterFullscreen')}</span>
    </Button>
  );
}
