import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { PreferredLocation } from './models';

const STORAGE_KEY = 'offers.location';

export type LocationSource = 'gps' | 'manual' | 'profile' | 'none';

export interface SelectedLocation {
  label: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  source: LocationSource;
}

const NO_LOCATION: SelectedLocation = {
  label: 'All locations',
  city: null,
  latitude: null,
  longitude: null,
  source: 'none',
};

/** Cities offered for manual selection when the customer declines GPS (§8.1). */
export const SUGGESTED_CITIES: { city: string; latitude: number; longitude: number }[] = [
  { city: 'Coimbatore', latitude: 11.0168, longitude: 76.9558 },
  { city: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
  { city: 'Bengaluru', latitude: 12.9716, longitude: 77.5946 },
  { city: 'Hyderabad', latitude: 17.385, longitude: 78.4867 },
  { city: 'Mumbai', latitude: 19.076, longitude: 72.8777 },
  { city: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { city: 'Kochi', latitude: 9.9312, longitude: 76.2673 },
  { city: 'Madurai', latitude: 9.9252, longitude: 78.1198 },
];

/**
 * Holds the customer's current or selected location.
 *
 * Location is strictly optional (§8.6): if permission is denied, or the browser
 * has no geolocation, the app keeps working and manual selection stays
 * available. Nothing here ever blocks browsing.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  private readonly selected = signal<SelectedLocation>(this.readStored());
  readonly location = this.selected.asReadonly();
  readonly hasPosition = computed(() => this.selected().latitude !== null);
  readonly requesting = signal(false);
  /** True once the browser has refused, so we stop offering "Use my location". */
  readonly permissionDenied = signal(false);

  constructor() {
    // Fall back to the location saved on the user's profile when nothing has
    // been picked in this browser yet.
    effect(() => {
      const user = this.auth.user();
      const current = this.selected();
      if (user?.preferredLocation?.latitude && current.source === 'none') {
        this.selected.set({
          label: user.preferredLocation.city ?? 'My location',
          city: user.preferredLocation.city,
          latitude: user.preferredLocation.latitude,
          longitude: user.preferredLocation.longitude,
          source: 'profile',
        });
      }
    });
  }

  /** Position to send with discovery requests, or null when unknown. */
  get position(): PreferredLocation | null {
    const value = this.selected();
    if (value.latitude === null || value.longitude === null) return null;
    return { city: value.city, latitude: value.latitude, longitude: value.longitude };
  }

  /** Asks the browser for GPS. Declining is a normal outcome, not an error. */
  requestCurrentPosition(): void {
    if (!('geolocation' in navigator)) {
      this.toast.info('This browser cannot share your location. Pick a city instead.');
      this.permissionDenied.set(true);
      return;
    }

    this.requesting.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.requesting.set(false);
        this.permissionDenied.set(false);
        this.set({
          label: 'Near me',
          city: null,
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          source: 'gps',
        });
        this.toast.success('Using your current location.');
      },
      (error) => {
        this.requesting.set(false);
        if (error.code === error.PERMISSION_DENIED) {
          this.permissionDenied.set(true);
          this.toast.info('Location access declined. You can still pick a city manually.');
        } else {
          this.toast.info('Could not determine your location. Pick a city instead.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }

  selectCity(city: { city: string; latitude: number; longitude: number }): void {
    this.set({
      label: city.city,
      city: city.city,
      latitude: city.latitude,
      longitude: city.longitude,
      source: 'manual',
    });
  }

  clear(): void {
    this.set(NO_LOCATION);
  }

  private set(value: SelectedLocation): void {
    this.selected.set(value);
    if (value.source === 'none') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
  }

  private readStored(): SelectedLocation {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return NO_LOCATION;
      const parsed = JSON.parse(raw) as SelectedLocation;
      return parsed.latitude !== undefined ? parsed : NO_LOCATION;
    } catch {
      return NO_LOCATION;
    }
  }
}
