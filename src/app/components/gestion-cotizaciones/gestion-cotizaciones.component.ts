import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

interface Producto {
  nombre?: string;
  equipo?: string;
  categoria?: string;
  cantidad: number;
  precio?: number;
}

interface Cotizacion {
  _id: string;
  numeroCotizacion?: string;
  fecha: Date;
  productos: Producto[];
  estado: string;
  userId: string;
  nombre: string;
  email: string;
  telefonoMovil: string;
  dniRuc: string;
  contacto: string;
}

@Component({
  selector: 'app-gestion-cotizaciones',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './gestion-cotizaciones.component.html',
  styleUrls: ['./gestion-cotizaciones.component.css']
})
export class GestionCotizacionesComponent implements OnInit {

  cotizaciones: Cotizacion[] = [];
  cotizacionesFiltradas: Cotizacion[] = [];
  loading = false;
  error: string | null = null;

  // Filtros
  filtroEstado: string = 'todos';
  filtroBusqueda: string = '';

  // Estadísticas
  totalCotizaciones = 0;
  pendientes = 0;
  enProceso = 0;
  vendida = 0;
  canceladas = 0;
cotizacionesPaginadas: Cotizacion[] = [];


  // 🔵 Paginación
paginaActual: number = 1;
itemsPorPagina: number = 10; // Puedes cambiarlo si quieres
totalPaginas: number = 1;
paginasArray: number[] = [];



