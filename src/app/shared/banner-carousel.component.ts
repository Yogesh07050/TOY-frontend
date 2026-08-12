import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ApiService } from '../core/api.service';
import { Banner } from '../core/models';

/**
 * Featured banner carousel (§3, §4, §11).
 *
 * Clicking a banner navigates straight to the promoted offer's details page -
 * never to a banner page of its own. Impressions are recorded once per banner
 * per mount when it actually becomes visible, so a banner scrolled past off
 * screen is not counted.
 */
@Component({
  selector: 'app-banner-carousel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (banners.length) {
      <section class="featured" aria-label="Featured offers">
        <div class="featured-head">
          <h2>Featured</h2>
          @if (banners.length > 1) {
            <div class="controls">
              <button type="button" class="icon-btn" (click)="scrollBy(-1)" aria-label="Previous">‹</button>
              <button type="button" class="icon-btn" (click)="scrollBy(1)" aria-label="Next">›</button>
            </div>
          }
        </div>

        <div class="track" #track (scroll)="onScroll()">
          @for (banner of banners; track banner.id) {
            <article
              class="banner"
              [attr.data-banner-id]="banner.id"
              [style.--banner-image]="backgroundFor(banner)"
              (click)="open(banner)"
              (keydown.enter)="open(banner)"
              tabindex="0"
              role="link"
              [attr.aria-label]="banner.title + ' — ' + banner.offerTitle"
            >
              <!-- Responsive art: the browser picks by viewport, falling back to
                   the single image when only one was uploaded (§11). -->
              @if (banner.mobileImageUrl || banner.desktopImageUrl || banner.imageUrl) {
                <picture class="art">
                  @if (banner.desktopImageUrl) {
                    <source media="(min-width: 720px)" [srcset]="banner.desktopImageUrl" />
                  }
                  <img
                    [src]="banner.mobileImageUrl || banner.imageUrl || banner.desktopImageUrl"
                    [alt]="banner.title"
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
              }

              <div class="content">
                <span class="shop-tag">{{ banner.shop.name }}</span>
                <h3>{{ banner.title }}</h3>
                @if (banner.subtitle) {
                  <p class="subtitle">{{ banner.subtitle }}</p>
                }
                <span class="cta">{{ banner.buttonText }} →</span>
              </div>
            </article>
          }
        </div>

        @if (banners.length > 1) {
          <div class="dots" role="tablist">
            @for (banner of banners; track banner.id; let i = $index) {
              <button
                type="button"
                class="dot"
                [class.active]="activeIndex() === i"
                (click)="goTo(i)"
                [attr.aria-label]="'Go to banner ' + (i + 1)"
              ></button>
            }
          </div>
        }
      </section>
    }
  `,
  styleUrl: './banner-carousel.component.scss',
})
export class BannerCarouselComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  @Input({ required: true }) banners: Banner[] = [];

  private readonly track = viewChild<ElementRef<HTMLDivElement>>('track');
  readonly activeIndex = signal(0);

  private observer?: IntersectionObserver;
  private readonly counted = new Set<number>();

  ngOnInit(): void {
    // Count an impression only when the banner is actually on screen.
    queueMicrotask(() => this.observeImpressions());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private observeImpressions(): void {
    const element = this.track()?.nativeElement;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = Number((entry.target as HTMLElement).dataset['bannerId']);
          if (!id || this.counted.has(id)) continue;

          this.counted.add(id);
          this.api.trackBanner(id, 'impression').subscribe({ error: () => undefined });
        }
      },
      { threshold: 0.5 },
    );

    for (const child of Array.from(element.querySelectorAll('.banner'))) {
      this.observer.observe(child);
    }
  }

  /** §4: a banner always leads to its associated offer's details page. */
  open(banner: Banner): void {
    this.api.trackBanner(banner.id, 'click').subscribe({ error: () => undefined });
    void this.router.navigate(['/offers', banner.offerId]);
  }

  backgroundFor(banner: Banner): string {
    const image = banner.desktopImageUrl || banner.imageUrl || banner.offerImageUrl;
    return image ? `url('${image}')` : 'none';
  }

  scrollBy(direction: 1 | -1): void {
    const element = this.track()?.nativeElement;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.9, behavior: 'smooth' });
  }

  goTo(index: number): void {
    const element = this.track()?.nativeElement;
    const target = element?.querySelectorAll<HTMLElement>('.banner')[index];
    if (!element || !target) return;
    element.scrollTo({ left: target.offsetLeft - element.offsetLeft, behavior: 'smooth' });
  }

  onScroll(): void {
    const element = this.track()?.nativeElement;
    if (!element) return;
    const children = Array.from(element.querySelectorAll<HTMLElement>('.banner'));
    const centre = element.scrollLeft + element.clientWidth / 2;
    const index = children.findIndex(
      (child) => child.offsetLeft - element.offsetLeft + child.clientWidth > centre,
    );
    this.activeIndex.set(index === -1 ? children.length - 1 : index);
  }
}
