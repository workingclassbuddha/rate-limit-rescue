export {
  buildContinuationPrompt,
  coerceContextPack,
  createContextPack,
  exportLegacyContextPack,
  formatContextPackMarkdown,
  isLegacyContextPack,
  normalizeMessages,
  upgradeLegacyContextPack,
} from '../../extension/lib/shared/context-pack.js';

export {
  assertValidContextPack,
  validateLegacyContextPack,
  validateContextPack,
} from '../../extension/lib/shared/context-pack-validation.js';

export {
  PROVIDERS,
  inferProvider,
  isSupportedAiUrl,
  providerList,
  targetProviderList,
  targetUrl,
} from '../../extension/lib/shared/providers.js';

export {
  MAX_MESSAGES,
  MAX_RECENT_PACKS,
  LEGACY_PROTOCOL_VERSION,
  PROTOCOL_NAME,
  PROTOCOL_VERSION,
  STORAGE_KEYS,
} from '../../extension/lib/shared/constants.js';
