import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../hooks/use-toast'
import { User, Mail, Phone, Calendar, MapPin, Edit, Save, X, Camera, Download, AlertTriangle } from 'lucide-react'

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    date_of_birth: user?.date_of_birth || '',
    gender: user?.gender || '',
    nationality: user?.nationality || '',
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      province: user?.address?.province || '',
      postalCode: user?.address?.postalCode || ''
    },
    emergency_contact: {
      name: user?.emergency_contact?.name || '',
      relationship: user?.emergency_contact?.relationship || '',
      phone: user?.emergency_contact?.phone || ''
    }
  })
  
  const updateFormData = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => {
        const parentData = prev[parent as keyof typeof prev] as any
        return {
          ...prev,
          [parent]: {
            ...parentData,
            [child]: value
          }
        }
      })
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }
  
  const handleSave = async () => {
    setSaving(true)
    
    try {
      await updateProfile({
        name: formData.name,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender as 'Male' | 'Female' | 'Other',
        nationality: formData.nationality,
        address: formData.address,
        emergency_contact: formData.emergency_contact
      })
      
      setIsEditing(false)
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.'
      })
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update profile',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }
  
  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      date_of_birth: user?.date_of_birth || '',
      gender: user?.gender || '',
      nationality: user?.nationality || '',
      address: {
        street: user?.address?.street || '',
        city: user?.address?.city || '',
        province: user?.address?.province || '',
        postalCode: user?.address?.postalCode || ''
      },
      emergency_contact: {
        name: user?.emergency_contact?.name || '',
        relationship: user?.emergency_contact?.relationship || '',
        phone: user?.emergency_contact?.phone || ''
      }
    })
    setIsEditing(false)
  }
  
  const downloadData = () => {
    const data = {
      user_profile: user,
      export_date: new Date().toISOString(),
      export_type: 'user_data'
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mihas_profile_${user?.id}_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: 'Data Downloaded',
      description: 'Your profile data has been downloaded successfully.'
    })
  }
  
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your personal information and account settings
          </p>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button onClick={handleCancel} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>
      
      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Summary */}
        <Card>
          <CardHeader className="text-center">
            <div className="relative mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              {user?.profile_image_url ? (
                <img 
                  src={user.profile_image_url} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-blue-600" />
              )}
              <button className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                <Camera className="w-3 h-3 text-white" />
              </button>
            </div>
            <CardTitle>{user?.name}</CardTitle>
            <CardDescription className="capitalize">
              {user?.role?.replace('_', ' ')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{user?.email}</span>
            </div>
            {user?.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{user.phone}</span>
              </div>
            )}
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                Member since {new Date(user?.created_at || '').toLocaleDateString()}
              </span>
            </div>
            
            <div className="pt-4 border-t">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {user?.is_active ? 'Active Account' : 'Inactive Account'}
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Personal Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-gray-900">{user?.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <p className="text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <p className="text-gray-900">{user?.phone || 'Not provided'}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                {isEditing ? (
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => updateFormData('date_of_birth', e.target.value)}
                  />
                ) : (
                  <p className="text-gray-900">
                    {user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'Not provided'}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                {isEditing ? (
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => updateFormData('gender', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{user?.gender || 'Not provided'}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                {isEditing ? (
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => updateFormData('nationality', e.target.value)}
                    placeholder="Enter your nationality"
                  />
                ) : (
                  <p className="text-gray-900">{user?.nationality || 'Not provided'}</p>
                )}
              </div>
            </div>
            
            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  {isEditing ? (
                    <Input
                      id="street"
                      value={formData.address.street}
                      onChange={(e) => updateFormData('address.street', e.target.value)}
                      placeholder="Enter street address"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.address?.street || 'Not provided'}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city">City/Town</Label>
                  {isEditing ? (
                    <Input
                      id="city"
                      value={formData.address.city}
                      onChange={(e) => updateFormData('address.city', e.target.value)}
                      placeholder="Enter city or town"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.address?.city || 'Not provided'}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  {isEditing ? (
                    <Input
                      id="province"
                      value={formData.address.province}
                      onChange={(e) => updateFormData('address.province', e.target.value)}
                      placeholder="Enter province"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.address?.province || 'Not provided'}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  {isEditing ? (
                    <Input
                      id="postalCode"
                      value={formData.address.postalCode}
                      onChange={(e) => updateFormData('address.postalCode', e.target.value)}
                      placeholder="Enter postal code"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.address?.postalCode || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Emergency Contact Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_name">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="emergency_name"
                      value={formData.emergency_contact.name}
                      onChange={(e) => updateFormData('emergency_contact.name', e.target.value)}
                      placeholder="Emergency contact name"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.emergency_contact?.name || 'Not provided'}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emergency_relationship">Relationship</Label>
                  {isEditing ? (
                    <Input
                      id="emergency_relationship"
                      value={formData.emergency_contact.relationship}
                      onChange={(e) => updateFormData('emergency_contact.relationship', e.target.value)}
                      placeholder="e.g., Parent, Sibling"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.emergency_contact?.relationship || 'Not provided'}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="emergency_phone"
                      value={formData.emergency_contact.phone}
                      onChange={(e) => updateFormData('emergency_contact.phone', e.target.value)}
                      placeholder="Emergency contact phone"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.emergency_contact?.phone || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Manage your account preferences and security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Status
              </label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {user?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student ID
              </label>
              <p className="text-gray-900">{user?.student_id || 'Not assigned'}</p>
            </div>
            
            {user?.employee_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID
                </label>
                <p className="text-gray-900">{user.employee_id}</p>
              </div>
            )}
          </div>
          
          <div className="pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-4">
              <Button variant="outline">
                Change Password
              </Button>
              <Button variant="outline" onClick={downloadData}>
                <Download className="w-4 h-4 mr-2" />
                Download Data
              </Button>
              <Button variant="destructive">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Deactivate Account
              </Button>
            </div>
            
            <Alert className="mt-4">
              <AlertDescription>
                Need to update your password or have security concerns? Contact our support team at{' '}
                <a href="mailto:support@mihas.edu.zm" className="text-blue-600 hover:underline">
                  support@mihas.edu.zm
                </a>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProfilePage