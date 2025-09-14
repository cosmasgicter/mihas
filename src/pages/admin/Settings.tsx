import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AdminNavigation } from '@/components/ui/AdminNavigation'
import { ArrowLeft } from 'lucide-react'

interface SettingsForm {
  site_name: string
  primary_color: string
  secondary_color: string
  contact_email: string
  contact_phone: string
}

interface SystemSetting {
  setting_key: string
  setting_value: string
}

const SETTING_KEYS = ['site_name', 'primary_color', 'secondary_color', 'contact_email', 'contact_phone'] as const

export default function AdminSettings() {
  const [form, setForm] = useState<SettingsForm>({
    site_name: '',
    primary_color: '#000000',
    secondary_color: '#ffffff',
    contact_email: '',
    contact_phone: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', SETTING_KEYS)
      if (error) throw error
      const values = settings?.reduce((acc: Partial<SettingsForm>, setting: SystemSetting) => {
        acc[setting.setting_key as keyof SettingsForm] = setting.setting_value || ''
        return acc
      }, {}) || {}
      setForm((prevForm) => ({ ...prevForm, ...values }))
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target
    setForm((prevForm) => ({ ...prevForm, [name]: value }))
  }

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      const updates = Object.entries(form).map(([key, value]) => ({
        setting_key: key,
        setting_value: value
      }))
      const { error } = await supabase
        .from('system_settings')
        .upsert(updates)
      if (error) throw error
      setSuccess('Settings updated successfully!')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <AdminNavigation />
      <div className="container-mobile py-4 sm:py-6 lg:py-8 safe-area-bottom">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header - Mobile First */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 border-white/30">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">⚙️ System Settings</h1>
                  <p className="text-white/90 text-sm sm:text-base">Configure system preferences</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-6 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="text-4xl">😱</div>
                  <div className="text-red-700 font-medium">{error}</div>
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-xl bg-green-50 border border-green-200 p-6 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="text-4xl">✅</div>
                  <div className="text-green-700 font-medium">{success}</div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="text-center">
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-lg text-gray-600">Loading settings...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={saveSettings} className="space-y-8">
                {/* Site Branding Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    🎨 Site Branding
                  </h2>
                  <div className="space-y-6">
                    <Input
                      label="Site Name"
                      name="site_name"
                      value={form.site_name}
                      onChange={handleChange}
                      className="form-input-mobile"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Primary Color"
                          type="color"
                          name="primary_color"
                          value={form.primary_color}
                          onChange={handleChange}
                          className="h-12"
                        />
                        <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: form.primary_color }}>
                          <span className="text-white text-sm font-medium">Primary Color Preview</span>
                        </div>
                      </div>
                      <div>
                        <Input
                          label="Secondary Color"
                          type="color"
                          name="secondary_color"
                          value={form.secondary_color}
                          onChange={handleChange}
                          className="h-12"
                        />
                        <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: form.secondary_color }}>
                          <span className="text-white text-sm font-medium">Secondary Color Preview</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    📞 Contact Information
                  </h2>
                  <div className="space-y-6">
                    <Input
                      label="Contact Email"
                      type="email"
                      name="contact_email"
                      value={form.contact_email}
                      onChange={handleChange}
                      className="form-input-mobile"
                      placeholder="admin@mihas-katc.edu.zm"
                    />
                    <Input
                      label="Contact Phone"
                      type="tel"
                      name="contact_phone"
                      value={form.contact_phone}
                      onChange={handleChange}
                      className="form-input-mobile"
                      placeholder="+260 XXX XXX XXX"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={loadSettings}
                    className="btn-responsive"
                  >
                    Reset Changes
                  </Button>
                  <Button 
                    type="submit" 
                    loading={saving}
                    className="btn-responsive bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}