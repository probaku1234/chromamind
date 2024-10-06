import { invoke } from '@tauri-apps/api/core'
import { TauriCommand } from '../types'

type InvokeResult<T> =
  | { type: 'success'; result: T }
  | { type: 'error'; error: string }

export async function invokeWrapper<T>(
  command: TauriCommand,
  args?: Record<string, unknown>,
): Promise<InvokeResult<T>> {
  try {
    const result = await invoke<T>(command, args)
    return { type: 'success', result }
  } catch (error) {
    return { type: 'error', error: error as string }
  }
}
