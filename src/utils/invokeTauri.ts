import { invoke } from '@tauri-apps/api/core'
import { TauriCommand } from '../types';

export async function invokeWrapper<T>(command: TauriCommand, args?: Record<string, unknown>): Promise<[T | null, string | null]> {
    try {
        const result = await invoke<T>(command, args);
        return [result, null];
    } catch (error) {
        return [null, error as string];
    }
}