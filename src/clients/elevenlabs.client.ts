import { logger } from '../utils/logger';

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export interface ElevenLabsResponse {
  audioUrl?: string;
  audioData?: ArrayBuffer;
  error?: string;
}

export class ElevenLabsClient {
  private static instance: ElevenLabsClient;
  private readonly config: ElevenLabsConfig;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  private constructor(config: ElevenLabsConfig) {
    this.config = {
      voiceId: config.voiceId || '21m00Tcm4TlvDq8ikWAM', // Default: Rachel (neutral, clear)
      modelId: config.modelId || 'eleven_monolingual_v1',
      stability: config.stability ?? 0.5,
      similarityBoost: config.similarityBoost ?? 0.75,
      ...config,
    };
  }

  public static getInstance(): ElevenLabsClient | null {
    const apiKey = process.env['ELEVENLABS_API_KEY'];
    if (!apiKey) {
      logger.warn('ELEVENLABS_API_KEY not set, narration will be skipped');
      return null;
    }

    if (!ElevenLabsClient.instance) {
      const config: ElevenLabsConfig = { apiKey };
      
      const voiceId = process.env['ELEVENLABS_VOICE_ID'];
      if (voiceId) config.voiceId = voiceId;
      
      const modelId = process.env['ELEVENLABS_MODEL_ID'];
      if (modelId) config.modelId = modelId;
      
      const stability = process.env['ELEVENLABS_STABILITY'];
      if (stability) config.stability = parseFloat(stability);
      
      const similarityBoost = process.env['ELEVENLABS_SIMILARITY_BOOST'];
      if (similarityBoost) config.similarityBoost = parseFloat(similarityBoost);
      
      ElevenLabsClient.instance = new ElevenLabsClient(config);
    }

    return ElevenLabsClient.instance;
  }

  /**
   * Generate speech from text using ElevenLabs API
   * Returns audio data as ArrayBuffer
   */
  async textToSpeech(text: string): Promise<ElevenLabsResponse> {
    try {
      if (!text || text.trim().length === 0) {
        return { error: 'Text cannot be empty' };
      }

      const url = `${this.baseUrl}/text-to-speech/${this.config.voiceId}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: this.config.modelId,
          voice_settings: {
            stability: this.config.stability,
            similarity_boost: this.config.similarityBoost,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('ElevenLabs API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        return { 
          error: `ElevenLabs API error: ${response.status} ${response.statusText}: ${errorText}` 
        };
      }

      const audioData = await response.arrayBuffer();
      
      logger.info('ElevenLabs text-to-speech successful', {
        textLength: text.length,
        audioSize: audioData.byteLength,
      });

      return { audioData };
    } catch (error) {
      logger.error('ElevenLabs text-to-speech failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices(): Promise<{ voices?: any[]; error?: string }> {
    try {
      const url = `${this.baseUrl}/voices`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'xi-api-key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { 
          error: `Failed to fetch voices: ${response.status} ${response.statusText}: ${errorText}` 
        };
      }

      const data = await response.json() as { voices?: any[] };
      return { voices: data.voices || [] };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }
}

