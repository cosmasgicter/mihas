import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'

import { Input } from '@/components/ui/Input'
import { ProfileCompletionBadge } from '@/components/ui/ProfileAutoPopulationIndicator'

import type { WizardFormData } from '../types'

interface BasicKycStepProps {
  form: UseFormReturn<WizardFormData>
  hasAutoPopulatedData: boolean
  completionPercentage: number
  selectedProgram?: WizardFormData['program']
  title: string
}

const BasicKycStep = ({
  form,
  hasAutoPopulatedData,
  completionPercentage,
  selectedProgram,
  title
}: BasicKycStepProps) => {
  const {
    register,
    formState: { errors }
  } = form

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg shadow-lg p-6 border border-gray-100"
      data-testid="basic-kyc-step"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {hasAutoPopulatedData && (
          <ProfileCompletionBadge completionPercentage={completionPercentage} />
        )}
      </div>

      {hasAutoPopulatedData && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <div className="flex items-center space-x-2 text-sm text-green-800">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Profile data automatically populated</span>
          </div>
          <p className="text-xs text-green-700 mt-1">
            Some fields have been pre-filled from your profile. Please review and update as needed.
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <Input
            {...register('full_name')}
            label="Full Name"
            error={errors.full_name?.message}
            required
          />
        </div>

        <div>
          <Input
            {...register('nrc_number')}
            label="NRC Number"
            error={errors.nrc_number?.message}
            helperText="Provide either NRC or Passport (one is sufficient)"
          />
        </div>

        <div>
          <Input
            {...register('passport_number')}
            label="Passport Number"
            error={errors.passport_number?.message}
            helperText="Provide either NRC or Passport (one is sufficient)"
          />
        </div>

        <div>
          <Input
            type="date"
            {...register('date_of_birth')}
            label="Date of Birth"
            error={errors.date_of_birth?.message}
            required
          />
        </div>

        <div>
          <label htmlFor="sex" className="block text-sm font-medium text-gray-700 mb-1">
            Sex <span className="text-red-500">*</span>
          </label>
          <select
            {...register('sex')}
            id="sex"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {errors.sex && <p className="mt-1 text-sm text-red-600">{errors.sex.message}</p>}
        </div>

        <div>
          <Input
            {...register('phone')}
            label="Phone Number"
            error={errors.phone?.message}
            required
          />
        </div>

        <div>
          <Input
            type="email"
            {...register('email')}
            label="Email Address"
            error={errors.email?.message}
            required
          />
        </div>

        <div>
          <Input
            {...register('residence_town')}
            label="Residence Town"
            error={errors.residence_town?.message}
            required
          />
        </div>

        <div>
          <Input
            {...register('next_of_kin_name')}
            label="Next of Kin Name (Optional)"
            error={errors.next_of_kin_name?.message}
          />
        </div>

        <div>
          <Input
            {...register('next_of_kin_phone')}
            label="Next of Kin Phone (Optional)"
            error={errors.next_of_kin_phone?.message}
          />
        </div>

        <div>
          <label htmlFor="program" className="block text-sm font-medium text-gray-700 mb-1">
            Program <span className="text-red-500">*</span>
          </label>
          <select
            {...register('program')}
            id="program"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select program</option>
            <option value="Clinical Medicine">Clinical Medicine</option>
            <option value="Environmental Health">Environmental Health</option>
            <option value="Registered Nursing">Registered Nursing</option>
          </select>
          {errors.program && <p className="mt-1 text-sm text-red-600">{errors.program.message}</p>}
        </div>

        <div>
          <label htmlFor="intake" className="block text-sm font-medium text-gray-700 mb-1">
            Intake <span className="text-red-500">*</span>
          </label>
          <select
            {...register('intake')}
            id="intake"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select intake</option>
            <option value="January 2026">January 2026</option>
            <option value="July 2026">July 2026</option>
          </select>
          {errors.intake && <p className="mt-1 text-sm text-red-600">{errors.intake.message}</p>}
        </div>
      </div>

      {selectedProgram && (
        <motion.div
          className="mt-4 p-4 bg-blue-50 rounded-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-sm text-blue-800">
            <strong>Institution:</strong>{' '}
            {['Clinical Medicine', 'Environmental Health'].includes(selectedProgram) ? 'KATC' : 'MIHAS'}
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}

export default BasicKycStep
