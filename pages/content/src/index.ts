/**
 * Collect page data when called by the background scripts.
 */

import { buildDomTree } from './buildDomTree';
import { DOMElementNode, DOMTextNode } from './view';
import { executeAction } from './executeAction';
import { convertToDOMNode } from './domElement';
import { debug } from '@extension/shared/lib/debug';

console.log('Web Pilot content script loaded'); // For testing

// Get mapping of index to xpath for all elements with xpath
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getXPaths(result: { rootId: string; map: Record<string, any> }): Record<string, string> {
  debug.log('Starting getXPaths with rootId:', result.rootId);
  const xpaths: Record<string, string> = {};
  let index = 0;

  function traverse(nodeId: string) {
    if (!nodeId || !result.map[nodeId]) {
      debug.warn('Encountered undefined node during traversal:', nodeId);
      return;
    }

    const node = result.map[nodeId];
    debug.log('Traversing node:', {
      id: nodeId,
      tagName: node.tagName,
      xpath: node.xpath,
      children: node.children?.length || 0,
    });

    // Check if node has xpath
    if (node.xpath && node.tagName && node.highlightIndex !== null) {
      debug.log('Found element with xpath:', {
        index,
        xpath: node.xpath,
        tagName: node.tagName,
      });
      xpaths[node.highlightIndex.toString()] = node.xpath;
      index++;
    }

    // Traverse children if they exist
    if (Array.isArray(node.children)) {
      debug.log(`Processing ${node.children.length} children for node:`, nodeId);
      node.children.forEach((childId: string, idx: number) => {
        if (childId) {
          debug.log(`Processing child ${idx + 1}/${node.children.length} (${childId}) of node:`, nodeId);
          traverse(childId);
        } else {
          debug.warn(`Skipping undefined child ${idx + 1}/${node.children.length} of node:`, nodeId);
        }
      });
    }
  }

  // Start traversal from root
  if (result.rootId) {
    debug.log('Starting traversal from root:', result.rootId);
    traverse(result.rootId);
  } else {
    debug.warn('Root node is undefined');
  }

  debug.log('Generated xpaths:', xpaths);
  return xpaths;
}

// Helper function to get structured data from the page
async function getPageStructuredData(): Promise<Record<string, unknown>> {
  const result = buildDomTree({
    doHighlightElements: true,
    focusHighlightIndex: -1,
    viewportExpansion: 100,
  });

  debug.log('DOM tree result:', JSON.stringify(result, null, 2));

  // Get the root node from the map using the rootId
  if (!result.rootId || !result.map) {
    debug.error('Invalid DOM tree result:', result);
    return {
      url: window.location.href,
      clickableElements: '',
    };
  }

  // Convert the DOM tree to our DOMElementNode structure
  const convertedRoot = convertToDOMNode(result.rootId, result.map);
  if (!convertedRoot) {
    debug.error('Failed to convert root node');
    return {
      url: window.location.href,
      clickableElements: '',
    };
  }

  if (!(convertedRoot instanceof DOMElementNode)) {
    debug.error('Root node is not a DOMElementNode');
    return {
      url: window.location.href,
      clickableElements: '',
    };
  }

  debug.log('Converted root node:', convertedRoot.toString());
  debug.log(
    'Root node children:',
    convertedRoot.children.map(c => {
      if (c instanceof DOMElementNode) {
        return {
          tagName: c.tagName,
          isInteractive: c.isInteractive,
          isVisible: c.isVisible,
          highlightIndex: c.highlightIndex,
          text: c.children
            .filter(child => child instanceof DOMTextNode)
            .map(child => (child as DOMTextNode).text)
            .join(' '),
        };
      }
      return c instanceof DOMTextNode ? c.text : null;
    }),
  );

  // Get clickable elements as string
  const clickableElements = convertedRoot.clickableElementsToString();
  debug.log('clickableElements:', clickableElements);

  try {
    const xpaths = getXPaths(result);
    debug.log('XPaths:', xpaths);
    return {
      title: document.title,
      url: window.location.href,
      clickableElements,
      xpaths,
    };
  } catch (error) {
    debug.error('Error getting XPaths:', error);
    return {
      title: document.title,
      url: window.location.href,
      clickableElements,
      xpaths: {},
    };
  }
}

// Function to get scroll position information
function getScrollInfo() {
  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  const totalHeight = document.documentElement.scrollHeight;
  const pixelsAbove = scrollY;
  const pixelsBelow = totalHeight - (scrollY + viewportHeight);

  return {
    pixelsAbove,
    pixelsBelow,
  };
}

// Function to remove all highlights
function removeHighlights() {
  const highlightedElement = document.getElementById('playwright-highlight-container');
  if (highlightedElement) {
    highlightedElement.remove();
  }
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debug.log('Content script received message:', message);

  const handleAsyncResponse = async () => {
    try {
      if (message.type === 'GET_PAGE_DATA') {
        const data = await getPageStructuredData();
        debug.log('Sending page data:', data);
        return data;
      }

      if (message.type === 'EXECUTE_ACTION') {
        debug.log('Executing action:', message.action);
        const response = await executeAction(message.action);
        debug.log('Action execution response:', response);
        return response;
      }

      if (message.type === 'REMOVE_HIGHLIGHTS') {
        removeHighlights();
        return { success: true };
      }

      if (message.type === 'GET_SCROLL_INFO') {
        sendResponse(getScrollInfo());
        return true;
      }
    } catch (error) {
      debug.error('Error handling message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  };

  // Handle the async response
  handleAsyncResponse()
    .then(response => {
      try {
        sendResponse(response);
      } catch (error) {
        debug.error('Error sending response:', error);
      }
    })
    .catch(error => {
      debug.error('Error in async handler:', error);
      try {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to handle message',
        });
      } catch (sendError) {
        debug.error('Error sending error response:', sendError);
      }
    });

  return true; // Will respond asynchronously
});
