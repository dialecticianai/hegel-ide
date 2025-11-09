// Theme management with localStorage persistence and auto mode system preference tracking

export function createThemes() {
  let preferenceListener = null;
  let preferenceMediaQuery = null;

  return {
      // State
      currentTheme: 'auto',

      // Initialize theme from localStorage
      initTheme() {
        const saved = localStorage.getItem('hegel-ide:theme');
        if (saved) {
          try {
            const { selected } = JSON.parse(saved);
            this.currentTheme = selected;
          } catch (e) {
            console.warn('Failed to parse saved theme:', e);
            this.currentTheme = 'auto';
          }
        }

        this.applyTheme();
      },

      // Apply theme class to body
      applyTheme() {
        // Remove all theme classes
        const themeClasses = ['theme-auto', 'theme-dark', 'theme-light', 'theme-synthwave'];
        themeClasses.forEach(cls => document.body.classList.remove(cls));

        // Handle auto mode: detect system preference
        if (this.currentTheme === 'auto') {
          this.setupPreferenceListener();
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else {
          // Manual theme selection
          this.cleanupPreferenceListener();
          document.body.classList.add(`theme-${this.currentTheme}`);
        }
      },

      // Set up system preference change listener for auto mode
      setupPreferenceListener() {
        // Clean up existing listener
        this.cleanupPreferenceListener();

        preferenceMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        preferenceListener = (e) => {
          // Only respond if still in auto mode
          if (this.currentTheme === 'auto') {
            document.body.classList.remove('theme-dark', 'theme-light');
            document.body.classList.add(e.matches ? 'theme-dark' : 'theme-light');
          }
        };

        preferenceMediaQuery.addEventListener('change', preferenceListener);
      },

      // Clean up preference listener when switching away from auto
      cleanupPreferenceListener() {
        if (preferenceMediaQuery && preferenceListener) {
          preferenceMediaQuery.removeEventListener('change', preferenceListener);
          preferenceListener = null;
          preferenceMediaQuery = null;
        }
      },

      // Switch theme and persist to localStorage
      setTheme(theme) {
        this.currentTheme = theme;

        // Save to localStorage
        localStorage.setItem('hegel-ide:theme', JSON.stringify({
          selected: theme
        }));

        // Apply new theme
        this.applyTheme();
      }
    };
}
