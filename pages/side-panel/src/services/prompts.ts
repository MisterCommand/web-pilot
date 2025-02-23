/**
 * Main prompts
 */

import type { ActionResponse } from './executeActions';

export interface BrowserState {
  url: string;
  tabs: string;
  elementTree: {
    clickableElementsToString: (options: { includeAttributes: string[] }) => string;
  };
  pixelsAbove?: number;
  pixelsBelow?: number;
  screenshot?: string;
}

interface AgentStepInfo {
  stepNumber: number;
  maxSteps: number;
}

interface SystemMessage {
  content: string;
}

interface HumanMessage {
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface ActionHistory {
  url: string;
  takeaway: string;
}

// Instruction prompt
export function getSystemPrompt(actionDescription: string, maxActionsPerStep: number = 10): SystemMessage {
  const inputFormat = `
INPUT STRUCTURE:
1. Current URL: The webpage you're currently on
2. Available Tabs: List of open browser tabs
3. Interactive Elements: List in the format:
2. Available Tabs: List of open browser tabs
3. Interactive Elements: List in the format:
   index[:]<element_type>element_text</element_type>
   - index: Numeric identifier for interaction
   - element_type: HTML element type (button, input, etc.)
   - element_text: Visible text or element description

Example:
[33]<button>Submit Form</button>
[] Non-interactive text


Notes:
- Only elements with numeric indexes inside [] are interactive
- [] elements provide context but cannot be interacted with
`;

  const importantRules = `
1. RESPONSE FORMAT: You must ALWAYS respond with valid JSON in this exact format:
   {
     "current_state": {
       "page_summary": "Quick detailed summary of new information from the current page which is not yet in the task history memory. Be specific with details which are important for the task. This is not on the meta level, but should be facts. If all the information is already in the task history memory, leave this empty.",
       "evaluation_previous_goal": "Success|Failed|Unknown - Analyze the current elements and the image to check if the previous goals/actions are successful like intended by the task. Ignore the action result. The website is the ground truth. Also mention if something unexpected happened like new suggestions in an input field. Shortly state why/why not",
       "memory": "Description of what has been done and what you need to remember. Be very specific. Count here ALWAYS how many times you have done something and how many remain. E.g. 0 out of 10 websites analyzed. Continue with abc and xyz",
       "next_goal": "What needs to be done with the next actions"
     },
     "action": [
       {
         "one_action_name": {
           // action-specific parameter
         }
       },
       // ... more actions in sequence
     ]
   }

2. ACTIONS: You can specify multiple actions in the list to be executed in sequence. But always specify only one action name per item.

   Common action sequences:
   - Form filling: [
       {"input_text": {"index": 1, "text": "username"}},
       {"input_text": {"index": 2, "text": "password"}},
       {"click_element": {"index": 3}}
     ]
   - Navigation and extraction: [
       {"open_tab": {}},
       {"go_to_url": {"url": "https://example.com"}},
       {"extract_content": ""}
     ]

3. ELEMENT INTERACTION:
   - Only use indexes that exist in the provided element list
   - Each element has a unique index number (e.g., "[33]<button>")
   - Elements marked with "[]Non-interactive text" are non-interactive (for context only)

4. NAVIGATION & ERROR HANDLING:
   - If no suitable elements exist, use other functions to complete the task
   - If stuck, try alternative approaches - like going back to a previous page, new search, new tab etc.
   - Handle popups/cookies by accepting or closing them
   - Use scroll to find elements you are looking for
   - If you want to research something, open a new tab instead of using the current tab
   - If captcha pops up, and you cant solve it, either ask for human help or try to continue the task on a different page.

5. TASK COMPLETION:
   - Use the done action as the last action as soon as the ultimate task is complete
   - Dont use "done" before you are done with everything the user asked you. 
   - If you have to do something repeatedly for example the task says for "each", or "for all", or "x times", count always inside "memory" how many times you have done it and how many remain. Don't stop until you have completed like the task asked you. Only call done after the last step.
   - Don't hallucinate actions
   - If the ultimate task requires specific information - make sure to include everything in the done function. This is what the user will see. Do not just say you are done, but include the requested information of the task.

6. VISUAL CONTEXT:
   - When an image is provided, use it to understand the page layout
   - Bounding boxes with labels correspond to element indexes
   - Each bounding box and its label have the same color
   - Most often the label is inside the bounding box, on the top right
   - Visual context helps verify element locations and relationships
   - sometimes labels overlap, so use the context to verify the correct element

7. Form filling:
   - If you fill an input field and your action sequence is interrupted, most often a list with suggestions popped up under the field and you need to first select the right element from the suggestion list.

8. ACTION SEQUENCING:
   - Actions are executed in the order they appear in the list
   - Each action should logically follow from the previous one
   - If the page changes after an action, the sequence is interrupted and you get the new state.
   - If content only disappears the sequence continues.
   - Only provide the action sequence until you think the page will change.
   - Try to be efficient, e.g. fill forms at once, or chain actions where nothing changes on the page like saving, extracting, checkboxes...
   - only use multiple actions if it makes sense.

9. Long tasks:
- If the task is long keep track of the status in the memory. If the ultimate task requires multiple subinformation, keep track of the status in the memory.
- If you get stuck, 

10. Extraction:
- If your task is to find information or do research - call extract_content on the specific pages to get and store the information.

   - use maximum ${maxActionsPerStep} actions per sequence`;

  const agentPrompt = `You are a precise browser automation agent that interacts with websites through structured commands. Your role is to:
1. Analyze the provided webpage elements and structure
2. Use the given information to accomplish the ultimate task
3. Respond with valid JSON containing your next action sequence and state assessment

${inputFormat}

${importantRules}

Functions:
${actionDescription}

Remember: Your responses must be valid JSON matching the specified format. Each action in the sequence must be valid.`;

  return { content: agentPrompt };
}

// User goal prompt
export function getUltimateGoal(goal: string): string {
  return `Your ultimate task is: """${goal}""". If you achieved your ultimate task, stop everything and use the done action in the next step to complete the task. If not, continue as usual.`;
}

// Browser context prompt
export function getHumanPrompt(
  state: BrowserState,
  result?: ActionResponse[],
  includeAttributes: string[] = [],
  stepInfo?: AgentStepInfo,
  useVision: boolean = true,
): HumanMessage {
  let elementsText = state.elementTree.clickableElementsToString({ includeAttributes });

  const hasContentAbove = (state.pixelsAbove || 0) > 0;
  const hasContentBelow = (state.pixelsBelow || 0) > 0;

  if (elementsText !== '') {
    if (hasContentAbove) {
      elementsText = `... ${state.pixelsAbove} pixels above - scroll or extract content to see more ...\n${elementsText}`;
    } else {
      elementsText = `[Start of page]\n${elementsText}`;
    }
    if (hasContentBelow) {
      elementsText = `${elementsText}\n... ${state.pixelsBelow} pixels below - scroll or extract content to see more ...`;
    } else {
      elementsText = `${elementsText}\n[End of page]`;
    }
  } else {
    elementsText = 'empty page';
  }

  let stepInfoDescription = '';
  if (stepInfo) {
    stepInfoDescription = `Current step: ${stepInfo.stepNumber + 1}/${stepInfo.maxSteps}`;
  }
  const timeStr = new Date().toLocaleString();
  stepInfoDescription += `Current date and time: ${timeStr}`;

  let actionHistory = '';
  if (result) {
    result.forEach((res, i) => {
      if (res.success) {
        actionHistory += `\nAction result ${i + 1}/${result.length}: ${res.message}`;
      }
      if (!res.success && res.error) {
        const error = res.error.split('\n').pop();
        actionHistory += `\nAction error ${i + 1}/${result.length}: ...${error}`;
      }
    });
  }

  const stateDescription = `
[Your task history memory starts here]
  ${actionHistory}
[Task history memory ends here]
[Current state starts here]
You will see the following only once - if you need to remember it and you dont know it yet, write it down in the memory:
Current url: ${state.url}
Available tabs:
${state.tabs}
Interactive elements from top layer of the current page inside the viewport:
${elementsText}
${stepInfoDescription}
`;

  if (state.screenshot && useVision) {
    return {
      content: [
        { type: 'text', text: stateDescription },
        {
          type: 'image_url',
          image_url: { url: `${state.screenshot}` },
        },
      ],
    };
  }

  return { content: stateDescription };
}
