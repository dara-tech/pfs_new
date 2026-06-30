import { useState, useEffect } from 'react';
import { useUIStore } from '../lib/stores/uiStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ColorPicker } from '../components/ui/color-picker';
import { FaCog, FaLock, FaUnlock, FaInfoCircle, FaPalette, FaUndo, FaCheck, FaMagic, FaFont, FaPaintBrush, FaChartBar, FaShieldAlt, FaKey, FaDatabase, FaDownload, FaUpload, FaExclamationTriangle, FaCheckCircle, FaImage, FaTrash, FaMobile, FaAndroid } from 'react-icons/fa';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';
import { t } from '../lib/translations/index';
import { ChangePasswordForm } from './ChangePassword';
import api from '../lib/api';

// Helper to convert HSL string to hex for color input
const hslToHex = (hslString) => {
  if (!hslString) return '#000000';
  const match = hslString.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!match) return '#000000';
  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  
  let r, g, b;
  if (h < 1/6) { r = c; g = x; b = 0; }
  else if (h < 2/6) { r = x; g = c; b = 0; }
  else if (h < 3/6) { r = 0; g = c; b = x; }
  else if (h < 4/6) { r = 0; g = x; b = c; }
  else if (h < 5/6) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
};

// Helper to convert hex to HSL string
const hexToHsl = (hex) => {
  if (!hex || !hex.startsWith('#')) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
};

// Default chart colors
const DEFAULT_CHART_COLORS = {
  chart1: '12 76% 61%',
  chart2: '173 58% 39%',
  chart3: '197 37% 24%',
  chart4: '43 74% 66%',
  chart5: '27 87% 67%',
};

const DEFAULT_DARK_CHART_COLORS = {
  chart1: '220 70% 50%',
  chart2: '160 60% 45%',
  chart3: '30 80% 55%',
  chart4: '280 65% 60%',
  chart5: '340 75% 55%',
};

/** App primary color presets (must match uiStore.js setColorScheme) */
const THEME_COLOR_OPTIONS = [
  { id: 'green', name: 'Green', preview: { light: '142 76% 36%', dark: '142 69% 58%' } },
  { id: 'blue', name: 'Blue', preview: { light: '217 91% 60%', dark: '217 85% 65%' } },
  { id: 'purple', name: 'Purple', preview: { light: '262 83% 58%', dark: '262 75% 65%' } },
  { id: 'red', name: 'Red', preview: { light: '0 84% 60%', dark: '0 75% 65%' } },
  { id: 'orange', name: 'Orange', preview: { light: '25 95% 53%', dark: '25 90% 60%' } },
];

// Color palette presets
const COLOR_PRESETS = {
  default: {
    name: 'Default',
    light: DEFAULT_CHART_COLORS,
    dark: DEFAULT_DARK_CHART_COLORS,
  },
  vibrant: {
    name: 'Vibrant',
    light: {
      chart1: '0 100% 50%',      // Red
      chart2: '120 100% 50%',    // Green
      chart3: '240 100% 50%',     // Blue
      chart4: '60 100% 50%',     // Yellow
      chart5: '300 100% 50%',    // Magenta
    },
    dark: {
      chart1: '0 90% 60%',
      chart2: '120 90% 60%',
      chart3: '240 90% 60%',
      chart4: '60 90% 60%',
      chart5: '300 90% 60%',
    },
  },
  pastel: {
    name: 'Pastel',
    light: {
      chart1: '350 70% 85%',     // Light Pink
      chart2: '180 50% 80%',      // Light Cyan
      chart3: '60 60% 85%',       // Light Yellow
      chart4: '280 50% 80%',      // Light Purple
      chart5: '20 70% 85%',       // Light Orange
    },
    dark: {
      chart1: '350 60% 70%',
      chart2: '180 50% 65%',
      chart3: '60 60% 70%',
      chart4: '280 50% 65%',
      chart5: '20 70% 70%',
    },
  },
  professional: {
    name: 'Professional',
    light: {
      chart1: '210 50% 45%',     // Navy Blue
      chart2: '200 60% 50%',     // Teal
      chart3: '30 50% 55%',      // Brown
      chart4: '220 40% 50%',     // Slate Blue
      chart5: '180 40% 45%',     // Dark Cyan
    },
    dark: {
      chart1: '210 50% 60%',
      chart2: '200 60% 65%',
      chart3: '30 50% 65%',
      chart4: '220 40% 65%',
      chart5: '180 40% 60%',
    },
  },
  ocean: {
    name: 'Ocean',
    light: {
      chart1: '195 80% 50%',     // Ocean Blue
      chart2: '180 70% 45%',     // Teal
      chart3: '200 60% 55%',     // Sky Blue
      chart4: '190 70% 50%',     // Cyan
      chart5: '210 60% 50%',     // Deep Blue
    },
    dark: {
      chart1: '195 80% 60%',
      chart2: '180 70% 55%',
      chart3: '200 60% 65%',
      chart4: '190 70% 60%',
      chart5: '210 60% 60%',
    },
  },
  sunset: {
    name: 'Sunset',
    light: {
      chart1: '15 90% 60%',      // Orange
      chart2: '30 85% 65%',      // Light Orange
      chart3: '0 80% 60%',       // Red
      chart4: '45 90% 70%',      // Yellow
      chart5: '20 85% 65%',      // Peach
    },
    dark: {
      chart1: '15 90% 70%',
      chart2: '30 85% 75%',
      chart3: '0 80% 70%',
      chart4: '45 90% 80%',
      chart5: '20 85% 75%',
    },
  },
  epide: {
    name: 'Epidemic',
    light: {
      chart1: '340 75% 55%',     // Deep Pink/Red
      chart2: '320 70% 60%',     // Magenta
      chart3: '280 65% 60%',     // Purple
      chart4: '260 70% 65%',     // Violet
      chart5: '300 75% 60%',     // Bright Magenta
    },
    dark: {
      chart1: '340 75% 65%',
      chart2: '320 70% 70%',
      chart3: '280 65% 70%',
      chart4: '260 70% 75%',
      chart5: '300 75% 70%',
    },
  },
};

// Font family options
const FONT_FAMILIES = [
  { value: 'google-sans', label: 'Google Sans', preview: 'Google Sans' },
];

// Font size options
const FONT_SIZES = [
  { value: 'small', label: 'Small', description: '14px base size' },
  { value: 'medium', label: 'Medium', description: '16px base size (Default)' },
  { value: 'large', label: 'Large', description: '18px base size' },
  { value: 'xlarge', label: 'Extra Large', description: '20px base size' },
];

