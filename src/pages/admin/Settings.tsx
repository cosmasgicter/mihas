import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface SettingsForm {
  site_name: string
  primary_color: string
  secondary_color: string
  contact_email: string
  contact_phone: string
}

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
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const keys = ['site_name', 'primary_color', 'secondary_color', 'contact_email', 'contact_phone']
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', keys)
      if (error) throw error
      const values: any = {}
      data?.forEach((s: any) => {
        values[s.setting_key] = s.setting_value || ''
      })
      setForm((f) => ({ ...f, ...values }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h1>

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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Site Branding</h2>
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
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