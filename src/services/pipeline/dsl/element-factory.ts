import type { Group, Rect, TextEl } from '../../../types';
import type { StylePack } from '../../../types';
import { randomUUID } from 'crypto';
import { computeCenteredXPositions } from '../../../utils/grid';
import { measureTextWidthAdvanced } from '../../../utils/text-width';
import { TimelineBuilder } from './timeline-builder';

// Helper function to calculate text width using Canvas API for accurate measurements
function calculateTextWidth(text: string, fontSize: number, fontFamily: string, fontWeight: string = 'normal'): number {
  return measureTextWidthAdvanced(text, fontSize, fontFamily, fontWeight);
}

// Helper function to calculate optimal cell dimensions based on content
function calculateOptimalCellDimensions(
  values: (string | number)[],
  style: StylePack,
  minCellSize: number = 60
): { width: number; height: number } {
  let maxTextWidth = 0;
  
  for (const value of values) {
    const textStr = String(value);
    const textWidth = calculateTextWidth(textStr, style.typography.size, style.typography.family);
    maxTextWidth = Math.max(maxTextWidth, textWidth);
  }
  
  // Add padding and ensure minimum size
  const optimalWidth = Math.max(maxTextWidth + 20, minCellSize);
  const optimalHeight = Math.max(style.typography.size * 1.5, minCellSize);

  return { width: optimalWidth, height: optimalHeight };
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

    // Center-origin positioning for arrays aligned to center-start grid lines
    const minCellSize = data.cell ?? style.cell.w;
    const gap = data.gap ?? 80;

    // Calculate optimal cell dimensions based on content
    const { width: cellWidth, height: cellHeight } = calculateOptimalCellDimensions(
      data.values,
      style,
      minCellSize
    );

    // Place middle item at x=0 using symmetric spacing (gap + cell width as step)
    const stepX = cellWidth + gap;
    const arrayY = 0; // center row per requirement
    const canvasWidth = 1920;
    const marginX = 40;
    const centerXs = computeCenteredXPositions(data.values.length, stepX, canvasWidth, marginX);

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
    
    // Position caption at the top of the canvas, centered horizontally
    const captionY = -400; // Above the array
    const captionX = 0; // Center horizontally
    
    // Create caption text element
    const captionFontSize = style.typography.size * 0.9;
    const captionTextWidth = calculateTextWidth(data.text, captionFontSize, style.typography.family);
    const captionWidth = Math.min(captionTextWidth, 1200); // Cap at 1200px
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
    
    // Position heading at the very top of the canvas, centered horizontally
    const headingY = -450; // Top of canvas
    const headingX = 0; // Center horizontally
    
    // Create heading text element
    const headingFontSize = style.typography.size * 1.2;
    const headingTextWidth = calculateTextWidth(data.text, headingFontSize, style.typography.family);
    const headingWidth = Math.min(headingTextWidth, 1200); // Cap at 1200px
    const headingHeight = style.typography.size * 1.8;
    
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
    
    // Position lists in the same place as other text elements (right side of canvas)
    const startX = 600; // Right side of canvas
    const startY = -300; // Start above the array
    const itemSpacing = 50; // Vertical spacing between items
    
    // Add title if present
    if (data.title) {
      const titleId = randomUUID();
      const titleFontSize = style.typography.size * 0.9;
      
      const title: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: startX,
        y: startY - 40, // Above the list items
        id: titleId,
        name: "List Title",
        text: data.title,
        type: "text",
        width: 800, // Max width for list titles
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
      
      const listItemElement: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: startX,
        y: itemY,
        id: itemId,
        name: `List Item ${index}`,
        text: `• ${item}`, // Add bullet point
        type: "text",
        width: 800, // Max width for list items
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
  ): TextEl[] {
    const elements: TextEl[] = [];
    
    // Get codeblock timing from TimelineBuilder
    const codeblockItems = timelineBuilder.getAllItems().filter(item => item.type === 'codeblock');
    const codeblockItem = codeblockItems[codeblockItems.length - 1]; // Get the last (most recent) codeblock
    
    // Position codeblocks in the same place as other text elements (right side of canvas)
    const startX = 600; // Right side of canvas
    const startY = -300; // Start above the array
    const lineSpacing = 25; // Vertical spacing between code lines
    
    // Add title if present
    if (data.title) {
      const titleId = randomUUID();
      const titleFontSize = style.typography.size * 0.9;
      
      const title: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: startX,
        y: startY - 40, // Above the code
        id: titleId,
        name: "Codeblock Title",
        text: data.title,
        type: "text",
        width: 800, // Max width for codeblock titles
        height: style.typography.size * 1.2,
        fontFamily: style.typography.family,
        fontSize: titleFontSize,
        fontWeight: "bold",
        textAlign: "left",
        pivotX: 0, // Left-aligned
        pivotY: (style.typography.size * 1.2) / 2,
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

      // Add timing animations if codeblock timing is available
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
          displayName: `codeblock-title-fade-in`,
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
          displayName: `codeblock-title-fade-out`,
          repeatDelay: 0
        });
      }
      
      elements.push(title);
    }
    
    // Add code lines
    data.data.forEach((line, index) => {
      const lineId = randomUUID();
      const lineFontSize = style.typography.size * 0.7; // Smaller font for code
      const lineY = startY + (index * lineSpacing);
      
      const codeLine: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: startX,
        y: lineY,
        id: lineId,
        name: `Code Line ${index}`,
        text: line,
        type: "text",
        width: 800, // Max width for code lines
        height: style.typography.size * 1.0,
        fontFamily: style.typography.family,
        fontSize: lineFontSize,
        fontWeight: "normal",
        textAlign: "left",
        pivotX: 0, // Left-aligned
        pivotY: (style.typography.size * 1.0) / 2,
        zIndex: 5,
        opacity: 0, // Start invisible for fade-in
        visible: true,
        groupId: "",
        wordWrap: true,
        fontStyle: "normal",
        lineHeight: 1.0,
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

      // Add timing animations if codeblock timing is available
      if (codeblockItem) {
        // Add fade-in animation
        codeLine.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: codeblockItem.startTime,
          duration: codeblockItem.fadeInDuration,
          properties: { alpha: 1 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: `codeblock-line-${index}-fade-in`,
          repeatDelay: 0
        });

        // Add fade-out animation
        codeLine.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: codeblockItem.startTime + codeblockItem.fadeInDuration + codeblockItem.visibleTime,
          duration: codeblockItem.fadeOutDuration,
          properties: { alpha: 0 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: `codeblock-line-${index}-fade-out`,
          repeatDelay: 0
        });
      }
      
      elements.push(codeLine);
    });
    
    return elements;
  }
}
