import { useEffect, useRef, useCallback } from 'react'
import type { WsMessage } from '@/types'

type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface Options {
  onMessage: (msg: WsMessage) => void
  onStatusChange?: (status: WsStatus) => void
  enabled?: boolean
}

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'
const RECONNECT_DELAY_MS = 3000

export function useWebSocket(resumeId: string | null, opts: Options) {
  const { onMessage, onStatusChange, enabled = true } = opts
  const wsRef        = useRef<WebSocket | null>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)

  const connect = useCallback(() => {
    if (!resumeId || !enabled || unmountedRef.current) return

    onStatusChange?.('connecting')
    const ws = new WebSocket(`${WS_BASE}/ws/drafts/${resumeId}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (unmountedRef.current) return
      onStatusChange?.('connected')
    }

    ws.onmessage = (e: MessageEvent) => {
      if (unmountedRef.current) return
      try {
        const msg: WsMessage = JSON.parse(e.data as string)
        onMessage(msg)
      } catch {
        console.warn('[WS] Failed to parse message', e.data)
      }
    }

    ws.onerror = () => {
      if (unmountedRef.current) return
      onStatusChange?.('error')
    }

    ws.onclose = () => {
      if (unmountedRef.current) return
      onStatusChange?.('disconnected')
      // Auto-reconnect
      timerRef.current = setTimeout(connect, RECONNECT_DELAY_MS)
    }
  }, [resumeId, enabled, onMessage, onStatusChange])

  useEffect(() => {
    unmountedRef.current = false
    connect()

    return () => {
      unmountedRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { send }
}
