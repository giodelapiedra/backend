/**
 * Date Utility Functions
 * Centralized date handling for the application
 */

const logger = require('./logger');

/**
 * Get start and end dates for a given week (Sunday to Saturday)
 * @param {Date} date - Any date in the week
 * @returns {object} Week start and end dates
 */
const getWeekDateRange = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = d.getDate() - day; // Go back to Sunday
  
  // Sunday
  const startDate = new Date(d.setDate(diff));
  startDate.setHours(0, 0, 0, 0);
  
  // Saturday
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    startDateISO: startDate.toISOString().split('T')[0],
    endDateISO: endDate.toISOString().split('T')[0],
    weekLabel: `Week of ${startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
  };
};

/**
 * Get current week and previous week data for comparison
 * @param {Date} date - Reference date (defaults to current date)
 * @returns {object} Current and previous week information
 */
const getWeekComparison = (date = new Date()) => {
  const currentWeek = getWeekDateRange(date);
  
  // Get previous week
  const prevWeekStart = new Date(currentWeek.startDate);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const previousWeek = getWeekDateRange(prevWeekStart);
  
  return {
    currentWeek,
    previousWeek
  };
};

/**
 * Calculate working days count between start and end date (Monday-Friday)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of working days
 */
const getWorkingDaysCount = (startDate, endDate) => {
  let workingDays = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  while (start <= end) {
    const day = start.getDay();
    if (day !== 0 && day !== 6) { // Not Sunday (0) or Saturday (6)
      workingDays++;
    }
    start.setDate(start.getDate() + 1);
  }
  
  return workingDays;
};

/**
 * Calculate working days elapsed since start of current week (Monday)
 * @param {Date|string} weekStartDate - Start date of the week (Monday)
 * @param {Date} currentDate - Current date (defaults to today)
 * @returns {number} Number of working days elapsed (0-5)
 */
const getWorkingDaysElapsed = (weekStartDate, currentDate = new Date()) => {
  const startOfWeek = new Date(weekStartDate);
  const today = new Date(currentDate);
  
  let workingDaysElapsed = 0;
  const currentDateInWeek = new Date(startOfWeek);
  
  // Count working days from Monday up to today (or end of week)
  while (currentDateInWeek <= today && currentDateInWeek.getDay() <= 5) {
    if (currentDateInWeek.getDay() >= 1 && currentDateInWeek.getDay() <= 5) { // Monday = 1, Friday = 5
      workingDaysElapsed++;
    }
    currentDateInWeek.setDate(currentDateInWeek.getDate() + 1);
  }
  
  // Cap at 5 working days
  return Math.min(workingDaysElapsed, 5);
};

/**
 * Calculate working days in a month (Monday-Friday)
 * @param {Date|string} monthStart - Month start date
 * @param {Date|string} monthEnd - Month end date
 * @returns {number} Number of working days in the month
 */
const getWorkingDaysInMonth = (monthStart, monthEnd) => {
  let workingDays = 0;
  const current = new Date(monthStart);
  const end = new Date(monthEnd);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Monday = 1, Tuesday = 2, ..., Friday = 5
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
};

/**
 * Get Philippine Time (UTC+8)
 * @returns {Date} Current date in Philippine time
 */
const getPhilippineTime = () => {
  // Simple approach: Use current time as is
  // The server should be running in Philippine Time
  return new Date();
};

/**
 * Get today's date string in YYYY-MM-DD format (PH time UTC+8)
 * @returns {string} Today's date string
 */
const getTodayDateString = () => {
  const now = new Date();
  const phtOffset = 8 * 60; // 8 hours in minutes
  const phtTime = new Date(now.getTime() + (phtOffset * 60 * 1000));
  return phtTime.toISOString().split('T')[0];
};

/**
 * Get date string from Date object (PH time UTC+8)
 * @param {Date} date - Date object
 * @returns {string} Date string in YYYY-MM-DD format
 */
const getDateString = (date) => {
  const targetDate = new Date(date);
  const phtOffset = 8 * 60; // 8 hours in minutes
  const phtTime = new Date(targetDate.getTime() + (phtOffset * 60 * 1000));
  return phtTime.toISOString().split('T')[0];
};

/**
 * Get start and end of day for a given date
 * @param {Date|string} date - Date to get day range for
 * @returns {object} Start and end of day timestamps
 */
const getDayRange = (date = new Date()) => {
  const targetDate = new Date(date);
  
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  return {
    start: startOfDay.toISOString(),
    end: endOfDay.toISOString(),
    startDate: startOfDay.toISOString().split('T')[0],
    endDate: endOfDay.toISOString().split('T')[0]
  };
};

/**
 * Get month date range
 * @param {Date} date - Any date in the month
 * @returns {object} Month start and end dates
 */
const getMonthDateRange = (date = new Date()) => {
  const targetDate = new Date(date);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
  
  return {
    startDate: monthStart.toISOString(),
    endDate: monthEnd.toISOString(),
    startDateISO: monthStart.toISOString().split('T')[0],
    endDateISO: monthEnd.toISOString().split('T')[0],
    monthLabel: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  };
};

/**
 * Calculate days difference between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Number of days difference
 */
const getDaysDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

/**
 * Check if a date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
const isToday = (date) => {
  const targetDate = new Date(date);
  const today = new Date();
  
  return targetDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];
};

/**
 * Check if a date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
const isPastDate = (date) => {
  const targetDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return targetDate < today;
};

/**
 * Check if a date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the future
 */
const isFutureDate = (date) => {
  const targetDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  return targetDate > today;
};

module.exports = {
  getWeekDateRange,
  getWeekComparison,
  getWorkingDaysCount,
  getWorkingDaysElapsed,
  getWorkingDaysInMonth,
  getPhilippineTime,
  getTodayDateString,
  getDateString,
  getDayRange,
  getMonthDateRange,
  getDaysDifference,
  isToday,
  isPastDate,
  isFutureDate
};
