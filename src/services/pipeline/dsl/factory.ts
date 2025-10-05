import type { Group, Rect, TextEl, CodeEditorEl } from '../../../types';
import type { StylePack } from '../../../types';
import { randomUUID } from 'crypto';
import { 
  calculateTextWidth, 
  getCappedTextWidth, 
  getArrayPositions,
  calculateOptimalCellDimensions,
  CanvasGrid,
  ZONES
} from '../../../utils/canvas-grid';
import { TimelineBuilder } from './timeline';

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

// Element builders (cell group) - CORRECTED to use consistent center-origin positioning
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
  const rid = randomUUID();
  const tid = randomUUID();
  const iid = randomUUID();

  // Rectangle positioned at center with center pivots
  const rect: Rect = {
    animations: [],
    fill: style.cell.fill,
    x: centerX,
    y: centerY,
    id: rid,
    name: `Rectangle ${value}`,
    type: "rectangle",
    width: cellWidth,
    height: cellHeight,
    pivotX: cellWidth / 2,  // Center pivot
    pivotY: cellHeight / 2, // Center pivot
    stroke: style.cell.stroke,
    zIndex: 1,
    groupId: gid,
    opacity: 1, // Elements inherit group opacity
    visible: true,
    shadowBlur: style.shadow.shadowBlur,
    shadowColor: style.shadow.shadowColor,
    strokeWidth: style.cell.strokeWidth,
    cornerRadius: style.cell.radius,
    shadowEnabled: style.shadow.shadowEnabled,
    shadowOffsetX: style.shadow.shadowOffsetX,
    shadowOffsetY: style.shadow.shadowOffsetY,
    shadowOpacity: style.shadow.shadowOpacity,
    isAnimationPath: false,
  };

  // Calculate actual text dimensions based on font metrics
  const textStr = String(value);
  const isMonospace = style.typography.family.includes('monospace');
  const charWidth = isMonospace ? 0.6 : 0.7;
  const estimatedTextWidth = textStr.length * style.typography.size * charWidth;
  const textWidth = Math.min(estimatedTextWidth, cellWidth * 0.9); // Cap at 90% of cell width
  const textHeight = style.typography.size * 1.2; // Line height based on font size

  // Text positioned at center with center pivots
  const text: TextEl = {
    animations: [],
    fill: style.palette.text,
    x: centerX, // Center position
    y: centerY, // Center position
    id: tid,
    name: `Text ${value}`,
    text: textStr,
    type: "text",
    width: textWidth,
    height: textHeight,
    pivotX: textWidth / 2,  // Center pivot
    pivotY: textHeight / 2, // Center pivot
    zIndex: 2,
    groupId: gid,
    opacity: 1, // Elements inherit group opacity
    visible: true,
    fontSize: style.typography.size,
    wordWrap: false,
    fontStyle: "normal",
    textAlign: "center",
    fontFamily: style.typography.family,
    fontWeight: String(style.typography.weight),
    lineHeight: 1.2,
    shadowBlur: style.shadow.shadowBlur,
    shadowColor: style.shadow.shadowColor,
    strokeWidth: 0,
    cornerRadius: 0,
    letterSpacing: 0,
    shadowEnabled: style.shadow.shadowEnabled,
    shadowOffsetX: style.shadow.shadowOffsetX,
    shadowOffsetY: style.shadow.shadowOffsetY,
    shadowOpacity: style.shadow.shadowOpacity,
    wordWrapWidth: 0,
    textStrokeJoin: "round",
    isAnimationPath: false,
    textStrokeWidth: 0,
  };

  // Index text positioned below the cell
  const indexStr = String(index);
  const indexFontSize = style.typography.size * 0.7; // Smaller than cell text
  const indexTextWidth = calculateTextWidth(indexStr, indexFontSize, style.typography.family);
  const indexTextHeight = indexFontSize * 1.2;
  const indexY = centerY + (cellHeight / 2) + 30; // 30px below the cell

  const indexText: TextEl = {
    animations: [],
    fill: style.palette.text,
    x: centerX, // Center position
    y: indexY, // Below the cell
    id: iid,
    name: `Index ${index}`,
    text: indexStr,
    type: "text",
    width: indexTextWidth,
    height: indexTextHeight,
    pivotX: indexTextWidth / 2,  // Center pivot
    pivotY: indexTextHeight / 2, // Center pivot
    zIndex: 3,
    groupId: indexGroupId,
    opacity: 1,
    visible: true,
    fontSize: indexFontSize,
    wordWrap: false,
    fontStyle: "normal",
    textAlign: "center",
    fontFamily: style.typography.family,
    fontWeight: "normal",
    lineHeight: 1.2,
    shadowBlur: style.shadow.shadowBlur,
    shadowColor: style.shadow.shadowColor,
    strokeWidth: 0,
    cornerRadius: 0,
    letterSpacing: 0,
    shadowEnabled: style.shadow.shadowEnabled,
    shadowOffsetX: style.shadow.shadowOffsetX,
    shadowOffsetY: style.shadow.shadowOffsetY,
    shadowOpacity: style.shadow.shadowOpacity,
    wordWrapWidth: 0,
    textStrokeJoin: "round",
    isAnimationPath: false,
    textStrokeWidth: 0,
  };

  // Index group (contains only the index text)
  const indexGroup: Group = {
    animations: [],
    elementIds: [iid],
    x: 0,
    y: 0,
    id: indexGroupId,
    name: `Index Group ${index}`,
    type: "custom",
    opacity: 1,
    rotation: 0,
    isDefaultGroup: false,
  };

  // Main cell group (contains rect and text)
  const group: Group = {
    animations: [],
    elementIds: [rid, tid],
    x: 0,
    y: 0,
    id: gid,
    name: `Array Cell ${index}`,
    type: "custom",
    opacity: 1,
    rotation: 0,
    isDefaultGroup: false,
  };

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
    const captionId = randomUUID();
    
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
    
    const caption: TextEl = {
      animations: [],
      fill: style.palette.text,
      x: captionX,
      y: captionY,
      id: captionId,
      name: `Caption ${data.order}`,
      text: data.text,
      type: "text",
      width: captionWidth,
      height: captionHeight,
      fontFamily: style.typography.family,
      fontSize: captionFontSize,
      fontWeight: "normal", // Normal weight for captions
      textAlign: "center",
      pivotX: captionWidth / 2, // Center pivot (half of width)
      pivotY: captionHeight / 2, // Center pivot (half of height)
      zIndex: 10, // High z-index to appear above other elements
      opacity: 0, // Start invisible for fade-in
      visible: true,
      groupId: "",
      wordWrap: true,
      fontStyle: "normal",
      lineHeight: 1.2,
      shadowBlur: 0,
      shadowColor: "#000000",
      strokeWidth: 0,
      cornerRadius: 0,
      letterSpacing: 0,
      shadowEnabled: false,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowOpacity: 0,
      wordWrapWidth: captionWidth, // Same as width like captions
      textStrokeJoin: "round",
      isAnimationPath: false,
      textStrokeWidth: 0
    };

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
    const headingId = randomUUID();
    
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
    
    const heading: TextEl = {
      animations: [],
      fill: style.palette.text,
      x: headingX,
      y: headingY,
      id: headingId,
      name: "Heading",
      text: data.text,
      type: "text",
      width: headingWidth,
      height: headingHeight,
      fontFamily: style.typography.family,
      fontSize: headingFontSize,
      fontWeight: "bold", // Bold weight for headings
      textAlign: "center",
      pivotX: headingWidth / 2, // Center pivot (half of width)
      pivotY: headingHeight / 2, // Center pivot (half of height)
      zIndex: 15, // Highest z-index to appear above all other elements
      opacity: 1, // Always visible
      visible: true,
      groupId: "",
      wordWrap: true,
      fontStyle: "normal",
      lineHeight: 1.2,
      shadowBlur: 0,
      shadowColor: "#000000",
      strokeWidth: 0,
      cornerRadius: 0,
      letterSpacing: 0,
      shadowEnabled: false,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowOpacity: 0,
      wordWrapWidth: headingWidth,
      textStrokeJoin: "round",
      isAnimationPath: false,
      textStrokeWidth: 0
    };

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
      const titleId = randomUUID();
      const titleFontSize = style.typography.size * 0.9;
      const titleWidth = getCappedTextWidth(
        data.title, 
        titleFontSize, 
        style.typography.family, 
        'LIST_TITLE',
        'bold'
      );
      
      const title: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: startX,
        y: startY - 40, // Above the list items
        id: titleId,
        name: "List Title",
        text: data.title,
        type: "text",
        width: titleWidth,
        height: style.typography.size * 1.2,
        fontFamily: style.typography.family,
        fontSize: titleFontSize,
        fontWeight: "bold",
        textAlign: "left",
        pivotX: 0, // Left-aligned
        pivotY: (style.typography.size * 1.2) / 2,
        zIndex: 5,
        opacity: 1,
        visible: true,
        groupId: "",
        wordWrap: true,
        fontStyle: "normal",
        lineHeight: 1.2,
        shadowBlur: 0,
        shadowColor: "#000000",
        strokeWidth: 0,
        cornerRadius: 0,
        letterSpacing: 0,
        shadowEnabled: false,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowOpacity: 0,
        wordWrapWidth: 800,
        textStrokeJoin: "round",
        isAnimationPath: false,
        textStrokeWidth: 0
      };
      
      elements.push(title);
    }
    
    // Add list items with timing from TimelineBuilder
    const listItems = timelineBuilder.getAllListItems();
    const listItem = listItems.find(item => item.itemCount === data.data.length);
    
    data.data.forEach((item, index) => {
      const itemId = randomUUID();
      const itemFontSize = style.typography.size * 0.8;
      const itemY = startY + (index * itemSpacing);
      
      const itemWidth = getCappedTextWidth(
        `• ${item}`, 
        itemFontSize, 
        style.typography.family, 
        'LIST_ITEM'
      );
      
      const listItemElement: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: startX,
        y: itemY,
        id: itemId,
        name: `List Item ${index}`,
        text: `• ${item}`, // Add bullet point
        type: "text",
        width: itemWidth,
        height: style.typography.size * 1.1,
        fontFamily: style.typography.family,
        fontSize: itemFontSize,
        fontWeight: "normal",
        textAlign: "left",
        pivotX: 0, // Left-aligned
        pivotY: (style.typography.size * 1.1) / 2,
        zIndex: 5,
        opacity: 0, // Start invisible for fade-in
        visible: true,
        groupId: "",
        wordWrap: true,
        fontStyle: "normal",
        lineHeight: 1.2,
        shadowBlur: 0,
        shadowColor: "#000000",
        strokeWidth: 0,
        cornerRadius: 0,
        letterSpacing: 0,
        shadowEnabled: false,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowOpacity: 0,
        wordWrapWidth: 800,
        textStrokeJoin: "round",
        isAnimationPath: false,
        textStrokeWidth: 0
      };

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
    const rectangleId = randomUUID();
    const codeId = randomUUID();
    
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
    
    // Create background rectangle
    const rectangle: Rect = {
      animations: [],
      fill: "#ffffff",
      x: codeblockX,
      y: codeblockY,
      id: rectangleId,
      name: "Code Block Background",
      type: "rectangle",
      width: codeBlockWidth,
      height: codeBlockHeight,
      pivotX: codeBlockWidth / 2,  // Center pivot
      pivotY: codeBlockHeight / 2, // Center pivot
      stroke: "#000000",
      zIndex: 1,
      groupId: groupId,
      opacity: 1, // Elements inherit group opacity
      visible: true,
      shadowBlur: 0,
      shadowColor: "#000000",
      strokeWidth: 1,
      cornerRadius: 13,
      shadowEnabled: false,
      shadowOffsetX: 10,
      shadowOffsetY: 10,
      shadowOpacity: 0.5,
      isAnimationPath: false
    };
    
    // Create code text element
    const codeTextElement: CodeEditorEl = {
      animations: [],
      fill: "#1e1e1e",
      x: codeblockX,
      y: codeblockY,
      id: codeId,
      name: "Code Editor",
      text: codeText,
      type: "code-editor",
      width: codeEditorWidth,
      height: codeEditorHeight,
      pivotX: codeEditorWidth / 2,  // Center pivot
      pivotY: codeEditorHeight / 2, // Center pivot
      zIndex: 2,
      groupId: groupId,
      opacity: 1, // Elements inherit group opacity
      visible: true,
      fontSize: fontSize,
      wordWrap: true,
      fontStyle: "normal",
      textAlign: "left",
      fontFamily: fontFamily,
      fontWeight: "400",
      lineHeight: lineHeight,
      shadowBlur: 0,
      shadowColor: "#000000",
      strokeWidth: 1,
      cornerRadius: 0,
      letterSpacing: 0,
      shadowEnabled: false,
      shadowOffsetX: 10,
      shadowOffsetY: 10,
      shadowOpacity: 0.5,
      wordWrapWidth: codeEditorWidth,
      textStrokeJoin: "round",
      isAnimationPath: false,
      textStrokeWidth: 0,
      tabSize: 4,
      language: "javascript",
      syntaxTheme: "light",
      showLineNumbers: false,
      showLineHighlight: true
    };
    
    // Create group for code block
    const codeGroup: Group = {
      animations: [],
      elementIds: [rectangleId, codeId],
      x: 0, // Group positioning handled by elements
      y: 0, // Group positioning handled by elements
      id: groupId,
      name: "Code Block",
      type: "custom",
      opacity: 0, // Start invisible for fade-in animation
      rotation: 0,
      isDefaultGroup: false
    };
    
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
      const titleId = randomUUID();
      const titleFontSize = style.typography.size * 0.9;
      const titleWidth = getCappedTextWidth(
        data.title, 
        titleFontSize, 
        style.typography.family, 
        'CODE_TITLE',
        'bold'
      );
      
      const title: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: codeblockX,
        y: codeblockY - (codeBlockHeight / 2) - 40, // Above the code block
        id: titleId,
        name: "Codeblock Title",
        text: data.title,
        type: "text",
        width: titleWidth,
        height: style.typography.size * 1.2,
        fontFamily: style.typography.family,
        fontSize: titleFontSize,
        fontWeight: "bold",
        textAlign: "center",
        pivotX: titleWidth / 2, // Center pivot
        pivotY: (style.typography.size * 1.2) / 2, // Center pivot
        zIndex: 3,
        opacity: 0, // Start invisible for fade-in
        visible: true,
        groupId: "",
        wordWrap: true,
        fontStyle: "normal",
        lineHeight: 1.2,
        shadowBlur: 0,
        shadowColor: "#000000",
        strokeWidth: 0,
        cornerRadius: 0,
        letterSpacing: 0,
        shadowEnabled: false,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowOpacity: 0,
        wordWrapWidth: titleWidth,
        textStrokeJoin: "round",
        isAnimationPath: false,
        textStrokeWidth: 0
      };
      
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
