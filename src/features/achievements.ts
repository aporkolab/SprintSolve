import { useGameStore } from '@/stores/gameStore';
/* eslint-disable no-console */
import type { GameEvent } from '@/types';

export interface Achievement {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  readonly hidden: boolean;
  readonly progress: {
    readonly current: number;
    readonly target: number;
  };
  readonly unlocked: boolean;
  readonly unlockedAt?: number;
  readonly category:
    'score' | 'accuracy' | 'speed' | 'persistence' | 'exploration' | 'special';
}

interface AchievementDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly rarity: Achievement['rarity'];
  readonly hidden: boolean;
  readonly category: Achievement['category'];
  readonly condition: (
    _stats: any,
    _progress?: any,
  ) => { achieved: boolean; progress: number; target: number };
}

/**
 * Comprehensive achievements system
 */
export class AchievementSystem {
  private readonly achievements: Map<string, AchievementDefinition> = new Map();
  private readonly eventListeners: Map<
    string,
    ((_event: GameEvent) => void)[]
  > = new Map();
  private progressData: Record<string, any> = {};

  constructor() {
    this.initializeAchievements();
    this.loadProgress();
    this.setupEventListeners();
  }

  /**
   * Initialize all achievements
   */
  private initializeAchievements(): void {
    const definitions: AchievementDefinition[] = [
      // Score-based achievements
      {
        id: 'first_score',
        name: 'First Steps',
        description: 'Score your first point',
        icon: '🎯',
        rarity: 'common',
        hidden: false,
        category: 'score',
        condition: stats => ({
          achieved: stats.totalScore >= 1,
          progress: Math.min(stats.totalScore, 1),
          target: 1,
        }),
      },
      {
        id: 'score_10',
        name: 'Getting Started',
        description: 'Reach a score of 10',
        icon: '🔟',
        rarity: 'common',
        hidden: false,
        category: 'score',
        condition: stats => ({
          achieved: stats.bestScore >= 10,
          progress: Math.min(stats.bestScore, 10),
          target: 10,
        }),
      },
      {
        id: 'score_25',
        name: 'Quarter Century',
        description: 'Reach a score of 25',
        icon: '🏆',
        rarity: 'uncommon',
        hidden: false,
        category: 'score',
        condition: stats => ({
          achieved: stats.bestScore >= 25,
          progress: Math.min(stats.bestScore, 25),
          target: 25,
        }),
      },
      {
        id: 'score_50',
        name: 'Half Century',
        description: 'Reach a score of 50',
        icon: '🥉',
        rarity: 'uncommon',
        hidden: false,
        category: 'score',
        condition: stats => ({
          achieved: stats.bestScore >= 50,
          progress: Math.min(stats.bestScore, 50),
          target: 50,
        }),
      },
      {
        id: 'score_100',
        name: 'Century',
        description: 'Reach a score of 100',
        icon: '🥈',
        rarity: 'rare',
        hidden: false,
        category: 'score',
        condition: stats => ({
          achieved: stats.bestScore >= 100,
          progress: Math.min(stats.bestScore, 100),
          target: 100,
        }),
      },
      {
        id: 'score_250',
        name: 'Master',
        description: 'Reach a score of 250',
        icon: '🥇',
        rarity: 'epic',
        hidden: false,
        category: 'score',
        condition: stats => ({
          achieved: stats.bestScore >= 250,
          progress: Math.min(stats.bestScore, 250),
          target: 250,
        }),
      },
      {
        id: 'score_500',
        name: 'Legend',
        description: 'Reach a score of 500',
        icon: '👑',
        rarity: 'legendary',
        hidden: false,
        category: 'score',
        condition: stats => ({
          achieved: stats.bestScore >= 500,
          progress: Math.min(stats.bestScore, 500),
          target: 500,
        }),
      },

      // Accuracy-based achievements
      {
        id: 'perfect_10',
        name: 'Perfect Ten',
        description: 'Answer 10 questions correctly in a row',
        icon: '💯',
        rarity: 'uncommon',
        hidden: false,
        category: 'accuracy',
        condition: (stats, progress) => ({
          achieved: (progress.maxStreak || 0) >= 10,
          progress: Math.min(progress.maxStreak || 0, 10),
          target: 10,
        }),
      },
      {
        id: 'accuracy_90',
        name: 'Sharp Shooter',
        description: 'Maintain 90% accuracy over 20 questions',
        icon: '🎯',
        rarity: 'rare',
        hidden: false,
        category: 'accuracy',
        condition: stats => {
          const accuracy =
            stats.totalQuestionsAnswered > 0
              ? (stats.correctAnswers / stats.totalQuestionsAnswered) * 100
              : 0;
          return {
            achieved: accuracy >= 90 && stats.totalQuestionsAnswered >= 20,
            progress:
              stats.totalQuestionsAnswered >= 20
                ? accuracy
                : stats.totalQuestionsAnswered,
            target: stats.totalQuestionsAnswered >= 20 ? 90 : 20,
          };
        },
      },

      // Persistence achievements
      {
        id: 'games_10',
        name: 'Persistent Player',
        description: 'Play 10 games',
        icon: '🎮',
        rarity: 'common',
        hidden: false,
        category: 'persistence',
        condition: stats => ({
          achieved: stats.totalGamesPlayed >= 10,
          progress: Math.min(stats.totalGamesPlayed, 10),
          target: 10,
        }),
      },
      {
        id: 'games_50',
        name: 'Dedicated Gamer',
        description: 'Play 50 games',
        icon: '🕹️',
        rarity: 'uncommon',
        hidden: false,
        category: 'persistence',
        condition: stats => ({
          achieved: stats.totalGamesPlayed >= 50,
          progress: Math.min(stats.totalGamesPlayed, 50),
          target: 50,
        }),
      },
      {
        id: 'games_100',
        name: 'Game Master',
        description: 'Play 100 games',
        icon: '🏅',
        rarity: 'rare',
        hidden: false,
        category: 'persistence',
        condition: stats => ({
          achieved: stats.totalGamesPlayed >= 100,
          progress: Math.min(stats.totalGamesPlayed, 100),
          target: 100,
        }),
      },
      {
        id: 'playtime_hour',
        name: 'Time Investment',
        description: 'Play for a total of 1 hour',
        icon: '⏰',
        rarity: 'uncommon',
        hidden: false,
        category: 'persistence',
        condition: stats => ({
          achieved: stats.playTime >= 3600,
          progress: Math.min(stats.playTime, 3600),
          target: 3600,
        }),
      },

      // Exploration achievements
      {
        id: 'categories_5',
        name: 'Explorer',
        description: 'Play in 5 different categories',
        icon: '🗺️',
        rarity: 'uncommon',
        hidden: false,
        category: 'exploration',
        condition: stats => ({
          achieved: stats.categoriesPlayed.length >= 5,
          progress: Math.min(stats.categoriesPlayed.length, 5),
          target: 5,
        }),
      },
      {
        id: 'categories_10',
        name: 'Category Conqueror',
        description: 'Play in 10 different categories',
        icon: '🌍',
        rarity: 'rare',
        hidden: false,
        category: 'exploration',
        condition: stats => ({
          achieved: stats.categoriesPlayed.length >= 10,
          progress: Math.min(stats.categoriesPlayed.length, 10),
          target: 10,
        }),
      },

      // Speed achievements
      {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Reach maximum game speed',
        icon: '💨',
        rarity: 'rare',
        hidden: false,
        category: 'speed',
        condition: (_stats, progress) => ({
          achieved: (progress.maxSpeedReached || 0) >= 12,
          progress: Math.min(progress.maxSpeedReached || 0, 12),
          target: 12,
        }),
      },

      // Special achievements
      {
        id: 'shield_master',
        name: 'Shield Master',
        description: 'Use shields 25 times',
        icon: '🛡️',
        rarity: 'uncommon',
        hidden: false,
        category: 'special',
        condition: (_stats, progress) => ({
          achieved: (progress.shieldsUsed || 0) >= 25,
          progress: Math.min(progress.shieldsUsed || 0, 25),
          target: 25,
        }),
      },
      {
        id: 'comeback_king',
        name: 'Comeback King',
        description: 'Come back from 1 life to score 20+ points',
        icon: '💪',
        rarity: 'epic',
        hidden: false,
        category: 'special',
        condition: (_stats, progress) => ({
          achieved: progress.comebackAchieved || false,
          progress: progress.comebackAchieved ? 1 : 0,
          target: 1,
        }),
      },
      {
        id: 'first_day',
        name: 'Day One Player',
        description: 'Play on the first day of release',
        icon: '🗓️',
        rarity: 'legendary',
        hidden: true,
        category: 'special',
        condition: stats => {
          const releaseDate = new Date('2024-01-01').getTime();
          const firstPlayDate = stats.firstPlayDate || Date.now();
          const oneDayMs = 24 * 60 * 60 * 1000;
          return {
            achieved: firstPlayDate <= releaseDate + oneDayMs,
            progress: firstPlayDate <= releaseDate + oneDayMs ? 1 : 0,
            target: 1,
          };
        },
      },
      {
        id: 'midnight_gamer',
        name: 'Midnight Gamer',
        description: 'Play between midnight and 6 AM',
        icon: '🌙',
        rarity: 'uncommon',
        hidden: true,
        category: 'special',
        condition: (_stats, progress) => ({
          achieved: progress.midnightPlayed || false,
          progress: progress.midnightPlayed ? 1 : 0,
          target: 1,
        }),
      },
      {
        id: 'question_master',
        name: 'Question Master',
        description: 'Answer 1000 questions correctly',
        icon: '🧠',
        rarity: 'epic',
        hidden: false,
        category: 'persistence',
        condition: stats => ({
          achieved: stats.correctAnswers >= 1000,
          progress: Math.min(stats.correctAnswers, 1000),
          target: 1000,
        }),
      },
    ];

    // Register all achievements
    for (const definition of definitions) {
      this.achievements.set(definition.id, definition);
    }
  }

