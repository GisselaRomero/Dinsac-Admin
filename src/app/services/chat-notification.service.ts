import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatNotificationService {
  // 🔹 BehaviorSubject para manejar el total de clientes con mensajes nuevos
  private notificacionesSubject = new BehaviorSubject<number>(0);

  // 🔹 Observable público al que los componentes pueden suscribirse
  notificaciones$ = this.notificacionesSubject.asObservable();

  constructor() {}

  // 🔹 Método para actualizar el total
  actualizar(total: number) {
    this.notificacionesSubject.next(total);
  }
}
