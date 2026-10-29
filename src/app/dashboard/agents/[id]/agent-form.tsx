'use client';

import { useFormAction } from '@/components/use-form-action';
import type { Agent } from '@prisma/client';
import { updateAgent } from '../../actions';
import { LANGUAGE_OPTIONS, MODEL_OPTIONS, VOICE_OPTIONS } from '@/lib/templates';
import { FormMessage } from '@/components/ui';

export function AgentForm({ agent, readOnly }: { agent: Agent; readOnly: boolean }) {
  const { state, pending, formProps } = useFormAction(updateAgent.bind(null, agent.id));
  const model = `${agent.llmProvider}/${agent.llmModel}`;
  const voice = `${agent.voiceProvider}/${agent.voiceId}`;
  const models = MODEL_OPTIONS.some((m) => `${m.provider}/${m.model}` === model)
    ? MODEL_OPTIONS
    : [...MODEL_OPTIONS, { provider: agent.llmProvider, model: agent.llmModel, label: model }];
  const voices = VOICE_OPTIONS.some((v) => `${v.provider}/${v.voiceId}` === voice)
    ? VOICE_OPTIONS
    : [...VOICE_OPTIONS, { provider: agent.voiceProvider, voiceId: agent.voiceId, label: voice }];

  return (
    <form {...formProps} className="card space-y-5">
      <fieldset disabled={readOnly || pending} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input className="input" id="name" name="name" defaultValue={agent.name} required />
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select className="input" id="status" name="status" defaultValue={agent.status}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="firstMessage">Greeting</label>
          <input className="input" id="firstMessage" name="firstMessage" defaultValue={agent.firstMessage} required />
        </div>
        <div>
          <label className="label" htmlFor="systemPrompt">Instructions</label>
          <textarea className="input min-h-48 font-mono text-xs" id="systemPrompt" name="systemPrompt" defaultValue={agent.systemPrompt} required />
          <p className="mt-1 text-xs text-slate-500">How the agent behaves: its role, goals, tone and rules.</p>
        </div>
        <div>
          <label className="label" htmlFor="knowledge">Business knowledge</label>
          <textarea
            className="input min-h-32 font-mono text-xs"
            id="knowledge"
            name="knowledge"
            defaultValue={agent.knowledge}
            placeholder={'Opening hours: Mon–Fri 8am–5pm\nAddress: …\nPrices: …\nFAQs: …'}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label" htmlFor="voice">Voice</label>
            <select className="input" id="voice" name="voice" defaultValue={voice}>
              {voices.map((v) => (
                <option key={`${v.provider}/${v.voiceId}`} value={`${v.provider}/${v.voiceId}`}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="model">AI model</label>
            <select className="input" id="model" name="model" defaultValue={model}>
              {models.map((m) => (
                <option key={`${m.provider}/${m.model}`} value={`${m.provider}/${m.model}`}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="language">Language</label>
            <select className="input" id="language" name="language" defaultValue={agent.language}>
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label" htmlFor="temperature">Creativity (0–1)</label>
            <input className="input" id="temperature" name="temperature" type="number" step="0.1" min="0" max="1" defaultValue={agent.temperature} />
          </div>
          <div>
            <label className="label" htmlFor="maxDurationSec">Max call length (sec)</label>
            <input className="input" id="maxDurationSec" name="maxDurationSec" type="number" min="30" max="3600" defaultValue={agent.maxDurationSec} />
          </div>
          <div>
            <label className="label" htmlFor="transferNumber">Transfer to human</label>
            <input className="input" id="transferNumber" name="transferNumber" placeholder="+27821234567" defaultValue={agent.transferNumber ?? ''} />
          </div>
        </div>
      </fieldset>
      {!readOnly && (
        <div className="flex items-center gap-4">
          <button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save & publish'}</button>
          <FormMessage state={state} />
        </div>
      )}
    </form>
  );
}
