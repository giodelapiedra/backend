/**
 * Timezone utilities for Philippines Time (PHT = UTC+8)
 */

/**
 * Get current date in Philippines Time (PHT) in YYYY-MM-DD format
 */
export const getPHTDate = (): string => {
  const now = new Date();
  const phtOffset = 8 * 60; // 8 hours in minutes
  const phtTime = new Date(now.getTime() + (phtOffset * 60 * 1000));
  return phtTime.toISOString().split('T')[0];
};

/**
 * Get current date and time in Philippines Time (PHT)
 */
export const getPHTDateTime = (): Date => {
  const now = new Date();
  const phtOffset = 8 * 60; // 8 hours in minutes
  return new Date(now.getTime() + (phtOffset * 60 * 1000));
};

/**
 * Convert UTC date to PHT date string
 */
export const utcToPHTDate = (utcDate: Date): string => {
  const phtOffset = 8 * 60; // 8 hours in minutes
  const phtTime = new Date(utcDate.getTime() + (phtOffset * 60 * 1000));
  return phtTime.toISOString().split('T')[0];
};

/**
 * Convert PHT date string to UTC date
 */
export const phtToUTCDate = (phtDateString: string): Date => {
  const phtDate = new Date(phtDateString + 'T00:00:00.000Z');
  const phtOffset = 8 * 60; // 8 hours in minutes
  return new Date(phtDate.getTime() - (phtOffset * 60 * 1000));
};

/**
 * Format time for display in PHT
 */
export const formatPHTTime = (utcTimeString: string): string => {
  const utcDate = new Date(utcTimeString);
  const phtOffset = 8 * 60; // 8 hours in minutes
  const phtTime = new Date(utcDate.getTime() + (phtOffset * 60 * 1000));
  return phtTime.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Format date for display in PHT
 */
export const formatPHTDate = (utcDateString: string): string => {
  const utcDate = new Date(utcDateString);
  const phtOffset = 8 * 60; // 8 hours in minutes
  const phtTime = new Date(utcDate.getTime() + (phtOffset * 60 * 1000));
  return phtTime.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};
