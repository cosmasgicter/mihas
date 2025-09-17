import { supabase } from './supabase'
import { sanitizeForLog } from './security'
import { getApiBaseUrl } from './apiConfig'

// Get the application base URL for notification links
const getAppBaseUrl = () => {
  const apiBase = getApiBaseUrl()
  return import.meta.env.VITE_APP_BASE_URL || apiBase
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app'
  enabled: boolean
  priority: number
}

export interface NotificationPreferences {
  channels: NotificationChannel[]
  optimalTiming: boolean
  frequency: 'immediate' | 'daily' | 'weekly'
}

export interface NotificationTemplate {
  id: string
  type: string
  channels: string[]
  subject: string
  content: string
  variables: string[]
}

export class MultiChannelNotificationService {
  private static instance: MultiChannelNotificationService
  
  static getInstance(): MultiChannelNotificationService {
    if (!MultiChannelNotificationService.instance) {
      MultiChannelNotificationService.instance = new MultiChannelNotificationService()
    }
    return MultiChannelNotificationService.instance
  }

  async sendNotification(
    userId: string,
    type: string,
    data: Record<string, any>,
    channels?: string[]
  ): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId)
      const template = await this.getTemplate(type)
      const targetChannels = channels || this.selectOptimalChannels(preferences, type)
      
      const results = await Promise.allSettled(
        targetChannels.map(channel => this.sendToChannel(channel, userId, template, data))
      )
      
      await this.logNotification(userId, type, targetChannels, results)
      
      return results.some(r => r.status === 'fulfilled')
    } catch (error) {
      const sanitizedError = error instanceof Error ? error.message : 'Unknown error'
      console.error('Notification sending failed:', sanitizedError)
      return false
    }
  }

  async sendProactiveReminder(userId: string, applicationId: string): Promise<void> {
    const { data: application } = await supabase
      .from('applications_new')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (!application) return

    const reminders = this.generateProactiveReminders(application)
    
    for (const reminder of reminders) {
      await this.sendNotification(userId, reminder.type, {
        ...reminder.data,
        application_id: applicationId
      })
    }
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const { data } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    return data || {
      channels: [
        { type: 'email', enabled: true, priority: 1 },
        { type: 'sms', enabled: false, priority: 2 },
        { type: 'in_app', enabled: true, priority: 3 }
      ],
      optimalTiming: true,
      frequency: 'immediate'
    }
  }

  private async getTemplate(type: string): Promise<NotificationTemplate> {
    const templates: Record<string, NotificationTemplate> = {
      application_submitted: {
        id: 'app_submitted',
        type: 'application_submitted',
        channels: ['email', 'in_app'],
        subject: '✅ Application Submitted Successfully - {{program}}',
        content: `Dear {{full_name}},\n\nYour application for {{program}} has been successfully submitted!\n\n📋 Tracking Code: {{tracking_code}}\n⏰ Expected Processing: 3-5 business days\n\nYou can track your application status anytime at: ${getAppBaseUrl()}/track-application\n\nThank you for choosing {{institution}}!`,
        variables: ['program', 'tracking_code', 'full_name', 'institution']
      },
      document_missing: {
        id: 'doc_missing',
        type: 'document_missing',
        channels: ['email', 'in_app'],
        subject: '📄 Missing Documents - Action Required',
        content: `Dear {{full_name}},\n\nYour application requires the following documents:\n\n❌ {{missing_documents}}\n\n⏰ Deadline: {{deadline}}\n\nPlease upload these documents to continue processing your application.\n\nLogin to complete: ${getAppBaseUrl()}/apply`,
        variables: ['full_name', 'missing_documents', 'deadline']
      },
      status_update: {
        id: 'status_update',
        type: 'status_update',
        channels: ['email', 'in_app'],
        subject: '🔄 Application Status Update - {{status}}',
        content: `Dear {{full_name}},\n\nYour application status has been updated:\n\n📊 New Status: {{status}}\n💬 Message: {{message}}\n\nTrack your application: ${getAppBaseUrl()}/track-application\n\nFor questions, contact us at info@{{institution_domain}}.edu.zm`,
        variables: ['status', 'message', 'full_name', 'institution_domain']
      },
      application_approved: {
        id: 'app_approved',
        type: 'application_approved',
        channels: ['email', 'sms', 'in_app'],
        subject: '🎉 Congratulations! Application Approved',
        content: 'Dear {{full_name}},\n\nCongratulations! Your application for {{program}} has been APPROVED!\n\n🎓 Program: {{program}}\n📅 Next Steps: You will receive enrollment details within 48 hours\n\nWelcome to {{institution}}!',
        variables: ['full_name', 'program', 'institution']
      },
      incomplete_application: {
        id: 'incomplete_app',
        type: 'incomplete_application',
        channels: ['email', 'in_app'],
        subject: '⚠️ Incomplete Application - Please Complete',
        content: `Dear {{full_name}},\n\nYour application is incomplete:\n\n❌ {{missing_info}}\n📊 Current: {{current_count}} items\n\nPlease complete your application to proceed.\n\nContinue here: ${getAppBaseUrl()}/apply`,
        variables: ['full_name', 'missing_info', 'current_count']
      }
    }

    return templates[type] || templates.status_update
  }

  private selectOptimalChannels(preferences: NotificationPreferences, type: string): string[] {
    const urgentTypes = ['document_missing', 'deadline_reminder']
    const isUrgent = urgentTypes.includes(type)
    
    let channels = preferences.channels
      .filter(c => c.enabled)
      .sort((a, b) => a.priority - b.priority)
      .map(c => c.type)

    if (isUrgent) {
      // For urgent notifications, use all available channels
      return channels
    }

    // For regular notifications, use primary channel
    return channels.slice(0, 1)
  }

  private async sendToChannel(
    channel: string,
    userId: string,
    template: NotificationTemplate,
    data: Record<string, any>
  ): Promise<boolean> {
    const content = this.personalizeContent(template.content, data)
    const subject = this.personalizeContent(template.subject, data)

    switch (channel) {
      case 'email':
        return this.sendEmail(userId, subject, content)
      case 'sms':
        return this.sendSMS(userId, content)
      case 'whatsapp':
        return this.sendWhatsApp(userId, content)
      case 'push':
        return this.sendPushNotification(userId, subject, content)
      case 'in_app':
        return this.sendInAppNotification(userId, subject, content)
      default:
        return false
    }
  }

  private personalizeContent(template: string, data: Record<string, any>): string {
    let content = template
    Object.entries(data).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
    })
    return content
  }

  private async sendEmail(userId: string, subject: string, content: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user?.email) return false

      // In production, integrate with email service (SendGrid, AWS SES, etc.)
      console.log('Email sent:', { to: sanitizeForLog(user.user.email || ''), subject: sanitizeForLog(subject), content: sanitizeForLog(content) })
      return true
    } catch (error) {
      const sanitizedError = error instanceof Error ? error.message : 'Unknown error'
      console.error('Email sending failed:', sanitizedError)
      return false
    }
  }

  private async sendSMS(userId: string, content: string): Promise<boolean> {
    try {
      // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
      console.log('SMS sent:', { userId: sanitizeForLog(userId), content: sanitizeForLog(content) })
      return true
    } catch (error) {
      const sanitizedError = error instanceof Error ? error.message : 'Unknown error'
      console.error('SMS sending failed:', sanitizedError)
      return false
    }
  }

  private async sendWhatsApp(userId: string, content: string): Promise<boolean> {
    try {
      // In production, integrate with WhatsApp Business API
      console.log('WhatsApp sent:', { userId: sanitizeForLog(userId), content: sanitizeForLog(content) })
      return true
    } catch (error) {
      const sanitizedError = error instanceof Error ? error.message : 'Unknown error'
      console.error('WhatsApp sending failed:', sanitizedError)
      return false
    }
  }

  private async sendPushNotification(userId: string, title: string, content: string): Promise<boolean> {
    try {
      // In production, integrate with push notification service
      console.log('Push notification sent:', { userId: sanitizeForLog(userId), title: sanitizeForLog(title), content: sanitizeForLog(content) })
      return true
    } catch (error) {
      const sanitizedError = error instanceof Error ? error.message : 'Unknown error'
      console.error('Push notification failed:', sanitizedError)
      return false
    }
  }

  private async sendInAppNotification(userId: string, title: string, content: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('in_app_notifications')
        .insert({
          user_id: userId,
          title,
          content,
          type: 'info',
          read: false
        })

      return !error
    } catch (error) {
      const sanitizedError = error instanceof Error ? error.message : 'Unknown error'
      console.error('In-app notification failed:', sanitizedError)
      return false
    }
  }

  private generateProactiveReminders(application: any): Array<{type: string, data: any}> {
    const reminders: Array<{type: string, data: any}> = []
    
    if (!application.result_slip_url) {
      reminders.push({
        type: 'document_missing',
        data: {
          full_name: application.full_name,
          missing_documents: 'Result Slip',
          deadline: '7 days'
        }
      })
    }

    if (!application.pop_url) {
      reminders.push({
        type: 'document_missing',
        data: {
          full_name: application.full_name,
          missing_documents: 'Proof of Payment',
          deadline: '3 days'
        }
      })
    }

    return reminders
  }

  private async logNotification(
    userId: string,
    type: string,
    channels: string[],
    results: PromiseSettledResult<boolean>[]
  ): Promise<void> {
    const { error } = await supabase
      .from('notification_logs')
      .insert({
        user_id: userId,
        type,
        channels,
        success_count: results.filter(r => r.status === 'fulfilled').length,
        total_count: results.length,
        sent_at: new Date().toISOString()
      })

    if (error) {
      const sanitizedError = error.message || 'Unknown error'
      console.error('Failed to log notification:', sanitizedError)
    }
  }
}

export const multiChannelNotifications = MultiChannelNotificationService.getInstance()