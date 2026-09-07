import type { TemplateManifest } from '../../domain/component-template.model';

/**
 * eslam-barakat-portfolio uses zero `HttpClient` calls — all domain data is
 * static/prerendered JSON (verified: no HttpClient/HttpInterceptor/
 * HttpErrorResponse anywhere in src/). `origin: 'authored'`. Depends on
 * Error handling (§25's own worked example: "HTTP layer → Error handling")
 * — always generated alongside HTTP layer so `httpErrorInterceptor` never
 * imports a file that was not generated.
 */
export const httpLayerManifest: TemplateManifest = {
  id: 'http-layer',
  displayName: 'HTTP layer',
  origin: 'authored',
  sourceNote: 'No HttpClient usage exists in eslam-barakat-portfolio (fully static/prerendered data) — generator-authored.',
  requiresEra: 'any',
  readmeContractRead: false,
  requiredCapabilities: ['error-handling'],
  installLater: {
    package: '@ngneat/query',
    note: 'A caching/request-state layer over HttpClient, if this thin wrapper is not enough.',
  },
  files: [
    {
      relativePath: '{core}/http/api.service.ts',
      content: (ctx) => {
        const depth = 2 + ctx.coreDir.split('/').length;
        const upPath = '../'.repeat(depth);
        return `import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '${upPath}environments/environment';

/**
 * Thin, typed wrapper over HttpClient: every call is relative to
 * \`environment.apiUrl\`, so callers never repeat the base URL. Pair with
 * \`http-error.interceptor.ts\` (registered via
 * \`provideHttpClient(withInterceptors([httpErrorInterceptor]))\` in
 * app.config.ts) for centralized error normalization.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    return this.http.get<T>(this.url(path), { params });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  private url(path: string): string {
    return \`\${environment.apiUrl.replace(/\\/$/, '')}/\${path.replace(/^\\//, '')}\`;
  }
}
`;
      },
    },
    {
      relativePath: '{core}/http/http-error.interceptor.ts',
      content: () => `import type { HttpInterceptorFn } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { mapHttpError } from '../error/http-error.mapper';

/**
 * Functional interceptor: normalizes every failed HTTP response into
 * AppError before it reaches calling code. Register via
 * \`provideHttpClient(withInterceptors([httpErrorInterceptor]))\`.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        return throwError(() => mapHttpError(error));
      }
      return throwError(() => error);
    }),
  );
`,
    },
    {
      relativePath: '{core}/http/api.service.spec.ts',
      content: () => `import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  it('prefixes requests with environment.apiUrl', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(ApiService);
    const httpMock = TestBed.inject(HttpTestingController);

    service.get('widgets').subscribe();
    const req = httpMock.expectOne((r) => r.url.endsWith('/widgets'));
    req.flush({});
    httpMock.verify();
  });
});
`,
    },
  ],
};
