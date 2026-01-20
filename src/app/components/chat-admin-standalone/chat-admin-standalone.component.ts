import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Socket } from 'socket.io-client';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ChatNotificationService } from 'src/app/services/chat-notification.service';
import { Subscription } from 'rxjs';

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
  mostrarToast = false;
  toastTexto = '';
  
  private clientesSub!: Subscription;

  constructor(
    private http: HttpClient, 
    private chatNotifService: ChatNotificationService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // 🔹 Usar el socket del servicio global en lugar de crear uno nuevo
    this.socket = this.chatNotifService.getSocket();

    // 🔹 Suscribirse a los clientes del servicio
    this.clientesSub = this.chatNotifService.clientes$.subscribe(clientes => {
      this.clientes = clientes;
    });

    // 🔹 Cargar clientes iniciales del servicio
    this.clientes = this.chatNotifService.getClientes();

    console.log('✅ Chat admin inicializado con socket global');
  }

  seleccionarCliente(clienteId: string): void {
    console.log('👤 Seleccionando cliente:', clienteId);
    this.clienteSeleccionado = clienteId;
    this.mensajes = [];

    // 🔔 Limpiar notificaciones usando el servicio
    this.chatNotifService.limpiarNotificaciones(clienteId);

    this.http.get<Mensaje[]>(`https://backend-dinsac-hlf0.onrender.com/chats/${clienteId}`)
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

    this.http.post('https://backend-dinsac-hlf0.onrender.com/upload-chat', formData)
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

    this.http.delete(`https://backend-dinsac-hlf0.onrender.com/chats/${clienteIdAEliminar}`)
      .subscribe({
        next: () => {
          this.mensajes = [];
          this.clienteSeleccionado = null;
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
    // 🔹 NO desconectar el socket aquí, solo desuscribirse
    if (this.clientesSub) {
      this.clientesSub.unsubscribe();
    }
    console.log('🔴 Chat admin desmontado (socket sigue activo)');
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
    return mensaje.includes('https://backend-dinsac-hlf0.onrender.com/uploads/');
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