# Microservices Architecture Implementation

## 🏗️ Architecture Overview

The MIHAS application has been restructured into a serverless microservices architecture using Vercel API routes:

```
/api/
├── auth/           # Authentication Service
├── applications/   # Application Management Service  
├── documents/      # Document Processing Service
├── notifications/  # Notification Service
└── analytics/      # Analytics Service
```

## 🚀 Services

### Authentication Service (`/api/auth/`)
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Application Service (`/api/applications/`)
- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `GET /api/applications/[id]` - Get specific application
- `PUT /api/applications/[id]` - Update application
- `DELETE /api/applications/[id]` - Delete application

### Document Service (`/api/documents/`)
- `POST /api/documents/upload` - Upload documents

### Notification Service (`/api/notifications/`)
- `POST /api/notifications/send` - Send notifications

### Analytics Service (`/api/analytics`)
- `GET /api/analytics?action=metrics` - Get system metrics
- `GET /api/analytics?action=predictive-dashboard` - Predictive analytics overview
- `GET /api/analytics?action=telemetry` - Admin telemetry insights
- `POST /api/analytics?action=telemetry` - Telemetry ingestion endpoint

## 🔧 Usage

### Frontend Integration
```typescript
import { useApplications, useCreateApplication } from '@/hooks/useApiServices'

function ApplicationList() {
  const { data: applications } = useApplications()
  const createApp = useCreateApplication()
  
  return (
    // Component implementation
  )
}
```

### Direct API Usage
```typescript
import { applicationService } from '@/services/apiClient'

const applications = await applicationService.getAll()
const newApp = await applicationService.create(data)
```

## 🚀 Deployment

1. **Install dependencies:**
   ```bash
   npm install @types/node
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Environment Variables:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 📊 Benefits

- **Scalability**: Each service scales independently
- **Maintainability**: Clear separation of concerns
- **Development**: Teams can work on services independently
- **Deployment**: Individual service deployments
- **Monitoring**: Service-level observability

## 🔄 CI/CD Pipeline

The pipeline automatically:
1. Detects changes in specific services
2. Runs tests for affected services
3. Deploys to Vercel on main branch

## 🛠️ Development

```bash
# Start development server
npm run dev

# Test specific service
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```