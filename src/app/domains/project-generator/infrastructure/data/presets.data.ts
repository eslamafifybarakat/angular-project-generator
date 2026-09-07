import { readApiResponse, type ApiResponse } from '@core/data';
import type { Preset } from '../../domain';
import raw from './presets.json' with { type: 'json' };

export const PRESETS: readonly Preset[] = readApiResponse(raw as ApiResponse<Preset[]>);
