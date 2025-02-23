export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ChatResponse {
  content: string;
  error?: string;
}
