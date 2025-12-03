import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  totalPendientes = 0;
  private readonly API_URL = 'https://backend-dinsac-hlf0.onrender.com';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarPendientes();

    // 🔁 Actualiza cada 30 segundos automáticamente
    setInterval(() => this.cargarPendientes(), 30000);
  }

  cargarPendientes(): void {
   this.http.get<{ total?: number }>(`${this.API_URL}/cotizaciones/pendientes/total`)
  .subscribe({
    next: (res) => {
      if (res && typeof res.total === 'number') {
        this.totalPendientes = res.total;
      } else {
        console.warn('⚠️ Respuesta inesperada:', res);
        this.totalPendientes = 0;
      }
    },
    error: (err) => {
      console.error('❌ Error cargando pendientes:', err);
      this.totalPendientes = 0;
    }
  });

  }

  logClick(ruta: string) {
    console.log(`🧭 Click en: ${ruta}`);
    this.router.navigate([ruta], { relativeTo: this.router.routerState.root.firstChild })
      .then(success => console.log('✅ Navegación exitosa:', success))
      .catch(error => console.error('❌ Error en la navegación:', error));
  }

  logout() {
    console.log('🚪 Cerrar sesión');
    this.router.navigate(['/login']);
  }
}
