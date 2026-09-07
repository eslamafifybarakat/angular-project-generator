import type {
  AngularVersionProfile,
  ComponentNaming,
  GenerationEra,
  ResolvedArchitecture,
  GeneratedFile,
  ProjectConfig,
} from '../../domain';
import { componentClassName, componentFileStem } from '../../domain';

/**
 * Everything a content resolver needs to render one file's text.
 *
 * Built once per generation run by `FileContentService.buildContext()` and
 * passed to every resolver, so no resolver re-derives `era`/`standalone`/`ssr`
 * from `cfg` itself and risks disagreeing with `deriveFiles()`'s own reading
 * of the same values.
 */
export interface TemplateContext {
  readonly cfg: ProjectConfig;
  readonly resolved: ResolvedArchitecture;
  readonly era: GenerationEra;
  readonly profile: AngularVersionProfile | undefined;
  readonly standalone: boolean;
  readonly ssr: boolean;
  readonly npmScripts: readonly string[];
  /** Every file this run will write — for templates (README, sitemap script) that need the whole set, not just their own path. */
  readonly files: readonly GeneratedFile[];
  /** Which file/class naming convention this Angular version's components use — see `domain/naming.ts`. */
  readonly naming: ComponentNaming;
}

// Naming helpers live in the domain layer (`domain/naming.ts`) so path
// derivation (`deriveFiles()`) and content rendering never disagree about
// what a given Angular version's components are named — re-exported here so
// every existing `from './template-context.model'` import keeps working.
export { toClassName, toCamelCase, componentFileStem, componentClassName, componentSuffix } from '../../domain';
export type { ComponentNaming } from '../../domain';

export interface ComponentSpecOptions {
  readonly requiredInputs?: Readonly<Record<string, string>>;
  /** Extra `TestBed.configureTestingModule({ providers: [...] })` entries, e.g. `provideRouter([])` for a component using `routerLink`. */
  readonly providers?: readonly string[];
  /** Import lines the entries in `providers` need, e.g. `import { provideRouter } from '@angular/router';`. */
  readonly providerImportLines?: readonly string[];
}

/**
 * A basic "should create" spec for a component whose class name is exactly
 * `componentClassName(baseName, naming)` — every plain scaffold component
 * (app root, header, footer, toast, modal). Components with a domain-name
 * prefix in their class (the example-domain slice) build their own spec
 * text instead, since their class name isn't a plain function of the file's
 * base name.
 */
export function basicComponentSpec(
  baseName: string,
  naming: ComponentNaming,
  options?: ComponentSpecOptions,
): string {
  const stem = componentFileStem(baseName, naming);
  const className = componentClassName(baseName, naming);
  const setup = options?.requiredInputs
    ? Object.entries(options.requiredInputs)
        .map(([key, value]) => `    fixture.componentRef.setInput('${key}', ${JSON.stringify(value)});\n`)
        .join('')
    : '';
  const providers = options?.providers ?? [];
  const providerImportLines = options?.providerImportLines ?? [];
  const providersBlock = providers.length > 0 ? `,\n      providers: [${providers.join(', ')}]` : '';
  return `import { ComponentFixture, TestBed } from '@angular/core/testing';
${providerImportLines.length > 0 ? `${providerImportLines.join('\n')}\n` : ''}import { ${className} } from './${stem}';

describe('${className}', () => {
  let component: ${className};
  let fixture: ComponentFixture<${className}>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [${className}]${providersBlock},
    }).compileComponents();

    fixture = TestBed.createComponent(${className});
    component = fixture.componentInstance;
${setup}    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
`;
}