  private readonly API_URL = 'https://backend-dinsac-77sq.onrender.com';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarCotizaciones();
  }

  cargarCotizaciones(): void {
    this.loading = true;
    this.error = null;

    this.http.get<any>(`${this.API_URL}/cotizaciones`)
      .pipe(
        catchError(err => {
          console.error('Error al cargar cotizaciones:', err);
          this.error = 'Error al cargar cotizaciones';
          return of([]);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe(res => {
        // Manejar si viene como array directo o como { data: [] }
        this.cotizaciones = Array.isArray(res) ? res : (res.data || []);
        this.cotizacionesFiltradas = [...this.cotizaciones];
        this.calcularEstadisticas();
          this.actualizarPaginacion(); // 👈 PAGINAR LOS DATOS CARGADOS

        
        console.log('📋 Cotizaciones cargadas:', this.cotizaciones.length);
      });
  }

  calcularEstadisticas(): void {
    this.totalCotizaciones = this.cotizacionesFiltradas.length;
    this.pendientes = this.cotizacionesFiltradas.filter(c => c.estado === 'pendiente').length;
    this.enProceso = this.cotizacionesFiltradas.filter(c => c.estado === 'en proceso').length;
    this.vendida = this.cotizacionesFiltradas.filter(c => c.estado === 'vendida').length;
    this.canceladas = this.cotizacionesFiltradas.filter(c => c.estado === 'cancelada').length;
  }

aplicarFiltros(): void {
  let resultado = [...this.cotizaciones];

  // Filtrar por estado
  if (this.filtroEstado !== 'todos') {
    resultado = resultado.filter(c => c.estado === this.filtroEstado);
  }

  // Filtrar por búsqueda
  if (this.filtroBusqueda.trim()) {
    const busqueda = this.filtroBusqueda.toLowerCase();
    resultado = resultado.filter(c =>
      c.nombre?.toLowerCase().includes(busqueda) ||
      c.email?.toLowerCase().includes(busqueda) ||
      c.numeroCotizacion?.toLowerCase().includes(busqueda) ||
      c.dniRuc?.includes(busqueda)
    );
  }

  this.cotizacionesFiltradas = resultado;
  this.calcularEstadisticas();

  this.paginaActual = 1; // Resetear a la primera página
  this.actualizarPaginacion();
}


cambiarPagina(num: number) {
  this.paginaActual = num;
  this.actualizarPaginacion();
}


  limpiarFiltros(): void {
    this.filtroEstado = 'todos';
    this.filtroBusqueda = '';
    this.cotizacionesFiltradas = [...this.cotizaciones];
    this.calcularEstadisticas();
  }

  actualizarEstado(id: string, nuevoEstado: string): void {
    this.http.put(`${this.API_URL}/cotizaciones/${id}`, { estado: nuevoEstado })
      .subscribe({
        next: () => {
          const cot = this.cotizaciones.find(c => c._id === id);
          if (cot) {
            cot.estado = nuevoEstado;
            this.aplicarFiltros();
          }
          alert(`✅ Estado actualizado a "${nuevoEstado}"`);
        },
        error: (err) => {
          console.error(err);
          alert('❌ Error al actualizar el estado');
        }
      });
  }

  eliminarCotizacion(id: string): void {
    const confirmar = confirm('⚠️ ¿Seguro que deseas eliminar esta cotización?');
    if (!confirmar) return;

    this.http.delete(`${this.API_URL}/cotizaciones/${id}`)
      .subscribe({
        next: () => {
          this.cotizaciones = this.cotizaciones.filter(c => c._id !== id);
          this.aplicarFiltros();
          alert('🗑️ Cotización eliminada correctamente.');
        },
        error: (err) => {
          console.error('Error al eliminar cotización:', err);
          alert('❌ No se pudo eliminar la cotización.');
        }
      });
  }

  abrirWhatsApp(cot: Cotizacion): void {
    let telefono = '';

    if (typeof cot.telefonoMovil === 'object' && cot.telefonoMovil !== null) {
      telefono = (cot.telefonoMovil as any).telefono || (cot.telefonoMovil as any).numero || '';
    } else if (typeof cot.telefonoMovil === 'string') {
      telefono = cot.telefonoMovil.trim();
    }

    telefono = telefono.replace(/\D/g, '');

    if (!telefono || telefono.length < 9) {
      alert('⚠️ No se encontró un número de teléfono válido.');
      return;
    }

    const mensaje = encodeURIComponent(
      `Hola ${cot.nombre}, te saluda DINSAC respecto a tu cotización ${cot.numeroCotizacion || ''}.`
    );
    const url = `https://wa.me/51${telefono}?text=${mensaje}`;

    window.open(url, '_blank');
  }

  abrirCorreo(cot: Cotizacion): void {
    let correoElectronico = '';
    
    if (typeof cot.email === 'object' && cot.email !== null) {
      correoElectronico = (cot.email as any).email || (cot.email as any).correo || '';
    } else if (typeof cot.email === 'string') {
      correoElectronico = cot.email;
    }

    if (!correoElectronico || correoElectronico.trim() === '') {
      alert('⚠️ No se encontró un correo electrónico válido.');
      return;
    }

    const asunto = `Seguimiento cotización ${cot.numeroCotizacion || ''} - DINSAC`;
    const cuerpo = `Hola ${cot.nombre}, le saluda el equipo de DINSAC. Queríamos continuar con el proceso de su cotización.`;
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${correoElectronico}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    
    window.open(url, '_blank');
  }

  llamarTelefono(cot: Cotizacion): void {
    let telefono = '';

    if (typeof cot.telefonoMovil === 'object' && cot.telefonoMovil !== null) {
      telefono = (cot.telefonoMovil as any).telefono || (cot.telefonoMovil as any).numero || '';
    } else if (typeof cot.telefonoMovil === 'string') {
      telefono = cot.telefonoMovil.trim();
    }

    if (!telefono) {
      alert('⚠️ No se encontró un número de teléfono.');
      return;
    }

    window.location.href = `tel:${telefono}`;
  }

  getEstadoColor(estado: string): string {
    const colores: any = {
      'pendiente': '#f59e0b',
      'en proceso': '#3b82f6',
      'vendida': '#10b981',
      'cancelada': '#ef4444'
    };
    return colores[estado] || '#6b7280';
  }

  getEstadoIcon(estado: string): string {
    const iconos: any = {
      'pendiente': '⏳',
      'en proceso': '🔄',
      'vendida': '✅',
      'cancelada': '❌'
    };
    return iconos[estado] || '📋';
  }

  getNombreProducto(producto: Producto): string {
    return producto.nombre || producto.equipo || producto.categoria || 'Producto';
  }
verPDF(cot: any): void {
  if (!cot.pdfBase64) {
    alert('⚠️ Esta cotización no tiene PDF guardado');
    return;
  }

  const pdfWindow = window.open('', '_blank');
  if (pdfWindow) {
    pdfWindow.document.write(`
      <iframe 
        width="100%" 
        height="100%" 
        src="data:application/pdf;base64,${cot.pdfBase64}">
      </iframe>
    `);
  }
}

descargarPDF(cot: any): void {
  if (!cot.pdfBase64) {
    alert('⚠️ Esta cotización no tiene PDF guardado');
    return;
  }

  const byteCharacters = atob(cot.pdfBase64);
  const byteNumbers = Array.from(byteCharacters).map(c => c.charCodeAt(0));
  const byteArray = new Uint8Array(byteNumbers);

  const blob = new Blob([byteArray], { type: 'application/pdf' });
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = `${cot.numeroCotizacion || 'cotizacion'}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


actualizarPaginacion(): void {
  this.totalPaginas = Math.ceil(this.cotizacionesFiltradas.length / this.itemsPorPagina);
  this.paginaActual = Math.min(this.paginaActual, this.totalPaginas || 1);

  this.paginasArray = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);

  const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
  const fin = inicio + this.itemsPorPagina;

  // 👉 Aquí ya NO sobrescribes cotizacionesFiltradas
  this.cotizacionesPaginadas = this.cotizacionesFiltradas.slice(inicio, fin);
}


}