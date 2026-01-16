import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChatNotificationService } from 'src/app/services/chat-notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  totalPendientes = 0;
  totalChatsNuevos = 0;
  private readonly API_URL = 'https://backend-dinsac-77sq.onrender.com';
  private chatSub!: Subscription;

  constructor(
    private router: Router,
    private http: HttpClient,
    private chatNotifService: ChatNotificationService
  ) {}

  ngOnInit(): void {
    this.cargarPendientes();

    // 🔁 Actualiza cada 30 segundos automáticamente
    setInterval(() => this.cargarPendientes(), 30000);

    // 📩 Suscribirse a las notificaciones de chat
    this.chatSub = this.chatNotifService.notificaciones$
      .subscribe(total => {
        this.totalChatsNuevos = total;
      });
  }

  ngOnDestroy(): void {
    if (this.chatSub) {
      this.chatSub.unsubscribe();
    }
  }

  cargarPendientes(): void {
    this.http.get<{ total?: number }>(`${this.API_URL}/cotizaciones/pendientes/total`)
      .subscribe({
        next: (res) => {
          this.totalPendientes = (res && typeof res.total === 'number') ? res.total : 0;
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
