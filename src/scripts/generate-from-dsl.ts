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
const DEFAULT_DSL = `
heading "Binary Search Algorithm"

array [1,3,5,7,9,11,13,15]

caption 1 "Binary search requires a sorted array and uses two pointers to define the search range."

create_pointer "LOW" 0
create_pointer "HIGH" 7
caption 2 "Initialize low pointer at index 0 and high pointer at index 7."

create_pointer "LOW" 3
create_pointer "HIGH" 3
caption 3 "Calculate the midpoint at index 3 and compare it with the target value 9."

animate highlight [4,7]
caption 4 "Since target 9 is greater than midpoint value 7, adjust the low pointer to index 4."

create_pointer "LOW" 5
create_pointer "HIGH" 5
caption 5 "Calculate new midpoint at index 5 and compare with target."

animate select [5]
caption 6 "Target value 9 is found at index 5! Binary search successfully located the element."

explanation 1 "Binary search defines a search interval that covers the entire array."
explanation 2 "It repeatedly compares the midpoint value to the target, adjusting the interval."
explanation 3 "This method continues until the target is found or the interval is empty."

approach 1 "Start with low and high pointers indicating the full array range."
approach 2 "Calculate the midpoint of the current search interval."
approach 3 "If the target is greater than the midpoint value, adjust the low pointer."
approach 4 "If the target is less than the midpoint value, adjust the high pointer."
approach 5 "Repeat until the target is located or the search interval is exhausted."

keyidea 1 "Requires a sorted array for efficiency."
keyidea 2 "Utilizes a divide and conquer strategy."
keyidea 3 "Can be implemented using iteration or recursion."
keyidea 4 "Significantly reduces the search space at each step."
keyidea 5 "Highly efficient for large datasets."

pseudocode """function binarySearch(array, target)
   low = 0
   high = length(array) - 1
   while low <= high
       mid = (low + high) / 2
       if array[mid] == target
           return mid
       else if array[mid] < target
           low = mid + 1
       else
           high = mid - 1
   return -1"""

edgecase 1 "Empty array may lead to immediate failure."
edgecase 2 "Target less than smallest element results in no match."
edgecase 3 "Target greater than largest element results in no match."
edgecase 4 "Target in the middle can lead to a quick success."
edgecase 5 "Repeated elements may affect performance but not functionality."
edgecase 6 "Target as the first element requires careful pointer handling."

conclusion 1 "Time complexity is O(log n), making it efficient for large arrays."
conclusion 2 "Space complexity is O(1), as it uses minimal extra space."

alternative 1 "Linear Search — Check each element sequentially until found (O(n))."`;

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
