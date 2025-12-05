import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

@Component({
  standalone : true, 
  selector: 'app-login',
  imports : [FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  message: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    this.authService.login(this.username, this.password).subscribe(
      (response) => {
        this.message = 'Login exitoso!';
        console.log('Usuario:', response.user);
        // Después del login exitoso, redirige al componente "Welcome"
        this.router.navigate(['/welcome']);  // Redirige a la ruta '/welcome'
      },
      (error) => {
        this.message = 'Credenciales incorrectas';
        console.error('Error:', error);
      }
    );

  }
  
}
