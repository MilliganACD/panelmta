/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project-id.supabase.co');

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase credentials are not configured or are using placeholder values. ' +
    'Falling back to Local Storage Demo Mode.'
  );
}

// Only instantiate createClient if we have valid non-empty values to prevent runtime crashes
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