  /**
   * Setup event listeners for real-time achievement tracking
   */
  private setupEventListeners(): void {
    // Track streak
    let currentStreak = 0;
    let maxStreak = this.progressData.maxStreak || 0;

    this.addEventListener('QUESTION_ANSWERED', event => {
      if ('correct' in event && event.correct) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
        this.progressData.maxStreak = maxStreak;
      } else {
        currentStreak = 0;
      }
    });

    // Track maximum speed reached
    this.addEventListener('SPEED_INCREASED', event => {
      if ('speed' in event) {
        this.progressData.maxSpeedReached = Math.max(
          this.progressData.maxSpeedReached || 0,
          event.speed as number,
        );
      }
    });

    // Track shield usage
    this.addEventListener('POWERUP_COLLECTED', event => {
      if ('powerupType' in event && event.powerupType === 'shield') {
        this.progressData.shieldsUsed =
          (this.progressData.shieldsUsed || 0) + 1;
      }
    });

    // Track midnight gaming
    this.addEventListener('GAME_START', () => {
      const hour = new Date().getHours();
      if (hour >= 0 && hour < 6) {
        this.progressData.midnightPlayed = true;
      }
    });

    // Track comeback achievements
    this.addEventListener('SCORE_UPDATED', event => {
      // const gameStore = useGameStore.getState();
      if ('score' in event && 'lives' in event) {
        if (event.lives === 1 && (event.score as number) >= 20) {
          this.progressData.comebackAchieved = true;
        }
      }
    });

