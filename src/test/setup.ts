/* eslint-disable no-console, no-undef */
import { vi } from 'vitest';
import { webcrypto } from 'node:crypto';

// Polyfill crypto.getRandomValues for Node.js environments
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto as Crypto;
}

// Mock Canvas API
const createMockContext = (): Partial<CanvasRenderingContext2D> => ({
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  globalAlpha: 1,

  // Drawing methods
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  clearRect: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 })),

  // Path methods
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),

  // Transform methods
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),

  // Image methods
  drawImage: vi.fn(),

  // Other methods
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
});

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn().mockImplementation((contextType: string) => {
    if (contextType === '2d') {
      return createMockContext();
    }
    return null;
  }),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
  value: 800,
  writable: true,
});

Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
  value: 600,
  writable: true,
});

// Mock Image
global.Image = class {
  public src = '';
  public width = 100;
  public height = 100;
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;

  constructor() {
    // Simulate immediate load
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
} as any;

// Mock Audio
global.Audio = class {
  public src = '';
  public volume = 1;
  public currentTime = 0;
  public loop = false;
  public play = vi.fn().mockResolvedValue(undefined);
  public pause = vi.fn();
  public load = vi.fn();

  constructor(src?: string) {
    if (src) {
      this.src = src;
    }
  }
} as any;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback: (_time: number) => void) => {
  setTimeout(() => callback(performance.now()), 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock sessionStorage
vi.stubGlobal('sessionStorage', localStorageMock);

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Setup fetch mock for common API responses
export const setupFetchMock = () => {
  const mockFetch = vi.mocked(fetch);

  // Mock trivia categories response
  mockFetch.mockImplementation((url: string | Request | URL) => {
    const urlString = url.toString();

    if (urlString.includes('api_category.php')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            trivia_categories: [
              { id: 9, name: 'General Knowledge' },
              { id: 17, name: 'Science & Nature' },
              { id: 21, name: 'Sports' },
            ],
          }),
      } as Response);
    }

    if (urlString.includes('api.php')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            response_code: 0,
            results: [
              {
                category: 'General Knowledge',
                type: 'multiple',
                difficulty: 'medium',
                question: 'What is the capital of France?',
                correct_answer: 'Paris',
                incorrect_answers: ['London', 'Berlin', 'Madrid'],
              },
            ],
          }),
      } as Response);
    }

    return Promise.reject(new Error('Unhandled URL'));
  });

  return mockFetch;
};

// Performance mock
Object.defineProperty(performance, 'now', {
  value: vi.fn(() => Date.now()),
});

// Console error suppression for expected test errors
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('Error:'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
