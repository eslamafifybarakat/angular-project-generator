import { readApiResponse } from '@core/data/read-api-response';
import type { ApiResponse } from '@core/data/api-response.model';
import type { Preset } from '../../domain/preset.model';
import raw from './presets.json' with { type: 'json' };

export const PRESETS: readonly Preset[] = readApiResponse(raw as ApiResponse<Preset[]>);
