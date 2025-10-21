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
    
    // SECURITY: Always use Secure flag in production, SameSite=Strict to prevent CSRF
    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? 'Secure' : (window.location.protocol === 'https:' ? 'Secure' : '');
    
    document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; ${secureFlag}`;
  }

  removeItem(key: string): void {
    if (typeof document === 'undefined') return;
    
    // SECURITY: Match setItem security flags when removing cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? 'Secure' : (window.location.protocol === 'https:' ? 'Secure' : '');
    
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict; ${secureFlag}`;
  }
}

// Create storage instance
export const cookieStorage = new CookieStorageAdapter();

















































