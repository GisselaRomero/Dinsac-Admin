// app.component.ts
import { Component } from '@angular/core';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ProductosComponent } from "./components/productos/productos.component";
import { RouterModule } from '@angular/router';
import { LoginComponent } from "./components/login/login.component";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone : true,
  imports: [ RouterModule],
  styleUrls: ['./app.component.css'],
  
})
export class AppComponent {}
