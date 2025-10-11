/**
 * Centralized Date Range Handler
 * Handles all date-related operations with proper timezone support
 */

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface DateRangeUTC {
  startDateUTC: string; // ISO string with UTC timezone
  endDateUTC: string; // ISO string with UTC timezone
}

export class DateRangeHandler {
  private startDate: string;
  private endDate: string;
  private timezone: string;

  constructor(startDate: string, endDate: string, timezone: string = 'Asia/Manila') {
    this.startDate = startDate;
    this.endDate = endDate;
    this.timezone = timezone; // PHT = UTC+8
  }

  /**
   * Convert PHT dates to UTC for database queries
   * @returns UTC ISO strings for start and end dates
   */
  toUTC(): DateRangeUTC {
    // PHT is UTC+8, so we add +08:00 timezone offset
    const startDateUTC = new Date(`${this.startDate}T00:00:00+08:00`).toISOString();
    const endDateUTC = new Date(`${this.endDate}T23:59:59+08:00`).toISOString();

    return { startDateUTC, endDateUTC };
  }

  /**
   * Get the number of days in the date range (inclusive)
   */
  getDayCount(): number {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // +1 to include both start and end dates
  }

  /**
   * Check if a date falls within this range
   */
  contains(date: string): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  /**
   * Get a formatted display label for the date range
   */
  getLabel(): string {
    if (this.startDate === this.endDate) {
      return this.startDate;
    }
    return `${this.startDate} to ${this.endDate}`;
  }

  /**
   * Get current date in PHT timezone
   */
  static getTodayPHT(): string {
    const now = new Date();
    const phtOffset = 8 * 60; // 8 hours in minutes
    const phtTime = new Date(now.getTime() + (phtOffset * 60 * 1000));
    return phtTime.toISOString().split('T')[0];
  }

  /**
   * Normalize a date string to YYYY-MM-DD format
   * Handles both date strings and datetime strings
   */
  static normalizeDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    // Extract date part only (YYYY-MM-DD) from datetime strings
    return dateString.split('T')[0];
  }

  /**
   * Get the first and last day of a given month
   */
  static getMonthRange(yearMonth: string): DateRange {
    const [year, month] = yearMonth.split('-').map(Number);
    
    // First day of month
    const startDate = new Date(year, month - 1, 1);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Last day of month
    const endDate = new Date(year, month, 0);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    return { startDate: startDateStr, endDate: endDateStr };
  }
}

