/**
 * Background services to collect browser context.
 *
 * - Call client to get page data
 * - Screenshot
 * - Tab info
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
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

  if (!activeTab || !activeTab.id) {
    throw new Error('No active tab found');
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
        title: activeTab.title || '',
        url: activeTab.url || '',
        screenshot,
        clickableElements: response.clickableElements,
        tabs: await getTabsInfo(),
        scrollInfo: await getScrollInfo(),
        xpaths: response.xpaths,
      };
      console.log('Received response:', response);

      return data;
    } catch (error) {
      lastError = error as Error;
      console.error(`Error getting page data (attempt ${attempt}/5):`, error);
      if (attempt < 5) {
        console.log(`Retrying in 1 second...`);
        await sleep(1000);
      } else {
        throw 'Cannot access tab content, please switch to another website in the same tab.';
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

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(activeTab.id!, { type: 'REMOVE_HIGHLIGHTS' }, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!response?.success) {
        reject(new Error('Failed to remove highlights'));
      } else {
        resolve();
      }
    });
  });
}

// Function to capture screenshot
export async function captureScreenshot(): Promise<string | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (!activeTab?.id) {
    throw new Error('No active tab found');
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'png' }, result => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });

    return dataUrl;
  } catch (error) {
    console.error('Error capturing screenshot:', error);
  }
}

// Function to save screenshot
export async function saveScreenshot(dataUrl: string, filename?: string): Promise<string> {
  const defaultFilename = `screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;

  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: dataUrl,
        filename: filename || defaultFilename,
        saveAs: false,
      },
      downloadId => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(downloadId.toString());
        }
      },
    );
  });
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
