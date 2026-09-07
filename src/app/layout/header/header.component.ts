import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageService } from '@core/i18n/language.service';
import { TranslationService } from '@core/i18n/translation.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ThemeService } from '@core/theme/theme.service';
import { LANGUAGES, isLang, mirrorPath } from '@core/i18n/i18n.model';
import { DropdownComponent, type DropdownOption } from '@shared/ui/dropdown/dropdown.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, DropdownComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  protected readonly language = inject(LanguageService);
  protected readonly theme = inject(ThemeService);
  private readonly translations = inject(TranslationService);
  private readonly router = inject(Router);

  protected readonly languageOptions: readonly DropdownOption[] = LANGUAGES.map((item) => ({
    value: item.code,
    label: item.native,
  }));
  protected readonly menuOpen = signal(false);

  /** Language-aware link targets, so nav never drops an Arabic visitor at the English root. */
  protected readonly homeLink = computed(() => mirrorPath('/', this.language.lang()));
  protected readonly newLink = computed(() => mirrorPath('/new', this.language.lang()));

  protected readonly themeLabelKey = computed(() =>
    this.theme.isDark() ? 'theme.toLight' : 'theme.toDark',
  );

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  /**
   * Switching language keeps you on the same page: /ar/new/theme becomes
   * /new/theme, not /.
   */
  protected async switchLanguage(value: string): Promise<void> {
    if (!isLang(value)) {
      return;
    }
    const target = mirrorPath(this.router.url.split('?')[0], value);
    await this.translations.load(value);
    this.language.use(value);
    await this.router.navigateByUrl(target);
  }
}
