import { character } from './character';
import {
  updateObstacles,
  drawObstacles,
  checkCollisions,
  generateWallWithTunnels,
  clearObstacles,
} from './obstacles';
import { questionState, triviaService } from './questions';
import { gameStore } from './stores/gameStore';
import {
  audioManager,
  playJumpSound,
  playScoreSound,
  playGameOverSound,
  playBackgroundMusic,
  stopBackgroundMusic,
} from './audio';
import {
  updateParticles,
  drawParticles,
  createExplosion,
  clearParticles,
} from './particles';
import { loadGameAssets } from './assets';
import { analyticsService } from './services/analyticsService';
import './components/ConsentManager'; // Initialize consent manager
import { i18nService, t } from './services/i18nService';
import './components/LanguageSelector'; // Initialize language selector
/* eslint-disable no-console */
import type { GameAssets, DisplayMessage, PerformanceMetrics } from './types';

/**
 * Game engine class with modern architecture
 */
class GameEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private assets: GameAssets | null = null;
  private displayMessage: DisplayMessage = { text: '', ttl: 0, color: 'white' };
  private collisionProcessed = false;
  private roundJustStarted = true;
  private animationId: number | null = null;
  private lastFrameTime = 0;
  private performanceMetrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    renderTime: 0,
    updateTime: 0,
  };

  // Game state from Zustand store
  private gameStore = gameStore.getState();
  private gameActions = gameStore.getState();

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with id '${canvasId}' not found`);
    }

    this.canvas = canvas;
    this.canvas.dataset.gameState = 'loading';
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.setupCanvas();
    this.setupEventListeners();

    // Show loading screen immediately
    this.showLoadingScreen();

    // Subscribe to store changes
    gameStore.subscribe(state => {
      this.gameStore = state;
      this.canvas.dataset.gameState = state.gameState;
    });
  }

  /**
   * Initialize the game engine
   */
  public async init(): Promise<void> {
    try {
      this.showLoadingScreen();

      // Load assets
      this.assets = await loadGameAssets();

      // Optional remote audio must not block the game when unavailable.
      void audioManager.preloadAll();

      // Initialize internationalization
      await i18nService.initialize();

      // Initialize analytics (will respect user consent)
      await analyticsService.initialize();

      // Track game initialization
      analyticsService.trackCustomEvent('game_initialized', {
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        language: i18nService.getCurrentLanguage(),
      });

      // Start the game loop
      this.gameActions.setGameState('menu');
      this.startGameLoop();

      console.log('Game engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize game engine:', error);
      this.canvas.dataset.gameState = 'error';
      this.showErrorScreen(
        'Failed to load game assets. Please refresh and try again.',
      );

      // Track initialization failure
      analyticsService.trackCustomEvent('game_initialization_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Setup canvas properties
   */
  private setupCanvas(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  /**
   * Resize canvas to window size
   */
  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Reset character position after resize
    if (this.gameStore.gameState === 'playing') {
      character.reset(this.canvas.height);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Keyboard controls
    document.addEventListener('keydown', event => this.handleKeyDown(event));

    // Mouse/touch controls
    this.canvas.addEventListener('click', event => this.handleClick(event));
    this.canvas.addEventListener('touchstart', event =>
      this.handleTouch(event),
    );

    // Window visibility changes
    document.addEventListener('visibilitychange', () =>
      this.handleVisibilityChange(),
    );

    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  /**
   * Handle keyboard input
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const { code } = event;

    switch (code) {
      case 'Space':
      case 'ArrowUp':
        if (this.gameStore.gameState === 'playing') {
          this.handleJump();
        }
        event.preventDefault();
        break;

      case 'KeyP':
        if (this.gameStore.gameState === 'playing') {
          this.gameActions.setGameState('paused');
        } else if (this.gameStore.gameState === 'paused') {
          this.gameActions.setGameState('playing');
        }
        break;

      case 'KeyM':
        audioManager.toggleMute();
        break;

      case 'Escape':
        if (this.gameStore.gameState === 'playing') {
          this.gameActions.setGameState('paused');
        }
        break;
    }
  }

  /**
   * Handle mouse clicks
   */
  private handleClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    switch (this.gameStore.gameState) {
      case 'gameOver':
        this.handleGameOverClick(x, y);
        break;

      case 'menu':
        this.handleMenuClick(x, y);
        break;

      case 'playing':
        this.handleJump();
        break;
    }
  }

  /**
   * Handle touch events
   */
  private handleTouch(event: TouchEvent): void {
    event.preventDefault();

    if (this.gameStore.gameState === 'playing') {
      this.handleJump();
    }
  }

  /**
   * Handle visibility changes (pause when tab is hidden)
   */
  private handleVisibilityChange(): void {
    if (document.hidden && this.gameStore.gameState === 'playing') {
      this.gameActions.setGameState('paused');
    }
  }

  /**
   * Handle jump action
   */
  private handleJump(): void {
    if (this.roundJustStarted) {
      (character as any).gravity = 0.5;
      this.roundJustStarted = false;
    }

    character.jump();
    playJumpSound();
  }

  /**
   * Handle game over screen clicks
   */
  private handleGameOverClick(x: number, y: number): void {
    const buttonX = this.canvas.width / 2 - 100;
    const buttonY = this.canvas.height / 2 + 20;
    const buttonWidth = 200;
    const buttonHeight = 50;

    if (
      x >= buttonX &&
      x <= buttonX + buttonWidth &&
      y >= buttonY &&
      y <= buttonY + buttonHeight
    ) {
      this.restartGame();
    }
  }

  /**
   * Handle menu screen clicks
   */
  private handleMenuClick(x: number, y: number): void {
    const buttonX = this.canvas.width / 2 - 100;
    const buttonY = this.canvas.height / 2 + 20;
    const buttonWidth = 200;
    const buttonHeight = 50;

    if (
      x >= buttonX &&
      x <= buttonX + buttonWidth &&
      y >= buttonY &&
      y <= buttonY + buttonHeight
    ) {
      // Track menu interaction
      analyticsService.trackUserInteraction({
        event: 'menu_click',
        element: 'start_game_button',
      });

      this.startGame();
    }
  }

  /**
   * Start a new game
   */
  private async startGame(): Promise<void> {
    try {
      this.gameActions.setGameState('playing');
      this.gameActions.resetScore();

      // Set default category if none selected
      if (!this.gameStore.selectedCategoryId) {
        this.gameActions.setSelectedCategory(9); // General Knowledge
      }

      // Track game start
      analyticsService.trackGameplayEvent({
        event: 'game_start',
        category: this.gameStore.selectedCategoryId?.toString() || '9',
        difficulty: 'normal',
      });

      playBackgroundMusic();
      await this.resetForNewRound();
    } catch (error) {
      console.error('Failed to start game:', error);
      this.showTemporaryMessage('Failed to start game', 120, 'red');
    }
  }

  /**
   * Restart the game
   */
  private restartGame(): void {
    this.gameActions.resetGame();
    clearObstacles();
    clearParticles();
    this.startGame();
  }

  /**
   * Reset for a new round
   */
  private async resetForNewRound(): Promise<void> {
    character.reset(this.canvas.height);

    try {
      await triviaService.fetchQuestion(this.gameStore.selectedCategoryId || 9);
      generateWallWithTunnels(this.canvas, questionState);

      this.collisionProcessed = false;
      this.roundJustStarted = true;
    } catch (error) {
      console.error('Failed to reset for new round:', error);
      this.showTemporaryMessage('Failed to load question', 120, 'red');
    }
  }

  /**
   * Handle game over
   */
  private gameOver(): void {
    stopBackgroundMusic();
    playGameOverSound();
    createExplosion(character.x, character.y);

    // Track game end
    analyticsService.trackGameplayEvent({
      event: 'game_end',
      score: this.gameStore.score.value,
      category: this.gameStore.selectedCategoryId?.toString() || '9',
      difficulty: 'normal',
      duration: Date.now() - Date.now(),
    });

    this.gameActions.setGameState('gameOver');
  }

  /**
   * Show temporary message
   */
  private showTemporaryMessage(
    text: string,
    durationInFrames: number,
    color = 'white',
  ): void {
    this.displayMessage = { text, ttl: durationInFrames, color };
  }

  /**
   * Main game loop
   */
  private startGameLoop(): void {
    const gameLoop = (currentTime: number): void => {
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      // Calculate performance metrics
      const updateStartTime = performance.now();
      this.update(deltaTime);
      const updateEndTime = performance.now();

      const renderStartTime = performance.now();
      this.render();
      const renderEndTime = performance.now();

      this.performanceMetrics = {
        fps: 1000 / deltaTime,
        frameTime: deltaTime,
        updateTime: updateEndTime - updateStartTime,
        renderTime: renderEndTime - renderStartTime,
      };

      // Track performance metrics periodically (every 5 seconds)
      if (Math.random() < 0.01) {
        // ~1% of frames at 60fps = ~every 1.6 seconds
        analyticsService.trackPerformance({
          event: 'performance_metric',
          metric: 'fps',
          value: this.performanceMetrics.fps,
          context: this.gameStore.gameState,
        });
      }

      this.animationId = requestAnimationFrame(gameLoop);
    };

    this.animationId = requestAnimationFrame(gameLoop);
  }

  /**
   * Update game logic
   */
  private update(deltaTime: number): void {
    // deltaTime parameter reserved for future use in frame-rate dependent calculations
    void deltaTime; // Acknowledge parameter for future use
    if (!this.assets) return;

    switch (this.gameStore.gameState) {
      case 'playing':
        this.updateGameplay();
        break;

      case 'paused':
        // Don't update gameplay when paused
        break;

      default:
        // Update particles and other visual effects in all states
        updateParticles();
        break;
    }

    // Update display message timer
    if (this.displayMessage.ttl > 0) {
      this.displayMessage.ttl--;
    }
  }

  /**
   * Update gameplay logic
   */
  private updateGameplay(): void {
    character.update();
    updateObstacles(this.gameStore.gameSpeed);
    updateParticles();

    // Check collisions
    if (!this.collisionProcessed) {
      const collisionResult = checkCollisions(character, this.canvas);

      if (collisionResult) {
        this.handleCollision(collisionResult);
      }
    }

    // Check if obstacle passed without collision (incorrect answer)
    // This is a simplified check - in production, you'd want more sophisticated logic
    // const currentObstacles = this.gameStore; // Get from store or obstacles module
    // Implementation depends on obstacle system...
  }

  /**
   * Handle collision results
   */
  private handleCollision(result: string): void {
    this.collisionProcessed = true;

    switch (result) {
      case 'correct':
        this.handleCorrectAnswer();
        break;

      case 'incorrect':
        this.handleIncorrectAnswer();
        break;

      case 'wall':
      case 'ceiling':
      case 'floor':
        this.handleWallCollision();
        break;
    }
  }

  /**
   * Handle correct answer
   */
  private handleCorrectAnswer(): void {
    playScoreSound();
    this.gameActions.incrementScore();
    this.gameActions.addExperience(10);
    this.showTemporaryMessage(t('game.correct'), 60, 'green');

    // Track correct answer
    analyticsService.trackGameplayEvent({
      event: 'question_answered',
      correct: true,
      category: this.gameStore.selectedCategoryId?.toString() || '9',
      questionType: 'multiple',
    });

    // Increase difficulty
    const newSpeed = Math.min(this.gameStore.gameSpeed + 0.2, 12);
    this.gameActions.setGameSpeed(newSpeed);

    setTimeout(() => {
      this.resetForNewRound().catch(console.error);
    }, 500);
  }

  /**
   * Handle incorrect answer
   */
  private handleIncorrectAnswer(): void {
    this.showTemporaryMessage(t('game.incorrect'), 60, 'red');
    this.gameActions.decrementLives();

    // Track incorrect answer
    analyticsService.trackGameplayEvent({
      event: 'question_answered',
      correct: false,
      category: this.gameStore.selectedCategoryId?.toString() || '9',
      questionType: 'multiple',
    });

    if (this.gameStore.lives > 0) {
      setTimeout(() => {
        this.resetForNewRound().catch(console.error);
      }, 500);
    }
  }

  /**
   * Handle wall collision
   */
  private handleWallCollision(): void {
    if (this.gameStore.hasShield) {
      this.gameActions.setShield(false);
      this.showTemporaryMessage(t('game.shieldUsed'), 60, 'blue');
      // Push obstacles back
      setTimeout(() => {
        this.collisionProcessed = false;
      }, 100);
    } else {
      this.gameOver();
    }
  }

  /**
   * Render the game
   */
  private render(): void {
    if (!this.assets) {
      this.showLoadingScreen();
      return;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background
    this.ctx.drawImage(
      this.assets.background,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );

    // Render based on game state
    switch (this.gameStore.gameState) {
      case 'menu':
        this.renderMenu();
        break;

      case 'playing':
      case 'paused':
        this.renderGameplay();
        if (this.gameStore.gameState === 'paused') {
          this.renderPauseOverlay();
        }
        break;

      case 'gameOver':
        this.renderGameplay();
        this.renderGameOverScreen();
        break;
    }

    // Always render particles
    drawParticles(this.ctx);

    // Render performance metrics in debug mode
    if (import.meta.env.DEV) {
      this.renderDebugInfo();
    }
  }

  /**
   * Render menu screen
   */
  private renderMenu(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = '40px "Press Start 2P"';
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      t('game.title'),
      this.canvas.width / 2,
      this.canvas.height / 2 - 80,
    );

    // Start button
    this.ctx.fillStyle = '#FF6A00';
    this.ctx.fillRect(
      this.canvas.width / 2 - 100,
      this.canvas.height / 2 + 20,
      200,
      50,
    );
    this.ctx.font = '20px "Press Start 2P"';
    this.ctx.fillStyle = 'white';
    this.ctx.fillText(
      t('game.startGame'),
      this.canvas.width / 2,
      this.canvas.height / 2 + 55,
    );

    // Stats display
    this.renderStats();
  }

  /**
   * Render gameplay elements
   */
  private renderGameplay(): void {
    // Draw character
    character.draw(this.ctx, this.assets!.character);

    // Draw obstacles
    drawObstacles(this.ctx, this.assets!.obstacle);

    // Draw UI elements
    this.renderUI();
  }

  /**
   * Render UI elements
   */
  private renderUI(): void {
    // Score
    this.ctx.font = '20px "Press Start 2P"';
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(
      `${t('game.score')}: ${this.gameStore.score.value}`,
      10,
      30,
    );

    // Lives
    this.ctx.fillText(`${t('game.lives')}: ${this.gameStore.lives}`, 10, 60);

    // Level
    this.ctx.fillText(`${t('game.level')}: ${this.gameStore.level}`, 10, 90);

    // Shield indicator
    if (this.gameStore.hasShield) {
      this.ctx.fillStyle = 'blue';
      this.ctx.fillText('🛡️', 10, 120);
    }

    // Question
    if (questionState.display) {
      this.renderQuestion();
    }

    // Temporary messages
    if (this.displayMessage.ttl > 0) {
      this.renderMessage(this.displayMessage);
    }
  }

  /**
   * Render question
   */
  private renderQuestion(): void {
    this.ctx.font = '18px "Press Start 2P"';
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'center';

    // const maxWidth = this.canvas.width * 0.8;
    const x = this.canvas.width / 2;
    const y = 50;

    // Simple text rendering - could be improved with word wrapping
    this.ctx.fillText(questionState.text, x, y);
  }

  /**
   * Render temporary message
   */
  private renderMessage(message: DisplayMessage): void {
    this.ctx.font = '30px "Press Start 2P"';
    this.ctx.fillStyle = message.color;
    this.ctx.textAlign = 'center';

    // Background
    const textWidth = this.ctx.measureText(message.text).width;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(
      this.canvas.width / 2 - textWidth / 2 - 20,
      this.canvas.height / 2 - 40,
      textWidth + 40,
      70,
    );

    // Text
    this.ctx.fillStyle = message.color;
    this.ctx.fillText(
      message.text,
      this.canvas.width / 2,
      this.canvas.height / 2 + 10,
    );
  }

  /**
   * Render game over screen
   */
  private renderGameOverScreen(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = '40px "Press Start 2P"';
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      t('game.gameOver'),
      this.canvas.width / 2,
      this.canvas.height / 2 - 80,
    );

    this.ctx.font = '20px "Press Start 2P"';
    this.ctx.fillText(
      `${t('game.score')}: ${this.gameStore.score.value}`,
      this.canvas.width / 2,
      this.canvas.height / 2 - 20,
    );

    // Play Again button
    this.ctx.fillStyle = '#FF6A00';
    this.ctx.fillRect(
      this.canvas.width / 2 - 100,
      this.canvas.height / 2 + 20,
      200,
      50,
    );
    this.ctx.fillStyle = 'white';
    this.ctx.fillText(
      t('game.playAgain'),
      this.canvas.width / 2,
      this.canvas.height / 2 + 55,
    );
  }

  /**
   * Render pause overlay
   */
  private renderPauseOverlay(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = '40px "Press Start 2P"';
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      t('game.paused'),
      this.canvas.width / 2,
      this.canvas.height / 2,
    );

    this.ctx.font = '16px "Press Start 2P"';
    this.ctx.fillText(
      t('game.pressToContinue'),
      this.canvas.width / 2,
      this.canvas.height / 2 + 50,
    );
  }

  /**
   * Render statistics
   */
  private renderStats(): void {
    const stats = this.gameStore.statistics;
    const y = this.canvas.height - 100;

    this.ctx.font = '12px "Press Start 2P"';
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'center';

    this.ctx.fillText(
      `Best Score: ${stats.bestScore}`,
      this.canvas.width / 2,
      y,
    );
    this.ctx.fillText(
      `Games Played: ${stats.totalGamesPlayed}`,
      this.canvas.width / 2,
      y + 20,
    );
  }

  /**
   * Render debug information
   */
  private renderDebugInfo(): void {
    const metrics = this.performanceMetrics;

    this.ctx.font = '12px monospace';
    this.ctx.fillStyle = 'yellow';
    this.ctx.textAlign = 'left';

    this.ctx.fillText(
      `FPS: ${Math.round(metrics.fps)}`,
      10,
      this.canvas.height - 60,
    );
    this.ctx.fillText(
      `Frame: ${metrics.frameTime.toFixed(1)}ms`,
      10,
      this.canvas.height - 45,
    );
    this.ctx.fillText(
      `Update: ${metrics.updateTime.toFixed(1)}ms`,
      10,
      this.canvas.height - 30,
    );
    this.ctx.fillText(
      `Render: ${metrics.renderTime.toFixed(1)}ms`,
      10,
      this.canvas.height - 15,
    );
  }

  /**
   * Show loading screen
   */
  private showLoadingScreen(): void {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Use fallback fonts and text for better compatibility
    this.ctx.font = '20px "Press Start 2P", monospace, sans-serif';
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'center';

    // Use fallback text if i18n is not ready
    const loadingText =
      typeof t === 'function' ? t('common.loading') : 'Loading...';
    this.ctx.fillText(
      loadingText,
      this.canvas.width / 2,
      this.canvas.height / 2,
    );

    // Add SprintSolve title
    this.ctx.font = '32px "Press Start 2P", monospace, sans-serif';
    this.ctx.fillStyle = '#FF6A00';
    this.ctx.fillText(
      'SprintSolve',
      this.canvas.width / 2,
      this.canvas.height / 2 - 60,
    );
  }

  /**
   * Show error screen
   */
  private showErrorScreen(message: string): void {
    this.ctx.fillStyle = 'darkred';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = '16px "Press Start 2P"';
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      t('common.error'),
      this.canvas.width / 2,
      this.canvas.height / 2 - 20,
    );
    this.ctx.fillText(
      message,
      this.canvas.width / 2,
      this.canvas.height / 2 + 20,
    );
  }

  /**
   * Destroy the game engine
   */
  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    stopBackgroundMusic();
    clearObstacles();
    clearParticles();

    // Remove event listeners
    window.removeEventListener('resize', this.resizeCanvas);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
  }
}

// Initialize the game when the DOM is loaded
let gameEngine: GameEngine | null = null;

async function initGame(): Promise<void> {
  try {
    gameEngine = new GameEngine('gameCanvas');
    await gameEngine.init();
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
}

// Auto-start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame().catch(console.error);
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (gameEngine) {
    gameEngine.destroy();
  }
});

// Export for potential external access
export { GameEngine, gameEngine };
