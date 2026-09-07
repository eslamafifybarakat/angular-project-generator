import type { Lang } from '@core/i18n/i18n.model';
import {
  defaultCustomArchitecture,
  type ArchitectureType,
  type CustomArchitectureConfig,
} from './architecture.model';

/**
 * The one configuration object the whole wizard reads and writes.
 *
 * Field names follow the extracted configuration schema exactly, so a config
 * exported here can be handed to the generator without a translation layer.
 * Where the schema settled a choice, the type has a single member rather than
 * a union — `preprocessor: 'scss'` is not an oversight, it is the only
 * verified stylesheet template. `architecture.pattern` is a real union
 * because all four folder contracts in `architecture-registry.ts` are.
 */
export interface ProjectConfig {
  project: ProjectSection;
  angular: AngularSection;
  architecture: ArchitectureSection;
  styling: StylingSection;
  theme: ThemeSection;
  localization: LocalizationSection;
  /** Font family per generated-project language code. */
  fonts: Record<string, string>;
  rendering: RenderingSection;
  seo: SeoSection;
  environments: EnvironmentEntry[];
  features: FeatureSection;
  developerTools: DeveloperToolsSection;
}

export interface ProjectSection {
  name: string;
  slug: string;
  description: string;
  /** Prototype metadata. Deliberately does not affect a generated file. */
  type: string;
}

export interface AngularSection {
  version: string;
}

export interface ArchitectureSection {
  pattern: ArchitectureType;
  /**
   * Single owner of the example-domain switch. The "example code" step reads
   * and writes this same flag rather than keeping a parallel one.
   */
  includeExampleDomain: boolean;
  /** '' auto-derives the slice name from the project slug. */
  exampleName: string;
  /**
   * Only read when `pattern === 'custom'` — every other pattern ignores it
   * outright, so switching away can never leak a custom directory into DDD,
   * Feature-based or Simple. Left populated (rather than cleared) while
   * another pattern is selected, so switching back to Custom does not lose
   * what was typed in.
   */
  custom: CustomArchitectureConfig;
}

export interface StylingSection {
  preprocessor: 'scss';
}

export type ThemeSource = 'default' | 'template';

export interface ThemeSection {
  source: ThemeSource;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  supportDualMode: boolean;
  useDefaultScales: boolean;
}

export interface LocalizationSection {
  enabled: boolean;
  defaultLanguage: string;
  selectedLanguages: string[];
  /** Route-prefix duplication is the only supported strategy. */
  urlStrategy: 'prefix';
}

export type RenderingMode = 'ssr' | 'csr' | 'hybrid';
export type HydrationStrategy = 'default' | 'event-replay';

export interface RenderingSection {
  mode: RenderingMode;
  prerender: boolean;
  hydrationStrategy: HydrationStrategy;
}

export interface SeoSection {
  enabled: boolean;
  jsonLd: boolean;
  sitemap: boolean;
  siteName: string;
  defaultOgImage: string;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
}

export interface EnvironmentEntry {
  name: string;
  apiUrl: string;
  siteUrl: string;
  extra: EnvironmentVariable[];
}

/** Toast and modal offer all three. The date picker never offers 'customized'. */
export type FeatureChoice = 'none' | 'install-later' | 'customized';
export type DatePickerChoice = 'none' | 'install-later';

export interface FeatureSection {
  toast: FeatureChoice;
  modal: FeatureChoice;
  datePicker: DatePickerChoice;
}

export interface DeveloperToolsSection {
  eslint: boolean;
  prettier: boolean;
  editorconfig: boolean;
  husky: boolean;
  lintStaged: boolean;
  unit: boolean;
  e2e: boolean;
  lazy: boolean;
  imageOpt: boolean;
  budgets: boolean;
  a11y: boolean;
  aria: boolean;
  keyboard: boolean;
}

export const DEVELOPER_TOOL_KEYS = [
  'eslint',
  'prettier',
  'editorconfig',
  'husky',
  'lintStaged',
  'unit',
  'e2e',
  'lazy',
  'imageOpt',
  'budgets',
  'a11y',
  'aria',
  'keyboard',
] as const satisfies readonly (keyof DeveloperToolsSection)[];

/** Languages the generated project can be configured for. */
export interface GeneratedLanguage {
  readonly code: string;
  readonly name: string;
  readonly native: string;
  readonly dir: 'ltr' | 'rtl';
  readonly script: FontScript;
}

export type FontScript = 'latin' | 'arabic' | 'cyrillic' | 'cjk' | 'hebrew' | 'devanagari';

