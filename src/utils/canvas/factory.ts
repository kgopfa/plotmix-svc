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
    x: centerX,
    y: indexY,
    name: `Index Group ${index}`,
    opacity: 1,
    animations: []
  });

  const group = createGroup({
    elementIds: [rect.id, text.id],
    x: centerX,
    y: centerY,
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
    const demoStepTiming = timelineBuilder.getDemoStepTiming(data.order - 1);
    if (demoStepTiming) {
      
      // Add fade-in animation for caption
      caption.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: demoStepTiming.startTime,
        duration: demoStepTiming.fadeInDuration,
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
        startTime: demoStepTiming.visibleEnd,
        duration: demoStepTiming.fadeOutDuration,
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
    timelineBuilder: TimelineBuilder,
    listOrder?: number
  ): { groups: Group[]; elements: TextEl[] } {
    const elements: TextEl[] = [];
    const groups: Group[] = [];
    
    // Position lists using grid system
    const { x: startX, y: startY } = getCanvasGrid().getNextPosition('list', 'CONTENT_START');
    const itemSpacing = 50; // Vertical spacing between items
    
    // Get timing for this list content item
    const listTiming = timelineBuilder.getListTiming(listOrder || 0);
    
    // Create content item group for fade-out animation
    const contentGroupId = randomUUID();
    const contentGroup = createGroup({
      elementIds: [], // Will be populated as we add elements
      x: startX,
      y: startY,
      name: `List Content Item ${listOrder || 'Unknown'}`,
      opacity: 1, // Start visible, group handles fade-out
      animations: [],
      id: contentGroupId // Use the same ID
    });
    
    // Add group-level fade-out animation
    if (listTiming) {
      contentGroup.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: listTiming.visibleEnd,
        duration: listTiming.fadeOutDuration,
        properties: { alpha: 0 },
        easing: "power1.inOut",
        yoyo: false,
        repeat: 0,
        displayName: `list-content-fade-out`,
        repeatDelay: 0
      });
    }
    
    groups.push(contentGroup);
    
    // Add title if present - with proper timing (appears first)
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
        opacity: 0, // Start invisible for fade-in
        groupId: contentGroupId,
        name: `List Title ${listOrder || 'Unknown'}`,
        animations: []
      });

      // Set fill color from style
      title.fill = style.palette.text;
      
      // Add title fade-in animation (appears first)
      if (listTiming?.internalAnimations?.[0]?.id === 'list-title') {
        const titleTiming = listTiming.internalAnimations[0];
        
        title.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: titleTiming.startTime,
          duration: titleTiming.fadeInDuration,
          properties: { alpha: 1 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: `list-title-fade-in`,
          repeatDelay: 0
        });
      }
      
      elements.push(title);
      contentGroup.elementIds.push(title.id);
    }
    
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
        groupId: contentGroupId,
        name: `List Item ${index}`,
        animations: []
      });

      // Set fill color from style
      listItemElement.fill = style.palette.text;

      // Add internal animation timing if available (items appear after title)
      if (listTiming?.internalAnimations) {
        const itemAnimation = listTiming.internalAnimations.find(anim => anim.id === `list-item-${index}`);
        
        if (itemAnimation) {
          // Add fade-in animation (sequential timing)
          listItemElement.animations.push({
            id: randomUUID(),
            type: "fade",
            startTime: itemAnimation.startTime,
            duration: itemAnimation.fadeInDuration,
            properties: { alpha: 1 },
            easing: "power1.inOut",
            yoyo: false,
            repeat: 0,
            displayName: `list-item-${index}-fade-in`,
            repeatDelay: 0
          });
        }
      }
      
      elements.push(listItemElement);
      contentGroup.elementIds.push(listItemElement.id);
    });
    
    return { groups, elements };
  }

  static createCodeblock(
    data: { data: string[] | string; title?: string },
    style: StylePack,
    timelineBuilder: TimelineBuilder
  ): { groups: Group[]; elements: (Rect | TextEl | CodeEditorEl)[] } {
    const groups: Group[] = [];
    const elements: (Rect | TextEl | CodeEditorEl)[] = [];
    
    const codeblockTiming = timelineBuilder.getContentItemByType('codeblock', 0);
    
    const { x: codeblockX, y: codeblockY } = getCanvasGrid().getNextPosition('codeblock', 'CONTENT_START');
    
    const groupId = randomUUID();
    
    const codeText = Array.isArray(data.data) ? data.data.join('\n') : data.data;
    const codeLines = Array.isArray(data.data) ? data.data : data.data.split('\n');
    
    const codeBlockPadding = 40;
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
    const codeBlockWidth = codeEditorWidth + (codeBlockPadding * 2);
    const codeBlockHeight = codeEditorHeight + (codeBlockPadding * 2);
    
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
    
    const codeTextElement = createCodeEditorEl({
      text: codeText,
      x: codeblockX + codeBlockPadding, 
      y: codeblockY + codeBlockPadding,
      width: codeEditorWidth,
      height: codeEditorHeight,
      fontSize: fontSize,
      fontFamily: fontFamily,
      zIndex: 2,
      groupId: groupId,
      name: "Code Editor",
      animations: []
    });
    
    const codeGroup = createGroup({
      elementIds: [rectangle.id, codeTextElement.id],
      x: codeblockX,
      y: codeblockY,
      name: "Code Block",
      opacity: 0,
      animations: []
    });
    
    if (codeblockTiming) {
      codeGroup.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: codeblockTiming.startTime,
        duration: codeblockTiming.fadeInDuration,
        properties: { alpha: 1 },
        easing: "power1.inOut",
        yoyo: false,
        repeat: 0,
        displayName: "codeblock-fade-in",
        repeatDelay: 0
      });
      
      codeGroup.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: codeblockTiming.visibleEnd,
        duration: codeblockTiming.fadeOutDuration,
        properties: { alpha: 0 },
        easing: "power1.inOut",
        yoyo: false,
        repeat: 0,
        displayName: "codeblock-fade-out",
        repeatDelay: 0
      });
    }
    
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
        y: codeblockY - (codeBlockHeight / 2) - 40,
        width: titleWidth,
        height: style.typography.size * 1.2,
        fontSize: titleFontSize,
        fontFamily: style.typography.family,
        fontWeight: 'bold',
        textAlign: 'center',
        zIndex: 3,
        opacity: 0,
        name: 'Codeblock Title',
        animations: []
      });

      title.fill = style.palette.text;
      
      if (codeblockTiming) {
        title.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: codeblockTiming.startTime,
          duration: codeblockTiming.fadeInDuration,
          properties: { alpha: 1 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: "codeblock-title-fade-in",
          repeatDelay: 0
        });
        
        title.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: codeblockTiming.visibleEnd,
          duration: codeblockTiming.fadeOutDuration,
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
    
    elements.push(rectangle, codeTextElement);
    groups.push(codeGroup);
    
    return { groups, elements };
  }
}
