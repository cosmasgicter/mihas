"use client"

import { Toast, ToastContainer } from "@/components/ui/toast"
import { useToast } from "@/lib/hooks/use-toast"

export function ToastProvider() {
  const { toasts } = useToast()

  return (
    <ToastContainer>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </ToastContainer>
  )
}
