import { randomUUID } from 'crypto';
import type { Group, Rect, TextEl, CodeEditorEl } from '../../types';

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
  animations?: any[];
}

export function createTextEl(config: TextElConfig): TextEl {
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
    animations = []
  } = config;

  return {
    animations,
    fill: '#000000', // Will be overridden by style
    x,
    y,
    id: randomUUID(),
    name,
    text,
    type: 'text',
    width,
    height,
    pivotX: width / 2,
    pivotY: height / 2,
    zIndex,
    groupId,
    opacity,
    visible: true,
    fontSize,
    wordWrap: false,
    fontStyle: 'normal',
    textAlign,
    fontFamily,
    fontWeight,
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
  animations?: any[];
}

export function createRect(config: RectConfig): Rect {
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
    name = 'Rectangle',
    animations = []
  } = config;

  return {
    animations,
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
  name: string;
  opacity?: number;
  animations?: any[];
}

export function createGroup(config: GroupConfig): Group {
  const {
    elementIds,
    name,
    opacity = 1,
    animations = []
  } = config;

  return {
    animations,
    elementIds,
    x: 0,
    y: 0,
    id: randomUUID(),
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
  animations?: any[];
}

export function createCodeEditorEl(config: CodeEditorElConfig): CodeEditorEl {
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
    name = 'Code Editor',
    animations = []
  } = config;

  return {
    animations,
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
    textStrokeWidth: 0,
    tabSize: 4,
    language: 'javascript',
    syntaxTheme: 'light',
    showLineNumbers: false,
    showLineHighlight: true
  };
}
