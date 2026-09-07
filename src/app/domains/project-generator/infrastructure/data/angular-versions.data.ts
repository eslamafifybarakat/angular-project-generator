import { readApiResponse, type ApiResponse } from '@core/data';
import type { AngularVersionProfile } from '../../domain';
import raw from './angular-versions.json' with { type: 'json' };

/**
 * Typed view of the seed file. The JSON keeps the ApiResponse envelope so this
 * module is a straight `readApiResponse` call away from being a real HTTP
 * response body.
 */
export const ANGULAR_VERSIONS: readonly AngularVersionProfile[] = readApiResponse(
  raw as ApiResponse<AngularVersionProfile[]>,
);
