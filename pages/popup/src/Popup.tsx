import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { configStorage } from '@extension/storage';
import { useCallback, useState, useEffect } from 'react';

const Popup = () => {
  const config = useStorage(configStorage);

  // Local form state
  const [formState, setFormState] = useState({
    apiKey: '',
    modelId: '',
    baseUrl: '',
  });

  // Initialize form state from config
  useEffect(() => {
    setFormState({
      apiKey: config.apiKey,
      modelId: config.modelId,
      baseUrl: config.baseUrl,
    });
  }, [config]);

  // Update form state when fields change
  const handleInputChange = useCallback(
    (field: keyof typeof formState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormState(prev => ({
        ...prev,
        [field]: e.target.value,
      }));
    },
    [],
  );

  // Save config when the save button is clicked
  const handleSave = useCallback(async () => {
    await configStorage.updateApiKey(formState.apiKey);
    await configStorage.updateModelId(formState.modelId);
    await configStorage.updateBaseUrl(formState.baseUrl);
    // Could add a success notification here
  }, [formState]);

  const handleReset = useCallback(async () => {
    await configStorage.reset();
    // Form state will be updated via the useEffect when config changes
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <div className="flex flex-col gap-2 w-full max-w-md p-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="apiKey" className="text-sm font-medium text-left">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={formState.apiKey}
              onChange={handleInputChange('apiKey')}
              className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter API Key"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="modelId" className="text-sm font-medium text-left">
              Model ID
            </label>
            <input
              id="modelId"
              type="text"
              value={formState.modelId}
              onChange={handleInputChange('modelId')}
              className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Model ID"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="baseUrl" className="text-sm font-medium text-left">
              Base URL
            </label>
            <input
              id="baseUrl"
              type="text"
              value={formState.baseUrl}
              onChange={handleInputChange('baseUrl')}
              className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Base URL"
            />
          </div>

          <div className="flex flex-row gap-2 w-full">
            <button
              onClick={handleReset}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500">
              Reset
            </button>
            <button
              className="font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 grow bg-blue-200 text-black"
              onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
