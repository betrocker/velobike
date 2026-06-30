# VeloBike

Expo SDK 54 app with Expo Router, NativeWind/Tailwind, Inter, and Supabase.

## Start

```bash
npm install
npx expo start --clear --port 8081
```

## Supabase

Copy `.env.example` to `.env` and set values from the Supabase project dashboard:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

The client is configured in `src/lib/supabase.ts`. Expo only exposes client-side env vars prefixed with `EXPO_PUBLIC_`.
