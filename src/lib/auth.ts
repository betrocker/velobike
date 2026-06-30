import { Alert } from 'react-native';

import { i18n } from '@/i18n';

import { isSupabaseConfigured, supabase } from './supabase';

type SignUpData = Awaited<ReturnType<typeof supabase.auth.signUp>>['data'];
type SignInData = Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['data'];

function showSignUpError(error: unknown) {
  const message = error instanceof Error ? error.message : i18n.t('auth.errors.signUpFallback');

  console.error('[auth] sign up failed', error);
  Alert.alert(i18n.t('auth.errors.signUpTitle'), message);
}

function showSignInError(error: unknown) {
  const message = error instanceof Error ? error.message : i18n.t('auth.errors.signInFallback');

  console.error('[auth] sign in failed', error);
  Alert.alert(i18n.t('auth.errors.signInTitle'), message);
}

function requireSupabaseConfig() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<SignInData | null> {
  try {
    requireSupabaseConfig();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    showSignInError(error);
    return null;
  }
}

export async function signUpAsAdmin(
  email: string,
  password: string,
  fullName: string,
  companyName: string,
): Promise<SignUpData | null> {
  try {
    requireSupabaseConfig();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          company_name: companyName.trim(),
          full_name: fullName.trim(),
          is_creating_tenant: true,
        },
      },
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    showSignUpError(error);
    return null;
  }
}

export async function signUpAsStaff(
  email: string,
  password: string,
  fullName: string,
  inviteCode: string,
): Promise<SignUpData | null> {
  try {
    requireSupabaseConfig();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          invite_code: inviteCode.trim(),
          full_name: fullName.trim(),
          is_creating_tenant: false,
        },
      },
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    showSignUpError(error);
    return null;
  }
}
