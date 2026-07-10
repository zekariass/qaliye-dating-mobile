import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
const CHUNK_COUNT_SUFFIX = '__chunkCount';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const chunkCountStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX);
    if (chunkCountStr != null) {
      const count = parseInt(chunkCountStr, 10);
      const chunks: string[] = [];
      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}__chunk${i}`);
        if (chunk == null) return null;
        chunks.push(chunk);
      }
      return chunks.join('');
    }
    return SecureStore.getItemAsync(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const count = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(
        `${key}__chunk${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
    await SecureStore.setItemAsync(key + CHUNK_COUNT_SUFFIX, String(count));
    await SecureStore.deleteItemAsync(key);
  },

  removeItem: async (key: string): Promise<void> => {
    const chunkCountStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX);
    if (chunkCountStr != null) {
      const count = parseInt(chunkCountStr, 10);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}__chunk${i}`);
      }
      await SecureStore.deleteItemAsync(key + CHUNK_COUNT_SUFFIX);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

let client: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!client) {
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error(
          'Missing Supabase environment variables. ' +
          'Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in .env'
        );
      }
      client = createClient(url, key, {
        auth: {
          storage: ExpoSecureStoreAdapter,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
        global: {
          fetch: (input, init = {}) => {
            // Normalize headers to a plain Record — React Native's fetch drops Headers instances
            const raw = init.headers ?? {};
            const plainHeaders: Record<string, string> =
              raw instanceof Headers
                ? Object.fromEntries((raw as Headers).entries())
                : Array.isArray(raw)
                ? Object.fromEntries(raw as [string, string][])
                : { ...(raw as Record<string, string>) };

            if (
              init.body &&
              typeof init.body === 'string' &&
              !plainHeaders['Content-Type'] &&
              !plainHeaders['content-type']
            ) {
              plainHeaders['Content-Type'] = 'application/json';
            }
            return fetch(input, { ...init, headers: plainHeaders });
          },
        },
      });
    }
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
