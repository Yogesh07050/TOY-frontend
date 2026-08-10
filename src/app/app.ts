import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from './core/auth.service';
import { LocationService, SUGGESTED_CITIES } from './core/location.service';
import { ToastsComponent } from './shared/ui.components';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly auth = inject(AuthService);
  readonly locations = inject(LocationService);
  private readonly router = inject(Router);

  readonly cities = SUGGESTED_CITIES;
  readonly menuOpen = signal(false);
  readonly locationOpen = signal(false);
  readonly accountOpen = signal(false);

  readonly user = this.auth.user;
  readonly isAdminArea = signal(false);

  readonly initials = computed(() => {
    const name = this.user()?.name ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  });

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.isAdminArea.set((event as NavigationEnd).urlAfterRedirects.startsWith('/admin'));
      this.closeAll();
    });
  }

  /** Closes the dropdowns when the user clicks anywhere outside them. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.location-picker')) this.locationOpen.set(false);
    if (!target.closest('.account-menu')) this.accountOpen.set(false);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  toggleLocation(event: Event): void {
    event.stopPropagation();
    this.locationOpen.update((open) => !open);
    this.accountOpen.set(false);
  }

  toggleAccount(event: Event): void {
    event.stopPropagation();
    this.accountOpen.update((open) => !open);
    this.locationOpen.set(false);
  }

  useCurrentLocation(): void {
    this.locations.requestCurrentPosition();
    this.locationOpen.set(false);
  }

  pickCity(city: (typeof SUGGESTED_CITIES)[number]): void {
    this.locations.selectCity(city);
    this.locationOpen.set(false);
  }

  clearLocation(): void {
    this.locations.clear();
    this.locationOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
  }

  private closeAll(): void {
    this.menuOpen.set(false);
    this.locationOpen.set(false);
    this.accountOpen.set(false);
  }
}
