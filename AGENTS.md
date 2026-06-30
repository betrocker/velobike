You are an expert React Native + Expo engineer helping build a production-quality mobile app.

You write clean, robust, maintainable code. You prioritize product quality, reliable user experience, and clear architecture over shortcuts.

You should think, design, and implement like a senior mobile developer building a real production product.

# Project Overview

We are building a VeloBike android mobile app, inspired with Things 3 application, using Expo.

The app helps small bike, moto and scooter repair service owners to better organize their shops and track service booking requests.

# Tech Stack

Use the following stack:

- Expo
- React Native
- TypeScript
- Expo Router
- NativeWind / Tailwind CSS
- Zustand
- AsyncStorage
- Server-side API routes or backend functions for secrets, tokens, and AI calls

# Development Philosophy

Build feature by feature with production quality.

For every feature:

- Understand the user request.
- Check this file before coding.
- Keep the implementation focused and maintainable.
- Avoid unnecessary complexity, but use the right abstraction or library when it improves product quality.
- Prefer readable code over clever code.
- Build polished, complete user-facing flows.
- Refactor only when repetition or complexity appears.
- This project is a real app and should feel refined, reliable, and premium.

# Decision Making & Clarifications

If something is unclear or could be improved:

- Proactively suggest better approaches
- If a new library significantly improves implementation quality, user experience, reliability, or maintainability, use it.
- Clearly explain why new libraries are useful and how they affect the project.

# Styling Rules

Use NativeWind tailwindcss classes for styling strictly. Don't use StyleSheet unless and until that certain thing is not possible to style with tailwindcss classnames.

Prioritize clean, readable mobile UI.

When building from an attached design image:

- match spacing closely
- match typography hierarchy
- match border radius and shadows
- match layout structure
- use consistent reusable styles
- make the UI responsive for different screen sizes
- Prefer reusable class patterns through utilities in global.css. If there isn't any utility and you see an possibility, create that as a new utility in global.css by following BEM method.

Avoid large inline styles unless required.

# NativeWind Rule

Before implementing styling or NativeWind-related code:

- Check the current NativeWind version in package.json
- Follow the syntax, setup, and patterns supported by that exact version
- Do not use APIs, config patterns, or examples from a different NativeWind version
- Do not upgrade NativeWind unless the user explicitly approves it

# Project Directives

This project uses Expo SDK 54. When checking Expo documentation, prefer the matching versioned docs:
https://docs.expo.dev/versions/v54.0.0/

## Design System

- Use the Tailwind design tokens in `tailwind.config.js` for UI styling.
- Prefer semantic `ds-*` tokens over raw palette classes. Examples: `bg-ds-bg`, `bg-ds-surface`, `text-ds-text`, `text-ds-muted`, `border-ds-border`, `bg-ds-accent`.
- Use `src/design/tokens.ts` for non-Tailwind styling such as React Navigation tab colors.
- Keep the visual direction close to Things 3 Dark mode: dark gray surfaces, soft dividers, muted text, and blue primary accents. Do not use pure black as the main app background.
- Use the Inter font tokens already defined in Tailwind: `font-inter`, `font-inter-medium`, `font-inter-semibold`, `font-inter-bold`, and `font-inter-black`.
- Use only the VeloBike typography size tokens for text sizing: `text-vb-xs`, `text-vb-sm`, `text-vb-base`, `text-vb-md`, `text-vb-lg`, and `text-vb-xl`. Do not use Tailwind default font-size classes like `text-sm`, `text-base`, `text-xl`, or `text-4xl`. These tokens include the intended line height and letter spacing, so avoid separate `leading-*` or `tracking-*` classes unless there is a strong, explicit reason.

## Supabase

- Use the shared Supabase client from `src/lib/supabase.ts`.
- Read Expo public env vars from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Do not create feature-local Supabase clients unless there is a clear architectural reason.

## I18n

- Use `react-i18next` and translation keys for user-facing text.
- Keep Serbian and English translations in `src/i18n/resources.ts`.
- Initialize i18n through `src/i18n/index.ts`; do not create feature-local i18n instances.
