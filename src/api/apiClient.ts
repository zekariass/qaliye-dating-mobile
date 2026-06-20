import axios from 'axios';

import { supabase } from '@/lib/supabase';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
    if (__DEV__) {
      console.log(
        `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
        '| token:', session.access_token.slice(0, 20) + '…',
      );
    }
  } else {
    console.warn('[API] No active session — request sent without Bearer token');
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isRetry = (error.config as { _retry?: boolean })?._retry;
    if (error.response?.status === 401 && !isRetry) {
      (error.config as { _retry?: boolean })._retry = true;
      try {
        const {
          data: { session },
        } = await supabase.auth.refreshSession();
        if (session) {
          error.config.headers.Authorization = `Bearer ${session.access_token}`;
          return axios(error.config);
        }
      } catch {
        await supabase.auth.signOut();
      }
    }
    if (__DEV__ && error.response) {
      console.warn(
        `[API] ${error.response.status} ${error.config?.url}`,
        JSON.stringify(error.response.data),
      );
    }
    return Promise.reject(error);
  },
);
