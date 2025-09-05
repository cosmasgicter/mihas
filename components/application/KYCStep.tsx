'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const kycSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['Male', 'Female']),
  nationality: z.string().min(1, 'Nationality is required'),
  nrc_number: z.string().min(1, 'NRC number is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Valid email is required'),
  address_line_1: z.string().min(1, 'Address is required'),
  address_line_2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postal_code: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_relationship: z.string().optional(),
})

type KYCData = z.infer<typeof kycSchema>

type Application = {
  id: string
  user_id: string
  institution: 'MIHAS' | 'KATC'
  program: 'Nursing' | 'Clinical Medicine' | 'Environmental Health'
  status: string
  kyc_id: string | null
}

interface KYCStepProps {
  application: Application
  onComplete: () => void
  onNext: () => void
}

const zambianProvinces = [
  'Central', 'Copperbelt', 'Eastern', 'Luapula', 'Lusaka',
  'Muchinga', 'Northern', 'North-Western', 'Southern', 'Western'
]

export default function KYCStep({ application, onComplete, onNext }: KYCStepProps) {
  const [loading, setLoading] = useState(false)
  const [existingKYC, setExistingKYC] = useState<any>(null)
  const supabase = createSupabaseBrowserClient()

  const form = useForm<KYCData>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      first_name: '',
      middle_name: '',
      last_name: '',
      date_of_birth: '',
      gender: undefined,
      nationality: 'Zambian',
      nrc_number: '',
      phone_number: '',
      email: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      province: undefined,
      postal_code: '',
      guardian_name: '',
      guardian_phone: '',
      guardian_relationship: '',
    },
  })

  useEffect(() => {
    if (application.kyc_id) {
      fetchExistingKYC()
    }
  }, [application.kyc_id])

  const fetchExistingKYC = async () => {
    try {
      const { data, error } = await supabase
        .from('kyc')
        .select('*')
        .eq('application_id', application.id)
        .single()

      if (error) throw error
      
      if (data) {
        setExistingKYC(data)
        // Populate form with existing data
        Object.keys(data).forEach((key) => {
          if (key !== 'id' && key !== 'application_id' && key !== 'created_at' && key !== 'updated_at') {
            form.setValue(key as keyof KYCData, data[key] || '')
          }
        })
      }
    } catch (error: any) {
      console.error('Error fetching KYC data:', error)
    }
  }

  const onSubmit = async (data: KYCData) => {
    setLoading(true)

    try {
      if (existingKYC) {
        // Update existing KYC record
        const { error } = await supabase
          .from('kyc')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingKYC.id)

        if (error) throw error
      } else {
        // Create new KYC record
        const { data: kycData, error } = await supabase
          .from('kyc')
          .insert({
            application_id: application.id,
            ...data,
          })
          .select()
          .single()

        if (error) throw error

        // Update application with KYC ID
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            kyc_id: kycData.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', application.id)

        if (updateError) throw updateError
        
        setExistingKYC(kycData)
      }

      toast.success('Personal information saved successfully!')
      onComplete()
      onNext()
    } catch (error: any) {
      console.error('Error saving KYC data:', error)
      toast.error('Failed to save personal information')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information (KYC)</CardTitle>
        <p className="text-sm text-gray-600">
          Please provide accurate personal information as it appears on your official documents.
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Personal Details</h3>
              
              <div className="grid md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="middle_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Middle Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter middle name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nationality *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter nationality" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nrc_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NRC Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 123456/78/9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., +260 XX XXXXXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address Information */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
              
              <FormField
                control={form.control}
                name="address_line_1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1 *</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address, P.O. Box, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address_line_2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input placeholder="Apartment, suite, etc. (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select province" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {zambianProvinces.map((province) => (
                            <SelectItem key={province} value={province}>
                              {province}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter postal code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Guardian Information */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-medium text-gray-900">Guardian Information</h3>
              <p className="text-sm text-gray-600">If you are under 21 or require a guardian contact</p>
              
              <div className="grid md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="guardian_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guardian Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter guardian name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="guardian_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guardian Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter guardian phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="guardian_relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Father, Mother, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Save & Continue</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}