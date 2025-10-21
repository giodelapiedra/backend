# 🚀 Quick Reference: New Utility Functions

## 📅 DateRangeHandler

### Convert PHT to UTC
```typescript
import { DateRangeHandler } from '../utils/dateRangeHandler';

const handler = new DateRangeHandler('2025-10-10', '2025-10-12');
const { startDateUTC, endDateUTC } = handler.toUTC();
// Result: UTC ISO strings ready for database queries
```

### Get Today in PHT
```typescript
const today = DateRangeHandler.getTodayPHT();
// Result: "2025-10-12"
```

### Normalize Date String
```typescript
const normalized = DateRangeHandler.normalizeDate('2025-10-10T14:30:00.000Z');
// Result: "2025-10-10"
```

### Get Day Count
```typescript
const handler = new DateRangeHandler('2025-10-10', '2025-10-12');
const days = handler.getDayCount();
// Result: 3
```

---

## 📊 KPI Constants

### Use KPI Weights
```typescript
import { KPI_WEIGHTS } from '../utils/kpiConstants';

const score = (completionRate * KPI_WEIGHTS.COMPLETION_RATE) +
              (onTimeRate * KPI_WEIGHTS.ON_TIME_RATE);
```

### Get Readiness Score
```typescript
import { READINESS_SCORES } from '../utils/kpiConstants';

const score = level === 'fit' ? READINESS_SCORES.FIT : READINESS_SCORES.MINOR;
```

### Get KPI Rating
```typescript
import { getKPIRating } from '../utils/kpiConstants';

const { rating, color } = getKPIRating(85);
// Result: { rating: 'Good', color: '#22c55e' }
```

---

## ✅ Metrics Validator

### Validate Team Metrics
```typescript
import { validateTeamMetrics } from '../utils/metricsValidator';

const validation = validateTeamMetrics(
  {
    totalAssignments: 84,
    completedAssignments: 3,
    assignedWorkers: 28,
    workerCount: 28,
    complianceRate: 3.6
  },
  {
    teamName: 'TEAM GEO',
    dateRange: '2025-10-10 to 2025-10-12'
  }
);

if (!validation.isValid) {
  console.error('❌ Errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('⚠️ Warnings:', validation.warnings);
}
```

### Validate Date Range
```typescript
import { validateDateRange } from '../utils/metricsValidator';

const validation = validateDateRange('2025-10-10', '2025-10-12');
// Checks format, order, and reasonableness
```

---

## 💡 Pro Tips

1. **Always use DateRangeHandler for timezone conversion**
   - Consistent behavior across the app
   - Handles edge cases automatically

2. **Replace magic numbers with constants**
   - Makes future adjustments easier
   - Self-documenting code

3. **Add validation in development mode**
   - Catches issues early
   - Can be disabled in production if needed

4. **Log validation warnings**
   - Helps identify data quality issues
   - Useful for debugging

