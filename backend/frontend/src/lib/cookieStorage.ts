import { SupabaseClient } from '@supabase/supabase-js';

// Custom storage adapter for Supabase that uses cookies instead of localStorage
export class CookieStorageAdapter {
  private key: string;

  constructor(key: string = 'supabase.auth.token') {
    this.key = key;
  }

  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === key) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return;
    
    // Set cookie with security attributes
    const expires = new Date();
    expires.setTime(expires.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days
    
    document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure=${window.location.protocol === 'https:'}`;
  }

  removeItem(key: string): void {
    if (typeof document === 'undefined') return;
    
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict; Secure=${window.location.protocol === 'https:'}`;
  }
}

// Create storage instance
export const cookieStorage = new CookieStorageAdapter();
































