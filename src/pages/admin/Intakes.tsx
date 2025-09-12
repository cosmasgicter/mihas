import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Intake } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Pencil, Trash2, Plus, ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const intakeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  year: z.coerce.number().int().min(2000, 'Year is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  application_deadline: z.string().min(1, 'Application deadline is required'),
  total_capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  available_spots: z.coerce.number().int().min(0, 'Available spots must be 0 or more'),
})
  .refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
    message: 'Start date must be before end date',
    path: ['end_date'],
  })
  .refine(
    (data) => new Date(data.application_deadline) <= new Date(data.start_date),
    {
      message: 'Deadline must be before start date',
      path: ['application_deadline'],
    },
  )
  .refine((data) => data.available_spots <= data.total_capacity, {
    message: 'Available spots cannot exceed total capacity',
    path: ['available_spots'],
  })

export type IntakeForm = z.infer<typeof intakeSchema>

export default function AdminIntakes() {
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [currentIntake, setCurrentIntake] = useState<Intake | null>(null)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IntakeForm>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      name: '',
      year: new Date().getFullYear(),
      start_date: '',
      end_date: '',
      application_deadline: '',
      total_capacity: 0,
      available_spots: 0,
    },
  })

  useEffect(() => {
    loadIntakes()
  }, [])

  const loadIntakes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('intakes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setIntakes(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    reset({
      name: '',
      year: new Date().getFullYear(),
      start_date: '',
      end_date: '',
      application_deadline: '',
      total_capacity: 0,
      available_spots: 0,
    })
    setShowCreate(true)
  }

  const openEdit = (intake: Intake) => {
    setCurrentIntake(intake)
    reset({
      name: intake.name,
      year: intake.year,
      start_date: intake.start_date,
      end_date: intake.end_date,
      application_deadline: intake.application_deadline,
      total_capacity: intake.total_capacity,
      available_spots: intake.available_spots,
    })
    setShowEdit(true)
  }

  const openDelete = (intake: Intake) => {
    setCurrentIntake(intake)
    setShowDelete(true)
  }

  const handleOperation = async (operation: () => any, onSuccess: () => void) => {
    try {
      setSaving(true)
      setError('')
      const result = await operation()
      if (result.error) throw result.error
      onSuccess()
      await loadIntakes()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const createIntake = (data: IntakeForm) => handleOperation(
    () => supabase.from('intakes').insert({
      name: data.name,
      year: data.year,
      start_date: data.start_date,
      end_date: data.end_date,
      application_deadline: data.application_deadline,
      total_capacity: data.total_capacity,
      available_spots: data.available_spots,
      is_active: true,
    }).select(),
    () => setShowCreate(false)
  )

  const updateIntake = (data: IntakeForm) => {
    if (!currentIntake) return
    handleOperation(
      () => supabase.from('intakes').update({
        name: data.name,
        year: data.year,
        start_date: data.start_date,
        end_date: data.end_date,
        application_deadline: data.application_deadline,
        total_capacity: data.total_capacity,
        available_spots: data.available_spots,
      }).eq('id', currentIntake.id).select(),
      () => {
        setShowEdit(false)
        setCurrentIntake(null)
      }
    )
  }

  const deleteIntake = () => {
    if (!currentIntake) return
    handleOperation(
      () => supabase.from('intakes').delete().eq('id', currentIntake.id).select(),
      () => {
        setShowDelete(false)
        setCurrentIntake(null)
      }
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link to="/admin/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-secondary">Intakes</h1>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Intake
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : intakes.length === 0 ? (
          <p className="text-secondary">No intakes found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Start</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">End</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Spots</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {intakes.map((intake) => (
                  <tr key={intake.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{intake.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{intake.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {new Date(intake.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {new Date(intake.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {new Date(intake.application_deadline).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {intake.total_capacity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {intake.available_spots}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(intake)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => openDelete(intake)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Intake Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Intake</DialogTitle>
            <DialogDescription>Enter intake details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(createIntake)}>
            <div className="space-y-4 py-4">
              <Input label="Name" {...register('name')} error={errors.name?.message} required />
              <Input
                label="Year"
                type="number"
                {...register('year')}
                error={errors.year?.message}
                required
              />
              <Input
                label="Start Date"
                type="date"
                {...register('start_date')}
                error={errors.start_date?.message}
                required
              />
              <Input
                label="End Date"
                type="date"
                {...register('end_date')}
                error={errors.end_date?.message}
                required
              />
              <Input
                label="Application Deadline"
                type="date"
                {...register('application_deadline')}
                error={errors.application_deadline?.message}
                required
              />
              <Input
                label="Total Capacity"
                type="number"
                {...register('total_capacity')}
                error={errors.total_capacity?.message}
                required
              />
              <Input
                label="Available Spots"
                type="number"
                {...register('available_spots')}
                error={errors.available_spots?.message}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Intake Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Intake</DialogTitle>
            <DialogDescription>Update intake details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(updateIntake)}>
            <div className="space-y-4 py-4">
              <Input label="Name" {...register('name')} error={errors.name?.message} required />
              <Input
                label="Year"
                type="number"
                {...register('year')}
                error={errors.year?.message}
                required
              />
              <Input
                label="Start Date"
                type="date"
                {...register('start_date')}
                error={errors.start_date?.message}
                required
              />
              <Input
                label="End Date"
                type="date"
                {...register('end_date')}
                error={errors.end_date?.message}
                required
              />
              <Input
                label="Application Deadline"
                type="date"
                {...register('application_deadline')}
                error={errors.application_deadline?.message}
                required
              />
              <Input
                label="Total Capacity"
                type="number"
                {...register('total_capacity')}
                error={errors.total_capacity?.message}
                required
              />
              <Input
                label="Available Spots"
                type="number"
                {...register('available_spots')}
                error={errors.available_spots?.message}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEdit(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Intake Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Intake</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{currentIntake?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={deleteIntake} loading={saving}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

