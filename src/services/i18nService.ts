import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Supported languages configuration
export const SUPPORTED_LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false,
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    rtl: false,
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    rtl: false,
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    rtl: false,
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    rtl: false,
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
    rtl: false,
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    rtl: false,
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    rtl: false,
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    rtl: false,
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    rtl: false,
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    rtl: true,
  },
  he: {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    flag: '🇮🇱',
    rtl: true,
  },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Default translations
export const DEFAULT_TRANSLATIONS = {
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      close: 'Close',
      save: 'Save',
      cancel: 'Cancel',
      yes: 'Yes',
      no: 'No',
      continue: 'Continue',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
    },
    game: {
      title: 'SprintSolve',
      subtitle: 'Test your knowledge at lightning speed!',
      startGame: 'Start Game',
      playAgain: 'Play Again',
      paused: 'Paused',
      gameOver: 'Game Over',
      score: 'Score',
      lives: 'Lives',
      level: 'Level',
      correct: 'Correct!',
      incorrect: 'Incorrect!',
      timeUp: "Time's up!",
      finalScore: 'Final Score',
      newHighScore: 'New High Score!',
      pressToJump: 'Press SPACE or tap to jump',
      pressToContinue: 'Press P to continue',
      shieldUsed: 'Shield Used!',
    },
    menu: {
      play: 'Play',
      settings: 'Settings',
      leaderboard: 'Leaderboard',
      achievements: 'Achievements',
      statistics: 'Statistics',
      about: 'About',
      credits: 'Credits',
      quit: 'Quit',
    },
    settings: {
      title: 'Settings',
      audio: 'Audio',
      graphics: 'Graphics',
      controls: 'Controls',
      language: 'Language',
      theme: 'Theme',
      difficulty: 'Difficulty',
      volume: 'Volume',
      soundEffects: 'Sound Effects',
      music: 'Music',
      fullscreen: 'Fullscreen',
      notifications: 'Notifications',
    },
    categories: {
      generalKnowledge: 'General Knowledge',
      science: 'Science',
      history: 'History',
      geography: 'Geography',
      sports: 'Sports',
      entertainment: 'Entertainment',
      art: 'Art & Literature',
      mythology: 'Mythology',
      politics: 'Politics',
      animals: 'Animals',
    },
    privacy: {
      cookieConsent: 'We value your privacy',
      cookieDescription:
        'We use cookies and similar technologies to enhance your gaming experience.',
      necessary: 'Necessary',
      analytics: 'Analytics',
      marketing: 'Marketing',
      preferences: 'Preferences',
      acceptAll: 'Accept All',
      acceptNecessary: 'Necessary Only',
      customize: 'Customize',
      privacyPolicy: 'Privacy Policy',
    },
  },
} as const;

export interface I18nConfig {
  fallbackLanguage?: SupportedLanguage;
  debug?: boolean;
  loadPath?: string;
}

class I18nService {
  private currentLanguage: SupportedLanguage = 'en';
  private isInitialized = false;
  private changeListeners: Set<(_language: SupportedLanguage) => void> =
    new Set();

  constructor() {
    this.currentLanguage = this.detectLanguage();
  }

  public async initialize(config: I18nConfig = {}): Promise<void> {
    const {
      fallbackLanguage = 'en',
      debug = import.meta.env.DEV,
      loadPath = '/locales/{{lng}}/{{ns}}.json',
    } = config;

    try {
      await i18n
        .use(Backend)
        .use(LanguageDetector)
        .init({
          lng: this.currentLanguage,
          fallbackLng: fallbackLanguage,
          debug,
          backend: { loadPath },
          detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
          },
          resources: {
            en: { translation: DEFAULT_TRANSLATIONS.en },
          },
          interpolation: { escapeValue: false },
        });

      this.isInitialized = true;
      this.currentLanguage = (i18n.language as SupportedLanguage) || 'en';
      this.applyTextDirection();
      // eslint-disable-next-line no-console
      console.log(`I18n initialized with language: ${this.currentLanguage}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize i18n:', error);
      this.isInitialized = true;
    }
  }

  public async changeLanguage(language: SupportedLanguage): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await i18n.changeLanguage(language);
      this.currentLanguage = language;
      this.applyTextDirection();
      localStorage.setItem('i18n_language', language);
      this.changeListeners.forEach(listener => listener(language));
      // eslint-disable-next-line no-console
      console.log(`Language changed to: ${language}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to change language:', error);
    }
  }

  public t(key: string, options?: any): string {
    if (!this.isInitialized) {
      const keys = key.split('.');
      let value: any = DEFAULT_TRANSLATIONS.en;

      for (const k of keys) {
        value = value?.[k];
        if (!value) break;
      }

      return value || key;
    }

    return i18n.t(key, options) as string;
  }

  public getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  public getLanguageConfig(language: SupportedLanguage) {
    return SUPPORTED_LANGUAGES[language];
  }

  public getSupportedLanguages() {
    return Object.values(SUPPORTED_LANGUAGES);
  }

  public isRTL(): boolean {
    return SUPPORTED_LANGUAGES[this.currentLanguage]?.rtl || false;
  }

  public formatNumber(
    number: number,
    options?: Intl.NumberFormatOptions,
  ): string {
    try {
      return new Intl.NumberFormat(this.currentLanguage, options).format(
        number,
      );
    } catch {
      return number.toString();
    }
  }

  public formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    try {
      return new Intl.DateTimeFormat(this.currentLanguage, options).format(
        date,
      );
    } catch {
      return date.toLocaleDateString();
    }
  }

  public onLanguageChange(
    callback: (_language: SupportedLanguage) => void,
  ): () => void {
    this.changeListeners.add(callback);
    return () => this.changeListeners.delete(callback);
  }

  private detectLanguage(): SupportedLanguage {
    const saved = localStorage.getItem('i18n_language') as SupportedLanguage;
    if (saved && saved in SUPPORTED_LANGUAGES) {
      return saved;
    }

    const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
    if (browserLang in SUPPORTED_LANGUAGES) {
      return browserLang;
    }

    for (const lang of navigator.languages) {
      const langCode = lang.split('-')[0] as SupportedLanguage;
      if (langCode in SUPPORTED_LANGUAGES) {
        return langCode;
      }
    }

    return 'en';
  }

  private applyTextDirection(): void {
    const isRTL = this.isRTL();
    const htmlElement = document.documentElement;

    if (isRTL) {
      htmlElement.setAttribute('dir', 'rtl');
      htmlElement.setAttribute('lang', this.currentLanguage);
      document.body.classList.add('rtl');
      document.body.classList.remove('ltr');
    } else {
      htmlElement.setAttribute('dir', 'ltr');
      htmlElement.setAttribute('lang', this.currentLanguage);
      document.body.classList.add('ltr');
      document.body.classList.remove('rtl');
    }
  }
}

export const i18nService = new I18nService();

export const t = (key: string, options?: any): string => {
  return i18nService.t(key, options);
};

export const isRTL = (): boolean => {
  return i18nService.isRTL();
};
