import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Program } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/Dialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Pencil, Trash2, Plus, ArrowLeft } from 'lucide-react'

export default function AdminPrograms() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    duration_years: 1
  })

  useEffect(() => {
    loadPrograms()
  }, [])

  const loadPrograms = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setPrograms(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((f) => ({
      ...f,
      [name]: name === 'duration_years' ? Number(value) : value
    }))
  }

  const openCreate = () => {
    setForm({ name: '', description: '', duration_years: 1 })
    setShowCreate(true)
  }

  const openEdit = (program: Program) => {
    setCurrentProgram(program)
    setForm({
      name: program.name,
      description: program.description || '',
      duration_years: program.duration_years
    })
    setShowEdit(true)
  }

  const openDelete = (program: Program) => {
    setCurrentProgram(program)
    setShowDelete(true)
  }

  const handleOperation = async (operation: () => any, onSuccess: () => void) => {
    try {
      setSaving(true)
      const result = await operation()
      if (result.error) throw result.error
      onSuccess()
      await loadPrograms()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const createProgram = () => handleOperation(
    () => supabase.from('programs').insert({
      name: form.name,
      description: form.description,
      duration_years: form.duration_years,
      is_active: true
    }).select(),
    () => setShowCreate(false)
  )

  const updateProgram = () => {
    if (!currentProgram) return
    handleOperation(
      () => supabase.from('programs').update({
        name: form.name,
        description: form.description,
        duration_years: form.duration_years
      }).eq('id', currentProgram.id).select(),
      () => {
        setShowEdit(false)
        setCurrentProgram(null)
      }
    )
  }

  const deleteProgram = () => {
    if (!currentProgram) return
    handleOperation(
      () => supabase.from('programs').delete().eq('id', currentProgram.id).select(),
      () => {
        setShowDelete(false)
        setCurrentProgram(null)
      }
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link to="/admin/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-secondary">Programs</h1>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Program
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : programs.length === 0 ? (
          <p className="text-secondary">No programs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Duration (years)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {programs.map((program) => (
                  <tr key={program.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{program.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{program.duration_years}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(program)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => openDelete(program)}>
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

      {/* Create Program Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Program</DialogTitle>
            <DialogDescription>Enter program details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input label="Name" name="name" value={form.name} onChange={handleChange} required />
            <TextArea label="Description" name="description" value={form.description} onChange={handleChange} />
            <Input label="Duration (years)" type="number" name="duration_years" value={form.duration_years} onChange={handleChange} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</Button>
            <Button onClick={createProgram} loading={saving}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
            <DialogDescription>Update program details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input label="Name" name="name" value={form.name} onChange={handleChange} required />
            <TextArea label="Description" name="description" value={form.description} onChange={handleChange} />
            <Input label="Duration (years)" type="number" name="duration_years" value={form.duration_years} onChange={handleChange} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)} disabled={saving}>Cancel</Button>
            <Button onClick={updateProgram} loading={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Program Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Program</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{currentProgram?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} disabled={saving}>Cancel</Button>
            <Button variant="danger" onClick={deleteProgram} loading={saving}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
