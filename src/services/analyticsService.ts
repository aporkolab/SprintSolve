/* eslint-disable no-console, no-undef */
import { v4 as uuidv4 } from 'uuid';

// Define analytics configuration
export interface AnalyticsConfig {
  gtag?: string;
  debugMode?: boolean;
  userConsent?: boolean;
  sessionTimeout?: number;
}

// User behavior tracking types
export interface GameplayEvent {
  event:
    | 'game_start'
    | 'game_end'
    | 'question_answered'
    | 'level_completed'
    | 'achievement_unlocked';
  category?: string;
  difficulty?: string;
  score?: number;
  duration?: number;
  correct?: boolean;
  questionType?: string;
}

export interface UserInteractionEvent {
  event: 'menu_click' | 'settings_change' | 'theme_change' | 'audio_toggle';
  element?: string;
  value?: string | number;
}

export interface PerformanceEvent {
  event: 'performance_metric';
  metric: 'fps' | 'load_time' | 'render_time' | 'memory_usage';
  value: number;
  context?: string;
}

export interface UserSessionData {
  sessionId: string;
  userId: string;
  startTime: number;
  lastActivity: number;
  totalPlayTime: number;
  gamesPlayed: number;
  totalScore: number;
  averageScore: number;
  difficultiesPlayed: string[];
  categoriesPlayed: string[];
  achievementsUnlocked: string[];
}

class AnalyticsService {
  private config: AnalyticsConfig;
  private sessionData: UserSessionData;
  private eventQueue: Array<any> = [];
  private isInitialized = false;
  private performanceObserver?: PerformanceObserver;

  constructor() {
    this.config = this.loadConfig();
    this.sessionData = this.initializeSession();
    this.setupPerformanceMonitoring();
  }

  /**
   * Initialize analytics with Google Analytics 4
   */
  public async initialize(
    config: Partial<AnalyticsConfig> = {},
  ): Promise<void> {
    this.config = { ...this.config, ...config };

    if (!this.config.userConsent) {
      console.log('Analytics: User consent not granted');
      return;
    }

    try {
      // Load Google Analytics 4
      if (this.config.gtag && typeof window !== 'undefined') {
        await this.loadGoogleAnalytics();
      }

      // Initialize session tracking
      this.startSession();

      // Process queued events
      this.processEventQueue();

      this.isInitialized = true;
      console.log('Analytics: Initialized successfully');
    } catch (error) {
      console.error('Analytics: Initialization failed', error);
    }
  }

  /**
   * Track gameplay events
   */
  public trackGameplayEvent(event: GameplayEvent): void {
    const eventData = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionData.sessionId,
      userId: this.sessionData.userId,
    };

    // Update session data based on event
    this.updateSessionData(event);

    // Send to analytics
    this.sendEvent('gameplay_event', eventData);

