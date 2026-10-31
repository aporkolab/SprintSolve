import backgroundUrl from '../background.png';
import characterUrl from '../character.gif';
import obstacleUrl from '../obstacle.png';
import type { GameAssets } from '@/types';

/**
 * Loads an image and returns a promise that resolves with the loaded image
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = error => {
      // eslint-disable-next-line no-console
      console.error(`Failed to load image: ${src}`, error);
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.src = src;
  });
}

/**
 * Asset paths configuration
 */
const ASSET_PATHS = {
  background: backgroundUrl,
  character: characterUrl,
  obstacle: obstacleUrl,
} as const;

/**
 * Loads all game assets in parallel
 */
export async function loadGameAssets(): Promise<GameAssets> {
  try {
    const [background, character, obstacle] = await Promise.all([
      loadImage(ASSET_PATHS.background),
      loadImage(ASSET_PATHS.character),
      loadImage(ASSET_PATHS.obstacle),
    ]);

    return { background, character, obstacle };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load game assets:', error);
    throw new Error(
      'Failed to load game assets. Please refresh and try again.',
      { cause: error },
    );
  }
}

/**
 * Preloads a single asset with progress tracking
 */
export function preloadAsset(
  src: string,
  onProgress?: (_progress?: number) => void,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    if (onProgress) {
      img.addEventListener('progress', event => {
        if (event.lengthComputable && onProgress) {
          const progressValue = (event.loaded / event.total) * 100;
          onProgress(progressValue);
        }
      });
    }

    img.onload = () => resolve(img);
    img.onerror = error => {
      // eslint-disable-next-line no-console
      console.error(`Failed to preload asset: ${src}`, error);
      reject(new Error(`Failed to preload asset: ${src}`));
    };

    img.src = src;
  });
}

/**
 * Creates a fallback/placeholder image if assets fail to load
 */
export function createFallbackImage(
  width: number = 100,
  height: number = 100,
  color: string = '#FF6A00',
): HTMLImageElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', width / 2, height / 2);

  const img = new Image();
  img.src = canvas.toDataURL();

  return img;
}

/**
 * Asset manager class for caching and managing loaded assets
 */
export class AssetManager {
  private readonly cache = new Map<string, HTMLImageElement>();
  private readonly loadingPromises = new Map<
    string,
    Promise<HTMLImageElement>
  >();

  /**
   * Loads an asset with caching
   */
  public async load(src: string): Promise<HTMLImageElement> {
    // Return cached asset if available
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src)!;
    }

    // Start loading the asset
    const loadingPromise = loadImage(src);
    this.loadingPromises.set(src, loadingPromise);

    try {
      const asset = await loadingPromise;
      this.cache.set(src, asset);
      this.loadingPromises.delete(src);
      return asset;
    } catch (error) {
      this.loadingPromises.delete(src);
      throw error;
    }
  }

  /**
   * Preloads multiple assets
   */
  public async preloadAll(
    sources: readonly string[],
  ): Promise<HTMLImageElement[]> {
    return Promise.all(sources.map(src => this.load(src)));
  }

  /**
   * Gets a cached asset
   */
  public get(src: string): HTMLImageElement | undefined {
    return this.cache.get(src);
  }

  /**
   * Checks if an asset is cached
   */
  public has(src: string): boolean {
    return this.cache.has(src);
  }

  /**
   * Clears the asset cache
   */
  public clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Gets cache statistics
   */
  public getStats(): { cached: number; loading: number } {
    return {
      cached: this.cache.size,
      loading: this.loadingPromises.size,
    };
  }
}

// Global asset manager instance
export const assetManager = new AssetManager();
