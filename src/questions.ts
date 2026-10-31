import type {
  Question,
  TriviaCategory,
  TriviaApiQuestion,
  TriviaApiResponse,
} from '@/types';

/**
 * Question state singleton
 */
class QuestionState implements Question {
  public text = '';
  public correctAnswer: number | null = null;
  public answers: readonly string[] = [];
  public display = false;

  public update(question: Partial<Question>): void {
    if (question.text !== undefined) this.text = question.text;
    if (question.correctAnswer !== undefined)
      this.correctAnswer = question.correctAnswer;
    if (question.answers !== undefined) this.answers = [...question.answers];
    if (question.display !== undefined) this.display = question.display;
  }

  public reset(): void {
    this.text = '';
    this.correctAnswer = null;
    this.answers = [];
    this.display = false;
  }
}

export const questionState = new QuestionState();

/**
 * Trivia API service for fetching questions and categories
 */
export class TriviaService {
  private readonly baseUrl = 'https://opentdb.com';
  private readonly cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Utility to decode HTML entities
   */
  private decodeHtml(html: string): string {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }

  /**
   * Shuffles array in place and returns it
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }

  /**
   * Transforms API question to internal format
   */
  private transformQuestion(apiQuestion: TriviaApiQuestion): {
    question: string;
    answers: string[];
    correct_answer: number;
  } {
    const incorrectAnswers = apiQuestion.incorrect_answers.map(answer =>
      this.decodeHtml(answer),
    );
    const correctAnswer = this.decodeHtml(apiQuestion.correct_answer);

    const allAnswers = this.shuffleArray([...incorrectAnswers, correctAnswer]);
    const correctIndex = allAnswers.indexOf(correctAnswer);

    return {
      question: this.decodeHtml(apiQuestion.question),
      answers: allAnswers,
      correct_answer: correctIndex,
    };
  }

  /**
   * Generic fetch with caching and error handling
   */
  private async fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as T;

      // Cache the response
      this.cache.set(cacheKey, { data, timestamp: Date.now() });

