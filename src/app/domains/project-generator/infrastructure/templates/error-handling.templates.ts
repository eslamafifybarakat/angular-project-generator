import type { TemplateManifest } from '../../domain/component-template.model';

/**
 * eslam-barakat-portfolio has no custom ErrorHandler — only Angular's
 * built-in `provideBrowserGlobalErrorListeners()` and one ad hoc
 * `throw new Error(...)` in its data-read helper (verified: no
 * HttpErrorResponse/HttpInterceptor usage anywhere, no typed error model).
 * `origin: 'authored'`, not extracted.
 */
export const errorHandlingManifest: TemplateManifest = {
  id: 'error-handling',
  displayName: 'Error handling',
  origin: 'authored',
  sourceNote:
    'No custom ErrorHandler or error model exists in eslam-barakat-portfolio (only Angular\'s default listeners) — generator-authored.',
  requiresEra: 'any',
  readmeContractRead: false,
  installLater: {
    package: '@sentry/angular',
    note: 'A hosted error-tracking SDK, if in-app normalization/logging is not enough on its own.',
  },
  files: [
    {
      relativePath: '{core}/error/app-error.model.ts',
      content: () => `/**
 * Normalized shape every error-handling path converges on, whether it
 * started as a failed HTTP request, a thrown Error, or an unknown thrown
 * value.
 */
export type AppErrorKind = 'http' | 'runtime' | 'unknown';

export interface AppError {
  readonly kind: AppErrorKind;
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (error instanceof Error) {
    return { kind: 'runtime', message: error.message, cause: error };
  }
  return { kind: 'unknown', message: 'An unexpected error occurred.', cause: error };
}

function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'message' in value &&
    typeof (value as AppError).message === 'string'
  );
}
`,
    },
    {
      relativePath: '{core}/error/http-error.mapper.ts',
      content: () => `import { HttpErrorResponse } from '@angular/common/http';
import type { AppError } from './app-error.model';

/**
 * Maps a failed HTTP request into the app-wide AppError shape, with a
 * message suitable for direct user display (network vs. server vs. client
 * error) — never leaks the raw response body.
 */
export function mapHttpError(error: HttpErrorResponse): AppError {
  if (error.status === 0) {
    return {
      kind: 'http',
      message: 'Could not reach the server. Check your connection.',
      status: 0,
      cause: error,
    };
  }
  if (error.status >= 500) {
    return {
      kind: 'http',
      message: 'Something went wrong on our end. Please try again.',
      status: error.status,
      cause: error,
    };
  }
  if (error.status === 401 || error.status === 403) {
    return { kind: 'http', message: 'You are not authorized to do that.', status: error.status, cause: error };
  }
  if (error.status === 404) {
    return { kind: 'http', message: 'The requested resource was not found.', status: error.status, cause: error };
  }
  return { kind: 'http', message: 'The request could not be completed.', status: error.status, cause: error };
}
`,
    },
    {
      relativePath: '{core}/error/global-error-handler.ts',
      content: () => `import { ErrorHandler, Injectable } from '@angular/core';
import { toAppError } from './app-error.model';

/**
 * Replaces Angular's default ErrorHandler so uncaught errors (component
 * lifecycle throws, unhandled promise rejections Angular routes here) are
 * normalized to AppError and logged in one place instead of only reaching
 * the browser console. Register with \`{ provide: ErrorHandler, useClass:
 * GlobalErrorHandler }\` in app.config.ts.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const appError = toAppError(error);
    // Last-resort sink — replace with a real logging backend if one is added.
    // eslint-disable-next-line no-console
    console.error(\`[\${appError.kind}]\`, appError.message, appError.cause ?? error);
  }
}
`,
    },
    {
      relativePath: '{core}/error/global-error-handler.spec.ts',
      content: () => `import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  it('normalizes a thrown Error and logs it without throwing', () => {
    const handler = new GlobalErrorHandler();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => handler.handleError(new Error('boom'))).not.toThrow();
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});
`,
    },
  ],
};
