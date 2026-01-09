import { ApplicationConfig } from '@angular/core';
import { provideRouter, Routes, withHashLocation } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';

// Componentes
import { LoginComponent } from './components/login/login.component';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { CategoriasComponent } from './components/categorias/categorias.component';
import { ProductosComponent } from './components/productos/productos.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ReportesComponent } from './components/reportes/reportes.component';
import { ChatAdminStandaloneComponent } from './components/chat-admin-standalone/chat-admin-standalone.component';

// Rutas
export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },

  {
    path: 'welcome',
    component: WelcomeComponent,
    children: [
      { path: '', redirectTo: 'inicio-dashboard', pathMatch: 'full' },
      { path: 'inicio-dashboard', component: DashboardComponent },
      { path: 'categorias', component: CategoriasComponent },
      { path: 'reportes', component: ReportesComponent },
      { path: 'productos', component: ProductosComponent },
      { path: 'chat-admin-standalone', component: ChatAdminStandaloneComponent },

      {
        path: 'gestion-cotizaciones',
        loadComponent: () =>
          import('./components/gestion-cotizaciones/gestion-cotizaciones.component')
            .then(m => m.GestionCotizacionesComponent)
      },

      {
        path: 'bannerofertas',
        loadComponent: () =>
          import('./components/bannerofertas/bannerofertas.component')
            .then(c => c.BannerofertasComponent)
      }
    ]
  },

  { path: '**', redirectTo: '' }
];

// ✅ CONFIGURACIÓN FINAL
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withHashLocation()), // 🔥 AQUÍ VA
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch())
  ]
};