    // Save progress periodically
    setInterval(() => this.saveProgress(), 30000); // Every 30 seconds
  }

  /**
   * Add event listener for achievement tracking
   */
  public addEventListener(
    eventType: string,
    callback: (_event: GameEvent) => void,
  ): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * Emit event to trigger achievement checks
   */
  public emitEvent(event: GameEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.warn('Error in achievement event listener:', error);
      }
    }
  }

  /**
   * Update and check all achievements
   */
  public updateAchievements(): Achievement[] {
    const gameStore = useGameStore.getState();
    const stats = gameStore.statistics;
    const unlockedAchievements = gameStore.achievements;
    const newlyUnlocked: Achievement[] = [];

    for (const [id, definition] of this.achievements.entries()) {
      const isAlreadyUnlocked = unlockedAchievements.includes(id);

      if (!isAlreadyUnlocked) {
        const result = definition.condition(stats, this.progressData);

        if (result.achieved) {
          // Achievement unlocked!
          const achievement: Achievement = {
            id: definition.id,
            name: definition.name,
            description: definition.description,
            icon: definition.icon,
            rarity: definition.rarity,
            hidden: definition.hidden,
            progress: {
              current: result.target,
              target: result.target,
            },
            unlocked: true,
            unlockedAt: Date.now(),
            category: definition.category,
          };

          newlyUnlocked.push(achievement);
          gameStore.unlockAchievement(id);
        }
      }
    }

    return newlyUnlocked;
  }

  /**
   * Get all achievements with current progress
   */
  public getAllAchievements(): Achievement[] {
    const gameStore = useGameStore.getState();
    const stats = gameStore.statistics;
    const unlockedAchievements = gameStore.achievements;
    const achievements: Achievement[] = [];

    for (const [id, definition] of this.achievements.entries()) {
      const isUnlocked = unlockedAchievements.includes(id);
      const result = definition.condition(stats, this.progressData);

      const achievement: Achievement = {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        icon: definition.icon,
        rarity: definition.rarity,
        hidden: definition.hidden && !isUnlocked,
        progress: {
          current: result.progress,
          target: result.target,
        },
        unlocked: isUnlocked,
        unlockedAt: undefined, // Could store this separately
        category: definition.category,
      };

      achievements.push(achievement);
    }

    return achievements.sort((a, b) => {
      // Sort by unlocked first, then by rarity, then alphabetically
      if (a.unlocked !== b.unlocked) {
        return a.unlocked ? -1 : 1;
      }

      const rarityOrder = {
        legendary: 0,
        epic: 1,
        rare: 2,
        uncommon: 3,
        common: 4,
      };
      const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity];
      if (rarityDiff !== 0) {
        return rarityDiff;
      }

      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get achievements by category
   */
  public getAchievementsByCategory(
    category: Achievement['category'],
  ): Achievement[] {
    return this.getAllAchievements().filter(
      achievement => achievement.category === category,
    );
  }

  /**
   * Get achievement statistics
   */
  public getAchievementStats(): {
    total: number;
    unlocked: number;
    percentage: number;
    byRarity: Record<
      Achievement['rarity'],
      { total: number; unlocked: number }
    >;
    byCategory: Record<
      Achievement['category'],
      { total: number; unlocked: number }
    >;
  } {
    const achievements = this.getAllAchievements();
    const unlocked = achievements.filter(a => a.unlocked);

    const byRarity: Record<
      Achievement['rarity'],
      { total: number; unlocked: number }
    > = {
      common: { total: 0, unlocked: 0 },
      uncommon: { total: 0, unlocked: 0 },
      rare: { total: 0, unlocked: 0 },
      epic: { total: 0, unlocked: 0 },
      legendary: { total: 0, unlocked: 0 },
    };

    const byCategory: Record<
      Achievement['category'],
      { total: number; unlocked: number }
    > = {
      score: { total: 0, unlocked: 0 },
      accuracy: { total: 0, unlocked: 0 },
      speed: { total: 0, unlocked: 0 },
      persistence: { total: 0, unlocked: 0 },
      exploration: { total: 0, unlocked: 0 },
      special: { total: 0, unlocked: 0 },
    };

    for (const achievement of achievements) {
      byRarity[achievement.rarity].total++;
      byCategory[achievement.category].total++;

      if (achievement.unlocked) {
        byRarity[achievement.rarity].unlocked++;
        byCategory[achievement.category].unlocked++;
      }
    }

    return {
      total: achievements.length,
      unlocked: unlocked.length,
      percentage:
        achievements.length > 0
          ? (unlocked.length / achievements.length) * 100
          : 0,
      byRarity,
      byCategory,
    };
  }

  /**
   * Load progress data from localStorage
   */
  private loadProgress(): void {
    try {
      const saved = localStorage.getItem('sprintsolve-achievement-progress');
      if (saved) {
        this.progressData = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load achievement progress:', error);
    }
  }

  /**
   * Save progress data to localStorage
   */
  private saveProgress(): void {
    try {
      localStorage.setItem(
        'sprintsolve-achievement-progress',
        JSON.stringify(this.progressData),
      );
    } catch (error) {
      console.warn('Failed to save achievement progress:', error);
    }
  }

  /**
   * Get achievement rarity color
   */
  public static getRarityColor(rarity: Achievement['rarity']): string {
    switch (rarity) {
      case 'common':
        return '#9CA3AF';
      case 'uncommon':
        return '#10B981';
      case 'rare':
        return '#3B82F6';
      case 'epic':
        return '#8B5CF6';
      case 'legendary':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  }

  /**
   * Get category display name
   */
  public static getCategoryDisplayName(
    category: Achievement['category'],
  ): string {
    switch (category) {
      case 'score':
        return 'Score';
      case 'accuracy':
        return 'Accuracy';
      case 'speed':
        return 'Speed';
      case 'persistence':
        return 'Persistence';
      case 'exploration':
        return 'Exploration';
      case 'special':
        return 'Special';
      default:
        return 'Unknown';
    }
  }
}

// Global achievement system instance
export const achievementSystem = new AchievementSystem();
