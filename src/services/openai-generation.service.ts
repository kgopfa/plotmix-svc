import type { MainStateGenerationRequest, MainStateGenerationResponse } from '../clients/openai.client';
import { OpenAIClient } from '../clients/openai.client';
import { logger } from '../utils/logger';

export class OpenAIGenerationService {
  static buildCanvasPrompt(request: MainStateGenerationRequest): string {
    let prompt = `Generate a project mainState for our design canvas based on the following request: ${request.prompt}\n\n`;
    if (request.projectFeatures) {
      prompt += 'Available features:\n';
      if (request.projectFeatures.attachments?.enabled) prompt += '- Attachments: enabled\n';
      if (request.projectFeatures.audio?.enabled) prompt += '- Audio: enabled\n';
      if (request.projectFeatures.music?.enabled) prompt += '- Music: enabled\n';
      if (request.projectFeatures.webSearch?.enabled) prompt += '- Web search: enabled\n';
    }
    prompt += '\nRespond ONLY with a valid JSON object representing mainState (no prose).';
    return prompt;
  }

  static getCanvasSystemPrompt(projectFeatures?: any): string {
    // Reuse the same text that was previously in OpenAIClient.getCanvasSystemPrompt
    const client = OpenAIClient.getInstance();
    // Using the existing method keeps a single source of truth
    // @ts-expect-error using private for now; could be refactored to a shared const
    return client['getCanvasSystemPrompt']?.(projectFeatures) ?? '';
  }

  static async generateMainState(request: MainStateGenerationRequest): Promise<MainStateGenerationResponse> {
    const client = OpenAIClient.getInstance();
    const sdk = client.getSdk();

    try {
      const enhancedPrompt = this.buildCanvasPrompt(request);
      const messages = [
        { role: 'system' as const, content: this.getCanvasSystemPrompt(request.projectFeatures) },
        ...request.conversationHistory,
        { role: 'user' as const, content: enhancedPrompt }
      ];

      const response = await sdk.chat.completions.create({
        model: client.getConfig().model,
        messages,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received from OpenAI');
      }

      const mainState = JSON.parse(content).mainState ?? JSON.parse(content);

      try {
        logger.info('OpenAI mainState received', {
          elementsCount: Array.isArray(mainState?.elements) ? mainState.elements.length : 0,
          groupsCount: Array.isArray(mainState?.groups) ? mainState.groups.length : 0,
          timelineKeys: mainState?.timeline ? Object.keys(mainState.timeline?.animationStates || {}).length : 0,
        });
      } catch {}

      logger.info('Canvas data generated successfully', {
        model: client.getConfig().model,
        promptLength: request.prompt.length,
        canvasElements: mainState?.elements?.length || 0,
        usage: response.usage,
      });

      return { success: true, mainState };
    } catch (error) {
      logger.error('Error generating canvas data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        prompt: request.prompt.substring(0, 100) + '...',
      });
      return { success: false, error: (error as Error).message };
    }
  }
}


