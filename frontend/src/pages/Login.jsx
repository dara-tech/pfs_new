import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { useUIStore } from '../lib/stores/uiStore';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Card, CardContent } from '../components/ui/card';
import { FaEye, FaEyeSlash, FaUser, FaLock, FaSpinner, FaMoon, FaSun, FaArrowRight } from 'react-icons/fa';
import LanguageToggle from '../components/LanguageToggle';

const DEFAULT_LOGO =
  'https://tse2.mm.bing.net/th/id/OIP.m5Zpyrf5a2AjwderAqj26QHaHa?rs=1&pid=ImgDetMain&o=7&rm=3';

const MOBILE_FEATURES = {
  en: [
    'Secure data management',
    'Real-time reporting',
    'Efficient data analytics',
  ],
  kh: [
    'ការគ្រប់គ្រងទិន្នន័យដែលមានសុវត្ថិភាព',
    'របាយការណ៍ពេលវេលាពិត',
    'វិភាគទិន្នន័យដែលមានប្រសិទ្ធភាព',
  ],
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const navigate = useNavigate();
  const { setUser, setToken, setPermissions, setRoles } = useAuthStore();
  const { locale, theme, toggleTheme, initTheme } = useUIStore();
  const isKh = locale === 'kh';

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await api.get('/settings/logo', {
          params: { _t: Date.now() },
        });
        if (response.data.logoUrl) {
          setLogoUrl(`${response.data.logoUrl}?t=${Date.now()}`);
        }
      } catch (err) {
        console.error('Failed to load logo:', err);
      }
    };

    loadLogo();

    const handleLogoUpdate = (event) => {
      if (event.detail?.logoUrl) {
        setLogoUrl(event.detail.logoUrl);
      }
    };
    window.addEventListener('logoUpdated', handleLogoUpdate);
    const interval = setInterval(loadLogo, 30000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('logoUpdated', handleLogoUpdate);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, password });

      if (response?.data?.queued) {
        setError(
          isKh
            ? 'គ្មានអ៊ីនធឺណិត — សូមភ្ជាប់បណ្តាញហើយព្យាយាមម្តងទៀត'
            : 'You appear to be offline. Connect to the network and try again.'
        );
        return;
      }

      setToken(response.data.token);
      setUser(response.data.user);

      if (response.data.permissions) {
        setPermissions(response.data.permissions);
      }
      if (response.data.roles) {
        setRoles(response.data.roles);
      }

      navigate('/patients');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          (isKh ? 'ចូលមិនបាន។ សូមពិនិត្យឈ្មោះ និងពាក្យសម្ងាត់។' : 'Login failed. Please check your credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  const features = MOBILE_FEATURES[locale] || MOBILE_FEATURES.en;

  return (
    <div
      className={`login-page min-h-[100dvh] flex flex-col lg:flex-row bg-background ${isKh ? 'font-khmer' : ''}`}
      lang={locale}
    >
      {/* Top bar — language + theme */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 px-3 pt-safe sm:px-6 pointer-events-none">
        <div className="pointer-events-auto ">
          <LanguageToggle className="rounded-none" flagClassName="rounded-none" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="pointer-events-auto h-9 w-9 "
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <FaMoon className="h-4 w-4" /> : <FaSun className="h-4 w-4" />}
        </Button>
      </header>

      {/* Form column */}
      <main className="flex flex-1 min-h-0 w-full min-w-0 flex-col lg:w-3/5 xl:w-[58%]">
        <div className="flex flex-1 items-center justify-center overflow-y-auto overscroll-y-contain px-4 pb-safe pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:px-8 sm:py-12 lg:px-12 xl:px-16">
          <div className="w-full max-w-md space-y-6 sm:space-y-8 animate-fade-in py-4">
            <div className="text-center space-y-4 sm:space-y-5">
              <div className="flex justify-center">
                <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-full border-2 border-primary/25 bg-card p-1.5 shadow-md flex items-center justify-center overflow-hidden">
                  <img
                    key={logoUrl || 'default'}
                    src={logoUrl || DEFAULT_LOGO}
                    alt="Logo"
                    className="h-full w-full object-contain rounded-full"
                    onError={(e) => {
                      if (logoUrl && e.currentTarget.src !== DEFAULT_LOGO) {
                        e.currentTarget.src = DEFAULT_LOGO;
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2 min-w-0">
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight leading-snug text-balance px-1">
                  {isKh
                    ? 'ប្រព័ន្ធសម្រាប់គ្រប់គ្រងទិន្នន័យអ្នកជំងឺ (PSF)'
                    : 'Patient Dashboard System (PSF)'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {isKh ? 'សូមចូលប្រើប្រាស់គណនីរបស់អ្នក' : 'Please sign in to your account'}
                </p>
              </div>
            </div>

            <Card className="border-primary/15 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-sm font-medium">
                      {isKh ? 'ឈ្មោះចូលប្រើ' : 'Username'}
                    </Label>
                    <div className="relative">
                      <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="username"
                        type="text"
                        placeholder={isKh ? 'ឈ្មោះចូលប្រើ' : 'Enter your username'}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={`pl-10 h-10 sm:h-11 text-base sm:text-sm ${isKh ? 'font-khmer' : ''}`}
                        required
                        disabled={loading}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium">
                      {isKh ? 'ពាក្យសម្ងាត់' : 'Password'}
                    </Label>
                    <div className="relative">
                      <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={isKh ? 'ពាក្យសម្ងាត់' : 'Enter your password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`pl-10 pr-10 h-10 sm:h-11 text-base sm:text-sm ${isKh ? 'font-khmer' : ''}`}
                        required
                        disabled={loading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground touch-manipulation"
                        disabled={loading}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <FaEyeSlash className="h-4 w-4" />
                        ) : (
                          <FaEye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="animate-fade-in">
                      <AlertDescription className="text-sm">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    className={`w-full h-10 sm:h-11 text-sm font-semibold ${isKh ? 'font-khmer' : ''}`}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
                        {isKh ? 'កំពុងចូល...' : 'Signing in...'}
                      </>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        {isKh ? 'ចូលប្រើប្រាស់' : 'Login'}
                        <FaArrowRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Mobile / tablet: compact feature list (replaces hidden side panel) */}
            <div className="lg:hidden rounded-lg border border-primary/15 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide text-center">
                {isKh ? 'ប្រព័ន្ធរបាយការណ៍' : 'Reporting System'}
              </p>
              <ul className="space-y-2">
                {features.map((text) => (
                  <li key={text} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="leading-snug">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Desktop branding panel */}
      <aside className="hidden lg:flex lg:flex-1 lg:min-w-0 bg-gradient-to-br from-primary via-primary/95 to-primary/90 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/50 via-primary/30 to-transparent" />

        <div
          className={`relative z-10 flex flex-col items-center justify-center w-full h-full p-10 xl:p-12 text-white ${isKh ? 'font-khmer' : ''}`}
        >
          <div className="max-w-md space-y-8 text-center">
            <div className="space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 xl:w-20 xl:h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30">
                <span className="text-2xl xl:text-3xl font-bold">PSF</span>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-snug">
                  {isKh ? 'ប្រព័ន្ធរបាយការណ៍' : 'Reporting System'}
                </h2>
                <p className="text-base xl:text-lg text-white/90 leading-relaxed">
                  {isKh
                    ? 'គ្រប់គ្រង និងវិភាគទិន្នន័យអ្នកជំងឺដោយមានប្រសិទ្ធភាព'
                    : 'Efficiently manage and analyze patient data'}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-white/20 text-left">
              {features.map((text) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <p className="text-sm text-white/90 leading-snug">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      </aside>
    </div>
  );
}
