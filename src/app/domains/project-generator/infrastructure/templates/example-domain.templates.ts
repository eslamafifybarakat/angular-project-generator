import { registerContentResolver } from './content-registry';
import { componentFileStem, componentSuffix, toClassName } from './template-context.model';
import type { ComponentNaming } from './template-context.model';

/**
 * The one example slice generated when `architecture.includeExampleDomain`
 * is on — DDD's 4-layer pattern is adapted from `angular22-ddd-starter`'s
 * `domains/articles/*` (the one concrete example that project verified
 * end-to-end); Feature-based/Simple/Custom have no literal source
 * counterpart, so their content is hand-authored to the same idiomatic
 * standard rather than left as a stub, per `architecture-registry.ts`'s own
 * `architectureExampleFiles()` shape.
 *
 * Every path here is suffix-matched against `ctx.resolved.exampleName`
 * (`name`) rather than parsed out of the path — the resolved architecture
 * already knows the name, so there is nothing to re-derive. Checks run
 * specific-before-general so e.g. `/application/<name>.service.ts` (DDD) is
 * claimed before the generic `<name>.service.ts` (Custom) pattern would.
 */

function seedJson(className: string): string {
  return (
    JSON.stringify(
      {
        status: 'ok',
        message: 'Example seed data',
        data: [
          { id: '1', title: `First ${className}`, description: 'Replace with real data.' },
          { id: '2', title: `Second ${className}`, description: 'Replace with real data.' },
        ],
      },
      null,
      2,
    ) + '\n'
  );
}

function overviewHtml(className: string): string {
  return `<section>
  <h2>${className} overview</h2>
  <ul>
    @for (item of service.items(); track item.id) {
      <li>{{ item.title }}</li>
    }
  </ul>
</section>
`;
}

/** A plain "should create" spec for a component whose class name isn't a
 * plain function of the file's base name (it's `<domain><Role>` — e.g.
 * `ArticlesOverview`), so it can't reuse `basicComponentSpec`. */
function smokeSpec(className: string, importStem: string): string {
  return `import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ${className} } from './${importStem}';

describe('${className}', () => {
  let component: ${className};
  let fixture: ComponentFixture<${className}>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [${className}],
    }).compileComponents();

    fixture = TestBed.createComponent(${className});
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
`;
}

