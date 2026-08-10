import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { AuthService } from './core/auth.service';
import { authInterceptor, errorInterceptor, refreshInterceptor } from './core/interceptors';

/**
 * Resolves the signed-in user before the first navigation so route guards see a
 * settled auth state instead of briefly bouncing everyone to the login page.
 */
function restoreSession(auth: AuthService) {
  return () => firstValueFrom(auth.restore()).catch(() => null);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    // Order matters: auth attaches the token, refresh retries a 401 once,
    // error turns whatever is left into a toast.
    provideHttpClient(withInterceptors([authInterceptor, refreshInterceptor, errorInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: restoreSession,
      deps: [AuthService],
      multi: true,
    },
  ],
};
