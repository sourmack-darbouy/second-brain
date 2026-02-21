'use client';

import { useState, useEffect } from 'react';

type VisionProvider = 'openai' | 'zai' | 'google' | 'anthropic';

interface ProviderInfo {
  name: string;
  models: string[];
  keyUrl: string;
}

const PROVIDERS: Record<VisionProvider, ProviderInfo> = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
    keyUrl: 'https://platform.openai.com/api-keys'
  },
  zai: {
    name: 'z.ai (智谱)',
    models: ['glm-4.6v'],
    keyUrl: 'https://api.z.ai'
  },
  google: {
    name: 'Google Gemini',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
    keyUrl: 'https://aistudio.google.com/app/apikey'
  },
  anthropic: {
    name: 'Anthropic Claude',
    models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229'],
    keyUrl: 'https://console.anthropic.com/settings/keys'
  }
};

export default function SettingsPage() {
  const [provider, setProvider] = useState<VisionProvider>('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKeys, setApiKeys] = useState<Record<VisionProvider, string>>({
    openai: '',
    zai: '',
    google: '',
    anthropic: ''
  });
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedProvider = localStorage.getItem('vision_provider') as VisionProvider;
    const savedModel = localStorage.getItem('vision_model');
    const savedKeys: Record<VisionProvider, string> = {
      openai: localStorage.getItem('api_key_openai') || '',
      zai: localStorage.getItem('api_key_zai') || '',
      google: localStorage.getItem('api_key_google') || '',
      anthropic: localStorage.getItem('api_key_anthropic') || ''
    };

    if (savedProvider && PROVIDERS[savedProvider]) {
      setProvider(savedProvider);
    }
    if (savedModel) {
      setModel(savedModel);
    }
    setApiKeys(savedKeys);
  }, []);

  // Update model when provider changes
  useEffect(() => {
    const defaultModel = PROVIDERS[provider]?.models[0] || '';
    setModel(defaultModel);
  }, [provider]);

  const saveSettings = () => {
    localStorage.setItem('vision_provider', provider);
    localStorage.setItem('vision_model', model);
    localStorage.setItem('api_key_openai', apiKeys.openai);
    localStorage.setItem('api_key_zai', apiKeys.zai);
    localStorage.setItem('api_key_google', apiKeys.google);
    localStorage.setItem('api_key_anthropic', apiKeys.anthropic);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateApiKey = (p: VisionProvider, key: string) => {
    setApiKeys(prev => ({ ...prev, [p]: key }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold">⚙️ Settings</h2>
        {saved && (
          <span className="text-green-400 text-sm">✓ Saved!</span>
        )}
      </div>

      {/* Vision Provider Settings */}
      <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
        <h3 className="text-lg font-semibold mb-4">📷 Business Card Scanner</h3>
        <p className="text-zinc-400 text-sm mb-4">
          Choose which AI provider to use for scanning business cards. Each requires its own API key.
        </p>

        {/* Provider Selection */}
        <div className="mb-6">
          <label className="block text-sm text-zinc-400 mb-2">Vision Provider</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(PROVIDERS) as VisionProvider[]).map(p => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`p-3 rounded-lg border transition ${
                  provider === p
                    ? 'bg-blue-600 border-blue-500'
                    : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div className="font-medium">{PROVIDERS[p].name}</div>
                <div className="text-xs text-zinc-400 capitalize">{p}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Model Selection */}
        <div className="mb-6">
          <label className="block text-sm text-zinc-400 mb-2">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
          >
            {PROVIDERS[provider].models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* API Keys for all providers */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-zinc-300">API Keys</h4>
          
          {(Object.keys(PROVIDERS) as VisionProvider[]).map(p => (
            <div key={p} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">{PROVIDERS[p].name} Key</label>
                <input
                  type="password"
                  placeholder={`sk-...`}
                  value={apiKeys[p]}
                  onChange={(e) => updateApiKey(p, e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <a
                href={PROVIDERS[p].keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-end"
              >
                <span className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap py-2">
                  Get key →
                </span>
              </a>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800">
          <button
            onClick={saveSettings}
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Current Configuration */}
      <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
        <h3 className="text-lg font-semibold mb-4">📊 Current Configuration</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Provider:</span>
            <span className="font-medium">{PROVIDERS[provider].name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Model:</span>
            <span className="font-medium">{model}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">API Key:</span>
            <span className="font-medium">
              {apiKeys[provider] ? '✓ Configured' : '✗ Not set'}
            </span>
          </div>
        </div>
      </div>

      {/* Help */}
      <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
        <h3 className="text-lg font-semibold mb-4">💡 Tips</h3>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li>• <strong>z.ai</strong> uses OpenAI-compatible API - works the same way</li>
          <li>• <strong>gpt-4o-mini</strong> is fast and cheap for business cards</li>
          <li>• <strong>glm-4v</strong> from z.ai is a good alternative</li>
          <li>• API keys are stored locally in your browser only</li>
          <li>• Switch providers anytime - your contacts stay the same</li>
        </ul>
      </div>
    </div>
  );
}
