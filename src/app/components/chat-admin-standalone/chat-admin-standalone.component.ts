import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';
import { HttpClientModule, HttpClient } from '@angular/common/http';

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

@Component({
  selector: 'app-chat-admin-standalone',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './chat-admin-standalone.component.html',
  styleUrls: ['./chat-admin-standalone.component.css']
})
export class ChatAdminStandaloneComponent implements OnInit, OnDestroy {
  mensajeEscrito: string = '';
  mensajes: Mensaje[] = [];
  clientes: Cliente[] = [];
  clienteSeleccionado: string | null = null;
  socket!: Socket;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('✅ Admin conectado a Socket.IO');
      this.socket.emit('registrar', { clienteId: 'ADMIN' });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error conectando Socket.IO:', error);
    });

    this.cargarClientes();

    // Escuchar mensajes
    this.socket.on('mensaje', (msg: Mensaje) => {
      console.log('📩 Mensaje recibido:', msg);

      // Asignar nombre si es cliente
      if (msg.remitente === 'cliente' && msg.clienteId) {
        const cliente = this.clientes.find(c => c.id === msg.clienteId);
        msg.nombre = cliente ? cliente.nombre : 'Cliente';
      }

      // Agregar al chat activo si corresponde
      if (msg.clienteId === this.clienteSeleccionado) {
        const existe = this.mensajes.some(
          m => m.mensaje === msg.mensaje &&
               m.fecha === msg.fecha &&
               m.remitente === msg.remitente
        );
        if (!existe) {
          this.mensajes.push(msg);
          setTimeout(() => this.scrollToBottom(), 100);
        }
      } else {
        // Incrementar notificaciones si el cliente no está seleccionado
        const cliente = this.clientes.find(c => c.id === msg.clienteId);
        if (cliente && msg.remitente === 'cliente') {
          cliente.notificaciones = (cliente.notificaciones || 0) + 1;
          cliente.ultimoMensaje = msg.mensaje;
        }
      }
    });

    // Escuchar chat eliminado
    this.socket.on('chat-eliminado', (data: { clienteId: string }) => {
      console.log('🗑️ Chat eliminado:', data.clienteId);

      if (this.clienteSeleccionado === data.clienteId) {
        this.clienteSeleccionado = null;
        this.mensajes = [];
      }

      this.clientes = this.clientes.filter(c => c.id !== data.clienteId);
    });
  }

  cargarClientes(): void {
    this.http.get<Cliente[]>('http://localhost:3000/clientes-chat')
      .subscribe({
        next: (res) => {
          const idsExistentes = new Set(this.clientes.map(c => c.id));
          res.forEach(cliente => {
            if (!idsExistentes.has(cliente.id)) {
              this.clientes.push({
                id: cliente.id,
                nombre: cliente.nombre,
                notificaciones: 0,
                ultimoMensaje: ''
              });
            }
          });
          console.log('✅ Clientes cargados:', this.clientes);
        },
        error: (err) => {
          console.error('❌ Error cargando clientes:', err);
          alert('Error al cargar clientes. Verifica que el backend esté corriendo.');
        }
      });
  }

  seleccionarCliente(clienteId: string): void {
    this.clienteSeleccionado = clienteId;
    this.mensajes = [];

    const cliente = this.clientes.find(c => c.id === clienteId);
    if (cliente) cliente.notificaciones = 0;

    this.http.get<Mensaje[]>(`http://localhost:3000/chats/${clienteId}`)
      .subscribe({
        next: (res) => {
          const cliente = this.clientes.find(c => c.id === clienteId);
          this.mensajes = res.map(m => ({
            ...m,
            nombre: cliente?.nombre || 'Cliente'
          }));
          setTimeout(() => this.scrollToBottom(), 100);
          console.log('✅ Historial cargado:', res.length, 'mensajes');
        },
        error: (err) => console.error('❌ Error cargando historial:', err)
      });
  }

  enviarMensaje() {
    if (!this.mensajeEscrito.trim() || !this.clienteSeleccionado) return;

    const msg: Mensaje = {
      remitente: 'admin',
      mensaje: this.mensajeEscrito,
      clienteId: this.clienteSeleccionado,
      nombre: 'Soporte DINSAC',
      fecha: new Date().toISOString()
    };

    this.socket.emit('mensaje', msg);
    this.mensajes.push(msg);
    this.mensajeEscrito = '';
    setTimeout(() => this.scrollToBottom(), 100);
  }

  enviarArchivo(event: any) {
    const archivo = event.target.files[0];
    if (!archivo || !this.clienteSeleccionado) return;

    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('clienteId', this.clienteSeleccionado);

    this.http.post('http://localhost:3000/upload-chat', formData)
      .subscribe({
        next: (res: any) => {
          const nuevoMensaje: Mensaje = {
            remitente: 'admin',
            mensaje: res.url,
            clienteId: this.clienteSeleccionado,
            nombre: 'Soporte DINSAC',
            fecha: new Date().toISOString()
          };
          this.mensajes.push(nuevoMensaje);
          this.socket.emit('mensaje', nuevoMensaje);
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: err => console.error('❌ Error al subir archivo:', err)
      });

    event.target.value = '';
  }

  eliminarChat(): void {
    if (!this.clienteSeleccionado) return;

    const clienteNombre = this.getClienteNombre();
    if (!confirm(`¿Estás seguro de eliminar toda la conversación con ${clienteNombre}?`)) return;

    this.http.delete(`http://localhost:3000/chats/${this.clienteSeleccionado}`)
      .subscribe({
        next: () => {
          this.mensajes = [];
          this.clienteSeleccionado = null;
          this.clientes = this.clientes.filter(c => c.id !== this.clienteSeleccionado);
          alert('Conversación eliminada correctamente');
        },
        error: (err) => {
          console.error('❌ Error eliminando chat:', err);
          alert('Error al eliminar la conversación');
        }
      });
  }

  scrollToBottom(): void {
    const cont = document.querySelector('.mensajes');
    if (cont) cont.scrollTop = cont.scrollHeight;
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
      console.log('🔴 Admin desconectado');
    }
  }

  getClienteNombre(): string {
    const cliente = this.clientes.find(c => c.id === this.clienteSeleccionado);
    return cliente ? cliente.nombre : 'Cliente';
  }

  obtenerHora(fecha?: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  abrirSelector() {
    document.getElementById('fileInput')?.click();
  }
}
