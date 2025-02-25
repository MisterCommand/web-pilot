/* eslint-disable */
/**
 * This file contains function to convert DOM Nodes.
 */

import type { DOMNode } from './types';
import { DOMElementNode, DOMTextNode } from './view';

// Convert DOMNode to DOMElementNode/DOMTextNode
export function convertToDOMNode(
  nodeId: string,
  map: Record<string, DOMNode>,
  parent: DOMElementNode | null = null,
): DOMElementNode | DOMTextNode | null {
  const node = map[nodeId];
  if (!node) {
    console.warn('Node not found in map:', nodeId);
    return null;
  }

  if (node.type === 'TEXT_NODE' && node.text) {
    return new DOMTextNode(node.text, node.isVisible ?? true, parent);
  }

  // Create element node with all properties
  const elementNode = new DOMElementNode(
    node.tagName ?? 'div',
    node.xpath ?? '',
    node.attributes ?? {},
    [], // Children will be added after
    node.isVisible ?? true,
    node.isInteractive ?? false,
    node.isTopElement ?? false,
    true,
    node.shadowRoot ?? false,
    node.highlightIndex, // Don't use nullish coalescing here
    node.viewportCoordinates ?? null,
    node.pageCoordinates ?? null,
    node.viewport ?? null,
    parent,
  );

  // Convert children recursively
  if (node.children && Array.isArray(node.children)) {
    const convertedChildren = node.children
      .map(childId => {
        // Use the child ID directly from the children array
        const convertedChild = convertToDOMNode(childId.toString(), map, elementNode);
        if (!convertedChild) {
          return null;
        }
        return convertedChild;
      })
      .filter(Boolean);

    elementNode.children = convertedChildren;
  } else {
    elementNode.children = [];
  }

  return elementNode;
}
