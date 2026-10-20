/* eslint-disable no-console */
import {
  i18nService,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  t,
} from '../services/i18nService';
import { analyticsService } from '../services/analyticsService';

export interface LanguageSelectorConfig {
  position?:
    'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  showFlags?: boolean;
  showNames?: boolean;
  compact?: boolean;
  onLanguageChange?: (_language: SupportedLanguage) => void;
}

export class LanguageSelector {
  private container: HTMLElement | null = null;
  private dropdown: HTMLElement | null = null;
  private config: LanguageSelectorConfig;
  private isOpen = false;
  private currentLanguage: SupportedLanguage;

  constructor(config: LanguageSelectorConfig = {}) {
    this.config = {
      position: 'top-right',
      showFlags: true,
      showNames: true,
      compact: false,
      ...config,
    };

    this.currentLanguage = i18nService.getCurrentLanguage();
    this.create();
    this.setupEventListeners();
  }

  /**
   * Create the language selector UI
   */
  private create(): void {
    // Create container
    this.container = document.createElement('div');
    this.container.className = `language-selector ${this.config.position} ${this.config.compact ? 'compact' : ''}`;

    // Create current language button
    const currentButton = document.createElement('button');
    currentButton.className = 'current-language-btn';
    currentButton.setAttribute('aria-haspopup', 'true');
    currentButton.setAttribute('aria-expanded', 'false');
    currentButton.setAttribute(
      'aria-label',
      t('accessibility.languageSelector'),
    );

    this.updateCurrentLanguageButton(currentButton);

    // Create dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'language-dropdown';
    this.dropdown.setAttribute('role', 'menu');
    this.dropdown.setAttribute('aria-label', t('settings.language'));

    this.createDropdownItems();

    // Assemble
    this.container.appendChild(currentButton);
    this.container.appendChild(this.dropdown);

    // Add styles
    this.addStyles();

    // Add to DOM
    document.body.appendChild(this.container);
  }

  /**
   * Update the current language button content
   */
  private updateCurrentLanguageButton(button: HTMLElement): void {
    const langConfig = SUPPORTED_LANGUAGES[this.currentLanguage];
    const flagSpan = this.config.showFlags
      ? `<span class="flag">${langConfig.flag}</span>`
      : '';
    const nameSpan =
      this.config.showNames && !this.config.compact
        ? `<span class="name">${langConfig.nativeName}</span>`
        : '';
    const chevron = '<span class="chevron">▼</span>';

    button.innerHTML = `${flagSpan}${nameSpan}${chevron}`;
    button.setAttribute(
      'title',
      `${t('settings.language')}: ${langConfig.nativeName}`,
    );
  }

  /**
   * Create dropdown items for all supported languages
   */
  private createDropdownItems(): void {
    if (!this.dropdown) return;

    this.dropdown.innerHTML = '';

    Object.values(SUPPORTED_LANGUAGES).forEach(langConfig => {
      const item = document.createElement('button');
      item.className = `language-item ${langConfig.code === this.currentLanguage ? 'active' : ''}`;
      item.setAttribute('role', 'menuitem');
      item.setAttribute('data-language', langConfig.code);
      item.setAttribute(
        'aria-label',
        `${t('settings.language')}: ${langConfig.nativeName}`,
      );

      const flagSpan = this.config.showFlags
        ? `<span class="flag">${langConfig.flag}</span>`
        : '';
      const nameSpan = this.config.showNames
        ? `<span class="name">${langConfig.nativeName}</span>`
        : '';
      const checkmark =
        langConfig.code === this.currentLanguage
          ? '<span class="checkmark">✓</span>'
          : '';

      item.innerHTML = `${flagSpan}${nameSpan}${checkmark}`;

      // Add click handler
      item.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();
        await this.selectLanguage(langConfig.code);
      });

      this.dropdown?.appendChild(item);
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.container) return;

    const currentButton = this.container.querySelector(
      '.current-language-btn',
    ) as HTMLElement;

