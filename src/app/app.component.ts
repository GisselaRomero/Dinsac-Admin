// app.component.ts
import { Component, OnInit } from '@angular/core';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ProductosComponent } from "./components/productos/productos.component";
import { RouterModule } from '@angular/router';
import { LoginComponent } from "./components/login/login.component";
import { ChatNotificationService } from './services/chat-notification.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone : true,
  imports: [ RouterModule],
  styleUrls: ['./app.component.css'],
  
})
export class AppComponent implements OnInit {
  
  constructor(private chatNotifService: ChatNotificationService) {}

  ngOnInit(): void {
    // ✅ Esto fuerza la inicialización del servicio
    console.log('🚀 Aplicación iniciada - Socket chat activo');
  }
}