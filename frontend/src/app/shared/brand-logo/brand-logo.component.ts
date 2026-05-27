import { Component, input } from '@angular/core';
import { BRAND } from '../../core/constants/brand';

@Component({
  selector: 'app-brand-logo',
  template: `
    <img
      [src]="logoUrl()"
      [alt]="alt()"
      [class]="'brand-logo brand-logo--' + size()"
    />
  `,
  styles: `
    :host {
      display: block;
    }

    .brand-logo {
      display: block;
      width: auto;
      max-width: 100%;
      object-fit: contain;
    }

    .brand-logo--sm {
      height: 32px;
    }

    .brand-logo--md {
      height: 40px;
    }

    .brand-logo--lg {
      height: 52px;
    }
  `,
})
export class BrandLogoComponent {
  readonly logoUrl = input(BRAND.logoUrl);
  readonly alt = input(`${BRAND.name} — logo`);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
}
