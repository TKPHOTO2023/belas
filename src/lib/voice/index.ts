import type { VoiceProvider } from './types';
import { vapiProvider } from './vapi';

export * from './types';

const providers: Record<string, VoiceProvider> = { vapi: vapiProvider };

export function voice(): VoiceProvider {
  const name = process.env.VOICE_PROVIDER || 'vapi';
  const p = providers[name];
  if (!p) throw new Error(`Unknown VOICE_PROVIDER "${name}"`);
  return p;
}

export function voiceConfigured() {
  return Boolean(process.env.VAPI_API_KEY);
}
