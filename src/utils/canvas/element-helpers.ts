import { randomUUID } from 'crypto';
import type { CanvasElement, CanvasGroup } from '../../types';

// Helper functions for creating elements with configurable parameters

export interface TextElConfig {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  zIndex?: number;
  opacity?: number;
  groupId?: string;
  name?: string;
  pivotX?: number;
  pivotY?: number;
}

export function createTextEl(config: TextElConfig): CanvasElement {
  const {
    text,
    x,
    y,
    width,
    height,
    fontSize,
    fontFamily,
    fontWeight = 'normal',
    textAlign = 'center',
    zIndex = 1,
    opacity = 1,
    groupId = '',
    name = 'Text',
    pivotX = width / 2,
    pivotY = height / 2
  } = config;

  return {
    fill: '#000000', // Will be overridden by style
    x,
    y,
    id: randomUUID(),
    name,
    text,
    type: 'text',
    width,
    height,
    pivotX,
    pivotY,
    zIndex,
    groupId,
    opacity,
    visible: true,
    fontSize,
    wordWrap: false,
    fontStyle: 'normal',
    textAlign,
    fontFamily,
    fontWeight: fontWeight as any,
    lineHeight: 1.2,
    shadowBlur: 0,
    shadowColor: '#000000',
    strokeWidth: 0,
    cornerRadius: 0,
    letterSpacing: 0,
    shadowEnabled: false,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: 0,
    wordWrapWidth: 0,
    textStrokeJoin: 'round',
    isAnimationPath: false,
    textStrokeWidth: 0
  };
}

export interface RectConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  zIndex?: number;
  opacity?: number;
  groupId?: string;
  name?: string;
}

export function createRect(config: RectConfig): CanvasElement {
  const {
    x,
    y,
    width,
    height,
    fill,
    stroke = '#000000',
    strokeWidth = 1,
    cornerRadius = 0,
    zIndex = 1,
    opacity = 1,
    groupId = '',
    name = 'Rectangle'
  } = config;

  return {
    fill,
    x,
    y,
    id: randomUUID(),
    name,
    type: 'rectangle',
    width,
    height,
    pivotX: width / 2,
    pivotY: height / 2,
    stroke,
    zIndex,
    groupId,
    opacity,
    visible: true,
    shadowBlur: 0,
    shadowColor: '#000000',
    strokeWidth,
    cornerRadius,
    shadowEnabled: false,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: 0,
    isAnimationPath: false
  };
}

export interface GroupConfig {
  elementIds: string[];
  x: number;
  y: number;
  name: string;
  opacity?: number;
  id?: string; // Allow custom ID
}

export function createGroup(config: GroupConfig): CanvasGroup {
  const {
    elementIds,
    x,
    y,
    name,
    opacity = 1,
    id
  } = config;

  return {
    elementIds,
    x,
    y,
    id: id || randomUUID(),
    name,
    type: 'custom',
    opacity,
    rotation: 0,
    isDefaultGroup: false
  };
}

export interface CodeEditorElConfig {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  zIndex?: number;
  opacity?: number;
  groupId?: string;
  name?: string;
}

export function createCodeEditorEl(config: CodeEditorElConfig): CanvasElement {
  const {
    text,
    x,
    y,
    width,
    height,
    fontSize,
    fontFamily,
    zIndex = 2,
    opacity = 1,
    groupId = '',
    name = 'Code Editor'
  } = config;

  return {
    fill: '#1e1e1e',
    x,
    y,
    id: randomUUID(),
    name,
    text,
    type: 'code-editor',
    width,
    height,
    pivotX: width / 2,
    pivotY: height / 2,
    zIndex,
    groupId,
    opacity,
    visible: true,
    fontSize,
    wordWrap: true,
    fontStyle: 'normal',
    textAlign: 'left',
    fontFamily,
    fontWeight: '400',
    lineHeight: 1.5,
    shadowBlur: 0,
    shadowColor: '#000000',
    strokeWidth: 1,
    cornerRadius: 0,
    letterSpacing: 0,
    shadowEnabled: false,
    shadowOffsetX: 10,
    shadowOffsetY: 10,
    shadowOpacity: 0.5,
    wordWrapWidth: width,
    textStrokeJoin: 'round',
    isAnimationPath: false,
    textStrokeWidth: 0
  };
}
