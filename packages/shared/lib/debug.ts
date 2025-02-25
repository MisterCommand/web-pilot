/* eslint-disable */
import { configStorage } from '@extension/storage';

class DebugLogger {
  private static instance: DebugLogger;
  private debugEnabled: boolean = false;

  private constructor() {
    // Initialize debug state
    this.initDebugState();
  }

  private async initDebugState() {
    const config = await configStorage.get();
    this.debugEnabled = config.debug;

    // Listen for changes to debug setting
    configStorage.subscribe(() => {
      this.debugEnabled = config.debug;
    });
  }

  public static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  public log(...args: any[]): void {
    if (this.debugEnabled) {
      console.log(...args);
    }
  }

  public error(...args: any[]): void {
    if (this.debugEnabled) {
      console.error(...args);
    }
  }

  public warn(...args: any[]): void {
    if (this.debugEnabled) {
      console.warn(...args);
    }
  }
}

export const debug = DebugLogger.getInstance();
