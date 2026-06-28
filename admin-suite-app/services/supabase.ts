/**
 * Supabase has been removed from AdminSuite.
 * Authentication and email verification are now handled entirely by the Django backend.
 *
 * This file is kept as a stub to prevent import errors during the transition.
 * You can safely delete this file once confirmed no other imports remain.
 */

export const supabase = {
  auth: {
    signInWithPassword: () => { console.warn('[Supabase stub] Supabase removed. Use Django auth.'); return Promise.resolve({ data: null, error: null }); },
    signUp: () => { console.warn('[Supabase stub] Supabase removed. Use requestEmailOTP.'); return Promise.resolve({ data: null, error: null }); },
    signOut: () => { console.warn('[Supabase stub] Supabase removed.'); return Promise.resolve({ error: null }); },
    resend: () => { console.warn('[Supabase stub] Supabase removed. Use resendEmailOTP.'); return Promise.resolve({ data: null, error: null }); },
    verifyOtp: () => { console.warn('[Supabase stub] Supabase removed. Use verifyEmailOTP.'); return Promise.resolve({ data: null, error: null }); },
  },
};
