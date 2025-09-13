# Supabase Optimization & Error Handling Implementation Guide

## Overview
This implementation provides comprehensive database optimization, error handling, and recovery procedures for your MIHAS application system.

## 🚀 Quick Setup

### 1. Database Schema Setup
Run the following SQL files in your Supabase SQL editor:

```bash
# 1. First, run the optimization schema
supabase_optimization.sql

# 2. Then, run the error handling schema
error_handling_schema.sql
```

### 2. Frontend Integration
The following files have been created for frontend integration:

- `src/lib/errorHandling.ts` - Core error handling utilities
- `src/lib/databaseOptimization.ts` - Database optimization services
- `src/hooks/useErrorHandling.ts` - React hook for error handling
- `src/components/admin/DatabaseMonitoring.tsx` - Admin monitoring dashboard

## 📊 Features Implemented

### Database Optimization
- **Performance Indexing**: Comprehensive indexes on all frequently queried columns
- **Query Optimization**: Optimized views for common queries
- **Data Archiving**: Automatic archiving of old applications
- **Maintenance Scheduling**: Automated database maintenance tasks

### Error Handling & Recovery
- **Comprehensive Logging**: All errors logged with context and recovery attempts
- **Automatic Recovery**: Smart recovery for common database errors
- **Transaction Rollback**: Safe transaction management with rollback capability
- **Data Validation**: Database-level validation for data integrity

### Monitoring & Alerting
- **Health Metrics**: Real-time database health monitoring
- **Performance Tracking**: Application processing metrics
- **Error Statistics**: Detailed error analysis and recovery rates
- **Integrity Checking**: Automated data integrity verification

## 🔧 Usage Examples

### Using Error Handling in Components

```tsx
import { useErrorHandling } from '@/hooks/useErrorHandling'

function MyComponent() {
  const { executeWithErrorHandling, errorState } = useErrorHandling()

  const handleSubmit = async (data) => {
    const result = await executeWithErrorHandling(
      async () => {
        // Your database operation
        const { data, error } = await supabase
          .from('applications_new')
          .insert(data)
        if (error) throw error
        return data
      },
      'create_application',
      {
        maxRetries: 3,
        rollbackOperation: async () => {
          // Cleanup operation if needed
        }
      }
    )

    if (result) {
      // Success handling
    }
  }

  return (
    <div>
      {errorState.hasError && (
        <div className="error">
          Error: {errorState.error?.message}
          {errorState.canRetry && (
            <button onClick={retryLastOperation}>Retry</button>
          )}
        </div>
      )}
      {/* Your component content */}
    </div>
  )
}
```

### Database Operations with Safe Execution

```tsx
import { safeDbOperation } from '@/lib/errorHandling'
import { DatabaseOptimizer } from '@/lib/databaseOptimization'

// Safe database operation
const createApplication = async (applicationData) => {
  return safeDbOperation(
    async () => {
      const { data, error } = await supabase
        .from('applications_new')
        .insert(applicationData)
      if (error) throw error
      return data
    },
    'create_application',
    applicationData
  )
}

// Performance monitoring
const checkPerformance = async () => {
  const metrics = await DatabaseOptimizer.getSystemPerformance()
  console.log('System performance:', metrics)
}
```

## 🛠 Admin Dashboard Integration

Add the monitoring dashboard to your admin routes:

```tsx
// In your admin routing
import DatabaseMonitoring from '@/components/admin/DatabaseMonitoring'

// Add route
<Route path="/admin/monitoring" element={<DatabaseMonitoring />} />
```

## 📈 Monitoring Features

### Health Metrics Tracked
- Applications table size and row count
- Pending applications count
- System performance indicators
- Error rates and recovery statistics

### Automated Maintenance
- **Daily**: Cleanup old draft applications (30+ days)
- **Weekly**: Database vacuum and analyze operations
- **Monthly**: Archive completed applications (2+ years old)

### Data Integrity Checks
- Missing tracking codes (auto-repair)
- Orphaned documents (auto-cleanup)
- Invalid email formats (flagged for review)
- Missing application numbers (auto-generate)

## 🔒 Security Features

### Row Level Security (RLS)
All new tables have RLS enabled with appropriate policies:
- Admins can access all monitoring data
- Users can only access their own error logs
- System operations are properly secured

### Data Validation
Database-level constraints ensure:
- Valid email formats
- Proper Zambian phone number formats
- Correct NRC number patterns
- Required field validation

## 🚨 Error Recovery Procedures

### Automatic Recovery
The system automatically attempts recovery for:
- **Unique constraint violations**: Generates new unique values
- **Missing references**: Creates default records where safe
- **Transaction failures**: Automatic rollback and retry

### Manual Recovery
For complex issues, use the admin dashboard to:
- View detailed error logs
- Check data integrity
- Run manual maintenance
- Archive old data

## 📊 Performance Optimization

### Indexing Strategy
- Primary indexes on frequently queried columns
- Composite indexes for complex queries
- Partial indexes for conditional queries
- Regular index maintenance

### Query Optimization
- Materialized views for complex aggregations
- Optimized joins and subqueries
- Efficient pagination strategies
- Connection pooling optimization

## 🔄 Backup & Recovery

### Backup Procedures
```sql
-- Create backup record
SELECT create_backup_record('full', 'applications_new');

-- Update backup status
SELECT update_backup_status('backup_id', 'completed');
```

### Recovery Procedures
- Point-in-time recovery capabilities
- Table-level restoration
- Data integrity verification post-recovery
- Automated backup validation

## 📋 Maintenance Checklist

### Daily
- [ ] Check error logs for critical issues
- [ ] Monitor application processing metrics
- [ ] Verify backup completion

### Weekly
- [ ] Run database maintenance
- [ ] Review performance metrics
- [ ] Check data integrity

### Monthly
- [ ] Archive old applications
- [ ] Review and optimize queries
- [ ] Update monitoring thresholds

## 🎯 Best Practices

### Error Handling
1. Always use `executeWithErrorHandling` for database operations
2. Provide meaningful operation names for logging
3. Implement appropriate rollback operations
4. Set reasonable retry limits

### Performance
1. Use indexes appropriately
2. Monitor query performance regularly
3. Archive old data proactively
4. Optimize based on usage patterns

### Security
1. Validate all input at database level
2. Use RLS policies consistently
3. Log security-related errors
4. Regular security audits

## 🔧 Troubleshooting

### Common Issues

**High Error Rates**
- Check error statistics in admin dashboard
- Review recent code changes
- Verify database connectivity

**Performance Degradation**
- Run database maintenance
- Check for missing indexes
- Review slow query logs

**Data Integrity Issues**
- Run integrity check function
- Review validation constraints
- Check for orphaned records

### Support Functions

```sql
-- Check database health
SELECT * FROM check_database_health();

-- Get error statistics
SELECT * FROM get_error_statistics(24);

-- Check data integrity
SELECT * FROM check_data_integrity();

-- Run maintenance
SELECT perform_maintenance();
```

## 📞 Support

For issues or questions:
1. Check the error logs in the admin dashboard
2. Review the monitoring metrics
3. Run the integrity check functions
4. Contact the development team with specific error codes

---

This implementation provides a robust foundation for database optimization and error handling. Regular monitoring and maintenance will ensure optimal performance and reliability of your application system.