    // Log for debugging
    if (this.config.debugMode) {
      console.log('Analytics: Gameplay event tracked', eventData);
    }
  }

  /**
   * Track user interaction events
   */
  public trackUserInteraction(event: UserInteractionEvent): void {
    const eventData = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionData.sessionId,
    };

    this.sendEvent('user_interaction', eventData);

    if (this.config.debugMode) {
      console.log('Analytics: User interaction tracked', eventData);
    }
  }

  /**
   * Track performance metrics
   */
  public trackPerformance(event: PerformanceEvent): void {
    const eventData = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionData.sessionId,
    };

    this.sendEvent('performance_metric', eventData);

    if (this.config.debugMode) {
      console.log('Analytics: Performance metric tracked', eventData);
    }
  }

  /**
   * Track custom events
   */
  public trackCustomEvent(
    eventName: string,
    properties: Record<string, any> = {},
  ): void {
    const eventData = {
      event: eventName,
      ...properties,
      timestamp: Date.now(),
      sessionId: this.sessionData.sessionId,
    };

    this.sendEvent('custom_event', eventData);
  }

  /**
   * Set user properties
   */
  public setUserProperties(properties: Record<string, any>): void {
    if (typeof gtag !== 'undefined') {
      gtag('config', this.config.gtag!, {
        user_properties: properties,
      });
    }
  }

  /**
   * Track page views
   */
  public trackPageView(page: string, title?: string): void {
    if (typeof gtag !== 'undefined') {
      gtag('config', this.config.gtag!, {
        page_title: title || page,
        page_location: window.location.href,
      });
    }
  }

  /**
   * Get current session data
   */
  public getSessionData(): UserSessionData {
    return { ...this.sessionData };
  }

  /**
   * Get user engagement metrics
   */
  public getEngagementMetrics(): {
    sessionDuration: number;
    averageSessionDuration: number;
    totalSessions: number;
    bounceRate: number;
  } {
    const sessionDuration = Date.now() - this.sessionData.startTime;
    const totalSessions = parseInt(
      localStorage.getItem('analytics_total_sessions') || '1',
    );
    const totalSessionTime =
      parseInt(localStorage.getItem('analytics_total_session_time') || '0') +
      sessionDuration;
    const averageSessionDuration = totalSessionTime / totalSessions;

    // Calculate bounce rate (sessions with < 30 seconds engagement)
    const shortSessions = parseInt(
      localStorage.getItem('analytics_short_sessions') || '0',
    );
    const bounceRate = (shortSessions / totalSessions) * 100;

    return {
      sessionDuration,
      averageSessionDuration,
      totalSessions,
      bounceRate,
    };
  }

  /**
   * Export analytics data for analysis
   */
  public exportAnalyticsData(): string {
    const data = {
      sessionData: this.sessionData,
      config: this.config,
      engagementMetrics: this.getEngagementMetrics(),
      timestamp: Date.now(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Clear analytics data (GDPR compliance)
   */
  public clearAnalyticsData(): void {
    // Clear localStorage
    const analyticsKeys = Object.keys(localStorage).filter(key =>
      key.startsWith('analytics_'),
    );
    analyticsKeys.forEach(key => localStorage.removeItem(key));

    // Reset session
    this.sessionData = this.initializeSession();

    // Clear event queue
    this.eventQueue = [];

    console.log('Analytics: All data cleared');
  }

  /**
   * Update user consent
   */
  public updateConsent(consent: boolean): void {
    this.config.userConsent = consent;
    localStorage.setItem('analytics_consent', consent.toString());

    if (consent && !this.isInitialized) {
      this.initialize();
    } else if (!consent) {
      this.clearAnalyticsData();
    }
  }

  // Private methods

  private loadConfig(): AnalyticsConfig {
    return {
      gtag: process.env.VITE_GTAG_ID,
      debugMode: process.env.NODE_ENV === 'development',
      userConsent: localStorage.getItem('analytics_consent') === 'true',
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
    };
  }

  private initializeSession(): UserSessionData {
    const existingSession = localStorage.getItem('analytics_session');

    if (existingSession) {
      const session = JSON.parse(existingSession);
      // Check if session is still valid
      if (
        Date.now() - session.lastActivity <
        (this.config.sessionTimeout || 30 * 60 * 1000)
      ) {
        session.lastActivity = Date.now();
        return session;
      }
    }

    // Create new session
    const newSession: UserSessionData = {
      sessionId: uuidv4(),
      userId: localStorage.getItem('analytics_user_id') || uuidv4(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      totalPlayTime: 0,
      gamesPlayed: 0,
      totalScore: 0,
      averageScore: 0,
      difficultiesPlayed: [],
      categoriesPlayed: [],
      achievementsUnlocked: [],
    };

    // Store user ID permanently
    localStorage.setItem('analytics_user_id', newSession.userId);

    return newSession;
  }

  private startSession(): void {
    // Track session start
    this.trackCustomEvent('session_start', {
      user_id: this.sessionData.userId,
      session_id: this.sessionData.sessionId,
    });

    // Set up periodic session updates
    setInterval(() => {
      this.updateSession();
    }, 30000); // Update every 30 seconds

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }

  private updateSession(): void {
    this.sessionData.lastActivity = Date.now();
    this.saveSession();
  }

  private endSession(): void {
    const sessionDuration = Date.now() - this.sessionData.startTime;

    // Update total statistics
    const totalSessions =
      parseInt(localStorage.getItem('analytics_total_sessions') || '0') + 1;
    const totalSessionTime =
      parseInt(localStorage.getItem('analytics_total_session_time') || '0') +
      sessionDuration;

    localStorage.setItem('analytics_total_sessions', totalSessions.toString());
    localStorage.setItem(
      'analytics_total_session_time',
      totalSessionTime.toString(),
    );

    // Check if it was a short session (bounce)
    if (sessionDuration < 30000) {
      const shortSessions =
        parseInt(localStorage.getItem('analytics_short_sessions') || '0') + 1;
      localStorage.setItem(
        'analytics_short_sessions',
        shortSessions.toString(),
      );
    }

    // Track session end
    this.trackCustomEvent('session_end', {
      session_duration: sessionDuration,
      games_played: this.sessionData.gamesPlayed,
      total_score: this.sessionData.totalScore,
    });
  }

  private saveSession(): void {
    localStorage.setItem('analytics_session', JSON.stringify(this.sessionData));
  }

  private updateSessionData(event: GameplayEvent): void {
    switch (event.event) {
      case 'game_start':
        this.sessionData.gamesPlayed++;
        if (
          event.category &&
          !this.sessionData.categoriesPlayed.includes(event.category)
        ) {
          this.sessionData.categoriesPlayed.push(event.category);
        }
        if (
          event.difficulty &&
          !this.sessionData.difficultiesPlayed.includes(event.difficulty)
        ) {
          this.sessionData.difficultiesPlayed.push(event.difficulty);
        }
        break;

      case 'game_end':
        if (event.score) {
          this.sessionData.totalScore += event.score;
          this.sessionData.averageScore =
            this.sessionData.totalScore / this.sessionData.gamesPlayed;
        }
        if (event.duration) {
          this.sessionData.totalPlayTime += event.duration;
        }
        break;

      case 'achievement_unlocked':
        if (
          event.category &&
          !this.sessionData.achievementsUnlocked.includes(event.category)
        ) {
          this.sessionData.achievementsUnlocked.push(event.category);
        }
        break;
    }

    this.saveSession();
  }

  private async loadGoogleAnalytics(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof gtag !== 'undefined') {
        resolve();
        return;
      }

      try {
        // Load gtag script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.gtag}`;
        document.head.appendChild(script);

        // Initialize gtag
        script.onload = () => {
          (window as any).dataLayer = (window as any).dataLayer || [];
          (window as any).gtag = function () {
            (window as any).dataLayer.push(arguments);
          };

          gtag('js', new Date());
          gtag('config', this.config.gtag!, {
            cookie_flags: 'SameSite=None;Secure',
            anonymize_ip: true,
          });

          resolve();
        };

        script.onerror = reject;
      } catch (error) {
        reject(error);
      }
    });
  }

  private sendEvent(eventType: string, eventData: any): void {
    if (!this.isInitialized) {
      // Queue events if not initialized
      this.eventQueue.push({ eventType, eventData });
      return;
    }

    if (typeof gtag !== 'undefined') {
      gtag('event', eventType, eventData);
    }

    // Also send to local storage for offline analysis
    this.storeEventLocally(eventType, eventData);
  }

  private processEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const { eventType, eventData } = this.eventQueue.shift()!;
      this.sendEvent(eventType, eventData);
    }
  }

  private storeEventLocally(eventType: string, eventData: any): void {
    const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    events.push({ eventType, eventData, timestamp: Date.now() });

    // Keep only last 1000 events to prevent storage bloat
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }

    localStorage.setItem('analytics_events', JSON.stringify(events));
  }

  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      // Monitor navigation timing
      this.performanceObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.trackPerformance({
              event: 'performance_metric',
              metric: 'load_time',
              value: navEntry.loadEventEnd - navEntry.loadEventStart,
              context: 'navigation',
            });
          }
        });
      });

      this.performanceObserver.observe({
        entryTypes: ['navigation', 'resource'],
      });
    }

    // Monitor FPS
    let lastTime = performance.now();
    let frames = 0;

    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        this.trackPerformance({
          event: 'performance_metric',
          metric: 'fps',
          value: fps,
          context: 'gameplay',
        });

        frames = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Global declarations
declare global {
  function gtag(_command: string, ..._args: any[]): void;
}
