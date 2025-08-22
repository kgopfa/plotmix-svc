import { logger } from '../../utils/logger';
import { getRedis } from '../../clients/redis.client';
import { MotifCandidate } from './types';

export interface MotifCatalogEntry {
  id: string;
  one_liner: string;
  archetype: string;
  status: 'live' | 'draft' | 'deprecated';
  inputs_schema: Record<string, any>;
  defaults: Record<string, any>;
  version: number;
  embedding: number[]; // Vector representation
}

export interface MotifRetrievalOptions {
  archetype?: string;
  maxCandidates?: number;
  minConfidence?: number;
}

export class MotifRetrievalService {
  private static instance: MotifRetrievalService;
  private redis = getRedis();
  private isInitialized = false;

  private constructor() {
    this.initializeIndex();
  }

  static getInstance(): MotifRetrievalService {
    if (!MotifRetrievalService.instance) {
      MotifRetrievalService.instance = new MotifRetrievalService();
    }
    return MotifRetrievalService.instance;
  }

  private async initializeIndex() {
    try {
      // For now, use simple Redis without vector search (will be enhanced later)
      this.isInitialized = true;
      logger.info('Motif retrieval service initialized (simple mode)');
    } catch (error) {
      logger.error('Failed to initialize motif service', { error });
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializeIndex();
    }
  }

  /**
   * Step 2: Retrieve candidate motifs using vector search + metadata filtering
   */
  async retrieveMotifCandidates(
    query: string,
    archetype: string,
    options: MotifRetrievalOptions = {}
  ): Promise<MotifCandidate[]> {
    const { maxCandidates = 6, minConfidence = 0.7 } = options;
    
    try {
      // 1. Check Redis cache first (short TTL)
      const cacheKey = `motif:q:${archetype}:${this.hashQuery(query)}`;
      const cachedResults = await this.getFromCache(cacheKey);
      if (cachedResults) {
        logger.debug('Motif candidates found in cache', { cacheKey, count: cachedResults.length });
        return cachedResults.slice(0, maxCandidates);
      }

      // 2. Vector search via HNSW index
      const queryEmbedding = await this.getQueryEmbedding(query);
      const searchResults = await this.vectorSearch(queryEmbedding, archetype, maxCandidates * 2);

      // 3. Filter by status and confidence
      const filteredResults = searchResults
        .filter(result => result.status === 'live' && result.confidence >= minConfidence)
        .slice(0, maxCandidates);

      // 4. Cache results (short TTL ≈10 minutes)
      await this.cacheResults(cacheKey, filteredResults, 600);

      return filteredResults;
    } catch (error) {
      logger.error('Failed to retrieve motif candidates, using fallback', { error, query, archetype });
      
      // Fallback: return basic mock motifs if everything fails
      const fallbackMotifs = [
        {
          id: `motif_${archetype}_fallback`,
          one_liner: `${archetype} fallback motif`,
          archetype,
          status: 'live' as const,
          inputs_schema: {},
          defaults: {},
          version: 1,
          embedding: [],
          confidence: 0.7
        }
      ];
      
      return fallbackMotifs;
    }
  }

  /**
   * Get full motif payload from Redis cache
   */
  async getMotifPayload(motifId: string, version: number): Promise<any> {
    const cacheKey = `motif:v${version}:${motifId}`;
    try {
      const payload = await this.getFromCache(cacheKey);
      if (!payload) {
        throw new Error(`Motif payload not found in cache: ${cacheKey}`);
      }
      return payload;
    } catch (error) {
      logger.error('Failed to get motif payload', { motifId, version, error });
      throw new Error(`Failed to get motif payload: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async vectorSearch(
    _queryEmbedding: number[],
    archetype: string,
    k: number
  ): Promise<Array<MotifCatalogEntry & { confidence: number }>> {
    await this.ensureInitialized();
    
    // For now, return mock motifs for testing
    // TODO: Implement actual vector search with Redis + RediSearch + HNSW
    logger.debug('Vector search (mock mode)', { archetype, k });
    
    const mockMotifs = [
      {
        id: `motif_${archetype}_1`,
        one_liner: `${archetype} basic motif`,
        archetype,
        status: 'live' as const,
        inputs_schema: {},
        defaults: {},
        version: 1,
        embedding: [],
        confidence: 0.9
      },
      {
        id: `motif_${archetype}_2`,
        one_liner: `${archetype} advanced motif`,
        archetype,
        status: 'live' as const,
        inputs_schema: {},
        defaults: {},
        version: 1,
        embedding: [],
        confidence: 0.8
      },
      {
        id: `motif_${archetype}_3`,
        one_liner: `${archetype} enhanced motif`,
        archetype,
        status: 'live' as const,
        inputs_schema: {},
        defaults: {},
        version: 1,
        embedding: [],
        confidence: 0.85
      }
    ];
    
    return mockMotifs.slice(0, k);
  }

  private async getQueryEmbedding(query: string): Promise<number[]> {
    // TODO: Implement OpenAI embeddings
    // For now, return a mock embedding for testing
    logger.debug('Getting query embedding (mock mode)', { query });
    return new Array(1536).fill(0.1);
  }

  /**
   * Add a motif to the vector index
   */
  async addMotif(motif: MotifCatalogEntry): Promise<void> {
    // TODO: Implement actual Redis vector storage
    logger.debug('Add motif (mock mode)', { motifId: motif.id });
  }

  private hashQuery(query: string): string {
    // Simple hash for cache key (in production, use proper hashing)
    return Buffer.from(query).toString('base64').substring(0, 8);
  }

  private async getFromCache(key: string): Promise<any> {
    try {
      const result = await this.redis.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      logger.warn('Redis cache get failed', { key, error });
      return null;
    }
  }

  private async cacheResults(key: string, results: any[], ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(results));
      logger.debug('Cached motif results', { key, ttlSeconds, resultCount: results.length });
    } catch (error) {
      logger.warn('Redis cache set failed', { key, error });
    }
  }
}