registerContentResolver((path, ctx) => {
  if (!ctx.cfg.architecture.includeExampleDomain) return undefined;

  const name = ctx.resolved.exampleName;
  const className = toClassName(name);
  const naming: ComponentNaming = ctx.naming;
  const suffix = componentSuffix(naming);
  const overviewStem = componentFileStem('overview', naming);
  const pageStem = componentFileStem(name, naming);
  const summaryBase = `${name}-summary`;
  const summaryStem = componentFileStem(summaryBase, naming);
  const overviewClass = `${className}Overview${suffix}`;
  const pageClass = `${className}Page${suffix}`;
  const summaryClass = `${className}Summary${suffix}`;
  const rootClass = `${className}${suffix}`;

  // -- DDD (most specific first) -------------------------------------------
  if (path.endsWith(`/domain/${name}.model.ts`)) {
    return `export interface ${className} {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}
`;
  }
  if (path.endsWith(`/application/${name}.service.ts`)) {
    return `import { Injectable, inject, signal } from '@angular/core';
import { ${className}Repository } from '../infrastructure/${name}.repository';
import type { ${className} } from '../domain/${name}.model';

@Injectable({ providedIn: 'root' })
export class ${className}Service {
  private readonly repository = inject(${className}Repository);
  private readonly _items = signal<readonly ${className}[]>(this.repository.findAll());
  readonly items = this._items.asReadonly();

  findBySlug(id: string): ${className} | undefined {
    return this._items().find((item) => item.id === id);
  }
}
`;
  }
  if (path.endsWith(`/infrastructure/${name}.repository.ts`)) {
    return `import { Injectable } from '@angular/core';
import { ${className.toUpperCase()}_DATA } from './data/${name}.data';
import type { ${className} } from '../domain/${name}.model';

/** The seam a real backend slots in behind later: replace this body with
 * HttpClient calls returning the same ${className}[] shape — nothing above
 * it (service, component) needs to change. */
@Injectable({ providedIn: 'root' })
export class ${className}Repository {
  findAll(): readonly ${className}[] {
    return ${className.toUpperCase()}_DATA;
  }
}
`;
  }
  if (path.endsWith(`/infrastructure/data/${name}.data.ts`)) {
    return `import { readApiResponse } from '@core/data/read-api-response';
import type { ApiResponse } from '@core/data/api-response.model';
import raw from './${name}.json';
import type { ${className} } from '../../domain/${name}.model';

export const ${className.toUpperCase()}_DATA: readonly ${className}[] = readApiResponse(raw as ApiResponse<${className}[]>);
`;
  }
  if (path.endsWith(`/infrastructure/data/${name}.json`)) {
    return seedJson(className);
  }
  if (path.endsWith(`/presentation/overview/${overviewStem}.html`)) {
    return overviewHtml(className);
  }
  if (path.endsWith(`/presentation/overview/${overviewStem}.ts`)) {
    return `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ${className}Service } from '../../application/${name}.service';

@Component({
  selector: 'app-${name}-overview',
  templateUrl: './${overviewStem}.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${overviewClass} {
  protected readonly service = inject(${className}Service);
}
`;
  }
  if (path.endsWith(`/presentation/overview/${overviewStem}.spec.ts`)) {
    return smokeSpec(overviewClass, overviewStem);
  }
  if (path.endsWith(`/presentation/${name}.module.ts`)) {
    return `import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ${overviewClass} } from './overview/${overviewStem}';

@NgModule({
  declarations: [${overviewClass}],
  imports: [CommonModule],
  exports: [${overviewClass}],
})
export class ${className}Module {}
`;
  }

  // -- Feature-based / Simple ------------------------------------------------
  if (path.endsWith(`/pages/${name}/${pageStem}.html`)) {
    return `<section>
  <h2>${className}</h2>
  <p>{{ summary() }}</p>
</section>
`;
  }
  if (path.endsWith(`/pages/${name}/${pageStem}.ts`)) {
    return `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ${className}Service } from '../../services/${name}.service';

@Component({
  selector: 'app-${name}-page',
  templateUrl: './${pageStem}.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${pageClass} {
  private readonly service = inject(${className}Service);
  protected readonly summary = this.service.summary;
}
`;
  }
  if (path.endsWith(`/pages/${name}/${pageStem}.spec.ts`)) {
    return smokeSpec(pageClass, pageStem);
  }
  if (path.endsWith(`-summary/${summaryStem}.ts`)) {
    return `import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-${name}-summary',
  template: \`<p>{{ text() }}</p>\`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${summaryClass} {
  readonly text = input('');
}
`;
  }
  if (path.endsWith(`-summary/${summaryStem}.spec.ts`)) {
    return smokeSpec(summaryClass, summaryStem);
  }
  if (path.endsWith(`/services/${name}.service.ts`)) {
    return `import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ${className}Service {
  private readonly _summary = signal('Replace with real data.');
  readonly summary = this._summary.asReadonly();
}
`;
  }
  if (path.endsWith(`/models/${name}.model.ts`)) {
    return `export interface ${className} {
  readonly id: string;
  readonly title: string;
}
`;
  }

  // -- Feature-based / Custom root files --------------------------------------
  if (path.endsWith(`/${name}.routes.ts`)) {
    return `import { Routes } from '@angular/router';

export const ${toClassName(name).charAt(0).toLowerCase() + toClassName(name).slice(1)}Routes: Routes = [];
`;
  }
  if (path.endsWith(`/${name}.module.ts`)) {
    return `import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

@NgModule({
  imports: [CommonModule],
})
export class ${className}Module {}
`;
  }
  if (path.endsWith(`/${pageStem}.html`)) {
    return `<section>
  <h2>${className}</h2>
</section>
`;
  }
  if (path.endsWith(`/${pageStem}.ts`)) {
    return `import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-${name}',
  templateUrl: './${pageStem}.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${rootClass} {}
`;
  }
  if (path.endsWith(`/${pageStem}.spec.ts`)) {
    return smokeSpec(rootClass, pageStem);
  }
  if (path.endsWith(`/${name}.service.ts`)) {
    return `import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ${className}Service {
  private readonly _summary = signal('Replace with real data.');
  readonly summary = this._summary.asReadonly();
}
`;
  }

  return undefined;
});
