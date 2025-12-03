// ============================================
// reportes.component.ts
// ============================================
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

// Librerías para exportar
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule
  ],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css'],
  providers: [DatePipe]
})
export class ReportesComponent implements OnInit {
  cotizaciones: any[] = [];
  cotizacionesFiltradas: any[] = [];

  fechaInicio: Date | null = null;
  fechaFin: Date | null = null;
  estadoFiltro: string = 'todos';

  // Estadísticas
  totalCotizaciones = 0;
  cotizacionesPendientes = 0;
  cotizacionesAtendidas = 0;
  cotizacionesCanceladas = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarCotizaciones();
  }

  cargarCotizaciones() {
    this.http.get<any[]>('https://backend-dinsac-hlf0.onrender.com/cotizaciones').subscribe({
      next: (data) => {
        this.cotizaciones = data.map(cot => ({
          ...cot,
          nombre: cot.nombre || 'Sin nombre',
          email: cot.email || 'Sin email',
          estado: cot.estado || 'pendiente',
          fecha: cot.fecha || new Date(),
          productos: cot.productos || []
        }));
        this.cotizacionesFiltradas = [...this.cotizaciones];
        this.calcularEstadisticas();
      },
      error: (err) => {
        console.error('Error al cargar cotizaciones:', err);
        this.cotizaciones = [];
        this.cotizacionesFiltradas = [];
      }
    });
  }

  calcularEstadisticas() {
    this.totalCotizaciones = this.cotizacionesFiltradas.length;
    this.cotizacionesPendientes = this.cotizacionesFiltradas.filter(c => c.estado === 'pendiente').length;
    this.cotizacionesAtendidas = this.cotizacionesFiltradas.filter(c => c.estado === 'atendida' || c.estado === 'completada').length;
    this.cotizacionesCanceladas = this.cotizacionesFiltradas.filter(c => c.estado === 'cancelada').length;
  }

  filtrarCotizaciones() {
    let resultado = [...this.cotizaciones];

    // Filtrar por fecha
    if (this.fechaInicio && this.fechaFin) {
      const inicio = new Date(this.fechaInicio).setHours(0, 0, 0, 0);
      const fin = new Date(this.fechaFin).setHours(23, 59, 59, 999);

      resultado = resultado.filter(cot => {
        const fechaCot = new Date(cot.fecha).getTime();
        return fechaCot >= inicio && fechaCot <= fin;
      });
    }

    // Filtrar por estado
    if (this.estadoFiltro !== 'todos') {
      resultado = resultado.filter(cot => cot.estado === this.estadoFiltro);
    }

    this.cotizacionesFiltradas = resultado;
    this.calcularEstadisticas();
  }

  limpiarFiltros() {
    this.fechaInicio = null;
    this.fechaFin = null;
    this.estadoFiltro = 'todos';
    this.cotizacionesFiltradas = [...this.cotizaciones];
    this.calcularEstadisticas();
  }

  exportarPDF() {
    const doc = new jsPDF();
    const fechaHoy = new Date();
    const fechaGeneracion = fechaHoy.toLocaleDateString('es-PE');

    // Encabezado
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175);
    doc.text('REPORTE DE COTIZACIONES', 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Desde: ${this.fechaInicio?.toLocaleDateString('es-PE') || 'Todas'}`, 14, 25);
    doc.text(`Hasta: ${this.fechaFin?.toLocaleDateString('es-PE') || 'Todas'}`, 14, 30);
    doc.text(`Estado: ${this.estadoFiltro === 'todos' ? 'Todos' : this.estadoFiltro}`, 14, 35);
    doc.text(`Fecha de generación: ${fechaGeneracion}`, 14, 40);

    // Estadísticas
    doc.setFontSize(11);
    doc.setTextColor(30, 64, 175);
    doc.text('RESUMEN ESTADÍSTICO', 14, 50);
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total de cotizaciones: ${this.totalCotizaciones}`, 14, 57);
    doc.text(`Pendientes: ${this.cotizacionesPendientes}`, 14, 62);
    doc.text(`Atendidas: ${this.cotizacionesAtendidas}`, 14, 67);
    doc.text(`Canceladas: ${this.cotizacionesCanceladas}`, 14, 72);

    // Tabla de cotizaciones
    const rows = this.cotizacionesFiltradas.map((cot) => [
      cot.numeroCotizacion || 'N/A',
      cot.nombre,
      cot.email,
      cot.productos.length > 0 
        ? cot.productos.map((p: any) => `${p.categoria || p.equipo || 'Producto'} (${p.cantidad})`).join(', ')
        : 'Sin productos',
      cot.estado.toUpperCase(),
      new Date(cot.fecha).toLocaleDateString('es-PE')
    ]);

    autoTable(doc, {
      head: [['N° Cotización', 'Cliente', 'Email', 'Productos', 'Estado', 'Fecha']],
      body: rows,
      startY: 80,
      styles: { 
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    doc.save(`Reporte_Cotizaciones_${fechaGeneracion.replace(/\//g, '-')}.pdf`);
  }

  exportarExcel() {
    const data = this.cotizacionesFiltradas.map((cot) => ({
      'N° Cotización': cot.numeroCotizacion || 'N/A',
      'Cliente': cot.nombre,
      'Email': cot.email,
      'DNI/RUC': cot.dniRuc || 'N/A',
      'Teléfono': cot.telefonoMovil || 'N/A',
      'Contacto': cot.contacto || 'N/A',
      'Productos': cot.productos.map((p: any) => 
        `${p.categoria || ''} - ${p.equipo || ''} (${p.cantidad})`
      ).join(' | '),
      'Total Productos': cot.productos.length,
      'Estado': cot.estado.toUpperCase(),
      'Fecha': new Date(cot.fecha).toLocaleDateString('es-PE'),
      'Hora': new Date(cot.fecha).toLocaleTimeString('es-PE')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Ajustar ancho de columnas
    worksheet['!cols'] = [
      { wch: 15 }, // N° Cotización
      { wch: 20 }, // Cliente
      { wch: 25 }, // Email
      { wch: 12 }, // DNI/RUC
      { wch: 12 }, // Teléfono
      { wch: 15 }, // Contacto
      { wch: 40 }, // Productos
      { wch: 12 }, // Total Productos
      { wch: 12 }, // Estado
      { wch: 12 }, // Fecha
      { wch: 10 }  // Hora
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cotizaciones');

    const fechaHoy = new Date().toLocaleDateString('es-PE').replace(/\//g, '-');
    XLSX.writeFile(workbook, `Reporte_Cotizaciones_${fechaHoy}.xlsx`);
  }

  getEstadoColor(estado: string): string {
    const colores: any = {
      'pendiente': '#f59e0b',
      'en proceso': '#3b82f6',
      'atendida': '#10b981',
      'completada': '#059669',
      'cancelada': '#ef4444'
    };
    return colores[estado] || '#6b7280';
  }
}