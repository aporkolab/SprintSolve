import { Howl, Howler } from 'howler';
import type { AudioManager } from '@/types';

/**
 * Audio asset definitions
 */
const AUDIO_ASSETS = {
  jump: {
    src: ['https://freesound.org/data/previews/135/135936_2434988-lq.mp3'],
    volume: 0.7,
    preload: true,
  },
  score: {
    src: ['https://freesound.org/data/previews/270/270319_5123851-lq.mp3'],
    volume: 0.8,
    preload: true,
  },
  gameOver: {
    src: ['https://freesound.org/data/previews/219/219244_4082829-lq.mp3'],
    volume: 0.9,
    preload: true,
  },
  background: {
    src: ['https://freesound.org/data/previews/396/396740_5218259-lq.mp3'],
    volume: 0.4,
    loop: true,
    preload: true,
  },
  powerup: {
    src: ['https://freesound.org/data/previews/341/341695_5123451-lq.mp3'],
    volume: 0.6,
    preload: false,
  },
  shield: {
    src: ['https://freesound.org/data/previews/233/233704_4086654-lq.mp3'],
    volume: 0.7,
    preload: false,
  },
  explosion: {
    src: ['https://freesound.org/data/previews/245/245372_4486188-lq.mp3'],
    volume: 0.8,
    preload: false,
  },
} as const;

type AudioAssetKey = keyof typeof AUDIO_ASSETS;

/**
 * Enhanced audio manager with modern features
 */
export class AudioManagerImpl implements AudioManager {
  private readonly sounds = new Map<AudioAssetKey, Howl>();
  private readonly loadingPromises = new Map<AudioAssetKey, Promise<void>>();
  private masterVolume = 1.0;
  private sfxVolume = 1.0;
  private musicVolume = 1.0;
  private muted = false;
  private initialized = false;

  constructor() {
    this.init();
  }

  /**
   * Initialize the audio system
   */
  private async init(): Promise<void> {
    try {
      // Set global Howler settings
      Howler.volume(this.masterVolume);
      Howler.html5PoolSize = 10;

      // Preload essential sounds
      await this.preloadEssentialSounds();

      this.initialized = true;
      // eslint-disable-next-line no-console
      console.debug('Audio system initialized');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to initialize audio system:', error);
    }
  }

