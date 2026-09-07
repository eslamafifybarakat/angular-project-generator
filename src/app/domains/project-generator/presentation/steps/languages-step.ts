import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { Help } from '@shared/ui/help';
import { Dropdown, type DropdownOption } from '@shared/ui/dropdown';
import { ProjectConfigService } from '../../application';
import {
  GENERATED_LANGUAGES,
  fontsFor,
  languageMeta,
  type GeneratedLanguage,
} from '../../domain';

@Component({
  selector: 'app-languages-step',
  imports: [TranslatePipe, Help, Dropdown],
  templateUrl: './languages-step.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguagesStep {
  protected readonly configuration = inject(ProjectConfigService);
  protected readonly catalog = GENERATED_LANGUAGES;

  protected readonly localization = computed(() => this.configuration.config().localization);
  protected readonly fonts = computed(() => this.configuration.config().fonts);
  protected readonly isMultiple = computed(
    () => this.localization().selectedLanguages.length > 1,
  );
  protected readonly selectedMeta = computed(() =>
    this.localization().selectedLanguages.map((code) => languageMeta(code)),
  );
  protected readonly hasChinese = computed(() =>
    this.localization().selectedLanguages.includes('zh'),
  );
  protected readonly defaultLanguageOptions = computed<readonly DropdownOption[]>(() =>
    this.selectedMeta().map((language) => ({ value: language.code, label: language.name })),
  );

  protected readonly languageIssues = computed(() =>
    this.configuration.issuesForPath('localization.selectedLanguages'),
  );
  protected readonly defaultIssues = computed(() =>
    this.configuration.issuesForPath('localization.defaultLanguage'),
  );

  protected isSelected(code: string): boolean {
    return this.localization().selectedLanguages.includes(code);
  }

  protected fontOptions(code: string): readonly string[] {
    return fontsFor(code);
  }

  protected fontDropdownOptions(code: string): readonly DropdownOption[] {
    return fontsFor(code).map((font) => ({ value: font, label: font }));
  }

  protected fontFor(code: string): string {
    return this.fonts()[code] ?? this.fontOptions(code)[0];
  }

  /** Script-appropriate specimen: a Latin pangram tells you nothing about Cairo. */
  protected sampleFor(language: GeneratedLanguage): string {
    switch (language.script) {
      case 'arabic':
        return 'نصٌّ تجريبي للمعاينة';
      case 'cjk':
        return '示例文本预览';
      case 'cyrillic':
        return 'Пример текста';
      case 'hebrew':
        return 'טקסט לדוגמה';
      case 'devanagari':
        return 'नमूना पाठ';
      default:
        return 'Sample text preview';
    }
  }

  protected toggleEnabled(event: Event): void {
    this.configuration.patch('localization', {
      enabled: (event.target as HTMLInputElement).checked,
    });
  }

  protected onLanguage(code: string, event: Event): void {
    this.configuration.toggleLanguage(code, (event.target as HTMLInputElement).checked);
  }

  protected onDefault(value: string): void {
    this.configuration.patch('localization', { defaultLanguage: value });
  }

  protected onFont(code: string, value: string): void {
    this.configuration.setFont(code, value);
  }

  protected prefixFor(code: string): string {
    return code === this.localization().defaultLanguage ? "''" : `'${code}'`;
  }
}
