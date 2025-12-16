// ============================================
// dashboard.component.ts - COMPLETO Y FUNCIONAL
// ============================================
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { ProductService } from '../../services/product.service';
import { FormsModule } from '@angular/forms';

import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import pdfMake from 'pdfmake/build/pdfmake';
import 'pdfmake/build/vfs_fonts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, NgChartsModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  // ----- KPIs -----
  totalInteraccionesIA = 0;
  totalCotizaciones = 0;
  totalClientes = 0;
  tasaConversion = 0;

  // Tendencias (nuevo)
  tendenciaClientes = '+12%';
  tendenciaInteracciones = '+28%';
  tendenciaCotizaciones = '+8%';
  tendenciaConversion = '+5%';

  // Historial de cotizaciones (base)
  historialCotizaciones: any[] = [];
  historialOriginal: any[] = [];

  // filtros
  filtroTexto: string = '';
  fechaDesde: string = '';
  fechaHasta: string = '';
  filtroContacto: string = '';
  filtroCategoria: string = '';

  // paginación
  paginaActual = 1;
  itemsPorPagina = 10;
  totalPaginas = 0;

  // listas de filtros
  categoriasDisponibles: string[] = [];
  tiposContactoDisponibles: string[] = [];

  // TOPS
  topProductos: { name: string, count: number, porcentaje: number }[] = [];
  topClientes: { name: string, count: number }[] = [];

  // Datos para gráfica de barras (cotizaciones por mes)
  cotizacionesPorMes: { [key: string]: number } = {};
  barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Cotizaciones',
      backgroundColor: '#3b82f6',
      borderRadius: 8,
      barThickness: 40
    }]
  };
  
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'white',
        titleColor: '#1e293b',
        bodyColor: '#64748b',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        displayColors: false
      }
    },
    scales: {
      x: { 
        grid: { display: false },
        ticks: { color: '#64748b' }
      },
      y: { 
        grid: { color: '#f1f5f9' },
        ticks: { color: '#64748b' }
      }
    }
  };

  // Gráfica de pie (canales de contacto) - NUEVO
  pieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: []
    }]
  };

  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { 
          padding: 15,
          font: { size: 12 },
          color: '#64748b'
        }
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: '#1e293b',
        bodyColor: '#64748b',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12
      }
    }
  };

  // getter para paginación en template
  get cotizacionesPaginadas(): any[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.historialCotizaciones.slice(inicio, fin);
  }

  get paginasArray(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private productService: ProductService,
    private http: HttpClient
  ) {}

  isBrowser = false;

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.cargarDatos();
    }
  }

  cargarDatos() {
    // Cargar clientes
    this.http.get<any[]>('https://backend-dinsac-hlf0.onrender.com/clientes').subscribe(cli => {
      this.totalClientes = cli.length;
    });

    // Cargar interacciones IA
    this.http.get<any[]>('https://backend-dinsac-hlf0.onrender.com/interacciones').subscribe(data => {
      this.totalInteraccionesIA = Array.isArray(data) ? data.length : 0;
    });

    // Total cotizaciones
    this.http.get<any[]>('https://backend-dinsac-hlf0.onrender.com/cotizaciones').subscribe(data => {
      const ordenadas = Array.isArray(data) 
        ? data.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()) 
        : [];
      
      this.historialCotizaciones = [...ordenadas];
      this.historialOriginal = [...ordenadas];
      this.totalCotizaciones = this.historialCotizaciones.length;

      // Calcular tasa de conversión
      this.calcularTasaConversion();

      // extraer datos para filtros y tops
      this.extraerFiltrosUnicos();
      this.generarTops();
      this.generarGraficaPorMes();
      this.generarCanalesContacto(); // NUEVO
      this.calcularPaginacion();
    });
  }

  // NUEVO: Calcular tasa de conversión
  calcularTasaConversion() {
    if (this.totalInteraccionesIA > 0) {
      this.tasaConversion = Math.round((this.totalCotizaciones / this.totalInteraccionesIA) * 100);
    }
  }

  // Extrae categorías y tipos de contacto únicos
  extraerFiltrosUnicos(): void {
    const categorias = new Set<string>();
    const tiposContacto = new Set<string>();

    this.historialOriginal.forEach(cot => {
      if (cot.productos && cot.productos.length > 0) {
        cot.productos.forEach((p: any) => {
          if (p.categoria) categorias.add(p.categoria);
        });
      }
      if (cot.contacto) tiposContacto.add(cot.contacto);
    });

    this.categoriasDisponibles = Array.from(categorias).sort();
    this.tiposContactoDisponibles = Array.from(tiposContacto).sort();
  }

  // Genera TOP productos y TOP clientes
  generarTops(): void {
    const contadorProductos: { [key: string]: number } = {};
    const contadorClientes: { [key: string]: number } = {};

    this.historialOriginal.forEach(cot => {
      // contar cliente
      const nombreCliente = cot.nombre || cot.empresa || 'Cliente anónimo';
      contadorClientes[nombreCliente] = (contadorClientes[nombreCliente] || 0) + 1;

      // contar productos
      if (cot.productos && cot.productos.length > 0) {
        cot.productos.forEach((p: any) => {
          const nombreProd = p.equipo || p.nombre || (p.categoria ? `${p.categoria}` : 'Producto');
          contadorProductos[nombreProd] = (contadorProductos[nombreProd] || 0) + 1;
        });
      }
    });

    // Calcular porcentaje para productos
    const maxProductos = Math.max(...Object.values(contadorProductos), 1);
    
    this.topProductos = Object.entries(contadorProductos)
      .map(([name, count]) => ({ 
        name, 
        count,
        porcentaje: (count / maxProductos) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    this.topClientes = Object.entries(contadorClientes)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  // Genera la gráfica: cotizaciones por mes (últimos 6 meses)
  generarGraficaPorMes(): void {
    this.cotizacionesPorMes = {};
    const meses = new Set<string>();

    // contar por mes-YYYY
    this.historialOriginal.forEach(cot => {
      if (!cot.fecha) return;
      const d = new Date(cot.fecha);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
      this.cotizacionesPorMes[key] = (this.cotizacionesPorMes[key] || 0) + 1;
      meses.add(key);
    });

    // ordenar keys y tomar últimos 6 meses
    const keysOrdenadas = Array.from(meses).sort();
    const ultimoIndice = keysOrdenadas.length;
    const keysParaGrafica = keysOrdenadas.slice(Math.max(0, ultimoIndice - 6), ultimoIndice);

    this.barChartData.labels = keysParaGrafica.map(k => {
      const [year, month] = k.split('-');
      const date = new Date(Number(year), Number(month) - 1);
      return date.toLocaleString('es-PE', { month: 'short', year: 'numeric' });
    });

    this.barChartData.datasets[0].data = keysParaGrafica.map(k => this.cotizacionesPorMes[k] || 0);
  }

  // NUEVO: Genera gráfica de canales de contacto
  generarCanalesContacto(): void {
    const canales: { [key: string]: number } = {
      'WhatsApp': 0,
      'Correo': 0,
      'Teléfono': 0
    };

    this.historialOriginal.forEach(cot => {
      const contacto = cot.contacto?.toLowerCase() || '';
      if (contacto.includes('whatsapp')) {
        canales['WhatsApp']++;
      } else if (contacto.includes('correo') || contacto.includes('email')) {
        canales['Correo']++;
      } else if (contacto.includes('tel') || contacto.includes('teléfono')) {
        canales['Teléfono']++;
      }
    });

    const colores = {
      'WhatsApp': '#25d366',
      'Correo': '#1a73e8',
      'Teléfono': '#ff5722'
    };

    // Actualizar gráfica de pie
    this.pieChartData.labels = Object.keys(canales).filter(k => canales[k] > 0);
    this.pieChartData.datasets[0].data = Object.values(canales).filter(v => v > 0);
    this.pieChartData.datasets[0].backgroundColor = Object.keys(canales)
      .filter(k => canales[k] > 0)
      .map(k => colores[k as keyof typeof colores]);
  }

  // NUEVO: Colores para productos
  getColorProducto(index: number): string {
    const colores = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
    return colores[index % colores.length];
  }

  // NUEVO: Colores para clientes
  getColorCliente(index: number): string {
    const colores = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
    return colores[index % colores.length];
  }

  // FILTRADO
  filtrarCotizaciones(): void {
    const texto = this.filtroTexto.toLowerCase().trim();
    this.historialCotizaciones = this.historialOriginal.filter(cot => {
      const coincideTexto = !texto ||
        (cot.nombre && cot.nombre.toLowerCase().includes(texto)) ||
        (cot.email && cot.email.toLowerCase().includes(texto)) ||
        (cot.dni && String(cot.dni).toLowerCase().includes(texto)) ||
        (cot.dniRuc && String(cot.dniRuc).toLowerCase().includes(texto));

      const fechaCot = new Date(cot.fecha);
      const desde = this.fechaDesde ? new Date(this.fechaDesde) : null;
      const hasta = this.fechaHasta ? new Date(this.fechaHasta + 'T23:59:59') : null;
      const enRangoFecha = (!desde || fechaCot >= desde) && (!hasta || fechaCot <= hasta);

      const coincideContacto = !this.filtroContacto || cot.contacto === this.filtroContacto;

      const coincideCategoria = !this.filtroCategoria || 
        (cot.productos && cot.productos.some((p: any) => p.categoria === this.filtroCategoria));

      return coincideTexto && enRangoFecha && coincideContacto && coincideCategoria;
    });

    this.paginaActual = 1;
    this.calcularPaginacion();
  }

  limpiarFiltro(): void {
    this.filtroTexto = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.filtroContacto = '';
    this.filtroCategoria = '';
    this.historialCotizaciones = [...this.historialOriginal];
    this.paginaActual = 1;
    this.calcularPaginacion();
  }

  calcularPaginacion(): void {
    this.totalPaginas = Math.ceil(this.historialCotizaciones.length / this.itemsPorPagina) || 1;
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) this.paginaActual = pagina;
  }

  // EXPORTAR CSV
  exportarCotizaciones(): void {
    const datos = this.historialCotizaciones.map(cot => ({
      Nombre: cot.nombre || '',
      Email: cot.email || '',
      DNI: cot.dni || cot.dniRuc || 'N/A',
      Fecha: cot.fecha ? new Date(cot.fecha).toLocaleString() : '',
      Contacto: cot.contacto || '',
      Telefono: cot.telefono || cot.telefonoMovil || 'N/A',
      Productos: cot.productos?.map((p: any) => `${p.categoria} - ${p.equipo || p.nombre}`).join('; ') || 'N/A'
    }));

    const csv = this.convertirACSV(datos);
    this.descargarCSV(csv, `cotizaciones_${new Date().toISOString().split('T')[0]}.csv`);
  }

  private convertirACSV(datos: any[]): string {
    if (datos.length === 0) return '';
    const headers = Object.keys(datos[0]);
    const csvContent = [
      headers.join(','),
      ...datos.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    return csvContent;
  }

  private descargarCSV(contenido: string, nombreArchivo: string): void {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

  }

  // PDF - ver / descargar
  verPDF(cot: any) {
    if (!cot.pdfBase64) {
      alert("Esta cotización no tiene PDF guardado");
      return;
    }
    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
      pdfWindow.document.write(`<iframe width='100%' height='100%' src='data:application/pdf;base64,${cot.pdfBase64}'></iframe>`);
    }
  }

  descargarPDF(cot: any) {
    if (!cot.pdfBase64) {
      alert("Esta cotización no tiene PDF guardado");
      return;
    }

    const byteCharacters = atob(cot.pdfBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${cot.numeroCotizacion || 'cotizacion'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  eliminarCotizacion(id: string) {
    if (confirm('¿Estás seguro de eliminar esta cotización?')) {
      this.http.delete(`https://backend-dinsac-hlf0.onrender.com/cotizaciones/${id}`).subscribe({
        next: () => {
          alert('Cotización eliminada exitosamente');
          this.cargarDatos(); // Recargar datos
        },
        error: (err) => {
          console.error('Error al eliminar:', err);
          alert('Error al eliminar la cotización');
        }
      });
    }
  }

  // Generador del contenido del PDF
  getDocumentDefinition(cot: any) {
    return {
      content: [
        { text: 'COTIZACIÓN', style: 'header' },
        { text: `Cliente: ${cot.nombre}`, margin: [0, 10, 0, 0] },
        { text: `Email: ${cot.email}` },
        { text: `DNI/RUC: ${cot.dniRuc || 'N/A'}` },
        { text: `Fecha: ${new Date(cot.fecha).toLocaleString()}`, margin: [0, 0, 0, 10] },
        { text: 'Productos:', style: 'subheader' },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*'],
            body: [
              ['Categoría', 'Equipo'],
              ...(cot.productos?.map((p: any) => [p.categoria, p.equipo || p.nombre]) || [])
            ]
          }
        }
      ],
      styles: {
        header: { fontSize: 18, bold: true, alignment: 'center' },
        subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] }
      }
    };
  }

  guardarCotizacion(cot: any) {
    const docDef = this.getDocumentDefinition(cot);
    pdfMake.createPdf(docDef).getBase64((pdfBase64: string) => {
      const payload = { ...cot, pdfBase64 };
      this.http.post('https://backend-dinsac-hlf0.onrender.com/cotizaciones', payload).subscribe({
        next: (res) => console.log('✅ Cotización enviada y guardada:', res),
        error: (err) => console.error('❌ Error al guardar cotización:', err)
      });
    });
  }

  // helper: cuando cambian filtros en UI
  onFiltroChange(): void {
    this.filtrarCotizaciones();
  }
}