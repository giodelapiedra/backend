# ⚡ BACKEND OPTIMIZATION CHECKLIST

## Performance Optimization Roadmap

### 🎯 Priority 1: High Impact (This Week)

#### 1. Implement Redis Caching
- [ ] Install Redis: `npm install redis ioredis`
- [ ] Create Redis client configuration
- [ ] Add caching middleware
- [ ] Cache frequent queries:
  - [ ] Team analytics (TTL: 15 min)
  - [ ] Shift types (TTL: 1 hour)
  - [ ] Team leader lists (TTL: 30 min)
  - [ ] User session data (TTL: 5 min)

**Implementation:**
```javascript
// backend/config/redis.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

redis.on('error', (err) => logger.error('Redis error:', err));
redis.on('connect', () => logger.info('Redis connected'));

module.exports = redis;
```

#### 2. Add Database Indexes
- [ ] Analyze slow queries
- [ ] Create indexes for common filters
- [ ] Test query performance before/after

**Run this SQL:**
```sql
-- Work readiness assignments indexes
CREATE INDEX IF NOT EXISTS idx_wra_team_leader_date 
  ON work_readiness_assignments(team_leader_id, assigned_date DESC);

CREATE INDEX IF NOT EXISTS idx_wra_worker_date 
  ON work_readiness_assignments(worker_id, assigned_date DESC);

CREATE INDEX IF NOT EXISTS idx_wra_status_due_time 
  ON work_readiness_assignments(status, due_time) 
  WHERE status = 'pending';

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_role_team 
  ON users(role, team) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_users_team_leader 
  ON users(team_leader_id) WHERE role = 'worker';

-- Work readiness indexes
CREATE INDEX IF NOT EXISTS idx_wr_worker_submitted 
  ON work_readiness(worker_id, submitted_at DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notif_recipient_unread 
  ON notifications(recipient_id, created_at DESC) 
  WHERE is_read = false;
```

#### 3. Add Response Compression
- [ ] Install compression: `npm install compression`
- [ ] Add to server.js
- [ ] Configure compression levels
- [ ] Test response sizes

**Implementation:**
```javascript
// backend/server.js
const compression = require('compression');

app.use(compression({
  level: 6, // Balance between speed and compression
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

#### 4. Implement Query Result Caching
- [ ] Create cache helper functions
- [ ] Add cache invalidation logic
- [ ] Implement cache warming
- [ ] Monitor cache hit rates

---

### 🚀 Priority 2: Medium Impact (This Month)

#### 5. Add Request Size Limits
- [ ] Configure body parser limits
- [ ] Add file upload limits
- [ ] Implement request validation

**Implementation:**
```javascript
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 10000
}));
```

#### 6. Optimize Large Data Queries
- [ ] Add cursor-based pagination
- [ ] Implement streaming for large datasets
- [ ] Add query result limits

**Cursor Pagination:**
```javascript
// Instead of offset-based pagination
// Use cursor-based for better performance

async function getPaginatedAssignments(cursor, limit = 50) {
  let query = supabase
    .from('work_readiness_assignments')
    .select('*')
    .limit(limit)
    .order('created_at', { ascending: false });

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  
  return {
    data,
    nextCursor: data.length > 0 ? data[data.length - 1].created_at : null,
    hasMore: data.length === limit
  };
}
```

#### 7. Add APM Monitoring
- [ ] Choose APM tool (NewRelic, DataDog, Sentry)
- [ ] Install and configure
- [ ] Set up alerts
- [ ] Create performance dashboards

**NewRelic Setup:**
```bash
npm install newrelic

# Create newrelic.js config
cp node_modules/newrelic/newrelic.js .
# Edit and add your license key
```

#### 8. Implement Connection Pooling
- [ ] Monitor Supabase connections
- [ ] Add connection health checks
- [ ] Implement retry logic

---

### 💡 Priority 3: Nice to Have (Next Quarter)

#### 9. Add Request Coalescing
- [ ] Batch similar requests
- [ ] Implement DataLoader pattern
- [ ] Reduce N+1 query problems

#### 10. Implement Worker Threads
- [ ] Identify CPU-intensive operations
- [ ] Move to worker threads
- [ ] Add thread pool management

#### 11. Add GraphQL Layer
- [ ] Install Apollo Server
- [ ] Create GraphQL schemas
- [ ] Implement resolvers
- [ ] Add DataLoader caching

#### 12. Implement WebSocket for Real-time
- [ ] Set up Socket.IO server
- [ ] Add real-time notifications
- [ ] Implement presence tracking
- [ ] Add room-based broadcasts

---

## 📊 Performance Metrics to Track

### Response Time Targets:
- [ ] Average response time: < 200ms
- [ ] 95th percentile: < 500ms
- [ ] 99th percentile: < 1000ms
- [ ] Database queries: < 100ms

### Resource Usage Targets:
- [ ] Memory usage: < 512MB average
- [ ] CPU usage: < 50% average
- [ ] Database connections: < 20
- [ ] Cache hit rate: > 80%

### Monitoring Setup:
```javascript
// backend/middleware/monitoring.js
const monitoring = require('./utils/monitoring');

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    monitoring.recordMetric('api.response_time', duration, {
      method: req.method,
      path: req.path,
      status: res.statusCode
    });
    
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration,
        userId: req.user?.id
      });
    }
  });
  
  next();
});
```

---

## 🔧 Database Optimization

### Query Optimization Checklist:
- [ ] Use `select()` to specify only needed columns
- [ ] Add database-level filtering (not app-level)
- [ ] Use `.single()` for single-record queries
- [ ] Implement query result caching
- [ ] Add database indexes for frequently queried columns
- [ ] Use `.maybeSingle()` to avoid errors on empty results

**Before (Slow):**
```javascript
// ❌ Fetches all columns, filters in app
const { data: all } = await supabase.from('users').select('*');
const workers = all.filter(u => u.role === 'worker');
```

**After (Fast):**
```javascript
// ✅ Database-level filtering, only needed columns
const { data: workers } = await supabase
  .from('users')
  .select('id, first_name, last_name, team')
  .eq('role', 'worker')
  .eq('is_active', true);
