/**
 * Execute actions on the webpage when called by the background scripts.
 */

export interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Helper function to find element by index and optional xpath
async function findElement(index: number, xpaths?: Record<string, string>): Promise<Element | null> {
  // If we have a mapping of indices to xpaths, use that first
  if (xpaths && index.toString() in xpaths) {
    const mappedXPath = xpaths[index.toString()];
    const elements = document.evaluate(mappedXPath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const element = elements.snapshotItem(0);
    if (element) return element as Element;
  }

  const elements = document.querySelectorAll('button, a, input, textarea, select, [role="button"]');
  return elements[index] || null;
}

// Helper function to scroll element into view
function scrollIntoViewIfNeeded(element: Element) {
  const rect = element.getBoundingClientRect();
  const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;

  if (!isInViewport) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Click element action
export async function executeClickElement(params: {
  index: number;
  xpaths?: Record<string, string>;
}): Promise<ActionResponse> {
  try {
    const element = await findElement(params.index, params.xpaths);
    console.log('Executing click element action:', element);
    if (!element) {
      return { success: false, error: 'Element not found' };
    }

    scrollIntoViewIfNeeded(element);
    (element as HTMLElement).click();
    return {
      success: true,
      message: `Clicked element at index ${params.index} with text "${(element as HTMLElement).textContent}"`,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Input text action
export async function executeInputText(params: {
  index: number;
  text: string;
  xpaths?: Record<string, string>;
}): Promise<ActionResponse> {
  try {
    const element = await findElement(params.index, params.xpaths);
    if (!element || !(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      return { success: false, error: 'Input element not found' };
    }

    scrollIntoViewIfNeeded(element);
    (element as HTMLInputElement).value = params.text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return { success: true, message: `Entered text "${params.text}" into element at index ${params.index}` };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Scroll action
export async function executeScroll(params: { amount?: number }): Promise<ActionResponse> {
  try {
    const amount = params.amount || window.innerHeight;
    window.scrollBy({
      top: amount,
      behavior: 'smooth',
    });
    return { success: true, message: `Scrolled ${amount > 0 ? 'down' : 'up'} by ${Math.abs(amount)} pixels` };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Send keys action
export async function executeSendKeys(params: { keys: string }): Promise<ActionResponse> {
  try {
    // Parse key combination
    const keys = params.keys.split('+');
    const event = new KeyboardEvent('keydown', {
      key: keys[keys.length - 1],
      ctrlKey: keys.includes('Control'),
      shiftKey: keys.includes('Shift'),
      altKey: keys.includes('Alt'),
      metaKey: keys.includes('Meta'),
      bubbles: true,
    });
    document.dispatchEvent(event);
    document.dispatchEvent(new KeyboardEvent('keyup', { key: params.keys }));
    return { success: true, message: `Sent keyboard keys: ${params.keys}` };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Extract content action
export async function executeExtractContent(params: { value: string }): Promise<ActionResponse> {
  try {
    // Basic text content extraction
    const content = document.querySelector(params.value)?.textContent || '';
    return { success: true, message: `Extracted content: ${content}` };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Scroll to text action
export async function executeScrollToText(params: { text: string }): Promise<ActionResponse> {
  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        return node.textContent?.includes(params.text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    let node = walker.nextNode();
    while (node) {
      if (node.textContent?.includes(params.text)) {
        const element = node.parentElement;
        if (element) {
          scrollIntoViewIfNeeded(element);
          return { success: true, message: `Scrolled to text "${params.text}"` };
        }
      }
      node = walker.nextNode();
    }

    return { success: false, error: 'Text not found' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Get dropdown options action
export async function executeGetDropdownOptions(params: {
  index: number;
  xpaths?: Record<string, string>;
}): Promise<ActionResponse> {
  try {
    const element = await findElement(params.index, params.xpaths);
    if (!element || !(element instanceof HTMLSelectElement)) {
      return { success: false, error: 'Select element not found' };
    }

    const options = Array.from(element.options).map(opt => opt.text);
    return { success: true, message: `Retrieved dropdown options: ${options.join(', ')}` };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Action parameter types
interface ClickElementParams {
  index: number;
}

interface InputTextParams {
  index: number;
  text: string;
}

interface ScrollParams {
  amount?: number;
}

interface SendKeysParams {
  keys: string;
}

interface ExtractContentParams {
  value: string;
}

interface ScrollToTextParams {
  text: string;
}

interface GetDropdownOptionsParams {
  index: number;
}

type ActionParams =
  | { type: 'click_element'; params: ClickElementParams }
  | { type: 'input_text'; params: InputTextParams }
  | { type: 'scroll'; params: ScrollParams }
  | { type: 'send_keys'; params: SendKeysParams }
  | { type: 'extract_content'; params: ExtractContentParams }
  | { type: 'scroll_to_text'; params: ScrollToTextParams }
  | { type: 'get_dropdown_options'; params: GetDropdownOptionsParams };

// Main execute function
export async function executeAction(
  action: ActionParams & { xpaths?: Record<string, string> },
): Promise<ActionResponse> {
  console.log('Executing action:', action.type, action.params, action.xpaths);
  try {
    switch (action.type) {
      case 'click_element':
        return executeClickElement({ ...action.params, xpaths: action.xpaths });
      case 'input_text':
        return executeInputText({ ...action.params, xpaths: action.xpaths });
      case 'scroll':
        return executeScroll(action.params);
      case 'send_keys':
        return executeSendKeys(action.params);
      case 'extract_content':
        return executeExtractContent(action.params);
      case 'scroll_to_text':
        return executeScrollToText(action.params);
      case 'get_dropdown_options':
        return executeGetDropdownOptions({ ...action.params, xpaths: action.xpaths });
      default:
        return {
          success: false,
          error: `Unknown action type: ${action}`,
        };
    }
  } catch (error) {
    console.error('Error executing action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