export const GENERATED_LANGUAGES: readonly GeneratedLanguage[] = [
  { code: 'en', name: 'English', native: 'English', dir: 'ltr', script: 'latin' },
  { code: 'ar', name: 'Arabic', native: 'العربية', dir: 'rtl', script: 'arabic' },
  { code: 'ru', name: 'Russian', native: 'Русский', dir: 'ltr', script: 'cyrillic' },
  { code: 'zh', name: 'Chinese', native: '中文', dir: 'ltr', script: 'cjk' },
  { code: 'fr', name: 'French', native: 'Français', dir: 'ltr', script: 'latin' },
  { code: 'es', name: 'Spanish', native: 'Español', dir: 'ltr', script: 'latin' },
  { code: 'de', name: 'German', native: 'Deutsch', dir: 'ltr', script: 'latin' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', dir: 'ltr', script: 'latin' },
  { code: 'he', name: 'Hebrew', native: 'עברית', dir: 'rtl', script: 'hebrew' },
  { code: 'fa', name: 'Persian', native: 'فارسی', dir: 'rtl', script: 'arabic' },
  { code: 'ja', name: 'Japanese', native: '日本語', dir: 'ltr', script: 'cjk' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', dir: 'ltr', script: 'devanagari' },
];

export const FONTS_BY_SCRIPT: Readonly<Record<FontScript, readonly string[]>> = {
  latin: ['Inter', 'Figtree', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans', 'Noto Sans'],
  cyrillic: ['Inter', 'Roboto', 'Noto Sans', 'Open Sans', 'Montserrat'],
  arabic: ['Cairo', 'Tajawal', 'IBM Plex Sans Arabic', 'Noto Sans Arabic'],
  hebrew: ['Noto Sans Hebrew', 'Inter'],
  cjk: ['System stack', 'Noto Sans SC (subset)'],
  devanagari: ['Noto Sans Devanagari', 'Inter'],
};

export const PROJECT_TYPES: readonly string[] = [
  'Website',
  'Web application',
  'Admin dashboard',
  'SaaS',
  'E-commerce',
  'Portal',
  'Landing page',
];

export function languageMeta(code: string): GeneratedLanguage {
  return (
    GENERATED_LANGUAGES.find((l) => l.code === code) ?? {
      code,
      name: code,
      native: code,
      dir: 'ltr',
      script: 'latin',
    }
  );
}

/** Fonts available for a generated-project language. */
export function fontsFor(code: string): readonly string[] {
  return FONTS_BY_SCRIPT[languageMeta(code).script];
}

export function defaultProjectConfig(): ProjectConfig {
  return {
    project: {
      name: 'My Project',
      slug: 'my-project',
      description: '',
      type: 'Portal',
    },
    angular: { version: '22' },
    architecture: {
      pattern: 'ddd',
      includeExampleDomain: true,
      exampleName: '',
      custom: defaultCustomArchitecture(),
    },
    styling: { preprocessor: 'scss' },
    theme: {
      source: 'template',
      primaryColor: '#0e39b6',
      secondaryColor: '#0e7c74',
      accentColor: '#b87a16',
      supportDualMode: true,
      useDefaultScales: true,
    },
    localization: {
      enabled: true,
      defaultLanguage: 'en',
      selectedLanguages: ['en', 'ar'],
      urlStrategy: 'prefix',
    },
    fonts: { en: 'Figtree', ar: 'Cairo' },
    rendering: { mode: 'ssr', prerender: true, hydrationStrategy: 'event-replay' },
    seo: {
      enabled: true,
      jsonLd: true,
      sitemap: true,
      siteName: '',
      defaultOgImage: 'https://talbinah.example/og.png',
    },
    environments: [
      {
        name: 'development',
        apiUrl: 'https://api.dev.talbinah.example',
        siteUrl: 'https://dev.talbinah.example',
        extra: [],
      },
      {
        name: 'staging',
        apiUrl: 'https://api.staging.talbinah.example',
        siteUrl: 'https://staging.talbinah.example',
        extra: [],
      },
      {
        name: 'production',
        apiUrl: 'https://api.talbinah.example',
        siteUrl: 'https://talbinah.example',
        extra: [],
      },
    ],
    features: { toast: 'customized', modal: 'customized', datePicker: 'install-later' },
    developerTools: {
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
    },
  };
}

/** The wizard's step order. Route segments and rail labels both derive from it. */
export const WIZARD_STEPS = [
  'project',
  'angular',
  'architecture',
  'styling',
  'theme',
  'languages',
  'rendering',
  'environments',
  'features',
  'tools',
  'example',
  'review',
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number];

/** Interface-language codes, distinct from ProjectConfig languages. */
export type InterfaceLang = Lang;
