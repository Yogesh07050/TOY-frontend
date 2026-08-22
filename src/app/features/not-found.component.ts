import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="container page">
      <div class="empty-state">
        <app-icon name="compass-outline" [size]="16" />
        <h1>Page not found</h1>
        <p>The page you were looking for does not exist or has moved.</p>
        <a routerLink="/offers" class="btn mt-2">Browse offers</a>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
