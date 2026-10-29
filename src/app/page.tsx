import Link from 'next/link';
import { PLATFORM_NAME } from '@/lib/brand';

const FEATURES = [
  { title: 'Answers every call', body: 'A natural-sounding AI receptionist picks up 24/7, in seconds, and never puts anyone on hold.' },
  { title: 'Books and qualifies', body: 'Captures appointments, leads and messages, then hands off to a human when it should.' },
  { title: 'Knows your business', body: 'Add your hours, prices and FAQs. The agent answers from them and nothing else.' },
  { title: 'Every call recorded', body: 'Recordings, transcripts and AI summaries for every conversation, in one dashboard.' },
  { title: 'Your numbers', body: 'Bring an existing number over SIP or Twilio, or use a new one.' },
  { title: 'Pay per minute', body: 'Simple usage billing. No seats, no setup fees.' },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-bold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">{PLATFORM_NAME[0]}</div>
          {PLATFORM_NAME}
        </div>
        <Link href="/login" className="btn-secondary">Sign in</Link>
      </header>
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="mb-4 inline-block rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">AI voice agents for business</p>
        <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">Never miss another customer call.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          {PLATFORM_NAME} gives your business an AI phone agent that answers, books appointments and qualifies leads in
          a natural human voice, day and night.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <a href="mailto:hello@bela.ai" className="btn-primary px-6 py-3 text-base">Book a demo</a>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">Client login</Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-24 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card">
            <h3 className="font-semibold">{f.title}</h3>
            <p className="muted mt-2">{f.body}</p>
          </div>
        ))}
      </section>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} {PLATFORM_NAME}
      </footer>
    </main>
  );
}
