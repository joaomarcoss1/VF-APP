export type AppErrorCode =
  | 'UNKNOWN'
  | 'DATABASE'
  | 'VALIDATION'
  | 'PERMISSION'
  | 'AUTHORIZATION_UNAVAILABLE'
  | 'TENANT'
  | 'SESSION_EXPIRED'
  | 'INTEGRATION'
  | 'REPORT'
  | 'DOCUMENT'
  | 'WHATSAPP'
  | 'PAYMENT'
  | 'INVENTORY'
  | 'NETWORK'

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public details?: unknown,
    public retryable = false,
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Não foi possível acessar os dados.', details?: unknown) {
    super('DATABASE', message, details, true)
  }
}
export class ValidationError extends AppError {
  constructor(message = 'Revise os campos informados.', details?: unknown) {
    super('VALIDATION', message, details)
  }
}
export class PermissionError extends AppError {
  constructor(message = 'Você não possui permissão para esta ação.', details?: unknown) {
    super('PERMISSION', message, details)
  }
}
export class AuthorizationUnavailableError extends AppError {
  constructor(message = 'Não foi possível validar sua permissão. Tente novamente.', details?: unknown) {
    super('AUTHORIZATION_UNAVAILABLE', message, details, true)
  }
}
export class TenantError extends AppError {
  constructor(message = 'A empresa atual não foi identificada.', details?: unknown) {
    super('TENANT', message, details, true)
  }
}
export class TenantNotResolvedError extends TenantError {}
export class SessionExpiredError extends AppError {
  constructor(message = 'Sua sessão expirou. Entre novamente.', details?: unknown) {
    super('SESSION_EXPIRED', message, details)
  }
}
export class IntegrationError extends AppError {
  constructor(message = 'A integração não respondeu corretamente.', details?: unknown) {
    super('INTEGRATION', message, details, true)
  }
}
export class ReportError extends AppError {
  constructor(message = 'Não foi possível gerar o relatório.', details?: unknown) {
    super('REPORT', message, details, true)
  }
}
export class DocumentError extends AppError {
  constructor(message = 'Não foi possível gerar o documento.', details?: unknown) {
    super('DOCUMENT', message, details, true)
  }
}
export class WhatsAppError extends AppError {
  constructor(message = 'Não foi possível enviar pelo WhatsApp.', details?: unknown) {
    super('WHATSAPP', message, details, true)
  }
}
export class PaymentError extends AppError {
  constructor(message = 'Não foi possível processar o pagamento.', details?: unknown) {
    super('PAYMENT', message, details, true)
  }
}
export class InventoryError extends AppError {
  constructor(message = 'Não foi possível atualizar o estoque.', details?: unknown) {
    super('INVENTORY', message, details, true)
  }
}

export function toAppError(error: unknown, fallback = 'Não foi possível concluir a operação.'): AppError {
  if (error instanceof AppError) return error
  if (error instanceof Error) return new AppError('UNKNOWN', error.message || fallback, error)
  const raw = error as { message?: string; details?: string } | null
  return new AppError('UNKNOWN', raw?.message || raw?.details || fallback, error)
}

export function publicErrorMessage(error: unknown, fallback = 'Não foi possível concluir a operação.') {
  return toAppError(error, fallback).message
}
