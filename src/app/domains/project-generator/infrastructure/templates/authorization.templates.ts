import type { TemplateManifest } from '../../domain/component-template.model';

/**
 * eslam-barakat-portfolio has no roles/permissions model, guard, or
 * directive of any kind (verified: no CanActivate/CanMatch guards, no
 * `*appHasRole`-style directive, all "role"/"Role" matches were ARIA usage).
 * `origin: 'authored'`. Depends on Authentication (§25's own worked
 * example: "Authorization → Authentication") — always generated alongside
 * Authorization, which transitively pulls in Storage too, so the
 * generated Authorization module never imports a file that was not
 * generated, even if Authentication itself was left at "Not included".
 */
export const authorizationManifest: TemplateManifest = {
  id: 'authorization',
  displayName: 'Authorization',
  origin: 'authored',
  sourceNote: 'No roles/permissions model exists in eslam-barakat-portfolio (no user accounts at all) — generator-authored.',
  requiresEra: 'any',
  readmeContractRead: false,
  requiredCapabilities: ['authentication'],
  installLater: {
    package: 'casl',
    note: 'A more expressive ability/permission-rules engine, if role-string checks are not granular enough.',
  },
  files: [
    {
      relativePath: '{core}/auth/authorization.service.ts',
      content: () => `import { Injectable, inject } from '@angular/core';
import { AuthStateService } from './auth-state.service';

/** Role checks against the current AuthStateService user. */
@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private readonly authState = inject(AuthStateService);

  hasRole(role: string): boolean {
    return this.authState.user()?.roles.includes(role) ?? false;
  }

  hasAnyRole(...roles: readonly string[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }
}
`,
    },
    {
      relativePath: '{core}/auth/role.guard.ts',
      content: () => `import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthorizationService } from './authorization.service';

/**
 * \`canActivate: [roleGuard(['admin'])]\` — redirects home when the current
 * user lacks every listed role.
 */
export function roleGuard(roles: readonly string[]): CanActivateFn {
  return () => {
    const authorization = inject(AuthorizationService);
    const router = inject(Router);
    return authorization.hasAnyRole(...roles) ? true : router.parseUrl('/');
  };
}
`,
    },
    {
      relativePath: '{core}/auth/directives/has-role.directive.ts',
      content: () => `import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthorizationService } from '../authorization.service';

/**
 * \`*appHasRole="'admin'"\` or \`*appHasRole="['admin', 'editor']"\` — projects
 * the template only when the current user has at least one listed role.
 */
@Directive({ selector: '[appHasRole]' })
export class HasRoleDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authorization = inject(AuthorizationService);
  private hasView = false;

  @Input() set appHasRole(role: string | readonly string[]) {
    const roles = Array.isArray(role) ? role : [role];
    const allowed = this.authorization.hasAnyRole(...roles);
    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
`,
    },
    {
      relativePath: '{core}/auth/authorization.service.spec.ts',
      content: () => `import { TestBed } from '@angular/core/testing';
import { AuthStateService } from './auth-state.service';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  it('reports roles from the current AuthStateService user', () => {
    const authState = TestBed.inject(AuthStateService);
    const authorization = TestBed.inject(AuthorizationService);

    expect(authorization.hasRole('admin')).toBe(false);

    authState.setUser({ id: '1', email: 'a@b.com', roles: ['admin', 'editor'] });
    expect(authorization.hasRole('admin')).toBe(true);
    expect(authorization.hasAnyRole('viewer', 'editor')).toBe(true);
    expect(authorization.hasAnyRole('viewer')).toBe(false);
  });
});
`,
    },
  ],
};
