/**
 * Perform actions that could be executed in the background script,
 * And call content script to execute actions on the active tab.
 */

import { parseAction } from './actions';
import type { Action } from './actions';

export interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Helper function to get active tab
async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('No active tab found');
  }
  return tab;
}

// Execute action in content script
async function executeInContentScript(
  tabId: number,
  action: { type: string; params: unknown; xpaths: Record<string, string> },
): Promise<ActionResponse> {
  console.log('Executing action in content script:', action);
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'EXECUTE_ACTION',
      action,
    });
    return response as ActionResponse;
  } catch (error) {
    console.error('Error executing in content script:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute action in content script',
    };
  }
}

// Search Google action
async function executeSearchGoogle(params: { query: string }): Promise<ActionResponse> {
  try {
    const tab = await getActiveTab();
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(params.query)}`;
    await chrome.tabs.update(tab.id!, { url: searchUrl });
    return { success: true, message: `Searched Google for "${params.query}"` };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Go to URL action
async function executeGoToUrl(params: { url: string }): Promise<ActionResponse> {
  try {
    const tab = await getActiveTab();
    await chrome.tabs.update(tab.id!, { url: params.url });
    return { success: true, message: `Navigated to URL: ${params.url}` };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Switch tab action
async function executeSwitchTab(params: { page_id: number }): Promise<ActionResponse> {
  try {
    const tabs = await chrome.tabs.query({});
    const tab = tabs[params.page_id];
    if (!tab?.id) {
      return { success: false, error: 'Tab not found' };
    }
    await chrome.tabs.update(tab.id, { active: true });
    return { success: true, message: `Switched to tab with ID ${params.page_id}` };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Open tab action
async function executeOpenTab(params: { url: string }): Promise<ActionResponse> {
  try {
    await chrome.tabs.create({ url: params.url });
    return { success: true, message: `Opened new tab with URL: ${params.url}` };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Done action (no-op, just returns success)
async function executeDone(params: { text: string }): Promise<ActionResponse> {
  return { success: true, message: `Action completed: ${params.text}` };
}

// Main execute function
export async function executeAction(actionJson: string, xpaths: Record<string, string>): Promise<ActionResponse> {
  try {
    // Parse and validate the action
    const action = parseAction(actionJson);
    const actionType = Object.keys(action)[0];
    const params = action[actionType as keyof Action];

    // Get active tab for content script actions
    const tab = await getActiveTab();

    // Execute appropriate action
    switch (actionType) {
      case 'search_google':
        return executeSearchGoogle(params);
      case 'go_to_url':
        return executeGoToUrl(params);
      case 'switch_tab':
        return executeSwitchTab(params);
      case 'open_tab':
        return executeOpenTab(params);
      case 'done':
        return executeDone(params);
      case 'click_element':
      case 'input_text':
      case 'scroll':
      case 'send_keys':
      case 'extract_content':
      case 'scroll_to_text':
      case 'get_dropdown_options':
        // These actions are executed in the content script
        console.log('Executing action in content script:', actionType, params, xpaths);
        return executeInContentScript(tab.id!, { type: actionType, params, xpaths });
      default:
        return { success: false, error: `Unknown action type: ${actionType}` };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
