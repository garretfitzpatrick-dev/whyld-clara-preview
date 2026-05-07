# Whyld World: Clara Preview

A mobile-first Next.js prototype of Clara, the guide inside Whyld World.

Clara uses local browser storage for prototype state. Response wording is generated server-side through the OpenAI API, with fallback text when the API is unavailable. The Response Lab remains available at `/lab` for prompt and response-quality testing.

## Local Dev

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The Response Lab is available at `http://localhost:3000/lab`.

## Required Env Vars

Create `.env.local` for local development:

```bash
OPENAI_API_KEY=your_openai_api_key
```

Optional:

```bash
CLARA_OPENAI_MODEL=gpt-4.1
```

`OPENAI_API_KEY` is read only by server-side API routes. Do not expose it with a `NEXT_PUBLIC_` prefix.

## Vercel Deploy

1. Import the project into Vercel as a Next.js app.
2. Add `OPENAI_API_KEY` in Vercel Project Settings -> Environment Variables.
3. Optionally add `CLARA_OPENAI_MODEL`.
4. Deploy.

Useful commands:

```bash
npm run build
npm run start
```

## Prototype Data

The app stores onboarding, active check-ins, completed sessions, and settings in `localStorage`.

For phone testing, open Settings and use **Reset prototype data** to clear local prototype data on that device and return to onboarding.
