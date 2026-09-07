import { Injectable } from '@angular/core';
import type { Preset } from '../domain';
import { PRESETS } from './data';

@Injectable({ providedIn: 'root' })
export class PresetRepository {
  list(): readonly Preset[] {
    return PRESETS;
  }

  find(id: string): Preset | undefined {
    return PRESETS.find((p) => p.id === id);
  }
}
