import type { Group, Rect, TextEl, CodeEditorEl } from '../../types';
import type { StylePack } from '../../types';
import { randomUUID } from 'crypto';
import { 
  calculateTextWidth, 
  getCappedTextWidth, 
  getArrayPositions,
  calculateOptimalCellDimensions,
  CanvasGrid,
  ZONES
} from './canvas-grid';
import { TimelineBuilder } from '../../services/pipeline/dsl/timeline';
import { 
  createTextEl, 
  createRect, 
  createGroup, 
  createCodeEditorEl 
} from './element-helpers';

// Grid system for consistent positioning - shared instance
let canvasGrid: CanvasGrid | null = null;

export function resetCanvasGrid(): void {
  canvasGrid = new CanvasGrid();
}

export function getCanvasGrid(): CanvasGrid {
  if (!canvasGrid) {
    canvasGrid = new CanvasGrid();
  }
  return canvasGrid;
}


// Element builders (cell group) - using helper functions
function makeCell(
  style: StylePack,
  value: string | number,
  centerX: number,
  centerY: number,
  cellWidth: number,
  cellHeight: number,
  index: number
): { group: Group; rect: Rect; text: TextEl; indexText: TextEl; indexGroup: Group } {
  const gid = randomUUID();
  const indexGroupId = randomUUID();

  // Create rectangle using helper function
  const rect = createRect({
    x: centerX,
    y: centerY,
    width: cellWidth,
    height: cellHeight,
    fill: style.cell.fill,
    stroke: style.cell.stroke,
    strokeWidth: style.cell.strokeWidth,
    cornerRadius: style.cell.radius,
    zIndex: 1,
    groupId: gid,
    name: `Rectangle ${value}`,
    animations: []
  });

  // Calculate text dimensions
  const textStr = String(value);
  const isMonospace = style.typography.family.includes('monospace');
  const charWidth = isMonospace ? 0.6 : 0.7;
  const estimatedTextWidth = textStr.length * style.typography.size * charWidth;
  const textWidth = Math.min(estimatedTextWidth, cellWidth * 0.9);
  const textHeight = style.typography.size * 1.2;

  // Create text using helper function
  const text = createTextEl({
    text: textStr,
    x: centerX,
    y: centerY,
    width: textWidth,
    height: textHeight,
    fontSize: style.typography.size,
    fontFamily: style.typography.family,
    fontWeight: String(style.typography.weight),
    textAlign: 'center',
    zIndex: 2,
    groupId: gid,
    name: `Text ${value}`,
    animations: []
  });

  // Create index text
  const indexStr = String(index);
  const indexFontSize = style.typography.size * 0.7;
  const indexTextWidth = calculateTextWidth(indexStr, indexFontSize, style.typography.family);
  const indexTextHeight = indexFontSize * 1.2;
  const indexY = centerY + (cellHeight / 2) + 30;

  const indexText = createTextEl({
    text: indexStr,
    x: centerX,
    y: indexY,
    width: indexTextWidth,
    height: indexTextHeight,
    fontSize: indexFontSize,
    fontFamily: style.typography.family,
    fontWeight: 'normal',
    textAlign: 'center',
    zIndex: 3,
    groupId: indexGroupId,
    name: `Index ${index}`,
    animations: []
  });

  // Create groups using helper function
  const indexGroup = createGroup({
    elementIds: [indexText.id],
    name: `Index Group ${index}`,
    opacity: 1,
    animations: []
  });

  const group = createGroup({
    elementIds: [rect.id, text.id],
    name: `Array Cell ${index}`,
    opacity: 1,
    animations: []
  });

  return { group, rect, text, indexText, indexGroup };
}

