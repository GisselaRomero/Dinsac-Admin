import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';
import { ChatNotificationService } from 'src/app/services/chat-notification.service';
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

  constructor(private http: HttpClient, private chatNotifService: ChatNotificationService) {}

  ngOnInit(): void {
    this.socket = io('https://backend-dinsac-77sq.onrender.com', {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('✅ Admin conectado a Socket.IO');
      this.socket.emit('registrar', { clienteId: 'ADMIN' });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error conectando Socket.IO:', error);
    });

    // ✅ PRIMERO: Cargar notificaciones guardadas
    this.cargarNotificacionesGuardadas();
    
    // ✅ SEGUNDO: Cargar clientes y fusionar con notificaciones
    this.cargarClientes();

    // Escuchar mensajes
    this.socket.on('mensaje', (msg: Mensaje) => {
      console.log('📩 Mensaje recibido por admin:', msg);

      // Asignar nombre si es cliente
      if (msg.remitente === 'cliente' && msg.clienteId) {
        const cliente = this.clientes.find(c => c.id === msg.clienteId);
        msg.nombre = cliente ? cliente.nombre : msg.nombre || 'Cliente';
      }

      // Agregar al chat activo si corresponde
      if (msg.clienteId === this.clienteSeleccionado) {
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
        // ✅ INCREMENTAR NOTIFICACIONES SOLO SI ES DE UN CLIENTE
        if (msg.remitente === 'cliente' && msg.clienteId) {
          let cliente = this.clientes.find(c => c.id === msg.clienteId);
          
          // Si el cliente no existe, crearlo
          if (!cliente) {
            cliente = {
              id: msg.clienteId,
              nombre: msg.nombre || `Cliente ${msg.clienteId.substring(0, 8)}`,
              notificaciones: 0,
              ultimoMensaje: ''
            };
            this.clientes.push(cliente);
            console.log('✅ Nuevo cliente agregado:', msg.clienteId);
          }
          
          // Incrementar notificaciones
          cliente.notificaciones = (cliente.notificaciones || 0) + 1;
          cliente.ultimoMensaje = msg.mensaje;
          
          // ✅ GUARDAR INMEDIATAMENTE
          this.guardarNotificaciones();
          
          console.log(`🔔 Notificación para ${cliente.nombre}: ${cliente.notificaciones}`);
        }
      }
      
      // 🔔 Actualizar contador global
      this.actualizarContadorGlobal();
    });

    // Escuchar chat eliminado
    this.socket.on('chat-eliminado', (data: { clienteId: string }) => {
      console.log('🗑️ Chat eliminado:', data.clienteId);

      if (this.clienteSeleccionado === data.clienteId) {
        this.clienteSeleccionado = null;
        this.mensajes = [];
      }

      this.clientes = this.clientes.filter(c => c.id !== data.clienteId);
      this.guardarNotificaciones();
      this.actualizarContadorGlobal();
    });
  }

  // ✅ GUARDAR notificaciones en localStorage
  guardarNotificaciones() {
    const notificaciones = this.clientes.map(c => ({
      id: c.id,
      nombre: c.nombre,
      notificaciones: c.notificaciones || 0,
      ultimoMensaje: c.ultimoMensaje || ''
    }));
    
    localStorage.setItem('chat_notificaciones', JSON.stringify(notificaciones));
    console.log('💾 Notificaciones guardadas:', notificaciones.filter(n => n.notificaciones > 0));
  }

  // ✅ CARGAR notificaciones desde localStorage (antes de cargar clientes)
  cargarNotificacionesGuardadas() {
    const data = localStorage.getItem('chat_notificaciones');
    if (!data) {
      console.log('📭 No hay notificaciones guardadas');
      return;
    }

    try {
      const guardados: Cliente[] = JSON.parse(data);
      console.log('📥 Notificaciones cargadas desde localStorage:', guardados.filter(g => g.notificaciones && g.notificaciones > 0));
      
      // Crear clientes temporales con las notificaciones guardadas
      this.clientes = guardados.map(g => ({
        id: g.id,
        nombre: g.nombre,
        notificaciones: g.notificaciones || 0,
        ultimoMensaje: g.ultimoMensaje || ''
      }));
      
      // Actualizar contador global inmediatamente
      this.actualizarContadorGlobal();
    } catch (error) {
      console.error('❌ Error parseando notificaciones:', error);
      localStorage.removeItem('chat_notificaciones');
    }
  }

  // ✅ CARGAR clientes desde backend
  cargarClientes(): void {
    this.http.get<Cliente[]>('https://backend-dinsac-77sq.onrender.com/clientes-chat')
      .subscribe({
        next: (res) => {
          console.log('📋 Clientes recibidos del backend:', res.length);
          
          // Fusionar clientes del backend con notificaciones guardadas
          res.forEach(clienteBackend => {
            const clienteExistente = this.clientes.find(c => c.id === clienteBackend.id);
            
            if (clienteExistente) {
              // Mantener las notificaciones pero actualizar el nombre si cambió
              clienteExistente.nombre = clienteBackend.nombre;
            } else {
              // Nuevo cliente sin notificaciones
              this.clientes.push({
                id: clienteBackend.id,
                nombre: clienteBackend.nombre,
                notificaciones: 0,
                ultimoMensaje: ''
              });
            }
          });
          
          // Eliminar clientes que ya no existen en el backend
          this.clientes = this.clientes.filter(c => 
            res.some(r => r.id === c.id)
          );
          
          console.log('✅ Clientes finales:', this.clientes.length);
          console.log('🔔 Con notificaciones:', this.clientes.filter(c => c.notificaciones && c.notificaciones > 0));
          
          // Guardar estado actualizado
          this.guardarNotificaciones();
          this.actualizarContadorGlobal();
        },
        error: (err) => {
          console.error('❌ Error cargando clientes:', err);
          alert('Error al cargar clientes. Verifica que el backend esté corriendo.');
        }
      });
  }

  // ✅ SELECCIONAR cliente y limpiar notificaciones
  seleccionarCliente(clienteId: string): void {
    console.log('👤 Seleccionando cliente:', clienteId);
    this.clienteSeleccionado = clienteId;
    this.mensajes = [];

    // ✅ LIMPIAR notificaciones solo al seleccionar
    const cliente = this.clientes.find(c => c.id === clienteId);
    if (cliente) {
      console.log(`🔕 Limpiando ${cliente.notificaciones || 0} notificaciones de ${cliente.nombre}`);
      cliente.notificaciones = 0;
      cliente.ultimoMensaje = '';
      
      // ✅ GUARDAR INMEDIATAMENTE
      this.guardarNotificaciones();
      this.actualizarContadorGlobal();
    }

    // Cargar historial
    this.http.get<Mensaje[]>(`https://backend-dinsac-77sq.onrender.com/chats/${clienteId}`)
      .subscribe({
        next: (res) => {
          const cliente = this.clientes.find(c => c.id === clienteId);
          this.mensajes = res.map(m => ({
            ...m,
            nombre: m.remitente === 'cliente' 
              ? (m.nombre || cliente?.nombre || 'Cliente')
              : 'Soporte DINSAC'
          }));
          setTimeout(() => this.scrollToBottom(), 100);
          console.log('✅ Historial cargado:', res.length, 'mensajes');
        },
        error: (err) => console.error('❌ Error cargando historial:', err)
      });
  }

  // ✅ ACTUALIZAR contador global de notificaciones
  actualizarContadorGlobal() {
    const totalClientesConNotificaciones = this.clientes.filter(
      c => c.notificaciones && c.notificaciones > 0
    ).length;
    
    this.chatNotifService.actualizar(totalClientesConNotificaciones);
    console.log('🔔 Contador global actualizado:', totalClientesConNotificaciones);
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
    
    this.mensajes.push(msg);
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

    this.http.post('https://backend-dinsac-77sq.onrender.com/upload-chat', formData)
      .subscribe({
        next: (res: any) => {
          console.log('✅ Archivo subido:', res);

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
        error: err => {
          console.error('❌ Error al subir archivo:', err);
          alert('Error al subir archivo');
        }
      });

    event.target.value = '';
  }

  eliminarChat(): void {
    if (!this.clienteSeleccionado) return;

    const clienteNombre = this.getClienteNombre();
    if (!confirm(`¿Estás seguro de eliminar toda la conversación con ${clienteNombre}?`)) return;

    const clienteIdAEliminar = this.clienteSeleccionado;

    this.http.delete(`https://backend-dinsac-77sq.onrender.com/chats/${clienteIdAEliminar}`)
      .subscribe({
        next: () => {
          this.mensajes = [];
          this.clienteSeleccionado = null;
          this.clientes = this.clientes.filter(c => c.id !== clienteIdAEliminar);
          
          // ✅ GUARDAR Y ACTUALIZAR
          this.guardarNotificaciones();
          this.actualizarContadorGlobal();

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

  esArchivo(mensaje: string): boolean {
    return mensaje.includes('https://backend-dinsac-77sq.onrender.com/uploads/');
  }

  obtenerNombreArchivo(url: string): string {
    const partes = url.split('/');
    const nombreCompleto = partes[partes.length - 1];
    const nombreSinTimestamp = nombreCompleto.substring(nombreCompleto.indexOf('-') + 1);
    return decodeURIComponent(nombreSinTimestamp);
  }

  obtenerExtension(url: string): string {
    return url.split('.').pop()?.toLowerCase() || '';
  }

  esImagen(url: string): boolean {
    const ext = this.obtenerExtension(url);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  }

  esPDF(url: string): boolean {
    return this.obtenerExtension(url) === 'pdf';
  }

  descargarPDF(url: string, nombre: string): void {
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = nombre;
        link.click();
        window.URL.revokeObjectURL(link.href);
        console.log('✅ PDF descargado:', nombre);
      },
      error: (err) => {
        console.error('❌ Error descargando PDF:', err);
        window.open(url, '_blank');
      }
    });
  }
}