import type { AgentConfig, CallEvent, ImportNumberInput, VoiceProvider } from './types';

const BASE = 'https://api.vapi.ai';

async function vapi<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error('VAPI_API_KEY is not configured');
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Vapi ${init.method || 'GET'} ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

function systemMessage(agent: AgentConfig) {
  const parts = [agent.systemPrompt.trim()];
  if (agent.knowledge.trim()) {
    parts.push(`\n## Business knowledge\nUse these facts when answering. If something isn't covered, say you'll have someone follow up.\n${agent.knowledge.trim()}`);
  }
  if (agent.transferNumber) {
    parts.push('\nIf the caller asks for a human, or you cannot help, use the transferCall tool.');
  }
  return parts.join('\n');
}

function assistantBody(agent: AgentConfig) {
  const appUrl = process.env.APP_URL?.replace(/\/$/, '');
  return {
    name: agent.name.slice(0, 40),
    firstMessage: agent.firstMessage,
    maxDurationSeconds: agent.maxDurationSec,
    model: {
      provider: agent.llmProvider,
      model: agent.llmModel,
      temperature: agent.temperature,
      messages: [{ role: 'system', content: systemMessage(agent) }],
      ...(agent.transferNumber
        ? { tools: [{ type: 'transferCall', destinations: [{ type: 'number', number: agent.transferNumber }] }] }
        : {}),
    },
    voice: { provider: agent.voiceProvider, voiceId: agent.voiceId },
    transcriber: { provider: agent.transcriber, language: agent.language },
    analysisPlan: { summaryPlan: { enabled: true }, successEvaluationPlan: { enabled: true, rubric: 'PassFail' } },
    serverMessages: ['status-update', 'end-of-call-report'],
    ...(appUrl
      ? { server: { url: `${appUrl}/api/webhooks/vapi`, ...(process.env.VAPI_WEBHOOK_SECRET ? { secret: process.env.VAPI_WEBHOOK_SECRET } : {}) } }
      : {}),
    metadata: { belaAgentId: agent.id, belaWorkspaceId: agent.workspaceId },
  };
}

function toDate(v: unknown) {
  return typeof v === 'string' && v ? new Date(v) : null;
}

function directionOf(type: unknown): CallEvent['direction'] {
  if (type === 'inboundPhoneCall') return 'inbound';
  if (type === 'outboundPhoneCall') return 'outbound';
  return 'web';
}

export const vapiProvider: VoiceProvider = {
  name: 'vapi',

  async upsertAgent(agent, existingId) {
    const body = JSON.stringify(assistantBody(agent));
    if (existingId) {
      await vapi(`/assistant/${existingId}`, { method: 'PATCH', body });
      return existingId;
    }
    const created = await vapi<{ id: string }>('/assistant', { method: 'POST', body });
    return created.id;
  },

  async deleteAgent(id) {
    await vapi(`/assistant/${id}`, { method: 'DELETE' });
  },

  async importNumber(input: ImportNumberInput, label) {
    const body =
      input.kind === 'twilio'
        ? { provider: 'twilio', number: input.number, twilioAccountSid: input.accountSid, twilioAuthToken: input.authToken, name: label }
        : { provider: 'byo-phone-number', number: input.number, credentialId: input.credentialId, numberE164CheckEnabled: false, name: label };
    const created = await vapi<{ id: string }>('/phone-number', { method: 'POST', body: JSON.stringify(body) });
    return created.id;
  },

  async assignNumber(numberId, assistantId) {
    await vapi(`/phone-number/${numberId}`, { method: 'PATCH', body: JSON.stringify({ assistantId }) });
  },

  async releaseNumber(numberId) {
    await vapi(`/phone-number/${numberId}`, { method: 'DELETE' });
  },

  async startOutboundCall({ providerAgentId, providerNumberId, to }) {
    const call = await vapi<{ id: string }>('/call', {
      method: 'POST',
      body: JSON.stringify({ assistantId: providerAgentId, phoneNumberId: providerNumberId, customer: { number: to } }),
    });
    return call.id;
  },

  parseWebhook(headers, body: any) {
    const secret = process.env.VAPI_WEBHOOK_SECRET;
    if (secret && headers.get('x-vapi-secret') !== secret) {
      throw new Error('Invalid webhook secret');
    }
    const msg = body?.message;
    if (!msg?.call?.id) return null;
    const call = msg.call;
    const base: CallEvent = {
      providerCallId: call.id,
      providerAgentId: call.assistantId ?? msg.assistant?.id ?? null,
      direction: directionOf(call.type),
      status: 'queued',
      fromNumber: call.type === 'outboundPhoneCall' ? msg.phoneNumber?.number : call.customer?.number,
      toNumber: call.type === 'outboundPhoneCall' ? call.customer?.number : msg.phoneNumber?.number,
    };

    if (msg.type === 'status-update') {
      return { ...base, status: msg.status, startedAt: toDate(call.startedAt) };
    }

    if (msg.type === 'end-of-call-report') {
      const startedAt = toDate(msg.startedAt ?? call.startedAt);
      const endedAt = toDate(msg.endedAt ?? call.endedAt);
      const durationSec =
        typeof msg.durationSeconds === 'number'
          ? Math.round(msg.durationSeconds)
          : startedAt && endedAt
            ? Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
            : 0;
      const success = msg.analysis?.successEvaluation;
      return {
        ...base,
        status: 'ended',
        startedAt,
        endedAt,
        durationSec,
        providerCostCents: Math.round((msg.cost ?? call.cost ?? 0) * 100),
        endedReason: msg.endedReason ?? call.endedReason ?? null,
        transcript: msg.artifact?.transcript ?? msg.transcript ?? null,
        summary: msg.analysis?.summary ?? msg.summary ?? null,
        recordingUrl: msg.artifact?.recordingUrl ?? msg.recordingUrl ?? null,
        successful: success === undefined || success === null ? null : String(success).toLowerCase() === 'true',
      };
    }
    return null;
  },
};
