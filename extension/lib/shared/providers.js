export const PROVIDERS = {
  chatgpt: {
    id: 'chatgpt',
    label: 'ChatGPT',
    supportLevel: 'adapter',
    supportLabel: 'Message adapter',
    origins: ['https://chatgpt.com', 'https://chat.openai.com'],
    homeUrl: 'https://chatgpt.com/',
  },
  claude: {
    id: 'claude',
    label: 'Claude',
    supportLevel: 'adapter',
    supportLabel: 'Message adapter',
    origins: ['https://claude.ai'],
    homeUrl: 'https://claude.ai/new',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    supportLevel: 'adapter',
    supportLabel: 'Message adapter',
    origins: ['https://gemini.google.com'],
    homeUrl: 'https://gemini.google.com/app',
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    supportLevel: 'adapter',
    supportLabel: 'Message adapter',
    origins: ['https://chat.deepseek.com'],
    homeUrl: 'https://chat.deepseek.com/',
  },
  perplexity: {
    id: 'perplexity',
    label: 'Perplexity',
    supportLevel: 'generic',
    supportLabel: 'Generic composer support',
    origins: ['https://www.perplexity.ai', 'https://perplexity.ai'],
    homeUrl: 'https://www.perplexity.ai/',
  },
  copilot: {
    id: 'copilot',
    label: 'Copilot',
    supportLevel: 'generic',
    supportLabel: 'Generic composer support',
    origins: ['https://copilot.microsoft.com'],
    homeUrl: 'https://copilot.microsoft.com/',
  },
  poe: {
    id: 'poe',
    label: 'Poe',
    supportLevel: 'generic',
    supportLabel: 'Generic composer support',
    origins: ['https://poe.com'],
    homeUrl: 'https://poe.com/',
  },
  lechat: {
    id: 'lechat',
    label: 'Le Chat',
    supportLevel: 'generic',
    supportLabel: 'Generic composer support',
    origins: ['https://chat.mistral.ai'],
    homeUrl: 'https://chat.mistral.ai/chat',
  },
  grok: {
    id: 'grok',
    label: 'Grok',
    supportLevel: 'generic',
    supportLabel: 'Generic composer support',
    origins: ['https://grok.com', 'https://x.ai'],
    homeUrl: 'https://grok.com/',
  },
  huggingchat: {
    id: 'huggingchat',
    label: 'HuggingChat',
    supportLevel: 'generic',
    supportLabel: 'Generic composer support',
    origins: ['https://huggingface.co/chat'],
    homeUrl: 'https://huggingface.co/chat/',
  },
  qwen: {
    id: 'qwen',
    label: 'Qwen',
    supportLevel: 'generic',
    supportLabel: 'Generic composer support',
    origins: ['https://qwen.ai'],
    homeUrl: 'https://qwen.ai/qwenchat',
  },
};

export function providerList() {
  return Object.values(PROVIDERS);
}

export function targetProviderList() {
  return providerList().map((provider) => ({
    id: provider.id,
    label: provider.label,
    homeUrl: provider.homeUrl,
    supportLevel: provider.supportLevel,
    supportLabel: provider.supportLabel,
  }));
}

export function inferProvider(url) {
  const value = String(url || '').toLowerCase();
  for (const provider of providerList()) {
    if (provider.origins.some((origin) => value.startsWith(origin))) {
      return provider;
    }
  }
  return {
    id: 'web',
    label: 'Web Page',
    origins: [],
    homeUrl: '',
  };
}

export function isSupportedAiUrl(url) {
  return inferProvider(url).id !== 'web';
}

export function targetUrl(target) {
  return PROVIDERS[target]?.homeUrl || PROVIDERS.chatgpt.homeUrl;
}
