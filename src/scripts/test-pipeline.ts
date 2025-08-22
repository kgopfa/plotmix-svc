import { PipelineGenerationService } from '../services/pipeline-generation.service';
import { logger } from '../utils/logger';

async function testPipeline() {
  try {
    logger.info('Testing pipeline generation service...');
    
    const testPrompt = 'Explain how a web application processes user authentication requests';
    
    logger.info('Generating scene with prompt:', { prompt: testPrompt });
    
    const result = await PipelineGenerationService.generateScene(testPrompt);
    
    logger.info('Pipeline generation completed successfully', {
      name: result.name,
      title: result.title,
      description: result.description,
      elementCount: result.mainState.elements.length,
      groupCount: result.mainState.groups.length,
      timeline: result.mainState.timeline,
    });
    
    logger.info('Test completed successfully');
    
  } catch (error) {
    logger.error('Pipeline test failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPipeline();
}
