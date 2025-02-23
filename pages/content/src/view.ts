/**
 * https://github.com/browser-use/browser-use/blob/main/browser_use/dom/views.py
 */

// Types from external dependencies
interface CoordinateSet {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  center: { x: number; y: number };
  width: number;
  height: number;
}

interface ViewportInfo {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
}

interface HashedDomElement {
  // Implementation depends on HistoryTreeProcessor
  [key: string]: any;
}

// Base class for DOM nodes
export abstract class DOMBaseNode {
  constructor(
    public isVisible: boolean,
    public parent: DOMElementNode | null = null,
  ) {}
}

// Text node class
export class DOMTextNode extends DOMBaseNode {
  readonly type: string = 'TEXT_NODE';

  constructor(
    public text: string,
    isVisible: boolean,
    parent: DOMElementNode | null = null,
  ) {
    super(isVisible, parent);
  }

  hasParentWithHighlightIndex(): boolean {
    let current = this.parent;
    while (current !== null) {
      if (current.highlightIndex !== null) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  get isParentInViewport(): boolean {
    return this.parent?.isInViewport ?? false;
  }

  get isParentTopElement(): boolean {
    return this.parent?.isTopElement ?? false;
  }
}

// Element node class
export class DOMElementNode extends DOMBaseNode {
  private _hash: HashedDomElement | null = null;

  constructor(
    public tagName: string,
    public xpath: string,
    public attributes: Record<string, string>,
    public children: DOMBaseNode[],
    isVisible: boolean,
    public isInteractive: boolean = false,
    public isTopElement: boolean = false,
    public isInViewport: boolean = false,
    public shadowRoot: boolean = false,
    public highlightIndex: number | null = null,
    public viewportCoordinates: CoordinateSet | null = null,
    public pageCoordinates: CoordinateSet | null = null,
    public viewportInfo: ViewportInfo | null = null,
    parent: DOMElementNode | null = null,
  ) {
    super(isVisible, parent);
  }

  toString(): string {
    let tagStr = `<${this.tagName}`;

    // Add attributes
    for (const [key, value] of Object.entries(this.attributes)) {
      tagStr += ` ${key}="${value}"`;
    }
    tagStr += '>';

    // Add extra info
    const extras: string[] = [];
    if (this.isInteractive) extras.push('interactive');
    if (this.isTopElement) extras.push('top');
    if (this.shadowRoot) extras.push('shadow-root');
    if (this.highlightIndex !== null) extras.push(`highlight:${this.highlightIndex}`);
    if (this.isInViewport) extras.push('in-viewport');

    if (extras.length > 0) {
      tagStr += ` [${extras.join(', ')}]`;
    }

    return tagStr;
  }

  // Cached property simulation
  get hash(): HashedDomElement {
    if (!this._hash) {
      // Implementation would depend on HistoryTreeProcessor
      this._hash = {}; // Placeholder
    }
    return this._hash;
  }

  getAllTextTillNextClickableElement(maxDepth: number = -1): string {
    const textParts: string[] = [];
    let currentDepth = 0;

    const collectText = (node: DOMBaseNode, currentDepth: number) => {
      if (maxDepth >= 0 && currentDepth > maxDepth) return;

      if (node instanceof DOMTextNode) {
        if (node.isVisible) {
          const trimmedText = node.text.trim();
          if (trimmedText) {
            console.log('Adding text node:', trimmedText);
            textParts.push(trimmedText);
          }
        }
      } else if (node instanceof DOMElementNode) {
        // Stop at the next clickable element
        if (node !== this && node.highlightIndex !== null) {
          console.log('Stopping at clickable element:', {
            tagName: node.tagName,
            highlightIndex: node.highlightIndex,
            text: node.children
              .filter(c => c instanceof DOMTextNode)
              .map(c => (c as DOMTextNode).text)
              .join(' '),
          });
          return;
        }

        // Continue with children
        for (const child of node.children) {
          collectText(child, currentDepth + 1);
        }
      }
    };

    collectText(this, currentDepth);
    const result = textParts.join(' ');
    console.log('Final text for element:', {
      tagName: this.tagName,
      highlightIndex: this.highlightIndex,
      text: result,
    });
    return result;
  }

  clickableElementsToString(includeAttributes: string[] = []): string {
    const formattedText: string[] = [];

    const processNode = (node: DOMBaseNode, depth: number) => {
      if (node instanceof DOMElementNode) {
        // Add element with highlightIndex if it's interactive and visible
        if (node.highlightIndex !== null && node.isInteractive && node.isVisible) {
          let attributesStr = '';
          if (includeAttributes.length > 0) {
            attributesStr =
              ' ' +
              includeAttributes
                .map(key => (node.attributes[key] ? `${key}="${node.attributes[key]}"` : ''))
                .filter(Boolean)
                .join(' ');
          }

          // Get text content
          const textContent = node.getAllTextTillNextClickableElement();
          console.log('Processing clickable element:', {
            tagName: node.tagName,
            highlightIndex: node.highlightIndex,
            textContent,
            attributes: node.attributes,
            isInteractive: node.isInteractive,
            isVisible: node.isVisible,
            isTopElement: node.isTopElement,
            isInViewport: node.isInViewport,
          });

          // Always include interactive elements, even if they have no text content
          formattedText.push(
            `[${node.highlightIndex}]<${node.tagName}${attributesStr}>${textContent.trim()}</${node.tagName}>`,
          );
        }

        // Process children regardless
        for (const child of node.children) {
          processNode(child, depth + 1);
        }
      } else if (node instanceof DOMTextNode) {
        // Add text only if it doesn't have a highlighted parent and is visible
        if (!node.hasParentWithHighlightIndex() && node.isVisible && node.text.trim()) {
          console.log('Adding standalone text node:', {
            text: node.text.trim(),
            isVisible: node.isVisible,
            hasParentWithHighlight: node.hasParentWithHighlightIndex(),
          });
          formattedText.push(`[]${node.text.trim()}`);
        }
      }
    };

    processNode(this, 0);
    console.log('Final formatted text:', formattedText);
    return formattedText.join('\n');
  }

  getFileUploadElement(checkSiblings: boolean = true): DOMElementNode | null {
    // Check if current element is a file input
    if (this.tagName === 'input' && this.attributes['type'] === 'file') {
      return this;
    }

    // Check children
    for (const child of this.children) {
      if (child instanceof DOMElementNode) {
        const result = child.getFileUploadElement(false);
        if (result) {
          return result;
        }
      }
    }

    // Check siblings only for the initial call
    if (checkSiblings && this.parent) {
      for (const sibling of this.parent.children) {
        if (sibling !== this && sibling instanceof DOMElementNode) {
          const result = sibling.getFileUploadElement(false);
          if (result) {
            return result;
          }
        }
      }
    }

    return null;
  }
}

// Type for selector map
export type SelectorMap = Map<number, DOMElementNode>;

// DOM state class
export class DOMState {
  constructor(
    public elementTree: DOMElementNode,
    public selectorMap: SelectorMap,
  ) {}
}
