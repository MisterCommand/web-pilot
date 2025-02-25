/**
 * Background services to collect browser context.
 *
 * - Call client to get page data
 * - Screenshot
 * - Tab info
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { debug } from '@extension/shared/lib/debug';

// TabInfo interface definition
interface TabInfo {
  pageId: number;
  url: string;
  title: string;
}

// ScrollInfo interface definition
interface ScrollInfo {
  pixelsAbove: number;
  pixelsBelow: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getPageData(): Promise<any> {
  const activeTab = await getActiveTab();

  // If user on new tab, return skip collecting browser context
  if (!activeTab || activeTab.url === 'chrome://newtab/') {
    return {
      title: 'New Tab',
      url: 'chrome://newtab/',
      screenshot: undefined,
      clickableElements: [],
      tabs: [],
      scrollInfo: {
        pixelsAbove: 0,
        pixelsBelow: 0,
      },
      xpaths: [],
    };
  }

  const sendMessageAsync = async () => {
    return new Promise<any>((resolve, reject) => {
      chrome.tabs.sendMessage(activeTab.id!, { type: 'GET_PAGE_DATA' }, result => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
  };

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await sendMessageAsync();
      const screenshot = await captureScreenshot();

      const data = {
        title: response.title || '',
        url: response.url || '',
        screenshot,
        clickableElements: response.clickableElements,
        // tabs: await getTabsInfo(),
        tabs: [], // To be implemented
        scrollInfo: await getScrollInfo(),
        xpaths: response.xpaths,
      };
      debug.log('Received response:', response);

      return data;
    } catch (error) {
      lastError = error as Error;
      debug.error(`Error getting page data (attempt ${attempt}/5):`, error);
      if (attempt < 5) {
        debug.log(`Retrying in 1 second...`);
        await sleep(1000);
      } else {
        throw new Error('Failed to get page data after 5 attempts, please refresh the page and try again.');
      }
    }
  }

  throw lastError || new Error('Failed to get page data after 5 attempts');
}

// Function to remove highlights
export async function removeHighlights(): Promise<void> {
  const activeTab = await getActiveTab();
  if (!activeTab?.id) {
    throw new Error('No active tab found');
  }

  // Only remove highlights if the user is not on a new tab
  if (activeTab?.url === 'chrome://newtab/') {
    return;
  }

  debug.log('Removing highlights...');
  const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'REMOVE_HIGHLIGHTS' });

  if (!response?.success) {
    debug.error('Failed to remove highlights');
    throw new Error('Failed to remove highlights');
  }
}

// Function to capture screenshot
export async function captureScreenshot(): Promise<string | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (!activeTab?.id) {
    throw new Error('No active tab found');
  }

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'png' });
    debug.log('Captured screenshot');
    return dataUrl;
  } catch (error) {
    debug.error('Error capturing screenshot:', error);
  }
}

// Function to get active tab
export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

// Function to get information about all tabs
export async function getTabsInfo(): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({});

  const tabsInfo: TabInfo[] = await Promise.all(
    tabs.map(async (tab, index) => ({
      pageId: index,
      url: tab.url || '',
      title: tab.title || '',
    })),
  );

  return tabsInfo;
}

// Function to get scroll position information
export async function getScrollInfo(): Promise<ScrollInfo> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        reject(new Error('No active tab found'));
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { type: 'GET_SCROLL_INFO' }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  });
}
