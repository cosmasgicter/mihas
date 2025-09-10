"use client"

import * as React from "react"

type ToastActionElement = React.ReactElement

interface ToastData {
  id: string
  title?: string
  description?: string
  action?: ToastActionElement
  variant?: "default" | "destructive" | "success"
}

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 5000

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ToasterToast = ToastData & {
  id: string
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: ToasterToast[], action: any): ToasterToast[] => {
  switch (action.type) {
    case "ADD_TOAST":
      return [action.toast, ...state].slice(0, TOAST_LIMIT)

    case "UPDATE_TOAST":
      return state.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t))

    case "DISMISS_TOAST": {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return state.map((t) => (t.id === toastId || toastId === undefined ? { ...t, open: false } : t))
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return []
      }
      return state.filter((t) => t.id !== action.toastId)
  }
}

const listeners: Array<(state: ToasterToast[]) => void> = []

let memoryState: ToasterToast[] = []

function dispatch(action: any) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<ToasterToast[]>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
