import { supabaseAdminClient } from '../_utils/supabaseClient'
import { getAuthenticatedUser } from '../_utils/auth'

export default async function handler(req, res) {
  const authContext = await getAuthenticatedUser(req)
  if (authContext.error) {
    return res.status(401).json({ error: authContext.error })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!authContext.isAdmin) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const { action, applicationIds = [], status, paymentStatus, notification } = req.body || {}

  if (!action) {
    return res.status(400).json({ error: 'Action is required' })
  }

  if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
    return res.status(400).json({ error: 'applicationIds must be a non-empty array' })
  }

  try {
    switch (action) {
      case 'update_status':
        return bulkUpdateStatus(res, authContext.user.id, applicationIds, status)
      case 'update_payment_status':
        return bulkUpdatePaymentStatus(res, applicationIds, paymentStatus)
      case 'delete':
        return bulkDeleteApplications(res, applicationIds)
      case 'send_notifications':
        return bulkSendNotifications(res, applicationIds, notification)
      default:
        return res.status(400).json({ error: 'Unsupported action' })
    }
  } catch (error) {
    console.error('Bulk action error', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function bulkUpdateStatus(res, userId, applicationIds, status) {
  if (!status) {
    return res.status(400).json({ error: 'Status is required' })
  }

  const now = new Date().toISOString()
  const updateData = { status, updated_at: now }
  if (status === 'under_review') {
    updateData.review_started_at = now
  }
  if (['approved', 'rejected'].includes(status)) {
    updateData.decision_date = now
  }

  const { error } = await supabaseAdminClient
    .from('applications_new')
    .update(updateData)
    .in('id', applicationIds)

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  const historyRows = applicationIds.map(id => ({
    application_id: id,
    status,
    changed_by: userId
  }))

  await supabaseAdminClient
    .from('application_status_history')
    .insert(historyRows)

  return res.status(200).json({ successCount: applicationIds.length })
}

async function bulkUpdatePaymentStatus(res, applicationIds, paymentStatus) {
  if (!paymentStatus) {
    return res.status(400).json({ error: 'paymentStatus is required' })
  }

  const { error } = await supabaseAdminClient
    .from('applications_new')
    .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
    .in('id', applicationIds)

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({ successCount: applicationIds.length })
}

async function bulkDeleteApplications(res, applicationIds) {
  const { error } = await supabaseAdminClient
    .from('applications_new')
    .update({ status: 'deleted', updated_at: new Date().toISOString() })
    .in('id', applicationIds)

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({ successCount: applicationIds.length })
}

async function bulkSendNotifications(res, applicationIds, notification) {
  if (!notification?.title || !notification?.message) {
    return res.status(400).json({ error: 'Notification title and message are required' })
  }

  const { data: applications, error: fetchError } = await supabaseAdminClient
    .from('applications_new')
    .select('id, user_id, full_name, email, application_number')
    .in('id', applicationIds)

  if (fetchError) {
    return res.status(400).json({ error: fetchError.message })
  }

  const notifications = applications.map(app => ({
    user_id: app.user_id,
    title: notification.title.replace('{application_number}', app.application_number),
    message: notification.message
      .replace('{full_name}', app.full_name)
      .replace('{application_number}', app.application_number),
    type: 'application_update'
  }))

  const { error } = await supabaseAdminClient
    .from('notifications')
    .insert(notifications)

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({ successCount: notifications.length })
}
