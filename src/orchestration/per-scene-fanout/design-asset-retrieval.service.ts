import { logger } from '../../utils/logger';
import { getRedis } from '../../clients/redis.client';

export interface DesignAsset {
  id: string;
  kind: 'background' | 'texture' | 'ornament' | 'image' | 'pattern';
  tags: string[];
  one_liner: string;
  inputs_schema: Record<string, any>;
  defaults: Record<string, any>;
  status: 'live' | 'draft' | 'deprecated';
  version: number;
  embedding: number[]; // Vector representation
  compiler_key_asset: string; // For ENGINE_SPEC compliance
}

export interface DesignAssetRetrievalOptions {
  maxAssets?: number;
  minConfidence?: number;
  assetTypes?: string[];
}

export class DesignAssetRetrievalService {
  private static instance: DesignAssetRetrievalService;
  private redis = getRedis();

  private constructor() {
    this.initializeIndex();
  }

  static getInstance(): DesignAssetRetrievalService {
    if (!DesignAssetRetrievalService.instance) {
      DesignAssetRetrievalService.instance = new DesignAssetRetrievalService();
    }
    return DesignAssetRetrievalService.instance;
  }

  private async initializeIndex() {
    try {
      // For now, use simple mode without vector search
      logger.info('Design asset retrieval service initialized (simple mode)');
    } catch (error) {
      logger.error('Failed to initialize design asset service', { error });
    }
  }



  /**
   * Retrieve design assets for a scene using vector search
   */
  async retrieveDesignAssets(
    query: string,
    archetype: string,
    tone: string,
    options: DesignAssetRetrievalOptions = {}
  ): Promise<DesignAsset[]> {
    const { maxAssets = 5, minConfidence = 0.7, assetTypes = ['background', 'ornament'] } = options;
    
    try {
      // 1. Check Redis cache first (short TTL)
      const cacheKey = `asset:q:${archetype}:${tone}:${this.hashQuery(query)}`;
      const cachedResults = await this.getFromCache(cacheKey);
      if (cachedResults) {
        logger.debug('Design assets found in cache', { cacheKey, count: cachedResults.length });
        return this.filterByType(cachedResults, assetTypes).slice(0, maxAssets);
      }

      // 2. Vector search via HNSW index
      const queryEmbedding = await this.getQueryEmbedding(query);
      const searchResults = await this.vectorSearch(queryEmbedding, archetype, tone, maxAssets * 2);

      // 3. Filter by status, confidence, and type
      const filteredResults = searchResults
        .filter(result => 
          result.status === 'live' && 
          result.confidence >= minConfidence &&
          assetTypes.includes(result.kind)
        )
        .slice(0, maxAssets);

      // 4. Cache results (short TTL ≈10 minutes)
      await this.cacheResults(cacheKey, filteredResults, 600);

      return filteredResults;
    } catch (error) {
      logger.error('Failed to retrieve design assets', { error, query, archetype, tone });
      throw new Error(`Design asset retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get full design asset payload from Redis cache
   */
  async getDesignAssetPayload(assetId: string, version: number): Promise<DesignAsset> {
    const cacheKey = `asset:v${version}:${assetId}`;
    try {
      const payload = await this.getFromCache(cacheKey);
      if (!payload) {
        throw new Error(`Design asset payload not found in cache: ${cacheKey}`);
      }
      return payload;
    } catch (error) {
      logger.error('Failed to get design asset payload', { assetId, version, error });
      throw new Error(`Failed to get design asset payload: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get recommended asset mix for a scene
   */
  async getRecommendedAssetMix(
    archetype: string,
    tone: string,
    sceneCaption: string
  ): Promise<{
    backgrounds: DesignAsset[];
    ornaments: DesignAsset[];
    textures: DesignAsset[];
  }> {
    const query = `${archetype} ${tone} ${sceneCaption}`;
    
    const [backgrounds, ornaments, textures] = await Promise.all([
      this.retrieveDesignAssets(query, archetype, tone, { 
        maxAssets: 2, 
        assetTypes: ['background'] 
      }),
      this.retrieveDesignAssets(query, archetype, tone, { 
        maxAssets: 3, 
        assetTypes: ['ornament'] 
      }),
      this.retrieveDesignAssets(query, archetype, tone, { 
        maxAssets: 1, 
        assetTypes: ['texture'] 
      })
    ]);

    return { backgrounds, ornaments, textures };
  }

  private async vectorSearch(
    _queryEmbedding: number[],
    archetype: string,
    tone: string,
    k: number
  ): Promise<Array<DesignAsset & { confidence: number }>> {
    // TODO: Implement actual vector search
    logger.debug('Design asset vector search (mock mode)', { archetype, tone, k });
    
    const mockAssets = [
      {
        id: `asset_${archetype}_bg_1`,
        kind: 'background' as const,
        tags: [archetype, tone],
        one_liner: `${archetype} ${tone} background`,
        inputs_schema: {},
        defaults: {},
        status: 'live' as const,
        version: 1,
        embedding: [],
        compiler_key_asset: 'bg_solid',
        confidence: 0.9
      }
    ];
    
    return mockAssets.slice(0, k);
  }

  private async getQueryEmbedding(query: string): Promise<number[]> {
    // TODO: Implement OpenAI embeddings  
    logger.debug('Getting design asset query embedding (mock mode)', { query });
    return new Array(1536).fill(0.1);
  }

  /**
   * Add a design asset to the vector index
   */
  async addDesignAsset(asset: DesignAsset): Promise<void> {
    // TODO: Implement actual Redis vector storage
    logger.debug('Add design asset (mock mode)', { assetId: asset.id });
  }

  private hashQuery(query: string): string {
    // Simple hash for cache key (in production, use proper hashing)
    return Buffer.from(query).toString('base64').substring(0, 8);
  }

  private filterByType(assets: DesignAsset[], types: string[]): DesignAsset[] {
    return assets.filter(asset => types.includes(asset.kind));
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
      logger.debug('Cached design asset results', { key, ttlSeconds, resultCount: results.length });
    } catch (error) {
      logger.warn('Redis cache set failed', { key, error });
    }
  }
}
