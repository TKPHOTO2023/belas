'use client';

import { useEffect, useRef, useState } from 'react';
import type Vapi from '@vapi-ai/web';

type Line = { role: string; text: string };

// Talk to the agent from the browser using the microphone.
export function TestCall({ assistantId, publicKey }: { assistantId: string | null; publicKey: string | null }) {
  const vapiRef = useRef<Vapi | null>(null);
  const [state, setState] = useState<'idle' | 'connecting' | 'live'>('idle');
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => void vapiRef.current?.stop(), []);

  if (!assistantId || !publicKey) {
    return (
      <button className="btn-secondary" disabled title="Publish the agent and set NEXT_PUBLIC_VAPI_PUBLIC_KEY">
        Test call
      </button>
    );
  }

  async function start() {
    setError(null);
    setLines([]);
    setState('connecting');
    try {
      const { default: VapiClient } = await import('@vapi-ai/web');
      const vapi = new VapiClient(publicKey!);
      vapiRef.current = vapi;
      vapi.on('call-start', () => setState('live'));
      vapi.on('call-end', () => setState('idle'));
      vapi.on('error', (e: unknown) => {
        setError(e instanceof Error ? e.message : 'Call failed');
        setState('idle');
      });
      vapi.on('message', (m: any) => {
        if (m.type === 'transcript' && m.transcriptType === 'final') {
          setLines((prev) => [...prev, { role: m.role, text: m.transcript }]);
        }
      });
      await vapi.start(assistantId!);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the call');
      setState('idle');
    }
  }

  return (
    <div className="relative">
      {state === 'idle' ? (
        <button className="btn-primary" onClick={start}>Test call</button>
      ) : (
        <button className="btn-danger" onClick={() => vapiRef.current?.stop()}>
          {state === 'connecting' ? 'Connecting…' : 'End call'}
        </button>
      )}
      {(state !== 'idle' || lines.length > 0 || error) && (
        <div className="card absolute right-0 top-12 z-10 max-h-80 w-80 overflow-y-auto text-sm">
          {error && <p className="text-red-600">{error}</p>}
          {state === 'live' && lines.length === 0 && <p className="muted">Listening… say hello.</p>}
          {lines.map((l, i) => (
            <p key={i} className="mb-2">
              <span className="font-semibold capitalize">{l.role === 'assistant' ? 'Agent' : 'You'}:</span> {l.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
