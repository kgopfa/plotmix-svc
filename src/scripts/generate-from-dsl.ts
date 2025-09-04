import { Orchestrator } from '../services/pipeline/orchestrator';
import { ProjectService } from '../services/project.service';
import { ConversationService } from '../services/conversation.service';
import { createDefaultProjectConfiguration } from '../utils/project-config';
import { MESSAGE_TYPES } from '../types';
import { logger } from '../utils/logger';

import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../clients/database.client';

// Default DSL input for testing
const DEFAULT_DSL = `seed 42
style educational

heading "Binary Search Algorithm"
subtitle "Finding target value in sorted array"
explanation "An efficient search algorithm that finds a target value in a sorted array by repeatedly dividing the search interval in half"
example "Given a sorted array and a target value of 23, the algorithm will find the target efficiently"
array [2,5,8,12,16,23,38,56,72,91]
animate highlight [0,9]
caption 1 "Start with the entire sorted array as our search range"
animate focus [4]
caption 2 "Find the middle element (16) and compare it with our target (23)"
animate compare [4,5]
caption 3 "Since 16 < 23, we eliminate the left half and search only the right portion"
animate highlight [5,9]
caption 4 "Our new search range is narrowed to the right half of the array"
animate focus [6]
caption 5 "Find the new middle element (38) in our reduced search range"
animate select [5]
caption 6 "We found our target value 23 at index 5 of the array"
conclusion 1 "Time Complexity: O(log n)"
conclusion 2 "Space Complexity: O(1)"
conclusion 3 "Use Case: Searching in sorted arrays"
conclusion 4 "Requirement: Array must be sorted"`;

function getDslInput(): string {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📝 Using default DSL input...');
    return DEFAULT_DSL;
  }
  
  const firstArg = args[0];
  
  if (!firstArg) {
    console.log('📝 Using default DSL input...');
    return DEFAULT_DSL;
  }
  
  // Check if it's a file path
  if (firstArg.endsWith('.dsl') || firstArg.endsWith('.txt')) {
    try {
      const filePath = path.resolve(firstArg);
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`📁 Reading DSL from file: ${filePath}`);
      return content;
    } catch (error) {
      console.error(`❌ Failed to read file ${firstArg}:`, error);
      process.exit(1);
    }
  }
  
  // Check if it's a file path without extension
  if (fs.existsSync(firstArg)) {
    try {
      const content = fs.readFileSync(firstArg, 'utf8');
      console.log(`📁 Reading DSL from file: ${firstArg}`);
      return content;
    } catch (error) {
      console.error(`❌ Failed to read file ${firstArg}:`, error);
      process.exit(1);
    }
  }
  
  // Treat as inline DSL
  console.log('📝 Using inline DSL input...');
  return firstArg;
}

async function generateProjectFromDsl(dslInput?: string) {
  try {
    const dsl = dslInput || getDslInput();
    
    logger.info('Starting DSL-based project generation...');
    console.log('\n🚀 Starting DSL Project Generation...');
    
    // Generate scene from DSL using orchestrator
    const result = await Orchestrator.generateFromDsl(dsl);
    
    if (!result.success || !result.mainState) {
      throw new Error(`DSL generation failed: ${result.error}`);
    }
    
    logger.info('DSL processed successfully, creating project...');
    console.log('✅ DSL processed successfully');
    
    // Use the existing user with specified credentials
    const userEmail = 'jerrysmith@rickandmorty.com';
    let systemUserId: string;
    
    try {
      // Find the user by email
      const user = await prisma.user.findUnique({
        where: { email: userEmail }
      });
      
      if (!user) {
        throw new Error(`User with email ${userEmail} not found`);
      }
      
      systemUserId = user.id;
      logger.info('Found existing user', { userId: systemUserId, email: userEmail });
    } catch (error) {
      logger.error('Failed to find user', { error, email: userEmail });
      throw new Error(`User lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Extract title from DSL for project name
    const title = 'DSL Generated Project';
    
    // Create project with generated mainState
    const project = await ProjectService.createProject(systemUserId, {
      name: title,
      title: title,
      source: 'DSL_GENERATED',
      mainState: result.mainState,
      configuration: createDefaultProjectConfiguration(),
      features: {
        attachments: { enabled: false },
        audio: { enabled: false },
        music: { enabled: false },
        webSearch: { enabled: false },
      },
    } as any);
    
    logger.info('Project created successfully', { projectId: project.id });
    console.log('✅ Project created successfully');
    
    // Create conversation and add messages
    let conversationId = '';
    try {
      const conversation = await ConversationService.createConversation(systemUserId, { projectId: project.id });
      conversationId = conversation.id;
      
      await ConversationService.addMessage(conversationId, systemUserId, { 
        content: `Generated from DSL: ${title}` 
      } as any, MESSAGE_TYPES.USER);
      
      await ConversationService.addMessage(conversationId, systemUserId, { 
        content: result.summary || 'Generated via DSL pipeline' 
      } as any, MESSAGE_TYPES.LLM);
      
      logger.info('Conversation created successfully', { conversationId });
      console.log('✅ Conversation created successfully');
    } catch (e) {
      logger.error('Failed to create conversation/messages for generated project', { 
        error: e instanceof Error ? e.message : String(e) 
      });
      console.log('⚠️  Failed to create conversation (continuing anyway)');
    }
    
    // Log the results
    logger.info('🎉 DSL Project Generation Complete!', {
      projectId: project.id,
      conversationId,
      elementsCount: result.mainState.elements.length,
      groupsCount: result.mainState.groups.length,
      summary: result.summary
    });
    
    // Print project details for easy access
    console.log('\n📋 Generated Project Details:');
    console.log(`Project ID: ${project.id}`);
    console.log(`Conversation ID: ${conversationId}`);
    console.log(`Elements: ${result.mainState.elements.length}`);
    console.log(`Groups: ${result.mainState.groups.length}`);
    console.log(`Summary: ${result.summary}`);
    
    return { project, conversationId, mainState: result.mainState };
    
  } catch (error) {
    logger.error('DSL project generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    console.error('❌ Generation failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Export for use in other scripts
export { generateProjectFromDsl, DEFAULT_DSL };

// Run if this script is executed directly
if (require.main === module) {
  generateProjectFromDsl()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}
