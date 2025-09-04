# DSL Generation Script

This script allows you to quickly generate projects directly from DSL input, bypassing the LLM pipeline for faster testing and development.

## Usage

### 1. Using the default DSL (Binary Search example)
```bash
npm run generate:dsl
```

### 2. Using a DSL file
```bash
npm run generate:dsl examples/binary-search.dsl
```

### 3. Using inline DSL
```bash
npm run generate:dsl "dsl seed 42 style educational heading \"My Algorithm\" subtitle \"Description\" explanation \"Explanation text\" array [1,2,3,4,5]"
```

### 4. Using ts-node directly
```bash
npx ts-node src/scripts/generate-from-dsl.ts
npx ts-node src/scripts/generate-from-dsl.ts examples/binary-search.dsl
```

## What it does

1. **Processes DSL input** using the orchestrator's DSL compiler and executor
2. **Creates a project** with the generated mainState
3. **Creates a conversation** linked to the project
4. **Adds initial messages** to the conversation
5. **Outputs project details** including IDs for easy access

## Output

The script will output:
- Project ID
- Conversation ID  
- Number of elements and groups
- Summary of what was generated

## Example Output

```
🚀 Starting DSL Project Generation...
📝 Using default DSL input...
✅ DSL processed successfully
✅ Project created successfully
✅ Conversation created successfully

📋 Generated Project Details:
Project ID: 12345678-1234-1234-1234-123456789abc
Conversation ID: 87654321-4321-4321-4321-cba987654321
Elements: 25
Groups: 3
Summary: Generated visualization with 10 array elements and 15 text elements using seed 42.

✅ Script completed successfully!
```

## Notes

- Uses a system user ID for testing (`system-test-user-{uuid}`)
- Project source is set to `DSL_GENERATED`
- All features are disabled by default
- Project title is extracted from the `heading` directive in the DSL
- If conversation creation fails, the script continues and logs a warning
