/**
 * Main logic for chat service.
 *
 * - Collect browser context
 * - Generate prompts
 * - Send prompts to API
 * - Handle responses and call actions
 * - Update chat history
 */

import { configStorage } from '@extension/storage';
import type { ChatResponse, Message } from '../types';
import { type ActionResponse, executeAction } from './executeActions';
import { getAllActionDescriptions } from './actions';
import { getSystemPrompt, getHumanPrompt, type BrowserState, getUltimateGoal } from './prompts';
import { getPageData } from './uiService';
import { sendChatCompletion } from './apiService';

// Event emitter for chat updates
type ChatUpdateListener = (update: Message) => void;
const chatUpdateListeners: ChatUpdateListener[] = [];

export function addChatUpdateListener(listener: ChatUpdateListener) {
  chatUpdateListeners.push(listener);
}

export function removeChatUpdateListener(listener: ChatUpdateListener) {
  const index = chatUpdateListeners.indexOf(listener);
  if (index > -1) {
    chatUpdateListeners.splice(index, 1);
  }
}

function emitChatUpdate(message: Message) {
  chatUpdateListeners.forEach(listener => listener(message));
}

interface AIResponse {
  current_state: {
    page_summary: string;
    evaluation_previous_goal: string;
    memory: string;
    next_goal: string;
  };
  action?: Array<Record<string, unknown>>; // Accept actions or action
  actions?: Array<Record<string, unknown>>;
}

interface HumanPromptResponse {
  prompt: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  xpaths: Record<string, string>;
}

async function getChatResponseInternal(
  message: string,
  attempt: number = 1,
  maxAttempts?: number,
  previousActionResults: ActionResponse[] = [],
): Promise<ChatResponse> {
  if (attempt > (maxAttempts ?? 10)) {
    emitChatUpdate({
      role: 'assistant',
      content: `❌ Failed to complete task after ${maxAttempts ?? 10} attempts`,
      timestamp: Date.now(),
    });
    return {
      content: `❌ Failed to complete task after ${maxAttempts ?? 10} attempts`,
    };
  }

  try {
    if (!maxAttempts) {
      const config = await configStorage.get();
      maxAttempts = config.maxRounds;
    }

    const config = await configStorage.get();
    if (!config.apiKey) {
      throw new Error('API key not configured. Please set your API key in the extension popup.');
    }

    emitChatUpdate({
      role: 'assistant',
      content: `📰 Collecting browser context...`,
      timestamp: Date.now(),
    });

    // Get system prompt with action descriptions
    const systemPrompt = getInitialSystemPrompt();

    // Get human prompt with current browser state
    const humanPromptResponse = await getCurrentHumanPrompt(previousActionResults);

    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content:
          typeof humanPromptResponse.prompt === 'string'
            ? `${getUltimateGoal(message)} \n\n ${humanPromptResponse.prompt}`
            : [{ type: 'text', text: getUltimateGoal(message) }, ...humanPromptResponse.prompt],
      },
    ];

    const response = await sendChatCompletion(messages);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    console.log('AI Response:', aiResponse);

    try {
      // Try to parse the response as a structured JSON
      const parsedResponse = JSON.parse(aiResponse.replace(/^```json\n/, '').replace(/```$/, '')) as AIResponse;
      console.log('Parsed Response:', parsedResponse);

      // Execute each action in sequence
      const actionResults: ActionResponse[] = previousActionResults;
      const actions = parsedResponse.action ?? parsedResponse.actions;

      // If no action, return "no action"
      if (!actions || actions.length === 0) {
        emitChatUpdate({
          role: 'assistant',
          content: 'No more actions to perform.',
          timestamp: Date.now(),
        });

        return {
          content: 'No more actions to perform.',
        };
      }
      for (const action of actions) {
        // Emit action start message
        console.log('Executing action:', action);
        const actionJson = JSON.stringify(action);
        const actionObj = JSON.parse(actionJson) as Record<string, { text?: string }>;
        const actionName = Object.keys(actionObj)[0];

        // If Done, end the agent
        if (actionName === 'done') {
          // If there is a text property, use it
          const text = actionObj['done']?.text;
          if (text) {
            emitChatUpdate({
              role: 'assistant',
              content: `✔️ Task is completed: ${text}`,
              timestamp: Date.now(),
            });
            return {
              content: `✔️ Task is completed: ${text}`,
            };
          }
          emitChatUpdate({
            role: 'assistant',
            content: '✔️ Task is completed.',
            timestamp: Date.now(),
          });
          return {
            content: '✔️ Task is completed.',
          };
        }

        emitChatUpdate({
          role: 'assistant',
          content: `🔥 Executing action: ${actionName}`,
          timestamp: Date.now(),
        });
        const result = await executeAction(actionJson, humanPromptResponse.xpaths);

        // Emit action result
        if (!result.success) {
          console.log('❌ Action failed:', result.error);
        } else {
          console.log('✅ Action successful:', result.message);
        }
        actionResults.push(result);
      }

      // Retry with updated history
      return getChatResponseInternal(message, attempt + 1, maxAttempts, actionResults);
    } catch (parseError) {
      // If parsing fails, treat it as a regular text response
      console.error('Failed to parse AI response as JSON:', parseError);
      emitChatUpdate({
        role: 'assistant',
        content: `Error: Failed to parse AI response - ${parseError}`,
        timestamp: Date.now(),
      });
      return {
        content: aiResponse,
      };
    }
  } catch (error) {
    console.error('Error getting AI response:', error);
    emitChatUpdate({
      role: 'assistant',
      content: `❌ Error: ${error instanceof Error ? error : 'Failed to get AI response'}`,
      timestamp: Date.now(),
    });
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Failed to get AI response',
    };
  }
}

// Main entry point that starts with attempt 1
export async function getChatResponse(message: string): Promise<ChatResponse> {
  return getChatResponseInternal(message, 1);
}

// Get system prompt with action descriptions
export function getInitialSystemPrompt(): string {
  const actionDescription = getAllActionDescriptions();
  // console.log('System prompt:', getSystemPrompt(actionDescription).content);
  return getSystemPrompt(actionDescription).content;
}

// Get human prompt with current browser state
export async function getCurrentHumanPrompt(
  actionResults?: ActionResponse[],
  stepInfo?: { stepNumber: number; maxSteps: number },
  useVision: boolean = true,
): Promise<HumanPromptResponse> {
  const pageData = await getPageData();
  console.log('Page data:', pageData);

  const browserState: BrowserState = {
    url: pageData.url,
    tabs: JSON.stringify(pageData.tabs),
    elementTree: {
      clickableElementsToString: () => pageData.clickableElements || '',
    },
    pixelsAbove: pageData.scrollInfo?.pixelsAbove,
    pixelsBelow: pageData.scrollInfo?.pixelsBelow,
    screenshot: pageData.screenshot,
  };

  // await removeHighlights(); // Remove highlights after capturing the screenshot

  console.log('Human prompt:', getHumanPrompt(browserState, actionResults, [], stepInfo, useVision).content);

  return {
    prompt: getHumanPrompt(browserState, actionResults, [], stepInfo, useVision).content,
    xpaths: pageData.xpaths || {},
  };
}
