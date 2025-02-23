export interface Coordinates {
  x: number;
  y: number;
}

export interface ElementCoordinates {
  topLeft: Coordinates;
  topRight: Coordinates;
  bottomLeft: Coordinates;
  bottomRight: Coordinates;
  center: Coordinates;
  width: number;
  height: number;
}

export interface Viewport {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
}

export interface DOMNode {
  type?: 'TEXT_NODE';
  text?: string;
  tagName?: string;
  attributes?: Record<string, string>;
  xpath?: string;
  children: DOMNode[];
  isInteractive?: boolean;
  isVisible?: boolean;
  isTopElement?: boolean;
  highlightIndex?: number;
  shadowRoot?: boolean;
  viewportCoordinates?: ElementCoordinates;
  pageCoordinates?: ElementCoordinates;
  viewport?: Viewport;
}

export interface GetDOMTreeArgs {
  doHighlightElements?: boolean;
  focusHighlightIndex?: number;
  viewportExpansion?: number;
}
