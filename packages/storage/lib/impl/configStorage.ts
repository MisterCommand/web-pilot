import { StorageEnum } from '../base/enums.js';
import { createStorage } from '../base/base.js';
import type { BaseStorage } from '../base/types.js';

interface Config {
  apiKey: string;
  modelId: string;
  baseUrl: string;
  maxRounds: number;
}

const defaultConfig: Config = {
  apiKey: '',
  modelId: '',
  baseUrl: '',
  maxRounds: 10,
};

type ConfigStorage = BaseStorage<Config> & {
  updateApiKey: (apiKey: string) => Promise<void>;
  updateModelId: (modelId: string) => Promise<void>;
  updateBaseUrl: (baseUrl: string) => Promise<void>;
  updateMaxRounds: (maxRounds: number) => Promise<void>;
  reset: () => Promise<void>;
};

const storage = createStorage<Config>('config-storage-key', defaultConfig, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// Extended storage with convenience methods
export const configStorage: ConfigStorage = {
  ...storage,
  updateApiKey: async (apiKey: string) => {
    await storage.set(current => ({
      ...current,
      apiKey,
    }));
  },
  updateModelId: async (modelId: string) => {
    await storage.set(current => ({
      ...current,
      modelId,
    }));
  },
  updateBaseUrl: async (baseUrl: string) => {
    await storage.set(current => ({
      ...current,
      baseUrl,
    }));
  },
  updateMaxRounds: async (maxRounds: number) => {
    if (maxRounds <= 0) {
      throw new Error('maxRounds must be a positive number');
    }
    await storage.set(current => ({
      ...current,
      maxRounds,
    }));
  },
  async reset() {
    await storage.set(defaultConfig);
  },
};