```

---

## 🎯 API Optimization

### Best Practices:
- [ ] Implement field projection (allow clients to request specific fields)
- [ ] Add batch endpoints for multiple operations
- [ ] Use ETags for caching
- [ ] Implement conditional requests (If-Modified-Since)
- [ ] Add response compression
- [ ] Paginate all list endpoints

**Field Projection Example:**
```javascript
// GET /api/users?fields=id,first_name,last_name,email

const fields = req.query.fields?.split(',') || ['*'];
const { data } = await supabase
  .from('users')
  .select(fields.join(','));
```

---

## 📈 Caching Strategy

### What to Cache:
1. **Static Data** (1 hour - 1 day TTL)
   - Shift types
   - Team lists
   - System configurations

2. **User Data** (5-15 min TTL)
   - User profiles
   - Team memberships
   - User permissions

3. **Analytics** (15-30 min TTL)
   - Team performance metrics
   - Dashboard statistics
   - Trend data

4. **Query Results** (1-5 min TTL)
   - Assignment lists
   - Work readiness records
   - Recent notifications

### Cache Invalidation Strategy:
```javascript
// Invalidate cache on data modification
async function createAssignment(data) {
  const assignment = await supabaseAdmin
    .from('work_readiness_assignments')
    .insert(data)
    .select()
    .single();
  
  // Invalidate related caches
  await redis.del(`assignments:team_leader:${data.team_leader_id}`);
  await redis.del(`assignments:worker:${data.worker_id}`);
  await redis.del(`stats:team_leader:${data.team_leader_id}`);
  
  return assignment;
}
```

---

## ⚡ Load Testing

### Tools to Use:
- [ ] **Artillery** - Modern load testing
- [ ] **K6** - Developer-friendly load testing
- [ ] **Apache JMeter** - Comprehensive testing

### Load Test Scenarios:
```yaml
# load-test.yml (Artillery)
config:
  target: 'http://localhost:5001'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up"
    - duration: 180
      arrivalRate: 100
      name: "Sustained load"

scenarios:
  - name: "Get assignments"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "teamleader@test.com"
            password: "password"
          capture:
            - json: "$.token"
              as: "authToken"
      - get:
          url: "/api/work-readiness-assignments"
          headers:
            Authorization: "Bearer {{ authToken }}"
```

**Run load test:**
```bash
npm install -g artillery
artillery run load-test.yml
```

---

## 🔍 Monitoring & Alerts

### Key Metrics to Monitor:
- [ ] Response times (avg, p95, p99)
- [ ] Error rates
- [ ] Memory usage
- [ ] CPU usage
- [ ] Database query times
- [ ] Cache hit rates
- [ ] Active connections

### Alert Thresholds:
```javascript
const alerts = {
  responseTime: {
    warning: 500,  // ms
    critical: 1000 // ms
  },
  errorRate: {
    warning: 0.01,  // 1%
    critical: 0.05  // 5%
  },
  memoryUsage: {
    warning: 0.8,  // 80%
    critical: 0.9  // 90%
  }
};
```

---

## ✅ Optimization Completed Checklist

### Done (Already Implemented):
- ✅ Database-level filtering (90% faster)
- ✅ Memory monitoring and GC
- ✅ Rate limiting
- ✅ Security headers
- ✅ Structured logging
- ✅ UUID validation
- ✅ Graceful shutdown handling
- ✅ Environment validation

### To Do:
- [ ] Redis caching layer
- [ ] Database indexes
- [ ] Response compression
- [ ] APM monitoring
- [ ] Load testing
- [ ] Query result caching
- [ ] Cursor-based pagination
- [ ] Worker threads for heavy operations

---

## 📚 Resources

- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Supabase Performance Tips](https://supabase.com/docs/guides/platform/performance)
- [Redis Caching Strategies](https://redis.io/docs/manual/patterns/)
- [PostgreSQL Indexing](https://www.postgresql.org/docs/current/indexes.html)

---

**Last Updated:** October 9, 2025  
**Next Review:** November 9, 2025

