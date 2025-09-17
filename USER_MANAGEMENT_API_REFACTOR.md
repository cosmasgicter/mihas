# User Management API Refactor

## Overview
Successfully implemented admin-guarded user management APIs and refactored the frontend to use these services instead of direct Supabase calls.

## Changes Made

### 1. Admin-Guarded API Handlers

#### `/api/admin/users/index.js`
- **GET**: Lists all users (admin-only)
- **POST**: Creates new users with auth account and profile (admin-only)
- Uses `supabaseAdminClient` with elevated privileges
- Includes role validation via `requireUser({ requireAdmin: true })`

#### `/api/admin/users/[id].js`
- **GET**: Retrieves specific user by ID (admin-only)
- **PUT**: Updates user profile information (admin-only)
- **DELETE**: Soft deletes user by setting `deleted_at` timestamp (admin-only)
- Proper error handling and validation

### 2. Service Layer Updates

#### `src/services/apiClient.ts`
Added `userService` with methods:
- `list()`: Fetch all users
- `create(data)`: Create new user
- `update(id, data)`: Update user
- `remove(id)`: Delete user

#### `src/hooks/useApiServices.ts`
Added React Query hooks:
- `useUsers()`: Query hook for fetching users
- `useCreateUser()`: Mutation hook for creating users
- `useUpdateUser()`: Mutation hook for updating users
- `useDeleteUser()`: Mutation hook for deleting users

### 3. Frontend Refactoring

#### `src/pages/admin/Users.tsx`
- Removed direct Supabase imports and calls
- Replaced with new API service hooks
- Simplified state management (removed `updating` state)
- Maintained all existing functionality
- Improved error handling through React Query

#### `src/hooks/useUserManagement.ts`
- Refactored to use `userService` instead of direct Supabase calls
- Maintained backward compatibility
- Simplified implementation

## Security Improvements

1. **Admin Role Validation**: All user management operations require admin privileges
2. **Server-Side Operations**: User creation/deletion now uses admin client with elevated privileges
3. **Centralized Authentication**: All requests go through `requireUser` middleware
4. **Soft Deletes**: Users are soft-deleted instead of hard-deleted for audit trails

## API Endpoints

```
GET    /api/admin/users          # List all users
POST   /api/admin/users          # Create new user
GET    /api/admin/users/[id]     # Get user by ID
PUT    /api/admin/users/[id]     # Update user
DELETE /api/admin/users/[id]     # Soft delete user
```

## Request/Response Format

### Create User Request
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe",
  "phone": "+260123456789",
  "role": "student"
}
```

### Update User Request
```json
{
  "full_name": "John Smith",
  "email": "john.smith@example.com",
  "phone": "+260987654321",
  "role": "admissions_officer"
}
```

### Response Format
```json
{
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": "+260123456789",
    "role": "student",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

## Testing

A test script `test-user-api.js` has been created to verify the API endpoints. To run:

```bash
# Set admin token (get from browser after admin login)
export TEST_ADMIN_TOKEN="your_admin_jwt_token"

# Run tests
node test-user-api.js
```

## Benefits

1. **Security**: Admin-only operations with proper role validation
2. **Consistency**: Centralized user management through API layer
3. **Maintainability**: Single source of truth for user operations
4. **Performance**: React Query caching and optimistic updates
5. **Error Handling**: Improved error handling and user feedback
6. **Audit Trail**: Soft deletes maintain data integrity

## Migration Notes

- All existing functionality preserved
- No breaking changes to UI/UX
- Direct Supabase calls replaced with API services
- Improved loading states and error handling
- Better separation of concerns

## Next Steps

1. Add user permissions management API
2. Implement user activity logging API
3. Add bulk operations API endpoints
4. Create user import/export API endpoints
5. Add user search and filtering API