      return data;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to fetch from ${url}:`, error);
      throw new Error(
        `Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error },
      );
    }
  }

  /**
   * Loads trivia categories
   */
  public async loadCategories(): Promise<TriviaCategory[]> {
    try {
      const response = await this.fetchWithCache<{
        trivia_categories: TriviaCategory[];
      }>(`${this.baseUrl}/api_category.php`, 'categories');

      return response.trivia_categories;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading categories:', error);
      // Return default categories as fallback
      return [
        { id: 9, name: 'General Knowledge' },
        { id: 17, name: 'Science & Nature' },
        { id: 21, name: 'Sports' },
      ];
    }
  }

  /**
   * Fetches a single question by category
   */
  public async fetchQuestion(
    categoryId: number,
    difficulty?: 'easy' | 'medium' | 'hard',
  ): Promise<Question> {
    try {
      const difficultyParam = difficulty ? `&difficulty=${difficulty}` : '';
      const url = `${this.baseUrl}/api.php?amount=1&category=${categoryId}&type=multiple${difficultyParam}`;

      const response = await this.fetchWithCache<TriviaApiResponse>(
        url,
        `question_${categoryId}_${difficulty || 'any'}`,
      );

      if (response.response_code !== 0) {
        throw new Error(
          `API returned response code: ${response.response_code}`,
        );
      }

      if (response.results.length === 0) {
        throw new Error('No questions returned from API');
      }

      const transformed = this.transformQuestion(response.results[0]!);

      const question: Question = {
        text: transformed.question,
        correctAnswer: transformed.correct_answer,
        answers: transformed.answers,
        display: true,
      };

      // Update global state
      questionState.update(question);

      return question;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching question:', error);

      // Return fallback question
      const fallbackQuestion: Question = {
        text: 'Error loading question. Please try again.',
        correctAnswer: null,
        answers: ['Try Again', 'Refresh Page', 'Check Connection', 'Continue'],
        display: true,
      };

      questionState.update(fallbackQuestion);
      return fallbackQuestion;
    }
  }

  /**
   * Fetches multiple questions at once
   */
  public async fetchMultipleQuestions(
    categoryId: number,
    amount: number = 5,
    difficulty?: 'easy' | 'medium' | 'hard',
  ): Promise<Question[]> {
    try {
      const difficultyParam = difficulty ? `&difficulty=${difficulty}` : '';
      const url = `${this.baseUrl}/api.php?amount=${amount}&category=${categoryId}&type=multiple${difficultyParam}`;

      const response = await this.fetchWithCache<TriviaApiResponse>(
        url,
        `questions_${categoryId}_${amount}_${difficulty || 'any'}`,
      );

      if (response.response_code !== 0) {
        throw new Error(
          `API returned response code: ${response.response_code}`,
        );
      }

      return response.results.map(apiQuestion => {
        const transformed = this.transformQuestion(apiQuestion);
        return {
          text: transformed.question,
          correctAnswer: transformed.correct_answer,
          answers: transformed.answers,
          display: false, // Will be set to true when needed
        };
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching multiple questions:', error);
      return [];
    }
  }

  /**
   * Validates a question response
   */
  public validateAnswer(selectedIndex: number, question: Question): boolean {
    if (question.correctAnswer === null) return false;
    return selectedIndex === question.correctAnswer;
  }

  /**
   * Gets question statistics
   */
  public getStats(): {
    cacheSize: number;
    categories: number;
    questions: number;
  } {
    let categories = 0;
    let questions = 0;

    for (const [key] of this.cache.entries()) {
      if (key === 'categories') categories++;
      if (key.startsWith('question_')) questions++;
    }

    return {
      cacheSize: this.cache.size,
      categories,
      questions,
    };
  }

  /**
   * Clears the cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Preloads questions for better UX
   */
  public async preloadQuestions(
    categoryId: number,
    amount: number = 10,
  ): Promise<void> {
    try {
      await this.fetchMultipleQuestions(categoryId, amount);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to preload questions:', error);
    }
  }
}

// Global trivia service instance
export const triviaService = new TriviaService();

// Legacy API compatibility
export async function loadCategories(): Promise<TriviaCategory[]> {
  return triviaService.loadCategories();
}

export async function fetchQuestion(categoryId: number): Promise<void> {
  await triviaService.fetchQuestion(categoryId);
}

/**
 * Question queue for smooth gameplay
 */
export class QuestionQueue {
  private readonly queue: Question[] = [];
  private readonly maxSize = 5;

  constructor(
    private readonly _categoryId: number,
    private readonly _difficulty?: 'easy' | 'medium' | 'hard',
  ) {
    // Parameters are stored as class properties for use in methods
  }

  /**
   * Ensures the queue has questions
   */
  public async ensureQuestions(): Promise<void> {
    if (this.queue.length < 2) {
      const questions = await triviaService.fetchMultipleQuestions(
        this._categoryId,
        this.maxSize - this.queue.length,
        this._difficulty,
      );
      this.queue.push(...questions);
    }
  }

  /**
   * Gets the next question from the queue
   */
  public async next(): Promise<Question | null> {
    await this.ensureQuestions();

    const question = this.queue.shift();
    if (!question) return null;

    // Update global state
    questionState.update({ ...question, display: true });

    // Preload more questions in background
    this.ensureQuestions().catch(error => {
      // eslint-disable-next-line no-console
      console.warn('Failed to preload questions:', error);
    });

    return question;
  }

  /**
   * Gets queue statistics
   */
  public getStats(): { queued: number; maxSize: number } {
    return {
      queued: this.queue.length,
      maxSize: this.maxSize,
    };
  }

  /**
   * Clears the queue
   */
  public clear(): void {
    this.queue.length = 0;
  }
}
