import type { TemplateManifest } from '../../domain/component-template.model';

/**
 * eslam-barakat-portfolio has no login, session, guard, or token model of
 * any kind (verified: it is a public static portfolio site with no user
 * accounts). `origin: 'authored'`. Depends on Storage (§25's own worked
 * example: "Authentication → Storage") for SSR-safe token persistence —
 * always generated alongside Authentication. Contains no secrets, API keys,
 * or real endpoint URLs; `loginUrl` is a placeholder the generated project
 * points at its own backend.
 */
export const authenticationManifest: TemplateManifest = {
  id: 'authentication',
  displayName: 'Authentication',
  origin: 'authored',
  sourceNote: 'No authentication of any kind exists in eslam-barakat-portfolio (public static site) — generator-authored.',
  requiresEra: 'any',
  readmeContractRead: false,
  requiredCapabilities: ['storage'],
  installLater: {
    package: '@auth0/auth0-angular',
    note: 'A hosted identity-provider SDK, if a self-managed token flow is not the right fit.',
  },
  files: [
    {
      relativePath: '{core}/auth/models/auth-user.model.ts',
      content: () => `export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly roles: readonly string[];
}
`,
    },
    {
      relativePath: '{core}/auth/auth-state.service.ts',
      content: () => `import { Injectable, computed, signal } from '@angular/core';
import type { AuthUser } from './models/auth-user.model';

/**
 * Holds the currently authenticated user (or null) as the single source of
 * truth for both authentication and authorization. AuthService populates it
 * on login/logout/restore; AuthorizationService and the guards below only
 * ever read from it, never fetch the user themselves.
 */
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly _user = signal<AuthUser | null>(null);
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  setUser(user: AuthUser | null): void {
    this._user.set(user);
  }
}
`,
    },
    {
      relativePath: '{core}/auth/auth.service.ts',
      content: () => `import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';
import { StorageService } from '../storage/storage.service';
import { AuthStateService } from './auth-state.service';
import type { AuthUser } from './models/auth-user.model';

const TOKEN_KEY = 'auth-token';

interface LoginResponse {
  readonly token: string;
  readonly user: AuthUser;
}

/**
 * Login/logout/session-token access. Talks to HttpClient directly rather
 * than through the optional HTTP-layer capability, so Authentication works
 * whether or not that capability is also selected. No credentials, API
 * keys, or endpoint URLs are hardcoded — point \`loginUrl\` at your own
 * backend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly authState = inject(AuthStateService);

  /** Replace with your real authentication endpoint. */
  private readonly loginUrl = '/api/auth/login';

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.loginUrl, { email, password }).pipe(
      tap(({ token, user }) => {
        this.storage.set(TOKEN_KEY, token);
        this.authState.setUser(user);
      }),
    );
  }

  logout(): void {
    this.storage.remove(TOKEN_KEY);
    this.authState.setUser(null);
  }

  /** The persisted bearer token, if any — read by auth.interceptor.ts. */
  token(): string | null {
    return this.storage.get(TOKEN_KEY);
  }
}
`,
    },
    {
      relativePath: '{core}/auth/auth.guard.ts',
      content: () => `import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthStateService } from './auth-state.service';

/** \`canActivate: [authGuard]\` — redirects to /login when signed out. */
export const authGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  return authState.isAuthenticated() ? true : router.parseUrl('/login');
};
`,
    },
    {
      relativePath: '{core}/auth/auth.interceptor.ts',
      content: () => `import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '../storage/storage.service';

/**
 * Attaches the stored bearer token, if any, to every outgoing request.
 * Register via \`provideHttpClient(withInterceptors([authInterceptor]))\`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(StorageService).get('auth-token');
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: \`Bearer \${token}\` } }));
};
`,
    },
    {
      relativePath: '{core}/auth/auth.service.spec.ts',
      content: () => `import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStateService } from './auth-state.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('stores the token and updates AuthStateService on login', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(AuthService);
    const authState = TestBed.inject(AuthStateService);
    const httpMock = TestBed.inject(HttpTestingController);

    service.login('a@b.com', 'secret').subscribe();
    httpMock.expectOne((r) => r.url.endsWith('/api/auth/login')).flush({
      token: 'tok123',
      user: { id: '1', email: 'a@b.com', roles: ['user'] },
    });

    expect(service.token()).toBe('tok123');
    expect(authState.isAuthenticated()).toBe(true);
    httpMock.verify();
  });

  it('clears state on logout', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(AuthService);
    const authState = TestBed.inject(AuthStateService);

    service.logout();
    expect(service.token()).toBeNull();
    expect(authState.isAuthenticated()).toBe(false);
  });
});
`,
    },
  ],
};
