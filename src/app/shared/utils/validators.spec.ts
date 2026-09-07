import { describe, expect, it } from 'vitest';
import {
  isAbsoluteUrl,
  isHexColor,
  isKebabSlug,
  isSafeDirectorySegment,
  isSafeRelativeDirPath,
} from './validators';
import { slugify } from './slugify';

describe('validators', () => {
  it('accepts three- and six-digit hex colours only', () => {
    expect(isHexColor('#2b59f0')).toBe(true);
    expect(isHexColor('#abc')).toBe(true);
    expect(isHexColor('2b59f0')).toBe(false);
    expect(isHexColor('#12345')).toBe(false);
    expect(isHexColor('rgb(0,0,0)')).toBe(false);
  });

  it('requires a hostname with a dot for absolute URLs', () => {
    expect(isAbsoluteUrl('https://example.com')).toBe(true);
    expect(isAbsoluteUrl('http://api.dev.example.com/api')).toBe(true);
    expect(isAbsoluteUrl('example.com')).toBe(false);
    expect(isAbsoluteUrl('https://localhost')).toBe(false);
  });

  it('rejects slugs that npm would reject', () => {
    expect(isKebabSlug('talbinah-portal')).toBe(true);
    expect(isKebabSlug('2-portal')).toBe(false);
    expect(isKebabSlug('Portal')).toBe(false);
    expect(isKebabSlug('my_portal')).toBe(false);
  });

  it('folds diacritics instead of dropping the letters', () => {
    expect(slugify('Créateur de Projet')).toBe('createur-de-projet');
    expect(slugify('  Talbinah  Portal  ')).toBe('talbinah-portal');
  });

  it('accepts kebab-case directory segments only', () => {
    expect(isSafeDirectorySegment('domains')).toBe(true);
    expect(isSafeDirectorySegment('shared-ui')).toBe(true);
    expect(isSafeDirectorySegment('')).toBe(false);
    expect(isSafeDirectorySegment('  ')).toBe(false);
    expect(isSafeDirectorySegment('Domains')).toBe(false);
    expect(isSafeDirectorySegment('has space')).toBe(false);
    expect(isSafeDirectorySegment('has/slash')).toBe(false);
    expect(isSafeDirectorySegment('..')).toBe(false);
    expect(isSafeDirectorySegment('-leading')).toBe(false);
    expect(isSafeDirectorySegment('trailing-')).toBe(false);
  });

  it('rejects reserved Windows device names as directory segments', () => {
    expect(isSafeDirectorySegment('con')).toBe(false);
    expect(isSafeDirectorySegment('CON')).toBe(false);
    expect(isSafeDirectorySegment('com1')).toBe(false);
    expect(isSafeDirectorySegment('lpt9')).toBe(false);
    expect(isSafeDirectorySegment('console')).toBe(true);
  });

  it('accepts a nested relative directory path made of safe segments', () => {
    expect(isSafeRelativeDirPath('shared/ui')).toBe(true);
    expect(isSafeRelativeDirPath('domains')).toBe(true);
  });

  it('rejects absolute paths, traversal and empty segments', () => {
    expect(isSafeRelativeDirPath('/etc/passwd')).toBe(false);
    expect(isSafeRelativeDirPath('C:/Windows')).toBe(false);
    expect(isSafeRelativeDirPath('../outside')).toBe(false);
    expect(isSafeRelativeDirPath('shared/../../etc')).toBe(false);
    expect(isSafeRelativeDirPath('shared//ui')).toBe(false);
    expect(isSafeRelativeDirPath('')).toBe(false);
  });
});
