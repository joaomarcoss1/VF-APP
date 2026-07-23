import { toAppError, type AppError } from '@/core/errors/app-error'
export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: AppError }
export async function asResult<T>(operation: () => Promise<T>): Promise<ServiceResult<T>> {
  try { return { ok: true, data: await operation() } } catch (error) { return { ok: false, error: toAppError(error) } }
}
