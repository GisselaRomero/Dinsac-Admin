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
    this.socket = io('https://backend-dinsac-hlf0.onrender.com', {
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
      console.log('📩 Mensaje recibido por admin:', msg);

      // Asignar nombre si es cliente
      if (msg.remitente === 'cliente' && msg.clienteId) {
        const cliente = this.clientes.find(c => c.id === msg.clienteId);
        msg.nombre = cliente ? cliente.nombre : 'Cliente';
      }

      // Agregar al chat activo si corresponde
      if (msg.clienteId === this.clienteSeleccionado) {
        // ✅ MEJORADO: Comparación más flexible para evitar duplicados
        const existe = this.mensajes.some(
          m => m.mensaje === msg.mensaje &&
               m.remitente === msg.remitente &&
               Math.abs(new Date(m.fecha || '').getTime() - new Date(msg.fecha || '').getTime()) < 2000
        );
        
        if (!existe) {
          this.mensajes.push(msg);
          console.log('✅ Mensaje agregado al chat activo');
          setTimeout(() => this.scrollToBottom(), 100);
        } else {
          console.log('⚠️ Mensaje duplicado detectado, no se agrega');
        }
      } else {
        // Incrementar notificaciones si el cliente no está seleccionado
        const cliente = this.clientes.find(c => c.id === msg.clienteId);
        if (cliente && msg.remitente === 'cliente') {
          cliente.notificaciones = (cliente.notificaciones || 0) + 1;
          cliente.ultimoMensaje = msg.mensaje;
          console.log(`🔔 Notificación para ${cliente.nombre}`);
        }

        // ✅ NUEVO: Si es un cliente nuevo, agregarlo a la lista
        if (!cliente && msg.remitente === 'cliente' && msg.clienteId) {
          this.clientes.push({
            id: msg.clienteId,
            nombre: msg.nombre || `Cliente ${msg.clienteId.substring(0, 8)}`,
            notificaciones: 1,
            ultimoMensaje: msg.mensaje
          });
          console.log('✅ Nuevo cliente agregado:', msg.clienteId);
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
    this.http.get<Cliente[]>('https://backend-dinsac-hlf0.onrender.com/clientes-chat')
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
          console.log('✅ Clientes cargados:', this.clientes.length);
        },
        error: (err) => {
          console.error('❌ Error cargando clientes:', err);
          alert('Error al cargar clientes. Verifica que el backend esté corriendo.');
        }
      });
  }

  seleccionarCliente(clienteId: string): void {
    console.log('👤 Seleccionando cliente:', clienteId);
    this.clienteSeleccionado = clienteId;
    this.mensajes = [];

    const cliente = this.clientes.find(c => c.id === clienteId);
    if (cliente) cliente.notificaciones = 0;

    this.http.get<Mensaje[]>(`https://backend-dinsac-hlf0.onrender.com/chats/${clienteId}`)
      .subscribe({
        next: (res) => {
          const cliente = this.clientes.find(c => c.id === clienteId);
          this.mensajes = res.map(m => ({
            ...m,
            nombre: m.remitente === 'cliente' 
              ? (cliente?.nombre || 'Cliente')
              : 'Soporte DINSAC'
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

    console.log('📤 Admin enviando mensaje:', msg);
    
    // Agregar inmediatamente al chat local
    this.mensajes.push(msg);
    
    // Emitir por socket
    this.socket.emit('mensaje', msg);
    
    this.mensajeEscrito = '';
    setTimeout(() => this.scrollToBottom(), 100);
  }

  enviarArchivo(event: any) {
    const archivo = event.target.files[0];
    if (!archivo || !this.clienteSeleccionado) return;

    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('clienteId', this.clienteSeleccionado);

    this.http.post('https://backend-dinsac-hlf0.onrender.com/upload-chat', formData)
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

    const clienteIdAEliminar = this.clienteSeleccionado;

    this.http.delete(`https://backend-dinsac-hlf0.onrender.com/chats/${clienteIdAEliminar}`)
      .subscribe({
        next: () => {
          this.mensajes = [];
          this.clienteSeleccionado = null;
          this.clientes = this.clientes.filter(c => c.id !== clienteIdAEliminar);
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

  // 📄 Detectar si es un archivo
  esArchivo(mensaje: string): boolean {
    return mensaje.includes('https://backend-dinsac-hlf0.onrender.com/uploads/');
  }

  // 📝 Obtener nombre del archivo
  obtenerNombreArchivo(url: string): string {
    const partes = url.split('/');
    const nombreCompleto = partes[partes.length - 1];
    
    // Remover timestamp y decodificar
    const nombreSinTimestamp = nombreCompleto.substring(nombreCompleto.indexOf('-') + 1);
    return decodeURIComponent(nombreSinTimestamp);
  }

  // 📎 Obtener extensión del archivo
  obtenerExtension(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    return extension;
  }

  // 🖼️ Verificar si es imagen
  esImagen(url: string): boolean {
    const ext = this.obtenerExtension(url);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  }

  // 📄 Verificar si es PDF
  esPDF(url: string): boolean {
    return this.obtenerExtension(url) === 'pdf';
  }
}