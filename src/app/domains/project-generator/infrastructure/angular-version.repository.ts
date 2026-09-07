import { Injectable } from '@angular/core';
import type { AngularVersionProfile } from '../domain';
import { ANGULAR_VERSIONS } from './data';

/**
 * Reads the compatibility matrix.
 *
 * Bundled data today, an endpoint later: the methods return exactly what an
 * HTTP-backed version would, so the application layer never learns which one
 * it is talking to.
 */
@Injectable({ providedIn: 'root' })
export class AngularVersionRepository {
  list(): readonly AngularVersionProfile[] {
    return ANGULAR_VERSIONS;
  }

  find(version: string): AngularVersionProfile | undefined {
    return ANGULAR_VERSIONS.find((v) => v.version === version);
  }

  /** Versions the generator will actually accept. */
  selectable(): readonly AngularVersionProfile[] {
    return ANGULAR_VERSIONS.filter((v) => v.selectable);
  }
}
