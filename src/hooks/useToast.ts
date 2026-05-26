'use client'
import { useState, useCallback } from 'react'

type ToastType = 'success'|'error'|'warn'|'info'
interface Toast { id:string; type:ToastType; message:string }

let store: Toast[] = []
let listeners: Array<()=>void> = []

function notify() { listeners.forEach(l=>l()) }
function add(type:ToastType, message:string) {
  const id = Math.random().toString(36).slice(2)
  store = [...store, {id,type,message}]
  notify()
  setTimeout(()=>{ store=store.filter(t=>t.id!==id); notify() }, 4000)
}

export const toast = {
  success: (m:string)=>add('success',m),
  error:   (m:string)=>add('error',m),
  warn:    (m:string)=>add('warn',m),
  info:    (m:string)=>add('info',m),
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>(store)
  const refresh = useCallback(()=>setToasts([...store]),[])
  if(!listeners.includes(refresh)) listeners.push(refresh)
  return { toasts, dismiss:(id:string)=>{ store=store.filter(t=>t.id!==id); notify() } }
}