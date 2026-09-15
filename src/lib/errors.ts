/**
 * Gestion d'erreurs typées de l'application.
 * Chaque erreur expose un code stable (machine) et un message (humain).
 */

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: string;

  constructor(code: AppErrorCode, message: string, details?: string, status?: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status ?? defaultStatusFor(code);
    this.details = details;
  }
}

export function defaultStatusFor(code: AppErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "AUTH_REQUIRED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "RATE_LIMITED":
      return 429;
    case "CONFLICT":
      return 409;
    default:
      return 500;
  }
}

const SAFE_HTTP_STATUS: Record<number, AppErrorCode> = {
  400: "VALIDATION_ERROR",
  401: "AUTH_REQUIRED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  429: "RATE_LIMITED",
  409: "CONFLICT",
  500: "INTERNAL_ERROR",
};

/** Convertit n'importe quelle erreur en AppError (sans fuiter les internes). */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error) {
    if (Object.prototype.hasOwnProperty.call(err, "code")) {
      const maybeCode = (err as { code?: unknown }).code;
      if (typeof maybeCode === "number" && SAFE_HTTP_STATUS[maybeCode]) {
        return new AppError(SAFE_HTTP_STATUS[maybeCode], err.message);
      }
    }
    // Erreurs connues de la base (contrainte unique, etc.)
    if (err.message.includes("P2002")) {
      return new AppError("CONFLICT", "Un élément identique existe déjà.");
    }
    return new AppError("INTERNAL_ERROR", "Une erreur interne est survenue.", err.message);
  }
  return new AppError("INTERNAL_ERROR", "Une erreur interne est survenue.");
}

/** Message utilisateur sûr à afficher. */
export function userSafeMessage(err: unknown): string {
  const app = toAppError(err);
  if (app.code === "INTERNAL_ERROR") return "Une erreur inattendue est survenue. Réessayez.";
  return app.message;
}