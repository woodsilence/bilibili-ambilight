import { isWatchPageUrl, wrapErrorHandler } from './generic';
import { injectedScript } from './messaging/injected';
import SentryReporter from './errors/sentry-reporter';
import { storage } from './storage';

const THEME_LIGHT = -1;
const THEME_DEFAULT = 0;
const THEME_DARK = 1;

export default class Theming {
  constructor(ambientlight) {
    this.ambientlight = ambientlight;
    this.settings = ambientlight.settings;
  }

  initListeners() {
    this.preferredTheme = this.isDarkTheme() ? THEME_DARK : THEME_LIGHT;

    try {
      matchMedia('(prefers-color-scheme: dark)').addEventListener(
        'change',
        wrapErrorHandler(() => {
          this.preferredTheme = matchMedia('(prefers-color-scheme: dark)').matches
            ? THEME_DARK
            : THEME_LIGHT;
          this.updateTheme();
        }, true)
      );
    } catch (ex) {
      SentryReporter.captureException(ex);
    }

    let themeCorrections = 0;
    this.themeObserver = new MutationObserver(
      wrapErrorHandler(
        function themeMutation() {
          if (!this.shouldToggleTheme()) return;

          themeCorrections++;
          this.updateTheme();
          if (themeCorrections === 5) this.themeObserver.disconnect();
        }.bind(this),
        true
      )
    );
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['dark', 'class', 'data-theme'],
    });
  }

  isDarkTheme = () => {
    const html = document.documentElement;
    return (
      html.getAttribute('dark') != null ||
      html.getAttribute('data-theme') === 'dark' ||
      html.classList.contains('dark') ||
      html.classList.contains('bili-theme-dark') ||
      document.body?.classList.contains('dark') ||
      matchMedia('(prefers-color-scheme: dark)').matches
    );
  };

  shouldBeDarkTheme = (enabledAndVisible) => {
    const enabled =
      enabledAndVisible === undefined
        ? !this.settings.enabled || this.ambientlight.isHidden
        : !enabledAndVisible;
    const toTheme =
      enabled || this.settings.theme === THEME_DEFAULT
        ? this.preferredTheme
        : this.settings.theme;
    return toTheme === THEME_DARK;
  };

  shouldToggleTheme = () => {
    const toDark = this.shouldBeDarkTheme();
    return !(this.isDarkTheme() === toDark || (toDark && !isWatchPageUrl()));
  };

  updateTheme = wrapErrorHandler(
    async function updateTheme(fromSettings = false) {
      if (
        this.updatingTheme ||
        (!fromSettings && this.settings.theme === THEME_DEFAULT) ||
        !this.shouldToggleTheme()
      )
        return;

      this.updatingTheme = true;

      if (this.themeToggleFailed !== false) {
        const lastFailedThemeToggle = await new Promise(
          // eslint-disable-next-line no-async-promise-executor
          async (resolve, reject) => {
            try {
              let timeout = setTimeout(() => {
                timeout = undefined;
                resolve();
              }, 5000);
              const result = await storage.get('last-failed-theme-toggle');
              if (!timeout) return;

              clearTimeout(timeout);
              resolve(result);
            } catch (ex) {
              reject(ex);
            }
          }
        );

        if (lastFailedThemeToggle) {
          const now = new Date().getTime();
          const withinThresshold = now - 10000 < lastFailedThemeToggle;
          if (withinThresshold) {
            this.updatingTheme = false;
            return;
          }
          storage.set('last-failed-theme-toggle', undefined);
        }
        if (this.themeToggleFailed) {
          this.settings.setWarning('');
          this.themeToggleFailed = false;
        }

        if (!this.shouldToggleTheme()) {
          this.updatingTheme = false;
          return;
        }
      }

      await this.toggleDarkTheme();
      this.updatingTheme = false;
    }.bind(this),
    true
  );

  async updateDocumentTheme(toDark) {
    await injectedScript.postAndReceiveMessage('update-theme', toDark);
  }

  async toggleDarkTheme() {
    const wasDark = this.isDarkTheme();
    await this.updateDocumentTheme(!wasDark);
    const isDark = this.isDarkTheme();
    if (wasDark !== isDark) return;

    this.themeToggleFailed = true;
    await storage.set('last-failed-theme-toggle', new Date().getTime());
  }
}

