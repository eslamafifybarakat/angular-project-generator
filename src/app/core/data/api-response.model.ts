/**
 * Envelope every seed file and every future HTTP endpoint uses.
 *
 * Keeping the shape identical on both sides is the point: swapping a
 * repository from a bundled JSON import to a real `HttpClient` call should not
 * change a line in the application or presentation layers.
 */
export interface ApiResponse<T> {
  readonly status: number;
  readonly message: string;
  readonly data: T;
}