export class ElementFactory {
  static createArray(
    data: { values: (string | number)[]; cell?: number; gap?: number },
    style: StylePack,
  ): { groups: Group[]; elements: (Rect | TextEl)[] } {
    const groups: Group[] = [];
    const elements: (Rect | TextEl)[] = [];

    // Use grid system for consistent positioning
    const minCellSize = data.cell ?? style.cell.w;
    const gap = data.gap ?? 80;

    // Calculate optimal cell dimensions based on content
    const { width: cellWidth, height: cellHeight } = calculateOptimalCellDimensions(
      data.values,
      style.typography.size,
      style.typography.family,
      minCellSize
    );

    // Position array at center of canvas (zone CONTENT_MID)
    const arrayY = ZONES.CONTENT_MID;
    const centerXs = getArrayPositions(data.values.length, cellWidth, gap);

    data.values.forEach((v, i) => {
      const centerX = centerXs[i]!;
      const { group, rect, text, indexText, indexGroup } = makeCell(
        style,
        v,
        centerX,
        arrayY,
        cellWidth,
        cellHeight,
        i
      );

      groups.push(group, indexGroup);
      elements.push(rect, text, indexText);
    });

    return { groups, elements };
  }

  static createCaption(
    data: { text: string; order: number },
    style: StylePack,
    timelineBuilder: TimelineBuilder
  ): TextEl {
    // Position caption using grid system
    const { x: captionX, y: captionY } = getCanvasGrid().getNextPosition('caption', 'CAPTION');
    
    // Create caption text element with proper width calculation
    const captionFontSize = style.typography.size * 0.9;
    const captionWidth = getCappedTextWidth(
      data.text, 
      captionFontSize, 
      style.typography.family, 
      'CAPTION'
    );
    const captionHeight = style.typography.size * 1.5;
    
    const caption = createTextEl({
      text: data.text,
      x: captionX,
      y: captionY,
      width: captionWidth,
      height: captionHeight,
      fontSize: captionFontSize,
      fontFamily: style.typography.family,
      fontWeight: 'normal',
      textAlign: 'center',
      zIndex: 10,
      opacity: 0, // Start invisible for fade-in
      name: `Caption ${data.order}`,
      animations: []
    });

    // Set fill color from style
    caption.fill = style.palette.text;

    // Get timing for this specific caption order from demo steps
    const demoItems = timelineBuilder.getAllDemoItems();
    const demoItem = demoItems[0]; // Get the first (and main) demo
    if (demoItem && demoItem.steps[data.order - 1]) {
      const step = demoItem.steps[data.order - 1]!;
      
      // Add fade-in animation for caption
      caption.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: step.captionStartTime,
        duration: step.captionFadeInDuration,
        properties: { alpha: 1 },
        easing: "power1.inOut",
        yoyo: false,
        repeat: 0,
        displayName: `caption-${data.order}-fade-in`,
        repeatDelay: 0
      });

