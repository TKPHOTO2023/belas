# Bela — white-label AI voice agent platform

Bela lets you sell AI phone agents to other businesses. Each client gets their own branded dashboard where they build agents, connect phone numbers, test calls in the browser, read transcripts and see their usage bill. You see every client, set each one's per-minute price, and track your margin.

## What's included

| Area | What it does |
| --- | --- |
| **Clients** (platform admin) | Create client businesses with their own login, set price per minute and included minutes, suspend or reactivate them, and open any client's dashboard ("view as"). |
| **Agents** | Templates (receptionist, booking, lead qualification, support), plus greeting, instructions, business knowledge, voice, AI model, language, max length and transfer-to-human. Saving publishes the agent to the voice engine. |
| **Test call** | Talk to an agent from the browser with a live transcript. |
| **Phone numbers** | Import a Twilio number or a SIP trunk number, then choose which agent answers it. Outbound calls can be placed from an agent's page. |
| **Call logs** | Every call with its recording, transcript, AI summary, whether the agent's goal was met, duration and charge. |
| **Usage & billing** | Monthly statements: minutes, usage, included-minute credit and amount due. |
| **Settings** | Each client's branding (name, logo, colour) and team members (admin or viewer). |
| **Platform overview** | Calls, minutes, revenue and gross margin across all clients. |

## How it fits together

```
Browser ──▶ Next.js dashboard (this repo) ──▶ Postgres
                    │  publishes agents, numbers, outbound calls
                    ▼
             Voice engine (Vapi)  ◀──── phone network (Twilio / SIP)
                    │  speech-to-text → LLM → text-to-speech
                    ▼
   POST /api/webhooks/vapi  (status updates and end-of-call reports → Call rows + billing)
```

The voice engine sits behind a small interface (`src/lib/voice/types.ts`). Vapi is the first implementation. You can later add a self-hosted engine (LiveKit Agents or Pipecat, for better margins) or Retell without changing the dashboard.

## Run it locally

Requirements: Node 20+ and a Postgres database.

```bash
cp .env.example .env        # fill in DATABASE_URL, SESSION_SECRET, SEED_ADMIN_PASSWORD
npm install
npm run db:push             # create tables
npm run db:seed             # create the platform workspace + your admin login
npm run dev                 # http://localhost:3000
```

Sign in at `/login` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Without the voice engine keys, everything works except publishing agents and making real calls.

## Connect the voice engine (Vapi)

1. Create an account at [dashboard.vapi.ai](https://dashboard.vapi.ai) and add credit.
2. Copy your **private API key** into `VAPI_API_KEY` and your **public key** into `NEXT_PUBLIC_VAPI_PUBLIC_KEY`.
3. Set `APP_URL` to your public URL (e.g. `https://app.bela.ai`) and choose a random `VAPI_WEBHOOK_SECRET`. Every agent you save is configured to send its call events to `APP_URL/api/webhooks/vapi` with that secret.
4. Open an agent and press **Save & publish**, then **Test call**.

To use an Anthropic model (Claude) or ElevenLabs voices, add those provider keys in the Vapi dashboard under *Provider Keys*. The options shown in the agent editor live in `src/lib/templates.ts`.

### Phone numbers in South Africa

- **Twilio**: buy a South African number in Twilio (local numbers need regulatory documents), then add it on the *Phone numbers* page with your Account SID and Auth Token.
- **SIP trunk** (often cheaper locally): get a trunk from a SIP provider, add it as a *BYO SIP trunk* credential in the Vapi dashboard, then add the number here with that credential ID.

## Deploy (Vercel + Neon/Supabase)

1. Create a Postgres database (Neon, Supabase or Railway) and copy its connection string.
2. Import this repo in Vercel and set the environment variables from `.env.example`.
3. Deploy, then run `npx prisma db push` and `npm run db:seed` once against the production `DATABASE_URL`.

Set `NEXT_PUBLIC_CURRENCY` (e.g. `ZAR`) to bill in your currency. Set `NEXT_PUBLIC_PLATFORM_NAME` to rebrand the platform itself.

## Pricing your service

Vapi bills you per minute (platform fee plus the model, voice and transcription costs). The Vapi cost of each call is stored, so the Clients page and the platform overview show your margin per client. Set each client's rate to cover that cost with your markup.

## Roadmap ideas

- Stripe or PayFast invoicing from the monthly statements
- Knowledge base from uploaded documents and websites
- Tool calls into the client's calendar or CRM (Google Calendar, Cal.com, Zoho)
- Outbound campaigns (call lists with scheduling and retries)
- Self-hosted voice engine adapter (LiveKit/Pipecat) to cut per-minute cost
- Custom domains per client (`calls.clientbusiness.com`)