export default function Settings() {
  const {
    theme,
    themeLocked,
    setThemeLocked,
    locale,
    colorScheme,
    customThemeColor,
    setColorScheme,
    setCustomThemeColor,
    chartColors,
    setChartColor,
    setChartColors,
    initTheme,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
  } = useUIStore();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('default');
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [showVerification, setShowVerification] = useState(false);
  const [confirmedRestore, setConfirmedRestore] = useState(false);
  const [localChartColors, setLocalChartColors] = useState({
    chart1: chartColors?.chart1 || null,
    chart2: chartColors?.chart2 || null,
    chart3: chartColors?.chart3 || null,
    chart4: chartColors?.chart4 || null,
    chart5: chartColors?.chart5 || null,
  });
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [editingChartIndex, setEditingChartIndex] = useState(null);
  const [themeColorPicker, setThemeColorPicker] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [logoSuccess, setLogoSuccess] = useState('');
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [appIconUrl, setAppIconUrl] = useState(null);
  const [appIconLoading, setAppIconLoading] = useState(false);
  const [appIconError, setAppIconError] = useState('');
  const [appIconSuccess, setAppIconSuccess] = useState('');
  const [selectedAppIconFile, setSelectedAppIconFile] = useState(null);
  const [appIconPreview, setAppIconPreview] = useState(null);
  
  // APK Management state
  const [apkInfo, setApkInfo] = useState(null);
  const [apkLoading, setApkLoading] = useState(false);
  const [apkError, setApkError] = useState('');
  const [apkSuccess, setApkSuccess] = useState('');
  const [apkFile, setApkFile] = useState(null);
  const [apkDeleteDialog, setApkDeleteDialog] = useState(false);
  const [apkToDelete, setApkToDelete] = useState(null);
  
  // Load logo on mount
  useEffect(() => {
    const loadLogo = async () => {
      try {
        // Add timestamp to prevent caching
        const response = await api.get('/admin/settings/logo', {
          params: { _t: Date.now() }
        });
        if (response.data.logoUrl) {
          setLogoUrl(response.data.logoUrl + '?t=' + Date.now());
        }
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
    };
    loadLogo();
    
    // Listen for logo updates from other tabs/windows
    const handleLogoUpdate = (event) => {
      if (event.detail?.logoUrl) {
        setLogoUrl(event.detail.logoUrl);
      }
    };
    window.addEventListener('logoUpdated', handleLogoUpdate);
    
    return () => {
      window.removeEventListener('logoUpdated', handleLogoUpdate);
    };
  }, []);

  // Load app icon on mount
  useEffect(() => {
    const loadAppIcon = async () => {
      try {
        const response = await api.get('/admin/settings/app-icon', {
          params: { _t: Date.now() }
        });
        if (response.data.iconUrl) {
          setAppIconUrl(response.data.iconUrl + '?t=' + Date.now());
        }
      } catch (error) {
        console.error('Failed to load app icon:', error);
      }
    };
    loadAppIcon();
    
    // Load APK info
    const loadApkInfo = async () => {
      try {
        const response = await api.get('/admin/apk');
        if (response.data?.available) {
          setApkInfo(response.data);
        } else {
          setApkInfo(null);
        }
      } catch (error) {
        console.error('Error loading APK info:', error);
        setApkInfo(null);
      }
    };
    loadApkInfo();
  }, []);

  // Update local state when chartColors change
  useEffect(() => {
    setLocalChartColors({
      chart1: chartColors?.chart1 || null,
      chart2: chartColors?.chart2 || null,
      chart3: chartColors?.chart3 || null,
      chart4: chartColors?.chart4 || null,
      chart5: chartColors?.chart5 || null,
    });
  }, [chartColors]);

  const handleToggleThemeLock = async (locked) => {
    setSaving(true);
    setMessage('');
    
    try {
      setThemeLocked(locked);
      setMessage(locked 
        ? t(locale, 'admin.settings.themeLockedSuccess') 
        : t(locale, 'admin.settings.themeUnlockedSuccess'));
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating theme lock:', error);
      setMessage(t(locale, 'admin.common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleChartColorChange = (chartIndex, hexColor) => {
    const hslColor = hexToHsl(hexColor);
    const updatedColors = {
      ...localChartColors,
      [`chart${chartIndex}`]: hslColor,
    };
    setLocalChartColors(updatedColors);
    setChartColor(chartIndex, hslColor);
  };

  const handleResetChartColors = () => {
    const defaults = theme === 'dark' ? DEFAULT_DARK_CHART_COLORS : DEFAULT_CHART_COLORS;
    setLocalChartColors({
      chart1: null,
      chart2: null,
      chart3: null,
      chart4: null,
      chart5: null,
    });
    setChartColors({
      chart1: null,
      chart2: null,
      chart3: null,
      chart4: null,
      chart5: null,
    });
    setSelectedPreset('default');
    // Reset CSS variables
    const root = document.documentElement;
    Object.keys(defaults).forEach((key, index) => {
      root.style.removeProperty(`--chart-${index + 1}`);
    });
  };

  const getThemePreviewHsl = () => {
    if (colorScheme === 'custom' && customThemeColor) {
      return customThemeColor;
    }
    const preset = THEME_COLOR_OPTIONS.find((o) => o.id === colorScheme) || THEME_COLOR_OPTIONS[0];
    return theme === 'dark' ? preset.preview.dark : preset.preview.light;
  };

  const handleThemePresetSelect = (schemeId) => {
    setColorScheme(schemeId);
  };

  const openThemeColorPicker = () => {
    setEditingChartIndex(null);
    setThemeColorPicker(true);
    setColorPickerOpen(true);
  };

  const openChartColorPicker = (index) => {
    setThemeColorPicker(false);
    setEditingChartIndex(index);
    setColorPickerOpen(true);
  };

  const handlePresetSelect = (presetKey) => {
    const preset = COLOR_PRESETS[presetKey];
    if (!preset) return;
    
    const colors = theme === 'dark' ? preset.dark : preset.light;
    const updatedColors = {
      chart1: colors.chart1,
      chart2: colors.chart2,
      chart3: colors.chart3,
      chart4: colors.chart4,
      chart5: colors.chart5,
    };
    
    setLocalChartColors(updatedColors);
    setChartColors(updatedColors);
    setSelectedPreset(presetKey);
    
    // Apply colors to CSS variables
    Object.keys(updatedColors).forEach((key, index) => {
      const root = document.documentElement;
      root.style.setProperty(`--chart-${index + 1}`, updatedColors[key]);
    });
  };

  // Get current chart color for display
  const getChartColor = (chartIndex) => {
    const customColor = localChartColors[`chart${chartIndex}`];
    if (customColor) {
      return hslToHex(customColor);
    }
    const defaults = theme === 'dark' ? DEFAULT_DARK_CHART_COLORS : DEFAULT_CHART_COLORS;
    return hslToHex(defaults[`chart${chartIndex}`]);
  };

  // Get HSL color for chart preview
  const getChartColorHsl = (chartIndex) => {
    const customColor = localChartColors[`chart${chartIndex}`];
    if (customColor) {
      return `hsl(${customColor})`;
    }
    const defaults = theme === 'dark' ? DEFAULT_DARK_CHART_COLORS : DEFAULT_CHART_COLORS;
    return `hsl(${defaults[`chart${chartIndex}`]})`;
  };


  // Preview chart data
  const previewChartData = [
    { name: 'Jan', value: 45 },
    { name: 'Feb', value: 78 },
    { name: 'Mar', value: 32 },
    { name: 'Apr', value: 56 },
    { name: 'May', value: 89 },
  ];

  // Multi-series preview data
  const multiSeriesPreviewData = [
    { name: 'Q1', series1: 45, series2: 32, series3: 28, series4: 52, series5: 38 },
    { name: 'Q2', series1: 78, series2: 65, series3: 45, series4: 68, series5: 55 },
    { name: 'Q3', series1: 32, series2: 48, series3: 62, series4: 35, series5: 42 },
  ];

  // Pie chart preview data
  const pieChartData = [
    { name: 'Series 1', value: 35 },
    { name: 'Series 2', value: 25 },
    { name: 'Series 3', value: 20 },
    { name: 'Series 4', value: 15 },
    { name: 'Series 5', value: 5 },
  ];

  // Line chart preview data
  const lineChartData = [
    { name: 'Jan', value: 45 },
    { name: 'Feb', value: 52 },
    { name: 'Mar', value: 48 },
    { name: 'Apr', value: 61 },
    { name: 'May', value: 55 },
  ];

  return (
    <div className="page-stack page-stack-lg min-w-0 px-2 sm:px-0">
      {/* Main Settings Tabs */}
      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="flex w-full min-w-0 flex-wrap gap-2 sm:grid sm:grid-cols-4 sm:gap-3 mb-4 sm:mb-6 h-auto">
            <TabsTrigger value="appearance" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <FaPaintBrush className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t(locale, 'admin.settings.appearance')}</span>
              <span className="xs:hidden">App</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <FaChartBar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t(locale, 'admin.settings.charts')}</span>
              <span className="xs:hidden">Chart</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <FaShieldAlt className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t(locale, 'admin.settings.security')}</span>
              <span className="xs:hidden">Sec</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <FaDatabase className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t(locale, 'admin.settings.dataManagement')}</span>
              <span className="xs:hidden">Data</span>
            </TabsTrigger>
          </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4 sm:space-y-6">
          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {themeLocked ? (
                  <FaLock className="h-5 w-5 text-primary" />
                ) : (
                  <FaUnlock className="h-5 w-5 text-primary" />
                )}
                {t(locale, 'admin.settings.themeSettings')}
              </CardTitle>
              <CardDescription>
                {t(locale, 'admin.settings.themeSettingsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
          {message && (
            <Alert variant={message.includes('error') ? 'destructive' : 'default'}>
              <FaInfoCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Current Theme Display */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-muted/50">
            <div className="flex-1">
              <Label className="text-sm sm:text-base font-semibold">
                {t(locale, 'admin.settings.currentTheme')}
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {theme === 'light' 
                  ? t(locale, 'admin.settings.lightMode') 
                  : t(locale, 'admin.settings.darkMode')}
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-xs sm:text-sm whitespace-nowrap">
              {theme === 'light' 
                ? t(locale, 'admin.settings.lightMode') 
                : t(locale, 'admin.settings.darkMode')}
            </div>
          </div>

          {/* Theme Lock Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="theme-lock" className="text-sm sm:text-base font-semibold cursor-pointer">
                {t(locale, 'admin.settings.lockThemeChange')}
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t(locale, 'admin.settings.lockThemeChangeDescription')}
              </p>
            </div>
            <Switch
              id="theme-lock"
              checked={themeLocked}
              onCheckedChange={handleToggleThemeLock}
              disabled={saving}
              className="shrink-0"
            />
          </div>

          {themeLocked && (
            <Alert>
              <FaLock className="h-4 w-4" />
              <AlertDescription>
                {t(locale, 'admin.settings.themeLockedWarning')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

          {/* App color theme (primary) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaPalette className="h-5 w-5 text-primary" />
                {t(locale, 'admin.settings.colorTheme')}
              </CardTitle>
              <CardDescription>
                {t(locale, 'admin.settings.colorThemeDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                {THEME_COLOR_OPTIONS.map((option) => {
                  const swatch = theme === 'dark' ? option.preview.dark : option.preview.light;
                  const selected = colorScheme === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleThemePresetSelect(option.id)}
                      className={`group relative p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                        selected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 bg-card'
                      }`}
                    >
                      <div
                        className="h-10 w-full rounded-md border border-border/50 mb-2"
                        style={{ backgroundColor: `hsl(${swatch})` }}
                      />
                      <span className="text-xs sm:text-sm font-medium">{option.name}</span>
                      {selected && (
                        <div className="absolute top-2 right-2">
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <FaCheck className="h-3 w-3 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={openThemeColorPicker}
                  className={`group relative p-3 sm:p-4 rounded-lg border-2 border-dashed transition-all duration-200 hover:scale-105 ${
                    colorScheme === 'custom'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 bg-card'
                  }`}
                >
                  <div
                    className="h-10 w-full rounded-md border border-border/50 mb-2 flex items-center justify-center"
                    style={{ backgroundColor: `hsl(${getThemePreviewHsl()})` }}
                  >
                    <FaPalette className="h-4 w-4 text-primary opacity-80" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium">
                    {t(locale, 'admin.settings.customColor')}
                  </span>
                  {colorScheme === 'custom' && (
                    <div className="absolute top-2 right-2">
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <FaCheck className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-lg border bg-muted/50">
                <div
                  className="h-12 w-12 rounded-lg border-2 border-primary shrink-0"
                  style={{ backgroundColor: `hsl(${getThemePreviewHsl()})` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t(locale, 'admin.settings.colorTheme')}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {getThemePreviewHsl().toUpperCase()}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={openThemeColorPicker}>
                  <FaPalette className="h-3 w-3 mr-2" />
                  {t(locale, 'admin.settings.pickCustomColor')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Font Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaFont className="h-5 w-5 text-primary" />
                {t(locale, 'admin.settings.fontSettings')}
              </CardTitle>
              <CardDescription>
                {t(locale, 'admin.settings.fontSettingsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Font Family Selector */}
              <div className="space-y-2 sm:space-y-3">
                <Label htmlFor="font-family" className="text-sm sm:text-base font-semibold">
                  {t(locale, 'admin.settings.fontFamily')}
                </Label>
                <Select value={fontFamily || 'google-sans'} onValueChange={setFontFamily}>
                  <SelectTrigger id="font-family" className="w-full text-sm sm:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((font) => {
                      const fontStack = '"Google Sans", sans-serif';
                      return (
                        <SelectItem key={font.value} value={font.value}>
                          <div className="flex items-center justify-between w-full">
                            <span style={{ fontFamily: fontStack }}>
                              {font.label}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Font Size Selector */}
              <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t">
                <Label htmlFor="font-size" className="text-sm sm:text-base font-semibold">
                  {t(locale, 'admin.settings.fontSize')}
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => setFontSize(size.value)}
                      className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 active:scale-95 ${
                        fontSize === size.value
                          ? 'border-primary bg-primary/10 shadow-lg'
                          : 'border-border hover:border-primary/50 bg-card'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                        <div 
                          className={`font-bold ${
                            size.value === 'small' ? 'text-xs sm:text-sm' :
                            size.value === 'medium' ? 'text-sm sm:text-base' :
                            size.value === 'large' ? 'text-base sm:text-lg' :
                            'text-lg sm:text-xl'
                          }`}
                        >
                          Aa
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-center">
                          {size.label}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground text-center line-clamp-2">
                          {size.description}
                        </div>
                        {fontSize === size.value && (
                          <div className="mt-0.5 sm:mt-1">
                            <FaCheck className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Preview */}
              <div className="pt-3 sm:pt-4 border-t">
                <Label className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 block">
                  {t(locale, 'admin.settings.fontPreview')}
                </Label>
                <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 rounded-lg border bg-muted/50">
                  <div style={{ 
                    fontFamily: '"Google Sans", sans-serif',
                    fontSize: fontSize === 'small' ? '0.875rem' :
                              fontSize === 'medium' ? '1rem' :
                              fontSize === 'large' ? '1.125rem' :
                              '1.25rem'
                  }}>
                    <div className="text-xl sm:text-2xl font-bold mb-2">
                      {t(locale, 'admin.settings.fontPreviewTitle')}
                    </div>
                    <div className="text-base sm:text-lg mb-2">
                      {t(locale, 'admin.settings.fontPreviewSubtitle')}
                    </div>
                    <div className="text-sm sm:text-base text-muted-foreground">
                      {t(locale, 'admin.settings.fontPreviewText')}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4 break-all">
                      ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
                      abcdefghijklmnopqrstuvwxyz<br />
                      0123456789 !@#$%^&*()
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaImage className="h-5 w-5 text-primary" />
                {t(locale, 'admin.settings.logoSettings') || 'Logo Settings'}
              </CardTitle>
              <CardDescription>
                {t(locale, 'admin.settings.logoSettingsDescription') || 'Upload and manage your application logo'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {logoError && (
                <Alert variant="destructive">
                  <FaExclamationTriangle className="h-4 w-4" />
                  <AlertDescription>{logoError}</AlertDescription>
                </Alert>
              )}
              {logoSuccess && (
                <Alert className="border-2 border-green-500 bg-green-50 dark:bg-green-950">
                  <FaCheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                    {logoSuccess}
                  </AlertDescription>
                </Alert>
              )}

              {/* Current Logo Preview */}
              {(logoUrl || logoPreview) && (
                <div className="flex flex-col items-center gap-4 p-4 rounded-lg border bg-muted/50">
                  <Label className="text-sm sm:text-base font-semibold">
                    {t(locale, 'admin.settings.currentLogo') || 'Current Logo'}
                  </Label>
                  <div className="relative">
                    <div className="h-32 w-32 rounded-full border-4 border-primary/20 bg-white p-2 shadow-lg flex items-center justify-center overflow-hidden">
                      <img 
                        src={logoPreview || logoUrl} 
                        alt="Logo" 
                        className="h-full w-full object-contain rounded-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Logo Upload */}
              <div className="space-y-3 sm:space-y-4">
                <Label htmlFor="logo-upload" className="text-sm sm:text-base font-semibold">
                  {t(locale, 'admin.settings.uploadLogo') || 'Upload New Logo'}
                </Label>
                <div className="space-y-2">
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedLogoFile(file);
                        setLogoError('');
                        setLogoSuccess('');
                        // Create preview
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setLogoPreview(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="cursor-pointer h-12 sm:h-14 text-sm sm:text-base file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-md file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {selectedLogoFile && (
                    <div className="mt-2 sm:mt-3 p-2.5 sm:p-3 rounded-lg bg-muted border-2 border-primary/20">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded bg-primary/10 shrink-0">
                          <FaImage className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{selectedLogoFile.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                            {(selectedLogoFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    onClick={async () => {
                      if (!selectedLogoFile) {
                        setLogoError(t(locale, 'admin.settings.noFileSelected') || 'Please select a logo file');
                        return;
                      }
                      setLogoLoading(true);
                      setLogoError('');
                      setLogoSuccess('');
                      try {
                        const formData = new FormData();
                        formData.append('logo', selectedLogoFile);
                        const response = await api.post('/admin/settings/logo', formData, {
                          headers: {
                            'Content-Type': 'multipart/form-data',
                          },
                        });
                        // Add timestamp to prevent caching
                        const logoUrlWithTimestamp = response.data.logoUrl + '?t=' + Date.now();
                        setLogoUrl(logoUrlWithTimestamp);
                        setLogoSuccess(t(locale, 'admin.settings.logoUpdated') || 'Logo updated successfully');
                        setSelectedLogoFile(null);
                        setLogoPreview(null);
                        // Reset file input
                        const fileInput = document.getElementById('logo-upload');
                        if (fileInput) fileInput.value = '';
                        setTimeout(() => setLogoSuccess(''), 3000);
                        
                        // Force reload logo on login page by triggering a custom event
                        window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { logoUrl: logoUrlWithTimestamp } }));
                      } catch (err) {
                        setLogoError(err.response?.data?.error || t(locale, 'admin.settings.logoUpdateFailed') || 'Failed to update logo');
                      } finally {
                        setLogoLoading(false);
                      }
                    }}
                    disabled={logoLoading || !selectedLogoFile}
                    size="lg"
                    className="flex-1 font-semibold text-sm sm:text-base h-10 sm:h-11"
                  >
                    {logoLoading ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        {t(locale, 'admin.settings.uploading') || 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <FaUpload className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        {t(locale, 'admin.settings.uploadLogo') || 'Upload Logo'}
                      </>
                    )}
                  </Button>
                  {logoUrl && (
                    <Button
                      onClick={async () => {
                        if (!confirm(t(locale, 'admin.settings.resetLogoConfirm') || 'Are you sure you want to reset the logo to default?')) {
                          return;
                        }
                        setLogoLoading(true);
                        setLogoError('');
                        setLogoSuccess('');
                        try {
                          await api.delete('/admin/settings/logo');
                          setLogoUrl(null);
                          setLogoPreview(null);
                          setLogoSuccess(t(locale, 'admin.settings.logoReset') || 'Logo reset to default');
                          setTimeout(() => setLogoSuccess(''), 3000);
                        } catch (err) {
                          setLogoError(err.response?.data?.error || t(locale, 'admin.settings.logoResetFailed') || 'Failed to reset logo');
                        } finally {
                          setLogoLoading(false);
                        }
                      }}
                      disabled={logoLoading}
                      variant="destructive"
                      size="lg"
                      className="flex-1 font-semibold text-sm sm:text-base h-10 sm:h-11"
                    >
                      <FaTrash className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      {t(locale, 'admin.settings.resetLogo') || 'Reset to Default'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* App Icon Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaImage className="h-5 w-5 text-primary" />
                {t(locale, 'admin.settings.appIconSettings') || 'App Icon Settings'}
              </CardTitle>
              <CardDescription>
                {t(locale, 'admin.settings.appIconSettingsDescription') || 'Upload app icon for mobile app (requires app rebuild)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <Alert>
                <FaInfoCircle className="h-4 w-4" />
                <AlertDescription>
                  {t(locale, 'admin.settings.appIconNote') || 'Note: Changing the app icon requires rebuilding the mobile app. The icon will be stored and can be downloaded for use in app.json.'}
                </AlertDescription>
              </Alert>

              {appIconError && (
                <Alert variant="destructive">
                  <FaExclamationTriangle className="h-4 w-4" />
                  <AlertDescription>{appIconError}</AlertDescription>
                </Alert>
              )}
              {appIconSuccess && (
                <Alert className="border-2 border-green-500 bg-green-50 dark:bg-green-950">
                  <FaCheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                    {appIconSuccess}
                  </AlertDescription>
                </Alert>
              )}

              {/* Current App Icon Preview */}
              {(appIconUrl || appIconPreview) && (
                <div className="flex flex-col items-center gap-4 p-4 rounded-lg border bg-muted/50">
                  <Label className="text-sm sm:text-base font-semibold">
                    {t(locale, 'admin.settings.currentAppIcon') || 'Current App Icon'}
                  </Label>
                  <div className="relative">
                    <div className="h-32 w-32 rounded-lg border-4 border-primary/20 bg-white p-2 shadow-lg flex items-center justify-center overflow-hidden">
                      <img 
                        src={appIconPreview || appIconUrl} 
                        alt="App Icon" 
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                  {appIconUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(appIconUrl, '_blank');
                      }}
                    >
                      <FaDownload className="mr-2 h-4 w-4" />
                      {t(locale, 'admin.settings.downloadIcon') || 'Download Icon'}
                    </Button>
                  )}
                </div>
              )}

              {/* App Icon Upload */}
              <div className="space-y-3 sm:space-y-4">
                <Label htmlFor="app-icon-upload" className="text-sm sm:text-base font-semibold">
                  {t(locale, 'admin.settings.uploadAppIcon') || 'Upload New App Icon'}
                </Label>
                <div className="space-y-2">
                  <Input
                    id="app-icon-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedAppIconFile(file);
                        setAppIconError('');
                        setAppIconSuccess('');
                        // Create preview
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setAppIconPreview(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="cursor-pointer h-12 sm:h-14 text-sm sm:text-base file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-md file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {selectedAppIconFile && (
                    <div className="mt-2 sm:mt-3 p-2.5 sm:p-3 rounded-lg bg-muted border-2 border-primary/20">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded bg-primary/10 shrink-0">
                          <FaImage className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{selectedAppIconFile.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                            {(selectedAppIconFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    onClick={async () => {
                      if (!selectedAppIconFile) {
                        setAppIconError(t(locale, 'admin.settings.noFileSelected') || 'Please select an icon file');
                        return;
                      }
                      setAppIconLoading(true);
                      setAppIconError('');
                      setAppIconSuccess('');
                      try {
                        const formData = new FormData();
                        formData.append('icon', selectedAppIconFile);
                        const response = await api.post('/admin/settings/app-icon', formData, {
                          headers: {
                            'Content-Type': 'multipart/form-data',
                          },
                        });
                        const iconUrlWithTimestamp = response.data.iconUrl + '?t=' + Date.now();
                        setAppIconUrl(iconUrlWithTimestamp);
                        setAppIconSuccess(t(locale, 'admin.settings.appIconUpdated') || 'App icon updated successfully. Rebuild the mobile app to apply changes.');
                        setSelectedAppIconFile(null);
                        setAppIconPreview(null);
                        // Reset file input
                        const fileInput = document.getElementById('app-icon-upload');
                        if (fileInput) fileInput.value = '';
                        setTimeout(() => setAppIconSuccess(''), 5000);
                      } catch (err) {
                        setAppIconError(err.response?.data?.error || t(locale, 'admin.settings.appIconUpdateFailed') || 'Failed to update app icon');
                      } finally {
                        setAppIconLoading(false);
                      }
                    }}
                    disabled={appIconLoading || !selectedAppIconFile}
                    size="lg"
                    className="w-full font-semibold text-sm sm:text-base h-10 sm:h-11"
                  >
                    {appIconLoading ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        {t(locale, 'admin.settings.uploading') || 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <FaUpload className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        {t(locale, 'admin.settings.uploadAppIcon') || 'Upload App Icon'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4 sm:space-y-6">
          {/* Chart Color Settings */}
          <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FaPalette className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            {t(locale, 'admin.settings.chartColors')}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base mt-1">
            {t(locale, 'admin.settings.chartColorsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="grid w-full grid-cols-2 gap-2 h-auto">
              <TabsTrigger value="presets" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5">
                <FaMagic className="h-3 w-3 sm:h-4 sm:w-4" />
                {t(locale, 'admin.settings.presets')}
              </TabsTrigger>
              <TabsTrigger value="custom" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5">
                <FaPalette className="h-3 w-3 sm:h-4 sm:w-4" />
                {t(locale, 'admin.settings.custom')}
              </TabsTrigger>
            </TabsList>

            {/* Presets Tab */}
            <TabsContent value="presets" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                {Object.entries(COLOR_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handlePresetSelect(key)}
                    className={`group relative p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                      selectedPreset === key
                        ? 'border-primary bg-primary/10 shadow-none'
                        : 'border-border hover:border-primary/50 bg-card shadow-none'
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1 justify-center">
                        {[1, 2, 3, 4, 5].map((index) => {
                          const colors = theme === 'dark' ? preset.dark : preset.light;
                          const color = colors[`chart${index}`];
                          return (
                            <div
                              key={index}
                              className="h-8 w-8 rounded-md border border-border/50 transition-transform group-hover:scale-110"
                              style={{ backgroundColor: `hsl(${color})` }}
                            />
                          );
                        })}
                      </div>
                      <span className="text-sm font-medium text-center">
                        {preset.name}
                      </span>
                    </div>
                    {selectedPreset === key && (
                      <div className="absolute top-2 right-2">
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <FaCheck className="h-3 w-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </TabsContent>

            {/* Custom Tab */}
            <TabsContent value="custom" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5].map((index) => (
                  <Card key={index} className="overflow-hidden border-2 hover:border-primary/50 transition-colors">
                    <div
                      className="h-16 sm:h-20 w-full"
                      style={{ backgroundColor: getChartColorHsl(index) }}
                    />
                    <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`chart-${index}`} className="text-xs sm:text-sm font-semibold">
                          {t(locale, 'admin.settings.chartColor')} {index}
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updatedColors = {
                              ...localChartColors,
                              [`chart${index}`]: null,
                            };
                            setLocalChartColors(updatedColors);
                            setChartColor(index, null);
                            setSelectedPreset('default');
                          }}
                          className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                          title={t(locale, 'admin.settings.resetToDefault')}
                        >
                          <FaUndo className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Button
                          variant="outline"
                          className="w-full h-9 sm:h-10 border-2 text-xs sm:text-sm"
                          onClick={() => openChartColorPicker(index)}
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2 w-full">
                            <div
                              className="h-5 w-5 sm:h-6 sm:w-6 rounded border border-border shrink-0"
                              style={{ backgroundColor: getChartColorHsl(index) }}
                            />
                            <span className="text-[10px] sm:text-xs font-mono flex-1 text-left truncate">
                              {getChartColor(index).toUpperCase()}
                            </span>
                            <FaPalette className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          </div>
                        </Button>
                        <div className="text-[10px] sm:text-xs text-muted-foreground font-mono text-center truncate">
                          {getChartColor(index).toUpperCase()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Reset All Button */}
          <div className="flex justify-end pt-3 sm:pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleResetChartColors}
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10"
            >
              <FaUndo className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t(locale, 'admin.settings.resetAllColors')}</span>
              <span className="xs:hidden">Reset</span>
            </Button>
          </div>

          {/* Chart Preview */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <Label className="text-base sm:text-lg font-semibold">
                {t(locale, 'admin.settings.chartPreview')}
              </Label>
              <div className="flex gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5].map((index) => (
                  <div
                    key={index}
                    className="h-5 w-5 sm:h-6 sm:w-6 rounded-md border-2 border-border shadow-sm transition-transform hover:scale-110 cursor-pointer"
                    style={{ backgroundColor: getChartColorHsl(index) }}
                    title={`${t(locale, 'admin.settings.chartColor')} ${index}`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Bar Chart Preview */}
              <Card className="border-2">
                <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    {t(locale, 'admin.settings.barChartPreview')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="h-[200px] sm:h-[250px]">
                    <ChartContainer
                      config={{
                        value: { label: 'Value', color: getChartColorHsl(1) }
                      }}
                      className="h-full w-full"
                    >
                      <BarChart data={previewChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill={getChartColorHsl(1)} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Multi-Color Bar Chart */}
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    {t(locale, 'admin.settings.multiColorPreview')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ChartContainer
                      config={{
                        series1: { label: 'Series 1', color: getChartColorHsl(1) },
                        series2: { label: 'Series 2', color: getChartColorHsl(2) },
                        series3: { label: 'Series 3', color: getChartColorHsl(3) },
                        series4: { label: 'Series 4', color: getChartColorHsl(4) },
                        series5: { label: 'Series 5', color: getChartColorHsl(5) },
                      }}
                      className="h-full w-full"
                    >
                      <BarChart data={multiSeriesPreviewData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="series1" fill={getChartColorHsl(1)} radius={[8, 8, 0, 0]} />
                        <Bar dataKey="series2" fill={getChartColorHsl(2)} radius={[8, 8, 0, 0]} />
                        <Bar dataKey="series3" fill={getChartColorHsl(3)} radius={[8, 8, 0, 0]} />
                        <Bar dataKey="series4" fill={getChartColorHsl(4)} radius={[8, 8, 0, 0]} />
                        <Bar dataKey="series5" fill={getChartColorHsl(5)} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Pie Chart Preview */}
              <Card className="border-2">
                <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    {t(locale, 'admin.settings.pieChartPreview')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="h-[200px] sm:h-[250px]">
                    <ChartContainer
                      config={{
                        value: { label: 'Value' }
                      }}
                      className="h-full w-full"
                    >
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          innerRadius={0}
                          paddingAngle={0}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getChartColorHsl(index + 1)} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Line Chart Preview */}
              <Card className="border-2">
                <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    {t(locale, 'admin.settings.lineChartPreview')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="h-[200px] sm:h-[250px]">
                    <ChartContainer
                      config={{
                        value: { label: 'Value', color: getChartColorHsl(1) }
                      }}
                      className="h-full w-full"
                    >
                      <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={getChartColorHsl(1)} 
                          strokeWidth={3}
                          dot={{ fill: getChartColorHsl(1), r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <FaKey className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                {t(locale, 'admin.settings.changePassword')}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-1">
                {t(locale, 'admin.settings.changePasswordDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <ChangePasswordForm locale={locale} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-4 sm:space-y-6">
          {/* Backup Section */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                  <FaDownload className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg sm:text-xl">{t(locale, 'admin.settings.backupData')}</CardTitle>
                  <CardDescription className="mt-1 text-sm sm:text-base">
                    {t(locale, 'admin.settings.backupDataDescription')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              {backupError && (
                <Alert variant="destructive" className="border-2">
                  <FaExclamationTriangle className="h-4 w-4" />
                  <AlertDescription className="font-medium">{backupError}</AlertDescription>
                </Alert>
              )}
              {backupSuccess && (
                <Alert className="border-2 border-green-500 bg-green-50 dark:bg-green-950">
                  <FaCheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                    {backupSuccess}
                  </AlertDescription>
                </Alert>
              )}
              <div className="p-3 sm:p-4 rounded-lg bg-muted/50 border border-dashed">
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 leading-relaxed">
                  {t(locale, 'admin.settings.backupInfo')}
                </p>
                <Button
                  onClick={async () => {
                    setBackupLoading(true);
                    setBackupError('');
                    setBackupSuccess('');
                    try {
                      const response = await api.get('/admin/backup', {
                        responseType: 'blob',
                      });
                      const blob = new Blob([response.data], { type: 'application/sql' });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      const timestamp = new Date().toISOString().split('T')[0];
                      link.download = `backup-${timestamp}.sql`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                      setBackupSuccess(t(locale, 'admin.settings.backupSuccess'));
                    } catch (err) {
                      setBackupError(err.response?.data?.error || t(locale, 'admin.settings.backupFailed'));
                    } finally {
                      setBackupLoading(false);
                    }
                  }}
                  disabled={backupLoading}
                  size="lg"
                  className="w-full font-semibold text-sm sm:text-base h-10 sm:h-11"
                >
                  {backupLoading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      {t(locale, 'admin.settings.backingUp')}
                    </>
                  ) : (
                    <>
                      <FaDownload className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      {t(locale, 'admin.settings.downloadBackup')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* APK Management Section */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                  <FaAndroid className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg sm:text-xl">{t(locale, 'admin.settings.apkManagement') || 'APK Management'}</CardTitle>
                  <CardDescription className="mt-1 text-sm sm:text-base">
                    {t(locale, 'admin.settings.apkManagementDescription') || 'Upload and manage Android APK files for mobile app distribution'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              {apkError && (
                <Alert variant="destructive" className="border-2">
                  <FaExclamationTriangle className="h-4 w-4" />
                  <AlertDescription className="font-medium">{apkError}</AlertDescription>
                </Alert>
              )}
              {apkSuccess && (
                <Alert className="border-2 border-green-500 bg-green-50 dark:bg-green-950">
                  <FaCheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                    {apkSuccess}
                  </AlertDescription>
                </Alert>
              )}

              {/* Current APK Info */}
              {apkInfo?.latest && (
                <div className="p-3 sm:p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base">{apkInfo.latest.filename}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {t(locale, 'admin.settings.size') || 'Size'}: {apkInfo.latest.sizeFormatted} • {t(locale, 'admin.settings.modified') || 'Modified'}: {new Date(apkInfo.latest.modified).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.open(`/api/downloads/apk`, '_blank');
                        }}
                        className="gap-2"
                      >
                        <FaDownload className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{t(locale, 'admin.settings.download') || 'Download'}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setApkToDelete(apkInfo.latest.filename);
                          setApkDeleteDialog(true);
                        }}
                        className="text-destructive hover:text-destructive gap-2"
                      >
                        <FaTrash className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{t(locale, 'admin.common.delete') || 'Delete'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload APK */}
              <div className="space-y-3">
                <Label htmlFor="apk-upload" className="text-sm sm:text-base">
                  {t(locale, 'admin.settings.uploadApk') || 'Upload APK File'}
                </Label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Input
                    id="apk-upload"
                    type="file"
                    accept=".apk"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (!file.name.toLowerCase().endsWith('.apk')) {
                          setApkError(t(locale, 'admin.settings.apkInvalidFile') || 'Invalid file type. Only APK files are allowed.');
                          return;
                        }
                        setApkFile(file);
                        setApkError('');
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={async () => {
                      if (!apkFile) {
                        setApkError(t(locale, 'admin.settings.apkNoFileSelected') || 'Please select an APK file');
                        return;
                      }
                      setApkLoading(true);
                      setApkError('');
                      setApkSuccess('');
                      try {
                        const formData = new FormData();
                        formData.append('apk', apkFile);
                        const response = await api.post('/admin/apk', formData, {
                          headers: {
                            'Content-Type': 'multipart/form-data',
                          },
                        });
                        setApkSuccess(t(locale, 'admin.settings.apkUploadSuccess') || 'APK uploaded successfully');
                        setApkFile(null);
                        // Reset file input
                        const fileInput = document.getElementById('apk-upload');
                        if (fileInput) fileInput.value = '';
                        // Reload APK info
                        const infoResponse = await api.get('/admin/apk');
                        if (infoResponse.data?.available) {
                          setApkInfo(infoResponse.data);
                        }
                      } catch (err) {
                        setApkError(err.response?.data?.error || t(locale, 'admin.settings.apkUploadFailed') || 'Failed to upload APK');
                      } finally {
                        setApkLoading(false);
                      }
                    }}
                    disabled={apkLoading || !apkFile}
                    className="gap-2"
                  >
                    {apkLoading ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        {t(locale, 'admin.settings.uploading') || 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <FaUpload className="h-4 w-4" />
                        {t(locale, 'admin.settings.upload') || 'Upload'}
                      </>
                    )}
                  </Button>
                </div>
                {apkFile && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {t(locale, 'admin.settings.selectedFile') || 'Selected'}: {apkFile.name} ({(apkFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {!apkInfo?.latest && (
                <div className="p-3 sm:p-4 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                    <FaInfoCircle className="inline h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {t(locale, 'admin.settings.apkNoFile') || 'No APK file uploaded yet. Android users will not see the download option until an APK is uploaded.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delete APK Confirmation Dialog */}
          <Dialog open={apkDeleteDialog} onOpenChange={setApkDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t(locale, 'admin.settings.deleteApk') || 'Delete APK?'}</DialogTitle>
                <DialogDescription>
                  {t(locale, 'admin.settings.deleteApkConfirm') || `Are you sure you want to delete "${apkToDelete}"? This action cannot be undone.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApkDeleteDialog(false)}>
                  {t(locale, 'admin.common.cancel') || 'Cancel'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!apkToDelete) return;
                    setApkLoading(true);
                    setApkError('');
                    setApkSuccess('');
                    try {
                      await api.delete(`/admin/apk/${encodeURIComponent(apkToDelete)}`);
                      setApkSuccess(t(locale, 'admin.settings.apkDeleteSuccess') || 'APK deleted successfully');
                      setApkDeleteDialog(false);
                      setApkToDelete(null);
                      // Reload APK info
                      const response = await api.get('/admin/apk');
                      if (response.data?.available) {
                        setApkInfo(response.data);
                      } else {
                        setApkInfo(null);
                      }
                    } catch (err) {
                      setApkError(err.response?.data?.error || t(locale, 'admin.settings.apkDeleteFailed') || 'Failed to delete APK');
                    } finally {
                      setApkLoading(false);
                    }
                  }}
                  disabled={apkLoading}
                >
                  {apkLoading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      {t(locale, 'admin.settings.deleting') || 'Deleting...'}
                    </>
                  ) : (
                    <>
                      <FaTrash className="mr-2 h-4 w-4" />
                      {t(locale, 'admin.common.delete') || 'Delete'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Restore Section */}
          <Card className="border-2 hover:border-destructive/50 transition-colors">
            <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10 shrink-0">
                  <FaUpload className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg sm:text-xl">{t(locale, 'admin.settings.restoreData')}</CardTitle>
                  <CardDescription className="mt-1 text-sm sm:text-base">
                    {t(locale, 'admin.settings.restoreDataDescription')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              {restoreError && (
                <Alert variant="destructive" className="border-2">
                  <FaExclamationTriangle className="h-4 w-4" />
                  <AlertDescription className="font-medium">{restoreError}</AlertDescription>
                </Alert>
              )}
              {restoreSuccess && (
                <Alert className="border-2 border-green-500 bg-green-50 dark:bg-green-950">
                  <FaCheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                    {restoreSuccess}
                  </AlertDescription>
                </Alert>
              )}
              <Alert className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950">
                <FaExclamationTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 font-medium">
                  {t(locale, 'admin.settings.restoreWarning')}
                </AlertDescription>
              </Alert>
              
              {/* File Upload Area */}
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="restore-file" className="text-sm sm:text-base font-semibold">
                    {t(locale, 'admin.settings.selectBackupFile')}
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="restore-file"
                      type="file"
                      accept=".sql"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setSelectedFile(file);
                        setRestoreError('');
                        setRestoreSuccess('');
                        setVerificationResult(null);
                        setShowVerification(false);
                        setConfirmedRestore(false);
                      }}
                      className="cursor-pointer h-12 sm:h-14 text-sm sm:text-base file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-md file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                  </div>
                  {selectedFile && (
                    <div className="mt-2 sm:mt-3 p-2.5 sm:p-3 rounded-lg bg-muted border-2 border-primary/20">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 rounded bg-primary/10 shrink-0">
                          <FaDatabase className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{selectedFile.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        {verificationResult && (
                          <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-[10px] sm:text-xs font-medium shrink-0">
                            <FaCheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            <span className="hidden xs:inline">Verified</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    onClick={async () => {
                      if (!selectedFile) {
                        setRestoreError(t(locale, 'admin.settings.noFileSelected'));
                        return;
                      }
                      setVerifying(true);
                      setRestoreError('');
                      setVerificationResult(null);
                      try {
                        const formData = new FormData();
                        formData.append('file', selectedFile);
                        const response = await api.post('/admin/restore/verify', formData, {
                          headers: {
                            'Content-Type': 'multipart/form-data',
                          },
                        });
                        setVerificationResult(response.data);
                        setShowVerification(true);
                      } catch (err) {
                        setRestoreError(err.response?.data?.error || t(locale, 'admin.settings.verificationFailed'));
                      } finally {
                        setVerifying(false);
                      }
                    }}
                    disabled={verifying || !selectedFile}
                    variant="outline"
                    size="lg"
                    className="flex-1 font-semibold text-sm sm:text-base h-10 sm:h-11"
                  >
                    {verifying ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        {t(locale, 'admin.settings.verifying')}
                      </>
                    ) : (
                      <>
                        <FaInfoCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        {t(locale, 'admin.settings.verifyBackup')}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!selectedFile) {
                        setRestoreError(t(locale, 'admin.settings.noFileSelected'));
                        return;
                      }
                      if (!confirmedRestore && verificationResult && verificationResult.differences) {
                        const hasChanges = verificationResult.differences.newTables.length > 0 ||
                                          verificationResult.differences.modifiedTables.length > 0 ||
                                          verificationResult.differences.missingTables.length > 0;
                        if (hasChanges) {
                          setShowVerification(true);
                          return;
                        }
                      }
                      setRestoreLoading(true);
                      setRestoreError('');
                      setRestoreSuccess('');
                      try {
                        const formData = new FormData();
                        formData.append('file', selectedFile);
                        await api.post('/admin/restore', formData, {
                          headers: {
                            'Content-Type': 'multipart/form-data',
                          },
                        });
                        setRestoreSuccess(t(locale, 'admin.settings.restoreSuccess'));
                        setSelectedFile(null);
                        setVerificationResult(null);
                        setShowVerification(false);
                        setConfirmedRestore(false);
                        // Reset file input
                        const fileInput = document.getElementById('restore-file');
                        if (fileInput) fileInput.value = '';
                      } catch (err) {
                        setRestoreError(err.response?.data?.error || t(locale, 'admin.settings.restoreFailed'));
                      } finally {
                        setRestoreLoading(false);
                      }
                    }}
                    disabled={restoreLoading || !selectedFile}
                    variant="destructive"
                    size="lg"
                    className="flex-1 font-semibold text-sm sm:text-base h-10 sm:h-11"
                  >
                    {restoreLoading ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        {t(locale, 'admin.settings.restoring')}
                      </>
                    ) : (
                      <>
                        <FaUpload className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        {t(locale, 'admin.settings.restoreBackup')}
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Verification Dialog */}
                <Dialog open={showVerification} onOpenChange={setShowVerification}>
                  <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader className="pb-2 sm:pb-4">
                      <DialogTitle className="text-lg sm:text-xl">{t(locale, 'admin.settings.verificationResults')}</DialogTitle>
                      <DialogDescription className="text-sm sm:text-base">
                        {t(locale, 'admin.settings.verificationDescription')}
                      </DialogDescription>
                    </DialogHeader>
                    {verificationResult && (
                      <div className="space-y-3 sm:space-y-4">
                        {/* Summary */}
                        <div className="p-3 sm:p-4 rounded-lg border bg-muted/50">
                          <h4 className="font-semibold mb-2 text-sm sm:text-base">{t(locale, 'admin.settings.summary')}</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                            <div>
                              <span className="text-muted-foreground">{t(locale, 'admin.settings.dumpTables')}:</span>
                              <span className="ml-2 font-medium">{verificationResult.summary.totalDumpTables}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t(locale, 'admin.settings.currentTables')}:</span>
                              <span className="ml-2 font-medium">{verificationResult.summary.totalCurrentTables}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t(locale, 'admin.settings.matchingTables')}:</span>
                              <span className="ml-2 font-medium text-green-600">{verificationResult.summary.matchingTables}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t(locale, 'admin.settings.newTables')}:</span>
                              <span className="ml-2 font-medium text-blue-600">{verificationResult.summary.newTables}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t(locale, 'admin.settings.modifiedTables')}:</span>
                              <span className="ml-2 font-medium text-orange-600">{verificationResult.summary.modifiedTables}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t(locale, 'admin.settings.missingTables')}:</span>
                              <span className="ml-2 font-medium text-red-600">{verificationResult.summary.missingTables}</span>
                            </div>
                          </div>
                        </div>

                        {/* New Tables */}
                        {verificationResult.differences.newTables.length > 0 && (
                          <div className="p-3 sm:p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950">
                            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2 text-sm sm:text-base">
                              {t(locale, 'admin.settings.newTables')} ({verificationResult.differences.newTables.length})
                            </h4>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                              {t(locale, 'admin.settings.newTablesDescription')}
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm break-words">
                              {verificationResult.differences.newTables.map(table => (
                                <li key={table} className="font-mono">{table}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Modified Tables */}
                        {verificationResult.differences.modifiedTables.length > 0 && (
                          <div className="p-3 sm:p-4 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950">
                            <h4 className="font-semibold text-orange-700 dark:text-orange-300 mb-2 text-sm sm:text-base">
                              {t(locale, 'admin.settings.modifiedTables')} ({verificationResult.differences.modifiedTables.length})
                            </h4>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                              {t(locale, 'admin.settings.modifiedTablesDescription')}
                            </p>
                            <div className="space-y-2 sm:space-y-3">
                              {verificationResult.differences.modifiedTables.map(({ table, changes, error }) => (
                                <div key={table} className="text-xs sm:text-sm">
                                  <div className="font-mono font-semibold mb-1 break-words">{table}</div>
                                  {error ? (
                                    <div className="text-red-600 text-xs sm:text-sm">{error}</div>
                                  ) : (
                                    <div className="ml-2 sm:ml-4 space-y-1">
                                      {changes.added.length > 0 && (
                                        <div>
                                          <span className="text-green-600">+ Added:</span>
                                          <ul className="ml-2 sm:ml-4 list-disc">
                                            {changes.added.map(col => (
                                              <li key={col.name} className="font-mono text-[10px] sm:text-xs break-words">{col.name}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {changes.removed.length > 0 && (
                                        <div>
                                          <span className="text-red-600">- Removed:</span>
                                          <ul className="ml-2 sm:ml-4 list-disc">
                                            {changes.removed.map(col => (
                                              <li key={col.name} className="font-mono text-[10px] sm:text-xs break-words">{col.name}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {changes.modified.length > 0 && (
                                        <div>
                                          <span className="text-orange-600">~ Modified:</span>
                                          <ul className="ml-2 sm:ml-4 list-disc">
                                            {changes.modified.map(col => (
                                              <li key={col.name} className="font-mono text-[10px] sm:text-xs break-words">{col.name}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Missing Tables */}
                        {verificationResult.differences.missingTables.length > 0 && (
                          <div className="p-3 sm:p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950">
                            <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2 text-sm sm:text-base">
                              {t(locale, 'admin.settings.missingTables')} ({verificationResult.differences.missingTables.length})
                            </h4>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                              {t(locale, 'admin.settings.missingTablesDescription')}
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm break-words">
                              {verificationResult.differences.missingTables.map(table => (
                                <li key={table} className="font-mono">{table}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Matching Tables */}
                        {verificationResult.differences.matchingTables.length > 0 && (
                          <div className="p-3 sm:p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950">
                            <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2 text-sm sm:text-base">
                              {t(locale, 'admin.settings.matchingTables')} ({verificationResult.differences.matchingTables.length})
                            </h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {t(locale, 'admin.settings.matchingTablesDescription')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowVerification(false);
                        }}
                        className="w-full sm:w-auto text-sm sm:text-base h-9 sm:h-10"
                      >
                        {t(locale, 'admin.settings.cancel')}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          setConfirmedRestore(true);
                          setShowVerification(false);
                          // Trigger restore
                          setRestoreLoading(true);
                          setRestoreError('');
                          setRestoreSuccess('');
                          try {
                            const formData = new FormData();
                            formData.append('file', selectedFile);
                            await api.post('/admin/restore', formData, {
                              headers: {
                                'Content-Type': 'multipart/form-data',
                              },
                            });
                            setRestoreSuccess(t(locale, 'admin.settings.restoreSuccess'));
                            setSelectedFile(null);
                            setVerificationResult(null);
                            setConfirmedRestore(false);
                            const fileInput = document.getElementById('restore-file');
                            if (fileInput) fileInput.value = '';
                          } catch (err) {
                            setRestoreError(err.response?.data?.error || t(locale, 'admin.settings.restoreFailed'));
                          } finally {
                            setRestoreLoading(false);
                          }
                        }}
                        className="w-full sm:w-auto text-sm sm:text-base h-9 sm:h-10"
                      >
                        {t(locale, 'admin.settings.confirmRestore')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Color Picker Dialog */}
      <Dialog
        open={colorPickerOpen}
        onOpenChange={(open) => {
          setColorPickerOpen(open);
          if (!open) {
            setEditingChartIndex(null);
            setThemeColorPicker(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {themeColorPicker
                ? t(locale, 'admin.settings.colorTheme')
                : editingChartIndex
                  ? `${t(locale, 'admin.settings.chartColor')} ${editingChartIndex}`
                  : t(locale, 'admin.settings.selectColor')}
            </DialogTitle>
            <DialogDescription>
              {t(locale, 'admin.settings.selectColor')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {(themeColorPicker || editingChartIndex) && (
              <ColorPicker
                value={
                  themeColorPicker
                    ? getThemePreviewHsl()
                    : localChartColors[`chart${editingChartIndex}`] ||
                      (theme === 'dark'
                        ? DEFAULT_DARK_CHART_COLORS[`chart${editingChartIndex}`]
                        : DEFAULT_CHART_COLORS[`chart${editingChartIndex}`])
                }
                onChange={(hslValue) => {
                  if (themeColorPicker) {
                    setCustomThemeColor(hslValue);
                  } else if (editingChartIndex) {
                    handleChartColorChange(editingChartIndex, hslToHex(hslValue));
                    setSelectedPreset('custom');
                  }
                }}
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (themeColorPicker) {
                  setColorScheme('green');
                } else if (editingChartIndex) {
                  const updatedColors = {
                    ...localChartColors,
                    [`chart${editingChartIndex}`]: null,
                  };
                  setLocalChartColors(updatedColors);
                  setChartColor(editingChartIndex, null);
                  setSelectedPreset('default');
                }
                setColorPickerOpen(false);
                setEditingChartIndex(null);
                setThemeColorPicker(false);
              }}
            >
              {t(locale, 'admin.settings.resetToDefault')}
            </Button>
            <Button
              onClick={() => {
                setColorPickerOpen(false);
                setEditingChartIndex(null);
                setThemeColorPicker(false);
              }}
            >
              {t(locale, 'admin.common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
