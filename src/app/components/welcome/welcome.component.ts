import { Component } from '@angular/core';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { RouterModule, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome',
  standalone: true, 
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
  imports: [SidebarComponent, RouterOutlet,RouterModule]
})
export class WelcomeComponent {
  constructor(private router: Router) {}
}
