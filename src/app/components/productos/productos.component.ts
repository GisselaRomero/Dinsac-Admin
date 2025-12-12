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
  precioReal?: number | null;
  [key: string]: any;
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
  precioReal: number | null = null;

  categories = [
    'Agroindustria', 'Artículos del Hogar', 'Bombeo de Fluidos', 'Carpintería',
    'Compresoras', 'Construcción', 'Electrobombas', 'Generadores', 'Grupos Electrógenos',
    'Herramientas Eléctricas', 'Jardinería', 'Limpieza Industrial', 'Maquinaria Pesada',
    'Metalmecánica', 'Minería', 'Motores', 'Novedades', 'Ofertas y Liquidaciones',
    'Proceso de Alimentos', 'Soldadura y Corte', 'Taller Automotriz'
  ];

  tiposProducto = ['Normal', 'Oferta'];

  newProduct: ProductExtended = {
    codigo: '',
    name: '',
    description: '',
    stock: 0,
    price: 0,
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
    precioReal: null
  };

  imageFields = [
    { name: 'image', label: 'Imagen principal', mode: 'url' },
    { name: 'image1', label: 'Imagen 1', mode: 'url' },
    { name: 'image2', label: 'Imagen 2', mode: 'url' },
    { name: 'image3', label: 'Imagen 3', mode: 'url' },
  ];

  currentPage = 1;
  itemsPerPage = 5;
  totalPages = 0;

  videoMode: 'url' | 'file' = 'url';

  constructor(private productService: ProductService) {}

  ngOnInit() {
    this.getAllProducts();
  }

  getAllProducts() {
    this.productService.getProducts().subscribe((data) => {
      this.products = data.map(p => ({
        ...p,
        codigo: String(p.codigo),
        precioReal: p.precioReal || null
      }));

      this.filteredProducts = [...this.products];
      this.currentPage = 1;
      this.updatePagination();
    });
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
  }

  get paginatedProducts() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredProducts.slice(start, start + this.itemsPerPage);
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
    // VALIDACIONES
    if (!this.newProduct.name || !this.newProduct.description || !this.newProduct.category || !this.newProduct.estado) {
      alert('⚠️ Completa: Nombre, Descripción, Categoría y Tipo');
      return;
    }

    if (!this.newProduct.codigo.trim()) {
      alert('⚠️ El código es obligatorio');
      return;
    }

    const codigoRegex = /^[A-Z0-9]+$/i;
    if (!codigoRegex.test(this.newProduct.codigo)) {
      alert('⚠️ Código inválido. Solo letras y números.');
      return;
    }

    this.newProduct.codigo = this.newProduct.codigo.toUpperCase();

    if (this.newProduct.price < 0) {
      alert("⚠️ El precio debe ser mayor o igual a 0");
      return;
    }

    // VALIDACIÓN ESPECÍFICA PARA OFERTAS
    if (this.newProduct.estado === 'Oferta') {
      if (this.precioReal === null || this.precioReal <= 0) {
        alert('⚠️ Debes ingresar un precio real válido para las ofertas');
        return;
      }
      if (this.newProduct.price >= this.precioReal) {
        alert('⚠️ El precio de oferta debe ser menor al precio real');
        return;
      }
    }

    // CONVERTIR VIDEO URL
    if (this.videoMode === 'url' && this.newProduct.videoURL) {
      this.newProduct.videoURL = this.convertirYouTubeURL(this.newProduct.videoURL);
    }

    // OBJETO A ENVIAR AL BACKEND
    const productToSave: any = {
      codigo: this.newProduct.codigo,
      name: this.newProduct.name,
      description: this.newProduct.description,
      stock: Number(this.newProduct.stock),
      price: Number(this.newProduct.price),
      category: this.newProduct.category,
      estado: this.newProduct.estado,
      featuresText: this.newProduct.featuresText || '',
      tagsText: this.newProduct.tagsText || '',
      destacado: this.newProduct.destacado || false
    };

    // IMÁGENES
    ['image', 'image1', 'image2', 'image3'].forEach(img => {
      if (this.newProduct[img]) productToSave[img] = this.newProduct[img];
    });

    // VIDEO
    if (this.newProduct.videoURL) productToSave.videoURL = this.newProduct.videoURL;

    // ✅ CORREGIDO: SI ES OFERTA → GUARDAR precioReal (obligatorio)
    if (this.newProduct.estado === 'Oferta' && this.precioReal !== null) {
      productToSave.precioReal = Number(this.precioReal);
    } else if (this.newProduct.estado === 'Normal') {
      // Si es Normal, asegurar que precioReal sea null
      productToSave.precioReal = null;
    }

    console.log("📤 Enviando:", productToSave);

    // CREAR O ACTUALIZAR
    if (this.editingProductId) {
      this.productService.updateProduct(this.editingProductId, productToSave).subscribe({
        next: () => {
          alert("✅ Producto actualizado");
          this.resetForm();
          this.getAllProducts();
        },
        error: err => {
          console.error(err);
          alert("❌ Error al actualizar");
        }
      });
    } else {
      this.productService.createProduct(productToSave).subscribe({
        next: () => {
          alert("✅ Producto creado");
          this.resetForm();
          this.getAllProducts();
        },
        error: err => {
          console.error(err);
          alert("❌ Error al crear");
        }
      });
    }
  }

  editProduct(p: ProductExtended) {
    this.newProduct = {
      codigo: p.codigo || '',
      name: p.name || '',
      description: p.description || '',
      stock: Number(p.stock || 0),
      price: Number(p.price || 0),
      category: p.category || '',
      estado: p.estado || 'Normal',
      image: p.image || '',
      image1: p.image1 || '',
      image2: p.image2 || '',
      image3: p.image3 || '',
      featuresText: p.featuresText || '',
      tagsText: p.tagsText || '',
      videoURL: p.videoURL || '',
      destacado: p.destacado || false,
      precioReal: p.precioReal || null
    };

    this.precioReal = p.precioReal || null;

    this.editingProductId = p._id || null;

    // VIDEO MODE
    this.videoMode = p.videoURL?.startsWith('data:video') ? 'file' : 'url';

    // IMÁGENES MODE
    this.imageFields.forEach(field => {
      const val = this.newProduct[field.name];
      field.mode = val && val.startsWith('data:image') ? 'file' : 'url';
    });
  }

  deleteProduct(id: string) {
    if (!confirm("¿Eliminar producto?")) return;

    this.productService.deleteProduct(id).subscribe(() => {
      this.products = this.products.filter(p => p._id !== id);
      this.filteredProducts = [...this.products];
      this.currentPage = 1;
      this.updatePagination();
      alert("Producto eliminado");
    });
  }

  resetForm() {
    this.newProduct = {
      codigo: '',
      name: '',
      description: '',
      stock: 0,
      price: 0,
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
      precioReal: null
    };
    this.precioReal = null;
    this.editingProductId = null;
    this.videoMode = 'url';
  }

  buscar() {
    const term = this.searchTerm.toLowerCase();
    this.filteredProducts = this.products.filter(
      p =>
        p.name.toLowerCase().includes(term) ||
        p.codigo.toString().includes(term)
    );
    this.currentPage = 1;
    this.updatePagination();
  }

  onVideoSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.newProduct.videoURL = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  convertirYouTubeURL(url: string): string {
    if (!url) return '';
    if (url.includes('/embed/')) return url;

    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  }
}