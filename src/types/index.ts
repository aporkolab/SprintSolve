export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface GameObject extends Position, Size {
  readonly isWall?: boolean;
  readonly type?: string;
  // eslint-disable-next-line no-unused-vars
  draw(ctx: CanvasRenderingContext2D, image?: HTMLImageElement): void;
  // eslint-disable-next-line no-unused-vars
  update(gameSpeed: number): void;
}

export interface Character extends Position {
  readonly size: number;
  velocity_y: number;
  readonly gravity: number;
  readonly jump_strength: number;
  jump(): void;
  // eslint-disable-next-line no-unused-vars
  draw(ctx: CanvasRenderingContext2D, characterImage: HTMLImageElement): void;
  update(): void;
}

export interface Obstacle extends GameObject {
  readonly height: number;
  readonly isWall: true;
}

export interface Tunnel extends GameObject {
  readonly height: number;
  readonly isCorrect: boolean;
  readonly answerText: string;
}

export interface PowerUp extends Position {
  readonly size: number;
  readonly type: 'shield' | 'slowmo';
}

export interface Particle extends Position {
  readonly size: number;
  readonly speedX: number;
  readonly speedY: number;
  readonly color: string;
  ttl: number;
  update(): void;
  // eslint-disable-next-line no-unused-vars
  draw(ctx: CanvasRenderingContext2D): void;
}

export interface Question {
  readonly text: string;
  readonly correctAnswer: number | null;
  readonly answers: readonly string[];
  readonly display: boolean;
}

export interface TriviaCategory {
  readonly id: number;
  readonly name: string;
}

export interface TriviaApiQuestion {
  readonly category: string;
  readonly type: string;
  readonly difficulty: string;
  readonly question: string;
  readonly correct_answer: string;
  readonly incorrect_answers: readonly string[];
}

export interface TriviaApiResponse {
  readonly response_code: number;
  readonly results: readonly TriviaApiQuestion[];
}

export interface GameAssets {
  readonly background: HTMLImageElement;
  readonly character: HTMLImageElement;
  readonly obstacle: HTMLImageElement;
}

export interface GameScore {
  value: number;
}

export interface DisplayMessage {
  text: string;
  ttl: number;
  color: string;
}

export type GameState =
  'menu' | 'categorySelect' | 'playing' | 'paused' | 'gameOver';

export type CollisionResult =
  'correct' | 'incorrect' | 'wall' | 'ceiling' | 'floor' | null;

export interface GameConfig {
  readonly initialGameSpeed: number;
  readonly characterSize: number;
  readonly jumpStrength: number;
  readonly gravity: number;
  readonly powerupSpawnChance: number;
  readonly maxTunnels: number;
}

// Audio types
export interface AudioManager {
  playJump(): void;
  playScore(): void;
  playGameOver(): void;
  playBackgroundMusic(): void;
  stopBackgroundMusic(): void;
  // eslint-disable-next-line no-unused-vars
  setVolume(volume: number): void;
  mute(): void;
  unmute(): void;
}

// State management types
export interface GameStateStore {
  gameState: GameState;
  score: GameScore;
  hasShield: boolean;
  gameSpeed: number;
  selectedCategoryId: number | null;

  // Actions
  // eslint-disable-next-line no-unused-vars
  setGameState: (state: GameState) => void;
  incrementScore: () => void;
  resetScore: () => void;
  // eslint-disable-next-line no-unused-vars
  setShield: (hasShield: boolean) => void;
  // eslint-disable-next-line no-unused-vars
  setGameSpeed: (speed: number) => void;
  // eslint-disable-next-line no-unused-vars
  setSelectedCategory: (categoryId: number) => void;
  resetGame: () => void;
}

// Event types
export type GameEvent =
  | { type: 'JUMP' }
  | { type: 'COLLISION'; result: CollisionResult }
  | { type: 'POWERUP_COLLECTED'; powerupType: string }
  | { type: 'QUESTION_ANSWERED'; correct: boolean }
  | { type: 'GAME_OVER' }
  | { type: 'GAME_RESTART' };

// Performance monitoring
export interface PerformanceMetrics {
  readonly fps: number;
  readonly frameTime: number;
  readonly renderTime: number;
  readonly updateTime: number;
}

// Accessibility
export interface AccessibilityOptions {
  readonly highContrast: boolean;
  readonly reducedMotion: boolean;
  readonly fontSize: 'small' | 'medium' | 'large';
  readonly soundEnabled: boolean;
}

export interface UserPreferences extends AccessibilityOptions {
  readonly theme: 'light' | 'dark' | 'auto';
  readonly volume: number;
  readonly language: string;
}
