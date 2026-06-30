import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'light',
      locale: 'en',
      themeLocked: false, // Setting to prevent theme changes
      colorScheme: 'green', // Color palette: green, blue, purple, red, orange, custom
      customThemeColor: null, // Custom theme color in HSL format: "h s% l%"
      chartColors: {
        chart1: null, // null means use default
        chart2: null,
        chart3: null,
        chart4: null,
        chart5: null,
      },
      fontFamily: 'google-sans',
      fontSize: 'medium', // Font size: small, medium, large, xlarge
      
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setTheme: (theme) => {
        // Check if theme is locked
        if (get().themeLocked) {
          console.warn('Theme change is locked. Please unlock in settings first.');
          return;
        }
        set({ theme });
        // Apply theme to document with optimized DOM update
        const root = document.documentElement;
        // Use requestAnimationFrame for smoother transition
        requestAnimationFrame(() => {
          if (theme === 'dark') {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
          // Update color scheme after theme change (this will also update gradients)
          const colorScheme = get().colorScheme || 'green';
          get().setColorScheme(colorScheme);
        });
      },
      toggleTheme: () => {
        // Check if theme is locked
        if (get().themeLocked) {
          console.warn('Theme change is locked. Please unlock in settings first.');
          return;
        }
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },
      setThemeLocked: (locked) => set({ themeLocked: locked }),
      setColorScheme: (scheme) => {
        // Apply color scheme to document
        const root = document.documentElement;
        const isDark = root.classList.contains('dark');
        
        // Handle custom color scheme
        if (scheme === 'custom') {
          const customColor = get().customThemeColor;
          if (customColor) {
            const match = customColor.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
            if (match) {
              const h = parseInt(match[1]);
              const s = parseInt(match[2]);
              const l = parseInt(match[3]);
              
              root.style.setProperty('--primary-h', h.toString());
              root.style.setProperty('--primary-s', `${s}%`);
              root.style.setProperty('--primary-l', `${l}%`);
              root.style.setProperty('--primary', customColor);
              root.style.setProperty('--ring', customColor);
              // Sync sidebar accent color to theme
              root.style.setProperty('--sidebar-primary', customColor);
              root.style.setProperty('--sidebar-primary-foreground', isDark ? '0 0% 9%' : '0 0% 98%');
              root.style.setProperty('--sidebar-ring', customColor);
              
              // Create gradients based on the custom color
              const gradientStart = `${h} ${s}% ${isDark ? Math.min(l + 10, 100) : l}%`;
              const gradientEnd = `${h} ${s}% ${isDark ? Math.max(l - 15, 0) : Math.max(l - 15, 0)}%`;
              
              root.style.setProperty('--gradient-start', `hsl(${gradientStart})`);
              root.style.setProperty('--gradient-end', `hsl(${gradientEnd})`);
              
              set({ colorScheme: 'custom' });
              return;
            }
          }
          // If custom color is invalid, fall back to green
          scheme = 'green';
        }
        
        // Color scheme definitions (light mode, dark mode)
        const colorMap = {
          green: { 
            light: { h: 142, s: 76, l: 36 }, 
            dark: { h: 142, s: 69, l: 58 },
            gradients: {
              light: { start: '142 76% 36%', end: '142 76% 25%' },
              dark: { start: '142 69% 58%', end: '142 69% 45%' }
            }
          },
          blue: { 
            light: { h: 217, s: 91, l: 60 }, 
            dark: { h: 217, s: 85, l: 65 },
            gradients: {
              light: { start: '217 91% 60%', end: '217 91% 45%' },
              dark: { start: '217 85% 65%', end: '217 85% 50%' }
            }
          },
          purple: { 
            light: { h: 262, s: 83, l: 58 }, 
            dark: { h: 262, s: 75, l: 65 },
            gradients: {
              light: { start: '262 83% 58%', end: '262 83% 43%' },
              dark: { start: '262 75% 65%', end: '262 75% 50%' }
            }
          },
          red: { 
            light: { h: 0, s: 84, l: 60 }, 
            dark: { h: 0, s: 75, l: 65 },
            gradients: {
              light: { start: '0 84% 60%', end: '0 84% 45%' },
              dark: { start: '0 75% 65%', end: '0 75% 50%' }
            }
          },
          orange: { 
            light: { h: 25, s: 95, l: 53 }, 
            dark: { h: 25, s: 90, l: 60 },
            gradients: {
              light: { start: '25 95% 53%', end: '25 95% 38%' },
              dark: { start: '25 90% 60%', end: '25 90% 45%' }
            }
          },
        };
        
        const colors = colorMap[scheme] || colorMap.green;
        const activeColors = isDark ? colors.dark : colors.light;
        const activeGradients = isDark ? colors.gradients.dark : colors.gradients.light;
        
        // Update CSS variables for primary color
        const primaryValue = `${activeColors.h} ${activeColors.s}% ${activeColors.l}%`;
        root.style.setProperty('--primary-h', activeColors.h);
        root.style.setProperty('--primary-s', `${activeColors.s}%`);
        root.style.setProperty('--primary-l', `${activeColors.l}%`);
        root.style.setProperty('--primary', primaryValue);
        root.style.setProperty('--ring', primaryValue);
        // Sync sidebar colors to theme so sidebar reflects chosen color
        root.style.setProperty('--sidebar-primary', primaryValue);
        root.style.setProperty('--sidebar-primary-foreground', isDark ? '0 0% 9%' : '0 0% 98%');
        root.style.setProperty('--sidebar-ring', primaryValue);
        
        // Always update gradient colors based on theme when selecting a theme
        // This ensures theme-based gradients are applied
        root.style.setProperty('--gradient-start', `hsl(${activeGradients.start})`);
        root.style.setProperty('--gradient-end', `hsl(${activeGradients.end})`);
        
        // Update colorScheme and clear custom color if switching to preset
        if (scheme !== 'custom') {
          set({ colorScheme: scheme, customThemeColor: null });
        } else {
          set({ colorScheme: scheme });
        }
      },
      setCustomThemeColor: (hslValue) => {
        // Save custom color and apply it
        set({ customThemeColor: hslValue, colorScheme: 'custom' });
        get().setColorScheme('custom');
      },
      setChartColor: (chartIndex, hslColor) => {
        const chartColors = get().chartColors || {};
        const updatedColors = {
          ...chartColors,
          [`chart${chartIndex}`]: hslColor,
        };
        set({ chartColors: updatedColors });
        
        // Apply chart color to CSS variable
        const root = document.documentElement;
        if (hslColor) {
          // HSL color format: "12 76% 61%"
          root.style.setProperty(`--chart-${chartIndex}`, hslColor);
        } else {
          // Reset to default - remove custom override
          root.style.removeProperty(`--chart-${chartIndex}`);
        }
      },
      setChartColors: (colors) => {
        set({ chartColors: colors });
        // Apply all chart colors
        const root = document.documentElement;
        [1, 2, 3, 4, 5].forEach((chartIndex) => {
          const color = colors[`chart${chartIndex}`];
          if (color) {
            root.style.setProperty(`--chart-${chartIndex}`, color);
          } else {
            root.style.removeProperty(`--chart-${chartIndex}`);
          }
        });
      },
      setLocale: (locale) => {
        set({ locale });
        // Update document language attribute
        document.documentElement.lang = locale;
      },
      setFontFamily: (_fontFamily) => {
        const fontStack = "'Google Sans', sans-serif";
        set({ fontFamily: 'google-sans' });
        const root = document.documentElement;
        root.style.setProperty('--font-family', fontStack);
        document.body.style.fontFamily = fontStack;
      },
      setFontSize: (fontSize) => {
        set({ fontSize });
        // Apply font size to document
        const root = document.documentElement;
        
        // Font size scale definitions (in rem)
        const fontSizeMap = {
          small: {
            base: '0.875rem',    // 14px
            scale: '0.9',        // 90% of medium
          },
          medium: {
            base: '1rem',        // 16px (default)
            scale: '1',          // 100%
          },
          large: {
            base: '1.125rem',    // 18px
            scale: '1.125',      // 112.5% of medium
          },
          xlarge: {
            base: '1.25rem',     // 20px
            scale: '1.25',       // 125% of medium
          },
        };
        
        const size = fontSizeMap[fontSize] || fontSizeMap.medium;
        root.style.setProperty('--font-size-base', size.base);
        root.style.setProperty('--font-size-scale', size.scale);
        root.style.fontSize = size.base;
      },
      
      // Initialize theme on mount
      initTheme: () => {
        const theme = get().theme;
        const colorScheme = get().colorScheme || 'green';
        const customThemeColor = get().customThemeColor;
        const chartColors = get().chartColors || {};
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        // Initialize color scheme (this will also set gradient colors)
        // If custom color exists, use it; otherwise use the colorScheme
        if (colorScheme === 'custom' && customThemeColor) {
          get().setColorScheme('custom');
        } else {
          get().setColorScheme(colorScheme);
        }
        // Initialize chart colors
        if (chartColors && Object.keys(chartColors).length > 0) {
          get().setChartColors(chartColors);
        }
        // Initialize font family
        const fontFamily = get().fontFamily || 'system';
        get().setFontFamily(fontFamily);
        // Initialize font size
        const fontSize = get().fontSize || 'medium';
        get().setFontSize(fontSize);
      },
      // Initialize locale on mount
      initLocale: () => {
        const locale = get().locale || 'en';
        // Set document language attribute
        document.documentElement.lang = locale;
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ 
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        locale: state.locale,
        themeLocked: state.themeLocked,
        colorScheme: state.colorScheme,
        customThemeColor: state.customThemeColor,
        chartColors: state.chartColors,
        fontFamily: state.fontFamily,
        fontSize: state.fontSize
      }),
    }
  )
);