    // Toggle dropdown on button click
    currentButton?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', e => {
      if (!this.container?.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });

    // Handle keyboard navigation
    currentButton?.addEventListener('keydown', e => {
      switch (e.key) {
        case 'Enter':
        case ' ':
        case 'ArrowDown':
          e.preventDefault();
          this.openDropdown();
          this.focusFirstItem();
          break;
        case 'Escape':
          this.closeDropdown();
          break;
      }
    });

    // Handle dropdown keyboard navigation
    this.dropdown?.addEventListener('keydown', e => {
      this.handleDropdownKeydown(e);
    });

    // Listen for language changes from other sources
    i18nService.onLanguageChange(language => {
      this.currentLanguage = language;
      this.updateCurrentLanguageButton(currentButton);
      this.createDropdownItems();
    });
  }

  /**
   * Handle keyboard navigation in dropdown
   */
  private handleDropdownKeydown(e: KeyboardEvent): void {
    if (!this.dropdown) return;

    const items = Array.from(
      this.dropdown.querySelectorAll('.language-item'),
    ) as HTMLElement[];
    const currentIndex = items.findIndex(
      item => item === document.activeElement,
    );

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex]?.focus();
        break;
      }

      case 'ArrowUp': {
        e.preventDefault();
        const prevIndex =
          currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        items[prevIndex]?.focus();
        break;
      }

      case 'Enter':
      case ' ':
        e.preventDefault();
        (document.activeElement as HTMLElement)?.click();
        break;

      case 'Escape':
        e.preventDefault();
        this.closeDropdown();
        (
          this.container?.querySelector('.current-language-btn') as HTMLElement
        )?.focus();
        break;

      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;

      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
    }
  }

  /**
   * Select a language
   */
  private async selectLanguage(language: SupportedLanguage): Promise<void> {
    if (language === this.currentLanguage) {
      this.closeDropdown();
      return;
    }

    try {
      // Track language change
      analyticsService.trackUserInteraction({
        event: 'settings_change',
        element: 'language_selector',
        value: language,
      });

      // Change language
      await i18nService.changeLanguage(language);
      this.currentLanguage = language;

      // Update UI
      const currentButton = this.container?.querySelector(
        '.current-language-btn',
      ) as HTMLElement;
      this.updateCurrentLanguageButton(currentButton);
      this.createDropdownItems();

      // Close dropdown
      this.closeDropdown();

      // Notify callback
      this.config.onLanguageChange?.(language);

      // Dispatch custom event
      document.dispatchEvent(
        new CustomEvent('language-changed', {
          detail: { language, config: SUPPORTED_LANGUAGES[language] },
        }),
      );
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  }

  /**
   * Toggle dropdown open/closed
   */
  private toggleDropdown(): void {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
   * Open dropdown
   */
  private openDropdown(): void {
    if (!this.dropdown || !this.container) return;

    this.isOpen = true;
    this.dropdown.classList.add('open');
    this.container.classList.add('open');

    const currentButton = this.container.querySelector('.current-language-btn');
    currentButton?.setAttribute('aria-expanded', 'true');
  }

  /**
   * Close dropdown
   */
  private closeDropdown(): void {
    if (!this.dropdown || !this.container) return;

    this.isOpen = false;
    this.dropdown.classList.remove('open');
    this.container.classList.remove('open');

    const currentButton = this.container.querySelector('.current-language-btn');
    currentButton?.setAttribute('aria-expanded', 'false');
  }

  /**
   * Focus first dropdown item
   */
  private focusFirstItem(): void {
    const firstItem = this.dropdown?.querySelector(
      '.language-item',
    ) as HTMLElement;
    firstItem?.focus();
  }

  /**
   * Add CSS styles
   */
  private addStyles(): void {
    const styleId = 'language-selector-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .language-selector {
        position: fixed;
        z-index: 1000;
        font-family: 'Press Start 2P', monospace;
      }

      .language-selector.top-left {
        top: 1rem;
        left: 1rem;
      }

      .language-selector.top-right {
        top: 1rem;
        right: 1rem;
      }

      .language-selector.bottom-left {
        bottom: 1rem;
        left: 1rem;
      }

      .language-selector.bottom-right {
        bottom: 1rem;
        right: 1rem;
      }

      .language-selector.center {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }

      .current-language-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid #FF6A00;
        border-radius: 6px;
        color: white;
        font-family: inherit;
        font-size: 0.6rem;
        cursor: pointer;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
      }

      .current-language-btn:hover {
        background: rgba(255, 106, 0, 0.1);
        border-color: #FF8A20;
        transform: translateY(-1px);
      }

      .current-language-btn:focus {
        outline: 2px solid #FF6A00;
        outline-offset: 2px;
      }

      .language-selector.compact .current-language-btn {
        padding: 0.4rem;
        min-width: 2.5rem;
        justify-content: center;
      }

      .language-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 0.5rem;
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #FF6A00;
        border-radius: 6px;
        backdrop-filter: blur(10px);
        min-width: 200px;
        max-height: 300px;
        overflow-y: auto;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.2s ease;
      }

      .language-dropdown.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .language-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.75rem 1rem;
        background: transparent;
        border: none;
        color: white;
        font-family: inherit;
        font-size: 0.5rem;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
      }

      .language-item:hover {
        background: rgba(255, 106, 0, 0.2);
      }

      .language-item:focus {
        background: rgba(255, 106, 0, 0.3);
        outline: none;
      }

      .language-item.active {
        background: rgba(255, 106, 0, 0.1);
        color: #FF6A00;
      }

      .language-item .flag {
        font-size: 0.8rem;
        min-width: 1.2rem;
      }

      .language-item .name {
        flex: 1;
      }

      .language-item .checkmark {
        color: #4CAF50;
        font-size: 0.6rem;
      }

      .current-language-btn .chevron {
        transition: transform 0.2s ease;
        font-size: 0.4rem;
      }

      .language-selector.open .current-language-btn .chevron {
        transform: rotate(180deg);
      }

      /* RTL support */
      .rtl .language-selector.top-right {
        right: auto;
        left: 1rem;
      }

      .rtl .language-selector.top-left {
        left: auto;
        right: 1rem;
      }

      .rtl .language-dropdown {
        right: auto;
        left: 0;
      }

      .rtl .language-item {
        text-align: right;
        flex-direction: row-reverse;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .language-selector {
          position: fixed;
        }
        
        .language-selector.top-right {
          top: 0.5rem;
          right: 0.5rem;
        }

        .current-language-btn {
          font-size: 0.5rem;
          padding: 0.4rem 0.6rem;
        }

        .language-dropdown {
          min-width: 180px;
          max-height: 250px;
        }

        .language-item {
          padding: 0.6rem 0.8rem;
          font-size: 0.45rem;
        }
      }

      /* Dark/Light theme support */
      @media (prefers-color-scheme: light) {
        .current-language-btn {
          background: rgba(255, 255, 255, 0.9);
          color: #333;
        }

        .language-dropdown {
          background: rgba(255, 255, 255, 0.95);
        }

        .language-item {
          color: #333;
        }

        .language-item:hover {
          background: rgba(255, 106, 0, 0.1);
        }
      }

      /* Animation for dropdown scroll */
      .language-dropdown::-webkit-scrollbar {
        width: 4px;
      }

      .language-dropdown::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
      }

      .language-dropdown::-webkit-scrollbar-thumb {
        background: #FF6A00;
        border-radius: 2px;
      }

      .language-dropdown::-webkit-scrollbar-thumb:hover {
        background: #FF8A20;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<LanguageSelectorConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.container) {
      // Remove old position class
      this.container.className = this.container.className.replace(
        /(top-left|top-right|bottom-left|bottom-right|center)/g,
        '',
      );

      // Add new classes
      this.container.className += ` ${this.config.position} ${this.config.compact ? 'compact' : ''}`;

      // Update button content
      const currentButton = this.container.querySelector(
        '.current-language-btn',
      ) as HTMLElement;
      this.updateCurrentLanguageButton(currentButton);
      this.createDropdownItems();
    }
  }

  /**
   * Show the language selector
   */
  public show(): void {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  /**
   * Hide the language selector
   */
  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
    this.closeDropdown();
  }

  /**
   * Destroy the language selector
   */
  public destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.dropdown = null;
    }
  }

  /**
   * Get current selected language
   */
  public getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }
}

// Export singleton instance
export const languageSelector = new LanguageSelector();