  /**
   * Preload essential sounds for better UX
   */
  private async preloadEssentialSounds(): Promise<void> {
    const preloadPromises = Object.entries(AUDIO_ASSETS)
      .filter(([, config]) => config.preload)
      .map(([key]) => this.loadSound(key as AudioAssetKey));

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Load a sound with error handling and caching
   */
  private async loadSound(key: AudioAssetKey): Promise<void> {
    // Return existing loading promise if already loading
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    // Return immediately if already loaded
    if (this.sounds.has(key)) {
      return Promise.resolve();
    }

    const config = AUDIO_ASSETS[key];

    const loadingPromise = new Promise<void>(resolve => {
      const sound = new Howl({
        ...(config as any),
        onload: () => {
          this.sounds.set(key, sound);
          this.loadingPromises.delete(key);
          resolve();
        },
        onloaderror: () => {
          // eslint-disable-next-line no-console
          console.warn(`Failed to load audio: ${key}`);
          this.loadingPromises.delete(key);
          // Don't reject, just resolve to prevent breaking the game
          resolve();
        },
        onplayerror: () => {
          // eslint-disable-next-line no-console
          console.warn(`Failed to play audio: ${key}`);
        },
      });
    });

    this.loadingPromises.set(key, loadingPromise);
    return loadingPromise;
  }

  /**
   * Play a sound with volume control
   */
  private async playSound(
    key: AudioAssetKey,
    volume?: number,
    options?: { rate?: number; loop?: boolean },
  ): Promise<void> {
    if (this.muted) return;

    try {
      await this.loadSound(key);
      const sound = this.sounds.get(key);
      if (!sound) return;

      const config = AUDIO_ASSETS[key];
      const isMusicTrack = key === 'background';
      const volumeMultiplier = isMusicTrack ? this.musicVolume : this.sfxVolume;
      const finalVolume =
        (volume ?? config.volume) * volumeMultiplier * this.masterVolume;

      sound.volume(Math.max(0, Math.min(1, finalVolume)));

      if (options?.rate) sound.rate(options.rate);
      if (options?.loop !== undefined) sound.loop(options.loop);

      sound.play();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to play sound: ${key}`, error);
    }
  }

  /**
   * Stop a specific sound
   */
  private stopSound(key: AudioAssetKey): void {
    const sound = this.sounds.get(key);
    if (sound) {
      sound.stop();
    }
  }

  // Public AudioManager interface implementation
  public async playJump(): Promise<void> {
    await this.playSound('jump');
  }

  public async playScore(): Promise<void> {
    await this.playSound('score');
  }

  public async playGameOver(): Promise<void> {
    await this.playSound('gameOver');
  }

  public async playBackgroundMusic(): Promise<void> {
    await this.playSound('background');
  }

  public stopBackgroundMusic(): void {
    this.stopSound('background');
  }

  // Extended functionality
  public async playPowerup(): Promise<void> {
    await this.playSound('powerup');
  }

  public async playShield(): Promise<void> {
    await this.playSound('shield');
  }

  public async playExplosion(): Promise<void> {
    await this.playSound('explosion');
  }

  /**
   * Set master volume (0.0 - 1.0)
   */
  public setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.masterVolume);
  }

  /**
   * Set SFX volume (0.0 - 1.0)
   */
  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set music volume (0.0 - 1.0)
   */
  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));

    // Update background music volume if playing
    const bgMusic = this.sounds.get('background');
    if (bgMusic) {
      const config = AUDIO_ASSETS.background;
      bgMusic.volume(config.volume * this.musicVolume * this.masterVolume);
    }
  }

  /**
   * Mute all audio
   */
  public mute(): void {
    this.muted = true;
    Howler.mute(true);
  }

  /**
   * Unmute all audio
   */
  public unmute(): void {
    this.muted = false;
    Howler.mute(false);
  }

  /**
   * Toggle mute state
   */
  public toggleMute(): boolean {
    if (this.muted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.muted;
  }

  /**
   * Pause all sounds
   */
  public pauseAll(): void {
    for (const sound of this.sounds.values()) {
      sound.pause();
    }
  }

  /**
   * Resume all sounds
   */
  public resumeAll(): void {
    for (const sound of this.sounds.values()) {
      if (sound.playing()) {
        sound.play();
      }
    }
  }

  /**
   * Stop all sounds
   */
  public stopAll(): void {
    for (const sound of this.sounds.values()) {
      sound.stop();
    }
  }

  /**
   * Get audio system statistics
   */
  public getStats(): {
    initialized: boolean;
    soundsLoaded: number;
    soundsLoading: number;
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    muted: boolean;
  } {
    return {
      initialized: this.initialized,
      soundsLoaded: this.sounds.size,
      soundsLoading: this.loadingPromises.size,
      masterVolume: this.masterVolume,
      sfxVolume: this.sfxVolume,
      musicVolume: this.musicVolume,
      muted: this.muted,
    };
  }

  /**
   * Preload all sounds for offline play
   */
  public async preloadAll(): Promise<void> {
    const allKeys = Object.keys(AUDIO_ASSETS) as AudioAssetKey[];
    await Promise.allSettled(allKeys.map(key => this.loadSound(key)));
  }

  /**
   * Clear audio cache
   */
  public clearCache(): void {
    this.stopAll();
    for (const sound of this.sounds.values()) {
      sound.unload();
    }
    this.sounds.clear();
    this.loadingPromises.clear();
  }
}

// Global audio manager instance
export const audioManager = new AudioManagerImpl();

// Legacy API compatibility
export function playJumpSound(): void {
  // eslint-disable-next-line no-console
  audioManager.playJump().catch(console.warn);
}

export function playScoreSound(): void {
  // eslint-disable-next-line no-console
  audioManager.playScore().catch(console.warn);
}

export function playGameOverSound(): void {
  // eslint-disable-next-line no-console
  audioManager.playGameOver().catch(console.warn);
}

export function playBackgroundMusic(): void {
  // eslint-disable-next-line no-console
  audioManager.playBackgroundMusic().catch(console.warn);
}

export function stopBackgroundMusic(): void {
  audioManager.stopBackgroundMusic();
}

/**
 * Audio context for spatial audio and advanced effects
 */
export class SpatialAudioManager {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      this.gainNode = this.audioContext.createGain();
      this.compressor = this.audioContext.createDynamicsCompressor();

      // Create audio processing chain
      this.gainNode.connect(this.compressor);
      this.compressor.connect(this.audioContext.destination);

      // Configure compressor for game audio
      this.compressor.threshold.value = -50;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      // eslint-disable-next-line no-console
      console.debug('Spatial audio initialized');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to initialize spatial audio:', error);
    }
  }

  /**
   * Play sound with 3D positioning
   */
  public async playSpatialSound(
    audioBuffer: AudioBuffer,
    x: number,
    y: number,
    z: number = 0,
  ): Promise<void> {
    if (!this.audioContext || !this.gainNode) return;

    const source = this.audioContext.createBufferSource();
    const panner = this.audioContext.createPanner();

    source.buffer = audioBuffer;
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.setPosition(x, y, z);

    source.connect(panner);
    panner.connect(this.gainNode);

    source.start(0);
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}
