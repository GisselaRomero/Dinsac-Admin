import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../services/product.service';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

export type ProductExtended = Product & {
  featuresText?: string;
  tagsText?: string;
  videoURL?: string;
  destacado?: boolean;
  [key: string]: any; // acceso dinámico
};

@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, SafeUrlPipe],
})
export class ProductosComponent implements OnInit {
  products: ProductExtended[] = [];
  filteredProducts: ProductExtended[] = [];
  searchTerm: string = '';
  editingProductId: string | null = null;

categories = [
  'Agroindustria',
  'Artículos del Hogar',
  'Bombeo de Fluidos',
  'Carpintería',
  'Compresoras',
  'Construcción',
  'Electrobombas',
  'Generadores',
  'Grupos Electrógenos',
  'Herramientas Eléctricas',
  'Jardinería',
  'Limpieza Industrial',
  'Maquinaria Pesada',
  'Metalmecánica',
  'Minería',
  'Motores',
  'Novedades',
  'Ofertas y Liquidaciones',
  'Proceso de Alimentos',
  'Soldadura y Corte',
  'Taller Automotriz'
];

  // ✅ Solo "Normal" y "Oferta"
  tiposProducto = ['Normal', 'Oferta'];

  newProduct: ProductExtended = {
    codigo: 0,
    name: '',
    description: '',
    stock: 0,
    category: '',
    estado: '',
    image: '',
    image1: '',
    image2: '',
    image3: '',
    featuresText: '',
    tagsText: '',
    videoURL: '',
    destacado: false,
  };

  imageFields = [
    { name: 'image', label: 'Imagen principal', mode: 'url' },
    { name: 'image1', label: 'Imagen 1', mode: 'url' },
    { name: 'image2', label: 'Imagen 2', mode: 'url' },
    { name: 'image3', label: 'Imagen 3', mode: 'url' },
  ];
  currentPage: number = 1;
itemsPerPage: number = 5; // Cambia a 10 o 20 si quieres
totalPages: number = 0;


  constructor(private productService: ProductService) {}

  ngOnInit() {
    this.getAllProducts();
  }

getAllProducts() {
  this.productService.getProducts().subscribe((data) => {
    this.products = data;
    this.filteredProducts = [...this.products];
    this.currentPage = 1;  // 🔥 volver a página 1 siempre
    this.updatePagination();
  });
}

updatePagination() {
  this.totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
}
get paginatedProducts() {
  const start = (this.currentPage - 1) * this.itemsPerPage;
  const end = start + this.itemsPerPage;
  return this.filteredProducts.slice(start, end);
}


  onFileSelected(event: any, fieldName: string) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newProduct[fieldName] = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

createProduct() {
  if (!this.newProduct.name || !this.newProduct.description || !this.newProduct.category || !this.newProduct.estado) {
    alert('Completa los campos obligatorios: Nombre, Descripción, Categoría y Tipo');
    return;
  }

  // ✅ Convertir URL de YouTube antes de guardar
  if (this.newProduct.videoURL && this.videoMode === 'url') {
    this.newProduct.videoURL = this.convertirYouTubeURL(this.newProduct.videoURL);
  }

  const productToSave = {
    ...this.newProduct,
    featuresText: this.newProduct.featuresText || '',
    tagsText: this.newProduct.tagsText || ''
  };

  if (this.editingProductId) {
    this.productService.updateProduct(this.editingProductId, productToSave).subscribe({
      next: () => {
        alert('✅ Producto actualizado correctamente');
        this.resetForm();
        this.getAllProducts();
      },
      error: (err) => {
        console.error('❌ Error al actualizar el producto:', err);
        alert('Error al actualizar el producto');
      }
    });
  } else {
    this.productService.createProduct(productToSave).subscribe({
      next: () => {
        alert('✅ Producto agregado correctamente');
        this.resetForm();
        this.getAllProducts();
      },
      error: (err) => {
        console.error('❌ Error al guardar el producto:', err);
        alert('Error al guardar el producto');
      }
    });
  }
}


editProduct(p: ProductExtended) {
  this.newProduct = { ...p };
  this.editingProductId = p._id || null;

  // Detecta si el video es base64 y cambia el modo
  if (p.videoURL?.startsWith('data:video')) {
    this.videoMode = 'file';
  } else {
    this.videoMode = 'url';
  }
}


deleteProduct(id: string) {
  if (confirm('¿Eliminar producto?')) {
    this.productService.deleteProduct(id).subscribe(() => {
      this.products = this.products.filter((p) => p._id !== id);
      this.filteredProducts = [...this.products];

      this.currentPage = 1;  // 🔥 Para evitar que quede en página vacía
      this.updatePagination(); // 🔥 Recalcular

      alert("Producto eliminado");
    });
  }
}


  resetForm() {
    this.newProduct = {
      codigo: 0,
      name: '',
      description: '',
      stock: 0,
      category: '',
      estado: '',
      image: '',
      image1: '',
      image2: '',
      image3: '',
      featuresText: '',
      tagsText: '',
      videoURL: '',
      destacado: false,
    };
    this.editingProductId = null;
  }

buscar() {
  const term = this.searchTerm.toLowerCase();

  this.filteredProducts = this.products.filter(
    (p) =>
      p.name.toLowerCase().includes(term) ||
      p.codigo.toString().includes(term)
  );

  this.currentPage = 1;
  this.updatePagination();
}


  videoMode: 'url' | 'file' = 'url'; // modo del video

onVideoSelected(event: any) {
  const file = event.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.newProduct.videoURL = e.target.result; // guarda el video como base64
    };
    reader.readAsDataURL(file);
  }
}
// Convierte URL de YouTube a formato embed
convertirYouTubeURL(url: string): string {
  if (!url) return '';
  
  // Si ya es embed, devolver tal cual
  if (url.includes('/embed/')) return url;
  
  // Convertir watch?v= a embed
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  
  return url; // Si no es YouTube, devolver original
}
}
