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
  precioReal: number | null = null;


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

  // Modo de video (url/file)
  videoMode: 'url' | 'file' = 'url';

  constructor(private productService: ProductService) {}

  ngOnInit() {
    this.getAllProducts();
  }

  getAllProducts() {
    this.productService.getProducts().subscribe((data) => {
      this.products = data.map(p => ({
        ...p,
        codigo: String(p.codigo)  // 🔥 fuerza que siempre sea TEXTO
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
  // ✅ Validar antes de enviar
  if (!this.newProduct.name || !this.newProduct.description || 
      !this.newProduct.category || !this.newProduct.estado) {
    alert('⚠️ Completa: Nombre, Descripción, Categoría y Tipo (Normal/Oferta)');
    return;
  }

  // ✅ Validar código
  if (!this.newProduct.codigo || this.newProduct.codigo.trim() === '') {
    alert('⚠️ El código es obligatorio');
    return;
  }

  // ✅ Normalizar código (permitir letras y números)
  this.newProduct.codigo = String(this.newProduct.codigo).trim().toUpperCase();

  // ✅ Validar formato alfanumérico (letras y números solamente)
  const codigoRegex = /^[A-Z0-9]+$/i;
  if (!codigoRegex.test(this.newProduct.codigo)) {
    alert('⚠️ El código solo puede contener letras y números (sin espacios ni caracteres especiales)\nEjemplo válido: MT123, GEN2024, 200MG');
    return;
  }

  // ✅ Normalizar stock
  if (this.newProduct.stock !== undefined && this.newProduct.stock !== null) {
    this.newProduct.stock = Number(this.newProduct.stock);
  }

  // Convertir URL de YouTube
  if (this.newProduct.videoURL && this.videoMode === 'url') {
    this.newProduct.videoURL = this.convertirYouTubeURL(this.newProduct.videoURL);
  }

  // ✅ Crear copia del producto SIN el campo _id
  const productToSave: any = {
    codigo: this.newProduct.codigo,
    name: this.newProduct.name,
    description: this.newProduct.description,
    stock: this.newProduct.stock,
      price: Number(this.newProduct.price),   
    category: this.newProduct.category,
    estado: this.newProduct.estado,
    featuresText: this.newProduct.featuresText || '',
    tagsText: this.newProduct.tagsText || '',
    destacado: this.newProduct.destacado || false
  };

  // ✅ Solo agregar imágenes si tienen valor
  if (this.newProduct.image) productToSave.image = this.newProduct.image;
  if (this.newProduct.image1) productToSave.image1 = this.newProduct.image1;
  if (this.newProduct.image2) productToSave.image2 = this.newProduct.image2;
  if (this.newProduct.image3) productToSave.image3 = this.newProduct.image3;
  if (this.newProduct.videoURL) productToSave.videoURL = this.newProduct.videoURL;

  console.log('📤 Enviando producto:', productToSave);

  if (this.editingProductId) {
    // ========== ACTUALIZAR ==========
    console.log('🔄 Actualizando producto ID:', this.editingProductId);
    console.log('📦 Datos a enviar (sin _id):', productToSave);

    this.productService.updateProduct(this.editingProductId, productToSave).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:', response);
        alert('✅ Producto actualizado correctamente');
        this.resetForm();
        this.getAllProducts();
      },
      error: (err) => {
        console.error('❌ Error completo:', err);
        console.error('❌ Respuesta del servidor:', err.error);

        let errorMsg = 'Error al actualizar el producto';
        if (err.error?.details) {
          errorMsg += ':\n' + err.error.details.map((d: any) => 
            `- ${d.field}: ${d.message}`
          ).join('\n');
        } else if (err.error?.message) {
          errorMsg += ': ' + err.error.message;
        }

        alert(errorMsg);
      }
    });
if (this.newProduct.price === undefined || this.newProduct.price < 0) {
  alert("⚠️ El precio debe ser mayor o igual a 0");
  return;
}

    
  } else {
    // ========== CREAR ==========
    console.log('➕ Creando nuevo producto');
    console.log('📦 Datos a enviar:', productToSave);

    this.productService.createProduct(productToSave).subscribe({
      next: (response) => {
        console.log('✅ Producto creado:', response);
        alert('✅ Producto agregado correctamente');
        this.resetForm();
        this.getAllProducts();
      },
      error: (err) => {
        console.error('❌ Error al crear:', err);

        let errorMsg = 'Error al crear el producto';
        if (err.error?.details) {
          errorMsg += ':\n' + err.error.details.map((d: any) => 
            `- ${d.field}: ${d.message}`
          ).join('\n');
        } else if (err.error?.message) {
          errorMsg += ': ' + err.error.message;
        }

        alert(errorMsg);
      }
    });
  }
}

  // CORRECCIÓN: editProduct ahora usa newProduct (ya definido) y setea editingProductId
editProduct(p: ProductExtended) {
  // ✅ IMPORTANTE: Crear un objeto LIMPIO sin campos extras
  this.newProduct = { 
    codigo: p.codigo !== undefined && p.codigo !== null ? String(p.codigo).trim() : '',
    name: p.name || '',
    description: p.description || '',
    stock: p.stock !== undefined && p.stock !== null ? Number(p.stock) : 0,
    price: p.price || 0,
    category: p.category || '',
    estado: p.estado || 'Normal',
    image: p.image || '',
    image1: p.image1 || '',
    image2: p.image2 || '',
    image3: p.image3 || '',
    featuresText: p.featuresText || '',
    tagsText: p.tagsText || '',
    videoURL: p.videoURL || '',
    destacado: p.destacado || false
  };

  // ✅ NO copiar el _id
  this.editingProductId = p._id || null;

  // Configurar modo de video
  if (p.videoURL?.startsWith('data:video')) {
    this.videoMode = 'file';
  } else {
    this.videoMode = 'url';
  }

  // Configurar modo de imágenes
  this.imageFields.forEach((field) => {
    const imgValue = this.newProduct[field.name];
    if (imgValue?.startsWith('data:image')) {
      field.mode = 'file';
    } else {
      field.mode = 'url';
    }
  });

  console.log('✅ Producto cargado para edición (sin _id):', this.newProduct);
  console.log('📝 ID que se usará para actualizar:', this.editingProductId);
}

  // Si tu UI llama a openEditModal, aquí lo dejamos consistente con editProduct
  openEditModal(product: ProductExtended) {
    // reutiliza la misma lógica de editProduct para evitar duplicación
    this.editProduct(product);
    // si tu UI necesita una bandera modal, puedes controlarla en el HTML; no uso isEditModalOpen aquí
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
      codigo: '',
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
    // mantener videoMode por defecto
    this.videoMode = 'url';
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
