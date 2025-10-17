import type { CanvasElement, CanvasGroup } from '../../types';
import type { StylePack } from '../../types';
import { randomUUID } from 'crypto';
import { 
  calculateTextWidth, 
  getCappedTextWidth, 
  getArrayPositions,
  calculateOptimalCellDimensions,
  calculateTextHeight,
  CanvasGrid,
  ZONES,
  TEXT_WIDTH_CAPS
} from './canvas-grid';
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
): { group: CanvasGroup; rect: CanvasElement; text: CanvasElement; indexText: CanvasElement } {
  const gid = randomUUID();

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
    name: `Rectangle ${value}`
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
    name: `Text ${value}`
  });

  // Create index text - should be part of the same cell group
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
    groupId: gid,
    name: `Index ${index}`
  });

  // Create single group with all cell elements: rect, text, and index
  const group = createGroup({
    id: gid,
    elementIds: [rect.id, text.id, indexText.id],
    x: centerX,
    y: centerY,
    name: `Array Cell ${index}`,
    opacity: 1
  });

  return { group, rect, text, indexText };
}

export class ElementFactory {
  static createArray(
    data: { values: (string | number)[]; cell?: number; gap?: number },
    style: StylePack,
  ): { groups: CanvasGroup[]; elements: CanvasElement[] } {
    const groups: CanvasGroup[] = [];
    const elements: CanvasElement[] = [];

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
      const { group, rect, text, indexText } = makeCell(
        style,
        v,
        centerX,
        arrayY,
        cellWidth,
        cellHeight,
        i
      );

      groups.push(group);
      elements.push(rect, text, indexText);
    });

    return { groups, elements };
  }

  static createCaption(
    data: { text: string; order: number },
    style: StylePack
  ): CanvasElement {
    // Position caption using grid system
    const { x: captionX, y: captionY } = getCanvasGrid().getNextPosition('caption', 'CAPTION');
    
    // Create caption text element with proper width calculation
    const captionFontSize = style.typography.size * 0.9;
    const captionMaxWidth = TEXT_WIDTH_CAPS.CAPTION;
    const captionWidth = getCappedTextWidth(
      data.text, 
      captionFontSize, 
      style.typography.family, 
      'CAPTION'
    );
    
    // Calculate actual height considering wrapping
    const { height: captionHeight, lineCount: captionLines } = calculateTextHeight(
      data.text,
      captionFontSize,
      style.typography.family,
      captionMaxWidth,
      'normal',
      1.2
    );
    
    const needsWrapping = captionLines > 1;
    
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
      name: `Caption ${data.order}`
    });

    // Enable word wrapping if needed
    if (needsWrapping) {
      caption.wordWrap = true;
      caption.wordWrapWidth = captionMaxWidth;
    }

    // Set fill color from style
    caption.fill = style.palette.text;

    return caption;
  }

  static createHeading(
    data: { text: string },
    style: StylePack,
  ): CanvasElement {
    // Position heading using grid system
    const { x: headingX, y: headingY } = getCanvasGrid().getNextPosition('heading', 'TOP');
    
    // Create heading text element with proper width calculation
    const headingFontSize = style.typography.size * 1.5;
    const headingMaxWidth = TEXT_WIDTH_CAPS.HEADING;
    const headingWidth = getCappedTextWidth(
      data.text, 
      headingFontSize, 
      style.typography.family, 
      'HEADING',
      'bold'
    );
    
    // Calculate actual height considering wrapping
    const { height: headingHeight, lineCount: headingLines } = calculateTextHeight(
      data.text,
      headingFontSize,
      style.typography.family,
      headingMaxWidth,
      'bold',
      1.2
    );
    
    const needsWrapping = headingLines > 1;
    
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
      name: 'Heading'
    });

    // Enable word wrapping if needed
    if (needsWrapping) {
      heading.wordWrap = true;
      heading.wordWrapWidth = headingMaxWidth;
    }

    // Set fill color from style
    heading.fill = style.palette.text;

    // Advance the TOP zone by heading height plus spacing (100px gap before next content)
    getCanvasGrid().advanceZone('TOP', headingHeight, 100);

    return heading;
  }

  static createList(
    data: { data: string[] },
    style: StylePack,
    listOrder?: number
  ): { groups: CanvasGroup[]; elements: CanvasElement[] } {
    const elements: CanvasElement[] = [];
    const groups: CanvasGroup[] = [];
    
    // Start at SUBTITLE zone (-360) or continue from TOP zone if heading exists
    const grid = getCanvasGrid();
    const topZoneY = grid['zoneCurrentY']['TOP'];
    const listZone = topZoneY !== undefined ? 'TOP' : 'SUBTITLE';
    const { x: startX, y: startY } = grid.getNextPosition('list', listZone);
    
    // Create content item group
    const contentGroupId = randomUUID();
    const contentGroup = createGroup({
      elementIds: [],
      x: startX,
      y: startY,
      name: `List Content Item ${listOrder || 'Unknown'}`,
      opacity: 1,
      id: contentGroupId
    });
    groups.push(contentGroup);
    
    // Position items sequentially
    let currentY = startY;
    const itemSpacing = 10; // Spacing between items
    const itemMaxWidth = TEXT_WIDTH_CAPS.LIST_ITEM;
    const itemFontSize = style.typography.size * 0.8;
    
    data.data.forEach((item, index) => {
      const itemText = `• ${item}`;
      
      // Calculate height (accounts for wrapping)
      const { height: itemHeight } = calculateTextHeight(
        itemText,
        itemFontSize,
        style.typography.family,
        itemMaxWidth,
        'normal',
        1.2
      );
      
      const listItemElement = createTextEl({
        text: itemText,
        x: startX,
        y: currentY,
        width: itemMaxWidth,
        height: itemHeight,
        fontSize: itemFontSize,
        fontFamily: style.typography.family,
        fontWeight: 'normal',
        textAlign: 'left',
        zIndex: 5,
        opacity: 0,
        groupId: contentGroupId,
        name: `List Item ${index}`,
        pivotX: 0,
        pivotY: itemHeight / 2
      });

      listItemElement.wordWrap = true;
      listItemElement.wordWrapWidth = itemMaxWidth;
      listItemElement.fill = style.palette.text;
      
      elements.push(listItemElement);
      contentGroup.elementIds.push(listItemElement.id);
      
      // Next item starts after this one
      currentY += itemHeight + itemSpacing;
    });
    
    // Set zone to where next element's center should be
    // Account for large elements (codeblocks ~280px) that extend upward from center
    grid['zoneCurrentY'][listZone] = currentY + 150;
    grid['zoneCurrentY']['CONTENT_START'] = currentY + 150;
    
    return { groups, elements };
  }

  static createCodeblock(
    data: { data: string[] | string; title?: string },
    style: StylePack
  ): { groups: CanvasGroup[]; elements: CanvasElement[] } {
    const groups: CanvasGroup[] = [];
    const elements: CanvasElement[] = [];
    
    const { x: codeblockX, y: codeblockY } = getCanvasGrid().getNextPosition('codeblock', 'CONTENT_START', 300);
    
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
      name: "Code Block Background"
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
      name: "Code Editor"
    });
    
    const codeGroup = createGroup({
      elementIds: [rectangle.id, codeTextElement.id],
      x: codeblockX,
      y: codeblockY,
      name: "Code Block",
      opacity: 0
    });
    
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
        name: 'Codeblock Title'
      });

      title.fill = style.palette.text;
      
      elements.push(title);
    }
    
    elements.push(rectangle, codeTextElement);
    groups.push(codeGroup);
    
    // Advance the zone by the codeblock height (title is above, so just account for block)
    getCanvasGrid().advanceZone('CONTENT_START', codeBlockHeight, 20);
    
    return { groups, elements };
  }
}
