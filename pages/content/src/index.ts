/**
 * Collect page data when called by the background scripts.
 */

import { buildDomTree } from './buildDomTree';
import { DOMElementNode, DOMTextNode } from './view';
import { executeAction } from './executeAction';
import { convertToDOMNode } from './domElement';

console.log('Web Pilot content script loaded'); // For testing

// Get mapping of index to xpath for all elements with xpath
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getXPaths(result: { rootId: string; map: Record<string, any> }): Record<string, string> {
  console.log('Starting getXPaths with rootId:', result.rootId);
  const xpaths: Record<string, string> = {};
  let index = 0;

  function traverse(nodeId: string) {
    if (!nodeId || !result.map[nodeId]) {
      console.warn('Encountered undefined node during traversal:', nodeId);
      return;
    }

    const node = result.map[nodeId];
    console.log('Traversing node:', {
      id: nodeId,
      tagName: node.tagName,
      xpath: node.xpath,
      children: node.children?.length || 0,
    });

    // Check if node has xpath
    if (node.xpath && node.tagName && node.highlightIndex !== null) {
      console.log('Found element with xpath:', {
        index,
        xpath: node.xpath,
        tagName: node.tagName,
      });
      xpaths[node.highlightIndex.toString()] = node.xpath;
      index++;
    }

    // Traverse children if they exist
    if (Array.isArray(node.children)) {
      console.log(`Processing ${node.children.length} children for node:`, nodeId);
      node.children.forEach((childId: string, idx: number) => {
        if (childId) {
          console.log(`Processing child ${idx + 1}/${node.children.length} (${childId}) of node:`, nodeId);
          traverse(childId);
        } else {
          console.warn(`Skipping undefined child ${idx + 1}/${node.children.length} of node:`, nodeId);
        }
      });
    }
  }

  // Start traversal from root
  if (result.rootId) {
    console.log('Starting traversal from root:', result.rootId);
    traverse(result.rootId);
  } else {
    console.warn('Root node is undefined');
  }

  console.log('Generated xpaths:', xpaths);
  return xpaths;
}

// Helper function to get structured data from the page
async function getPageStructuredData(): Promise<Record<string, unknown>> {
  const result = buildDomTree({
    doHighlightElements: true,
    focusHighlightIndex: -1,
    viewportExpansion: 100,
  });

  console.log('DOM tree result:', JSON.stringify(result, null, 2));

  // Get the root node from the map using the rootId
  if (!result.rootId || !result.map) {
    console.error('Invalid DOM tree result:', result);
    return {
      url: window.location.href,
      clickableElements: '',
    };
  }

  // Convert the DOM tree to our DOMElementNode structure
  const convertedRoot = convertToDOMNode(result.rootId, result.map);
  if (!convertedRoot) {
    console.error('Failed to convert root node');
    return {
      url: window.location.href,
      clickableElements: '',
    };
  }

  if (!(convertedRoot instanceof DOMElementNode)) {
    console.error('Root node is not a DOMElementNode');
    return {
      url: window.location.href,
      clickableElements: '',
    };
  }

  console.log('Converted root node:', convertedRoot.toString());
  console.log(
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
  console.log('clickableElements:', clickableElements);

  try {
    const xpaths = getXPaths(result);
    console.log('XPaths:', xpaths);
    return {
      url: window.location.href,
      clickableElements,
      xpaths,
    };
  } catch (error) {
    console.error('Error getting XPaths:', error);
    return {
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
  console.log('Content script received message:', message);

  const handleAsyncResponse = async () => {
    try {
      if (message.type === 'GET_PAGE_DATA') {
        const data = await getPageStructuredData();
        console.log('Sending page data:', data);
        return data;
      }

      if (message.type === 'EXECUTE_ACTION') {
        console.log('Executing action:', message.action);
        const response = await executeAction(message.action);
        console.log('Action execution response:', response);
        return response;
      }

      if (message.type === 'REMOVE_HIGHLIGHTS') {
        setTimeout(removeHighlights, 5000); // One second delay before hiding highlights
        return { success: true };
      }

      if (message.type === 'GET_SCROLL_INFO') {
        sendResponse(getScrollInfo());
        return true;
      }
    } catch (error) {
      console.error('Error handling message:', error);
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
        console.error('Error sending response:', error);
      }
    })
    .catch(error => {
      console.error('Error in async handler:', error);
      try {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to handle message',
        });
      } catch (sendError) {
        console.error('Error sending error response:', sendError);
      }
    });

  return true; // Will respond asynchronously
});
