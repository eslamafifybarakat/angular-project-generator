import { readApiResponse } from '@core/data/read-api-response';
import type { ApiResponse } from '@core/data/api-response.model';
import type { AngularVersionProfile } from '../../domain/angular-version.model';
import raw from './angular-versions.json' with { type: 'json' };

/**
 * Typed view of the seed file. The JSON keeps the ApiResponse envelope so this
 * module is a straight `readApiResponse` call away from being a real HTTP
 * response body.
 */
export const ANGULAR_VERSIONS: readonly AngularVersionProfile[] = readApiResponse(
  raw as ApiResponse<AngularVersionProfile[]>,
);
