import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProjectConfigService } from '../application/project-config.service';
import { FileContentService } from './file-content.service';
import { ZipBuilderService } from './zip-builder.service';
import type { ArchitectureType } from '../domain/architecture.model';

const FALLBACK_MARKER = 'GENERATOR: no template registered';

describe('FileContentService', () => {
  let configuration: ProjectConfigService;
  let fileContent: FileContentService;
  let zipBuilder: ZipBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    configuration = TestBed.inject(ProjectConfigService);
    fileContent = TestBed.inject(FileContentService);
    zipBuilder = TestBed.inject(ZipBuilderService);
  });

  function renderCurrent() {
    const cfg = configuration.config();
    const files = configuration.generatedFiles();
    const npmScripts = configuration.npmScripts();
    expect(files.length).toBeGreaterThan(0);
    return fileContent.renderAll(cfg, npmScripts, files);
  }

  it('renders real content (no fallback stub) for every file in the default configuration', () => {
    const rendered = renderCurrent();
    for (const file of rendered) {
      expect(file.content, `no content for ${file.path}`).not.toContain(FALLBACK_MARKER);
      expect(file.content.length, `empty content for ${file.path}`).toBeGreaterThan(0);
    }
  });

  it('renders real content for every architecture pattern, with and without the example domain', () => {
    const patterns: ArchitectureType[] = ['ddd', 'feature-based', 'simple', 'custom'];
    for (const pattern of patterns) {
      configuration.setArchitecturePattern(pattern);
      for (const includeExampleDomain of [true, false]) {
        configuration.patch('architecture', { includeExampleDomain });
        const rendered = renderCurrent();
        for (const file of rendered) {
          expect(
            file.content,
            `${pattern} (example=${includeExampleDomain}) produced no template for ${file.path}`,
          ).not.toContain(FALLBACK_MARKER);
        }
      }
    }
  });

  it('renders real content across rendering modes, localization, SEO, and features', () => {
    configuration.patch('rendering', { mode: 'ssr', prerender: true });
    configuration.patch('seo', { enabled: true, jsonLd: true, sitemap: true });
    configuration.toggleLanguage('ru', true);
    configuration.toggleLanguage('zh', true);
    configuration.patch('features', { toast: 'customized', modal: 'customized', datePicker: 'install-later' });
    configuration.patch('developerTools', {
      eslint: true,
      prettier: true,
      editorconfig: true,
      husky: true,
      lintStaged: true,
      unit: true,
      e2e: false,
      lazy: true,
      imageOpt: false,
      budgets: true,
      a11y: true,
      aria: true,
      keyboard: true,
    });

    const rendered = renderCurrent();
    for (const file of rendered) {
      expect(file.content, `no template for ${file.path}`).not.toContain(FALLBACK_MARKER);
    }

    const pkg = rendered.find((f) => f.path === 'package.json');
    expect(pkg).toBeTruthy();
    const parsed = JSON.parse(pkg!.content) as { dependencies: Record<string, string> };
    expect(parsed.dependencies['@angular/ssr']).toBeTruthy();
    expect(parsed.dependencies['express']).toBeTruthy();

    for (const code of ['en', 'ar', 'ru', 'zh']) {
      const locale = rendered.find((f) => f.path === `src/locales/${code}.json`);
      expect(locale, `missing locale file for ${code}`).toBeTruthy();
      expect(() => JSON.parse(locale!.content)).not.toThrow();
    }
  });

  it('renders CSR-only (no SSR files requested, none produced) without a fallback stub', () => {
    configuration.patch('rendering', { mode: 'csr', prerender: false });
    const rendered = renderCurrent();
    expect(rendered.some((f) => f.path === 'src/server.ts')).toBe(false);
    for (const file of rendered) {
      expect(file.content).not.toContain(FALLBACK_MARKER);
    }
  });

  it('builds a real, non-empty ZIP archive from rendered files', async () => {
    const rendered = renderCurrent();
    const archive = await zipBuilder.build(rendered, configuration.config().project.slug || 'project');
    expect(archive.byteSize).toBeGreaterThan(0);
    expect(archive.blob.size).toBe(archive.byteSize);
  });
});
