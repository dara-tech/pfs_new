/** Match hooks/use-mobile.jsx (768px) and sidebar `md:` breakpoint */
export const MOBILE_BREAKPOINT = 768;

/** Stack toolbar actions full-width on narrow screens */
export const MOBILE_TOOLBAR_CLASS =
  'flex-col items-stretch [&_button]:w-full sm:flex-row sm:items-center sm:[&_button]:w-auto';

export function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

const SIDEBAR_COOKIE_NAME = 'sidebar_state';

export function getDefaultSidebarOpen() {
  if (typeof document === 'undefined') return true;
  if (isMobileViewport()) return false;
  const match = document.cookie.match(new RegExp(`${SIDEBAR_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] !== 'false' : true;
}
