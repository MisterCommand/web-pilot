/**
 * Actions available to the LLM.
 */

import { z } from 'zod';

export const actionSchemas = [
  {
    action_name: 'search_google',
    description:
      'Search the query in Google in the current tab, the query should be a search query like humans search in Google, concrete and not vague or super long. More the single most important items.',
    schema: z.object({
      query: z.string(),
    }),
    example: '{"search_google": {"query": "javascript"}}',
  },
  {
    action_name: 'go_to_url',
    description: 'Navigate to URL in the current tab',
    schema: z.object({
      url: z.string(),
    }),
    example: '{"go_to_url": {"url": "https://www.example.com"}}',
  },
  {
    action_name: 'click_element',
    description: 'Click element',
    schema: z.object({
      index: z.number(),
      xpath: z.string().optional(),
    }),
    example: '{"click_element": {"index": 1, "xpath": "//*[@id=\'submit-button\']"}}',
  },
  {
    action_name: 'input_text',
    description: 'Input text into a input interactive element',
    schema: z.object({
      index: z.number(),
      text: z.string(),
      xpath: z.string().optional(),
    }),
    example: '{"input_text": {"index": 2, "text": "Hello World", "xpath": "//input[@name=\'username\']"}}',
  },
  {
    action_name: 'done',
    description: 'Complete task',
    schema: z.object({
      text: z.string(),
    }),
    example: '{"done": {"text": "Successfully completed the form submission"}}',
  },
  {
    action_name: 'switch_tab',
    description: 'Switch tab',
    schema: z.object({
      page_id: z.number(),
    }),
    example: '{"switch_tab": {"page_id": 1}}',
  },
  {
    action_name: 'open_tab',
    description: 'Open url in new tab',
    schema: z.object({
      url: z.string(),
    }),
    example: '{"open_tab": {"url": "https://www.google.com"}}',
  },
  {
    action_name: 'scroll',
    description: 'Scroll down/up the page by pixel amount - if no amount is specified, scroll one page',
    schema: z.object({
      amount: z.number().optional(),
    }),
    example: '{"scroll": {"amount": 500}}',
  },
  {
    action_name: 'send_keys',
    description:
      'Send strings of special keys like Escape,Backspace, Insert, PageDown, Delete, Enter, Shortcuts such as `Control+o`, `Control+Shift+T` are supported as well.',
    schema: z.object({
      keys: z.string(),
    }),
    example: '{"send_keys": {"keys": "Control+Shift+T"}}',
  },
  {
    action_name: 'extract_content',
    description:
      'Extract page content to retrieve specific information from the page, e.g. all company names, a specifc description, all information about, links with companies in structured format or simply links',
    schema: z.object({
      value: z.string(),
    }),
    example: '{"extract_content": {"value": "company names and their contact information"}}',
  },
  {
    action_name: 'scroll_to_text',
    description: 'If you dont find something which you want to interact with, scroll to it',
    schema: z.object({
      text: z.string(),
    }),
    example: '{"scroll_to_text": {"text": "Contact Us"}}',
  },
  {
    action_name: 'get_dropdown_options',
    description: 'Get all options from a native dropdown',
    schema: z.object({
      index: z.number(),
    }),
    example: '{"get_dropdown_options": {"index": 3}}',
  },
  {
    action_name: 'select_dropdown_option',
    description: 'Select dropdown option for interactive element index by the text of the option you want to select',
    schema: z.object({
      index: z.number(),
      text: z.string(),
    }),
    example: '{"select_dropdown_option": {"index": 3, "text": "United States"}}',
  },
  {
    action_name: 'no_params',
    description: 'Action that accepts any input and discards it',
    schema: z.object({}).passthrough(),
    example: '{"no_params": {}}',
  },
] as const;

export type ActionName = (typeof actionSchemas)[number]['action_name'];
export type ActionSchema = (typeof actionSchemas)[number]['schema'];

// Type to represent any valid action
export type Action = {
  [K in ActionName]: {
    [key in K]: z.infer<Extract<(typeof actionSchemas)[number], { action_name: K }>['schema']>;
  };
}[ActionName];

// Helper type to get the parameters for a specific action
export type ActionParams<T extends ActionName> = z.infer<
  Extract<(typeof actionSchemas)[number], { action_name: T }>['schema']
>;

// Utility function to parse and validate an action
export function parseAction(actionJson: string): Action {
  const parsed = JSON.parse(actionJson);
  const actionNames = Object.keys(parsed);

  if (actionNames.length !== 1) {
    throw new Error('Action must have exactly one key representing the action name');
  }

  const actionName = actionNames[0] as ActionName;
  const actionSchema = actionSchemas.find(a => a.action_name === actionName);

  if (!actionSchema) {
    throw new Error(`Unknown action: ${actionName}`);
  }

  // Validate the action parameters
  const params = actionSchema.schema.parse(parsed[actionName]);

  return {
    [actionName]: params,
  } as Action;
}

// Utility function to get example for an action
export function getActionExample(actionName: ActionName): string | undefined {
  return actionSchemas.find(a => a.action_name === actionName)?.example;
}

// Utility function to get description for an action
export function getActionDescription(actionName: ActionName): string | undefined {
  return actionSchemas.find(a => a.action_name === actionName)?.description;
}

// Utility function to get schema for an action
export function getActionSchema(actionName: ActionName): z.ZodType | undefined {
  return actionSchemas.find(a => a.action_name === actionName)?.schema;
}

// Get all action descriptions in a formatted string
export function getAllActionDescriptions(): string {
  return actionSchemas
    .map(action => {
      return [
        action.action_name,
        `Description: ${action.description}`,
        `Example: ${action.example}`,
        '', // Empty line for spacing
      ].join('\n');
    })
    .join('\n');
}
