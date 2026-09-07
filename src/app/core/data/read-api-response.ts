import type { ApiResponse } from './api-response.model';

/**
 * Unwraps an ApiResponse, throwing on a non-2xx status so a malformed seed
 * file fails loudly at startup instead of rendering as an empty list.
 */
export function readApiResponse<T>(response: ApiResponse<T>): T {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Unexpected API status ${response.status}: ${response.message}`);
  }
  return response.data;
}
