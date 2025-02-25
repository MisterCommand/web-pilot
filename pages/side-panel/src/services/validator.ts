/**
 * Validate if the task is completed using LLM.
 *
 * Not in use at the moment.
 */

import { getCurrentHumanPrompt } from './chatService';
import { type ActionResponse } from './executeActions';
import { configStorage } from '@extension/storage';
import { debug } from '@extension/shared/lib/debug';

interface ValidationResponse {
  is_valid: boolean;
  reason: string;
}

// Validate if the task is completed using LLM (not in use)
export async function validateTaskCompletion(
  task: string,
  actionResults?: ActionResponse[],
): Promise<ValidationResponse> {
  const config = await configStorage.get(); // Get config from storage
  try {
    // Get current browser state with human prompt
    const humanPromptResponse = await getCurrentHumanPrompt(actionResults);

    const systemPrompt = `You are a validator of an agent who interacts with a browser.
  Validate if the output of last action is what the user wanted and if the task is completed.
  If the task is unclear defined, you can let it pass. But if something is missing or the image does not show what was requested don't let it pass.
  Try to understand the page and help the model with suggestions like scroll, do x, ... to get the solution right.
  Briefly summarise the major takeaway of this page, and give suggestion to the agent to complete the task.
  Task to validate: ${task}
  
  Return a JSON object with 2 keys: is_valid and reason.
  is_valid is a boolean that indicates if the output is correct.
  takeaway is a string that explains the takeaway and what the agent should do next.
  reason is a string that explains why it is valid or not.
  Example: {"is_valid": false, "takeaway": "The top song of the week is 'You Are My Sunshine', search 'You Are My Sunshine' in YouTube next.", "reason": "The user wanted to play 'You Are My Sunshine' in YouTube, it is not played yet."}`;

    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: humanPromptResponse.prompt,
      },
    ];

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages,
        temperature: 0.7,
        n: 1,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to validate task completion');
    }

    const data = await response.json();
    const validationResponse = data.choices[0].message.content;
    debug.log('Validation response:', validationResponse);

    try {
      // Parse the response as JSON
      const parsedResponse = JSON.parse(
        validationResponse.replace(/^```json\n/, '').replace(/```$/, ''),
      ) as ValidationResponse;
      return parsedResponse;
    } catch (parseError) {
      debug.error('Failed to parse validation response:', parseError);
      return {
        is_valid: false,
        reason: 'Failed to parse validation response: ' + validationResponse,
      };
    }
  } catch (error) {
    debug.error('Error validating task completion:', error);
    return {
      is_valid: false,
      reason: error instanceof Error ? error.message : 'Failed to validate task completion',
    };
  }
}

export function validateJson(jsonString: string): { success: boolean; error?: string } {
  try {
    debug.log('Validating JSON string:', jsonString);
    JSON.parse(jsonString);
    debug.log('JSON validation successful');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid JSON';
    debug.error('JSON validation failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
