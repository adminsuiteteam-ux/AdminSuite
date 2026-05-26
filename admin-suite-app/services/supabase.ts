import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://whjxjqsxrnjpkoknfixo.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoanhqcXN4cm5qcGtva25maXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjIxMTMsImV4cCI6MjA5NDg5ODExM30.sw6ac1XgIGZbXs9PJVhyliUSDGrkI1Cv6k4x02BcsE4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
