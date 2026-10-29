// Provider-neutral voice engine interface. Vapi is the first implementation;
// a self-hosted engine (LiveKit/Pipecat) or Retell can be added behind the
// same interface without touching the dashboard.

export type AgentConfig = {
  id: string;
  workspaceId: string;
  name: string;
  firstMessage: string;
  systemPrompt: string;
  knowledge: string;
  language: string;
  llmProvider: string;
  llmModel: string;
  temperature: number;
  voiceProvider: string;
  voiceId: string;
  transcriber: string;
  maxDurationSec: number;
  transferNumber: string | null;
};

export type ImportNumberInput =
  | { kind: 'twilio'; number: string; accountSid: string; authToken: string }
  | { kind: 'sip'; number: string; credentialId: string };

/** Normalised call event parsed from a provider webhook. */
export type CallEvent = {
  providerCallId: string;
  providerAgentId: string | null;
  direction: 'inbound' | 'outbound' | 'web';
  status: string;
  fromNumber?: string | null;
  toNumber?: string | null;
  startedAt?: Date | null;
  endedAt?: Date | null;
  durationSec?: number;
  providerCostCents?: number;
  endedReason?: string | null;
  transcript?: string | null;
  summary?: string | null;
  recordingUrl?: string | null;
  successful?: boolean | null;
};

export interface VoiceProvider {
  readonly name: string;
  upsertAgent(agent: AgentConfig, existingId: string | null): Promise<string>;
  deleteAgent(providerAgentId: string): Promise<void>;
  importNumber(input: ImportNumberInput, label: string): Promise<string>;
  assignNumber(providerNumberId: string, providerAgentId: string | null): Promise<void>;
  releaseNumber(providerNumberId: string): Promise<void>;
  startOutboundCall(opts: {
    providerAgentId: string;
    providerNumberId: string;
    to: string;
  }): Promise<string>;
  /** Verify and parse a webhook. Returns null for events we don't track. */
  parseWebhook(headers: Headers, body: unknown): CallEvent | null;
}
