import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
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

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-secondary">System Settings</h1>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-4 mb-6">
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : (
          <form onSubmit={saveSettings} className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-secondary mb-4">Site Branding</h2>
              <div className="grid grid-cols-1 gap-6">
                <Input
                  label="Site Name"
                  name="site_name"
                  value={form.site_name}
                  onChange={handleChange}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Primary Color"
                    type="color"
                    name="primary_color"
                    value={form.primary_color}
                    onChange={handleChange}
                  />
                  <Input
                    label="Secondary Color"
                    type="color"
                    name="secondary_color"
                    value={form.secondary_color}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-secondary mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 gap-6">
                <Input
                  label="Contact Email"
                  type="email"
                  name="contact_email"
                  value={form.contact_email}
                  onChange={handleChange}
                />
                <Input
                  label="Contact Phone"
                  type="tel"
                  name="contact_phone"
                  value={form.contact_phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                Save Settings
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}