      // Add fade-out animation for caption
      caption.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: step.captionStartTime + step.captionFadeInDuration + step.captionVisibleTime,
        duration: step.captionFadeOutDuration,
        properties: { alpha: 0 },
        easing: "power1.inOut",
        yoyo: false,
        repeat: 0,
        displayName: `caption-${data.order}-fade-out`,
        repeatDelay: 0
      });
    }

    return caption;
  }

  static createHeading(
    data: { text: string },
    style: StylePack,
  ): TextEl {
    // Position heading using grid system
    const { x: headingX, y: headingY } = getCanvasGrid().getNextPosition('heading', 'TOP');
    
    // Create heading text element with proper width calculation
    const headingFontSize = style.typography.size * 1.5;
    const headingWidth = getCappedTextWidth(
      data.text, 
      headingFontSize, 
      style.typography.family, 
      'HEADING',
      'bold'
    );
    const headingHeight = style.typography.size * 2;
    
    const heading = createTextEl({
      text: data.text,
      x: headingX,
      y: headingY,
      width: headingWidth,
      height: headingHeight,
      fontSize: headingFontSize,
      fontFamily: style.typography.family,
      fontWeight: 'bold',
      textAlign: 'center',
      zIndex: 15,
      opacity: 1, // Always visible
      name: 'Heading',
      animations: []
    });

    // Set fill color from style
    heading.fill = style.palette.text;

    return heading;
  }

  static createList(
    data: { data: string[]; title?: string },
    style: StylePack,
    timelineBuilder: TimelineBuilder
  ): TextEl[] {
    const elements: TextEl[] = [];
    
    // Position lists using grid system
    const { x: startX, y: startY } = getCanvasGrid().getNextPosition('list', 'CONTENT_START');
    const itemSpacing = 50; // Vertical spacing between items
    
    // Add title if present
    if (data.title) {
      const titleFontSize = style.typography.size * 0.9;
      const titleWidth = getCappedTextWidth(
        data.title, 
        titleFontSize, 
        style.typography.family, 
        'LIST_TITLE',
        'bold'
      );
      
      const title = createTextEl({
        text: data.title,
        x: startX,
        y: startY - 40, // Above the list items
        width: titleWidth,
        height: style.typography.size * 1.2,
        fontSize: titleFontSize,
        fontFamily: style.typography.family,
        fontWeight: 'bold',
        textAlign: 'left',
        zIndex: 5,
        opacity: 1,
        name: 'List Title',
        animations: []
      });

      // Set fill color from style
      title.fill = style.palette.text;
      
      elements.push(title);
    }
    
    // Add list items with timing from TimelineBuilder
    const listItems = timelineBuilder.getAllListItems();
    const listItem = listItems.find(item => item.itemCount === data.data.length);
    
    data.data.forEach((item, index) => {
      const itemFontSize = style.typography.size * 0.8;
      const itemY = startY + (index * itemSpacing);
      
      const itemWidth = getCappedTextWidth(
        `• ${item}`, 
        itemFontSize, 
        style.typography.family, 
        'LIST_ITEM'
      );
      
      const listItemElement = createTextEl({
        text: `• ${item}`, // Add bullet point
        x: startX,
        y: itemY,
        width: itemWidth,
        height: style.typography.size * 1.1,
        fontSize: itemFontSize,
        fontFamily: style.typography.family,
        fontWeight: 'normal',
        textAlign: 'left',
        zIndex: 5,
        opacity: 0, // Start invisible for fade-in
        name: `List Item ${index}`,
        animations: []
      });

      // Set fill color from style
      listItemElement.fill = style.palette.text;

      // Add timing animations if list timing is available
      if (listItem && listItem.items[index]) {
        const itemTiming = listItem.items[index]!;
        
        // Add fade-in animation
        listItemElement.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: itemTiming.startTime,
          duration: itemTiming.fadeInDuration,
          properties: { alpha: 1 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: `list-item-${index}-fade-in`,
          repeatDelay: 0
        });

        // Add fade-out animation
        listItemElement.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: itemTiming.startTime + itemTiming.fadeInDuration + itemTiming.visibleTime,
          duration: itemTiming.fadeOutDuration,
          properties: { alpha: 0 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: `list-item-${index}-fade-out`,
          repeatDelay: 0
        });
      }
      
      elements.push(listItemElement);
    });
    
    return elements;
  }

  static createCodeblock(
    data: { data: string[]; title?: string },
    style: StylePack,
    timelineBuilder: TimelineBuilder
  ): { groups: Group[]; elements: (Rect | TextEl | CodeEditorEl)[] } {
    const groups: Group[] = [];
    const elements: (Rect | TextEl | CodeEditorEl)[] = [];
    
    // Get codeblock timing from TimelineBuilder
    const codeblockItems = timelineBuilder.getAllItems().filter(item => item.type === 'codeblock');
    const codeblockItem = codeblockItems[codeblockItems.length - 1]; // Get the last (most recent) codeblock
    
    // Position codeblock using grid system
    const { x: codeblockX, y: codeblockY } = getCanvasGrid().getNextPosition('codeblock', 'CONTENT_START');
    
    // Create group and element IDs
    const groupId = randomUUID();
    
    // Join all code lines into single text
    const codeText = data.data.join('\n');
    const codeLines = data.data;
    
    // Calculate code block dimensions based on content
    const codeBlockPadding = 40; // 40px padding around the code editor
    const lineHeight = 1.5;
    const fontSize = 26;
    const fontFamily = 'Monaco, Consolas, "Courier New", monospace';
    
    // Calculate width: find longest line (including indentation)
    let maxLineWidth = 0;
    for (const line of codeLines) {
      const lineWidth = calculateTextWidth(line, fontSize, fontFamily);
      maxLineWidth = Math.max(maxLineWidth, lineWidth);
    }
    
    // Calculate code editor dimensions (inner)
    const codeEditorWidth = Math.max(maxLineWidth, 300);
    const codeEditorHeight = Math.max(codeLines.length * lineHeight * fontSize, 200);
    
    // Calculate rectangle dimensions (outer) with 40px padding
    const codeBlockWidth = codeEditorWidth + (codeBlockPadding * 2); // 40px on each side
    const codeBlockHeight = codeEditorHeight + (codeBlockPadding * 2); // 40px top and bottom
    
    // Create background rectangle using helper function
    const rectangle = createRect({
      x: codeblockX,
      y: codeblockY,
      width: codeBlockWidth,
      height: codeBlockHeight,
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 1,
      cornerRadius: 13,
      zIndex: 1,
      groupId: groupId,
      name: "Code Block Background",
      animations: []
    });
    
    // Create code text element using helper function
    const codeTextElement = createCodeEditorEl({
      text: codeText,
      x: codeblockX,
      y: codeblockY,
      width: codeEditorWidth,
      height: codeEditorHeight,
      fontSize: fontSize,
      fontFamily: fontFamily,
      zIndex: 2,
      groupId: groupId,
      name: "Code Editor",
      animations: []
    });
    
    // Create group for code block using helper function
    const codeGroup = createGroup({
      elementIds: [rectangle.id, codeTextElement.id],
      name: "Code Block",
      opacity: 0, // Start invisible for fade-in animation
      animations: []
    });
    
    // Add timing animations if codeblock timing is available
    if (codeblockItem) {
      // Add fade-in animation to the group
      codeGroup.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: codeblockItem.startTime,
        duration: codeblockItem.fadeInDuration,
        properties: { alpha: 1 },
        easing: "power1.inOut",
        yoyo: false,
        repeat: 0,
        displayName: "codeblock-fade-in",
        repeatDelay: 0
      });
      
      // Add fade-out animation to the group
      codeGroup.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: codeblockItem.startTime + codeblockItem.fadeInDuration + codeblockItem.visibleTime,
        duration: codeblockItem.fadeOutDuration,
        properties: { alpha: 0 },
        easing: "power1.inOut",
        yoyo: false,
        repeat: 0,
        displayName: "codeblock-fade-out",
        repeatDelay: 0
      });
    }
    
    // Add title if present (positioned above the code block)
    if (data.title) {
      const titleFontSize = style.typography.size * 0.9;
      const titleWidth = getCappedTextWidth(
        data.title, 
        titleFontSize, 
        style.typography.family, 
        'CODE_TITLE',
        'bold'
      );
      
      const title = createTextEl({
        text: data.title,
        x: codeblockX,
        y: codeblockY - (codeBlockHeight / 2) - 40, // Above the code block
        width: titleWidth,
        height: style.typography.size * 1.2,
        fontSize: titleFontSize,
        fontFamily: style.typography.family,
        fontWeight: 'bold',
        textAlign: 'center',
        zIndex: 3,
        opacity: 0, // Start invisible for fade-in
        name: 'Codeblock Title',
        animations: []
      });

      // Set fill color from style
      title.fill = style.palette.text;
      
      // Add timing animations for title if codeblock timing is available
      if (codeblockItem) {
        // Add fade-in animation
        title.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: codeblockItem.startTime,
          duration: codeblockItem.fadeInDuration,
          properties: { alpha: 1 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: "codeblock-title-fade-in",
          repeatDelay: 0
        });
        
        // Add fade-out animation
        title.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: codeblockItem.startTime + codeblockItem.fadeInDuration + codeblockItem.visibleTime,
          duration: codeblockItem.fadeOutDuration,
          properties: { alpha: 0 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: "codeblock-title-fade-out",
          repeatDelay: 0
        });
      }
      
      elements.push(title);
    }
    
    // Add elements and group to scene
    elements.push(rectangle, codeTextElement);
    groups.push(codeGroup);
    
    return { groups, elements };
  }
}
