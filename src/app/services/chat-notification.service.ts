import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { HttpClient } from '@angular/common/http';

interface Mensaje {
  remitente: 'cliente' | 'admin';
  mensaje: string;
  clienteId: string | null;
  nombre?: string;
  fecha?: string;
}

interface Cliente {
  id: string;
  nombre: string;
  notificaciones?: number;
  ultimoMensaje?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatNotificationService implements OnDestroy {
  private socket!: Socket;
  private notificacionesSubject = new BehaviorSubject<number>(0);
  notificaciones$ = this.notificacionesSubject.asObservable();

  // 🔹 Agregar BehaviorSubject para los clientes
  private clientesSubject = new BehaviorSubject<Cliente[]>([]);
  clientes$ = this.clientesSubject.asObservable();

  private readonly BACKEND_URL = 'https://backend-dinsac-hlf0.onrender.com';

  constructor(private http: HttpClient, private ngZone: NgZone) {
    this.inicializarSocket();
    this.cargarClientes();
  }

  private inicializarSocket(): void {
    this.socket = io(this.BACKEND_URL, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket conectado globalmente');
      this.socket.emit('registrar', { clienteId: 'ADMIN' });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error en socket global:', error);
    });

    // 🔔 Escuchar mensajes entrantes
    this.socket.on('mensaje', (msg: Mensaje) => {
      this.ngZone.run(() => {
        this.procesarMensajeEntrante(msg);
      });
    });

    // 🗑️ Escuchar chat eliminado
    this.socket.on('chat-eliminado', (data: { clienteId: string }) => {
      this.ngZone.run(() => {
        const clientes = this.clientesSubject.value.filter(c => c.id !== data.clienteId);
        this.clientesSubject.next(clientes);
        this.actualizarContador();
      });
    });
  }

  private cargarClientes(): void {
    this.http.get<Cliente[]>(`${this.BACKEND_URL}/clientes-chat`)
      .subscribe({
        next: (res) => {
          const clientesActualizados = res.map(c => ({
            ...c,
            notificaciones: 0,
            ultimoMensaje: ''
          }));
          this.clientesSubject.next(clientesActualizados);
          console.log('✅ Clientes cargados en servicio:', clientesActualizados.length);
        },
        error: (err) => console.error('❌ Error cargando clientes:', err)
      });
  }

  private procesarMensajeEntrante(msg: Mensaje): void {
    if (msg.remitente !== 'cliente' || !msg.clienteId) return;

    const clientes = this.clientesSubject.value;
    let cliente = clientes.find(c => c.id === msg.clienteId);

    if (cliente) {
      // Cliente existe, incrementar notificaciones
      cliente.notificaciones = (cliente.notificaciones || 0) + 1;
      cliente.ultimoMensaje = msg.mensaje;
    } else {
      // Cliente nuevo
      cliente = {
        id: msg.clienteId,
        nombre: msg.nombre || `Cliente ${msg.clienteId.substring(0, 8)}`,
        notificaciones: 1,
        ultimoMensaje: msg.mensaje
      };
      clientes.push(cliente);
    }

    this.clientesSubject.next([...clientes]);
    this.actualizarContador();
  }

  private actualizarContador(): void {
    const total = this.clientesSubject.value
      .filter(c => c.notificaciones && c.notificaciones > 0).length;
    this.notificacionesSubject.next(total);
  }

  // 🔹 Método para limpiar notificaciones de un cliente específico
  limpiarNotificaciones(clienteId: string): void {
    const clientes = this.clientesSubject.value;
    const cliente = clientes.find(c => c.id === clienteId);
    
    if (cliente) {
      cliente.notificaciones = 0;
      this.clientesSubject.next([...clientes]);
      this.actualizarContador();
    }
  }

  // 🔹 Obtener el socket para que el componente de chat lo use
  getSocket(): Socket {
    return this.socket;
  }

  // 🔹 Obtener clientes actuales
  getClientes(): Cliente[] {
    return this.clientesSubject.value;
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
      console.log('🔴 Socket desconectado');
    }
  }
}