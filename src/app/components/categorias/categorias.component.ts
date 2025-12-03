import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../services/product.service';

export type ProductExtended = Product & {
  featuresText?: string;
  tagsText?: string;
  videoURL?: string;
  destacado?: boolean;
  [key: string]: any; // ✅ permite acceso dinámico tipo newProduct[field]
};

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.css']
})
export class CategoriasComponent implements OnInit {
  products: ProductExtended[] = [];
  filteredProducts: ProductExtended[] = [];
  searchTerm = '';
  selectedCategory = '';
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

  estados = ['Ofertas', 'Estado normal'];

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
    destacado: false
  };

  imageFields = [
    { name: 'image', label: 'Imagen principal', mode: 'url' },
    { name: 'image1', label: 'Imagen 1', mode: 'url' },
    { name: 'image2', label: 'Imagen 2', mode: 'url' },
    { name: 'image3', label: 'Imagen 3', mode: 'url' }
  ];

  constructor(private productService: ProductService) {}

  ngOnInit() {
    this.loadAllProducts();
  }

  loadAllProducts() {
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.filteredProducts = [...this.products];
      },
      error: (err) => console.error('Error al cargar productos:', err)
    });
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
    if (!this.newProduct.name || !this.newProduct.category || !this.newProduct.estado) {
      alert('Completa todos los campos requeridos');
      return;
    }

    if (this.editingProductId) {
      this.productService.updateProduct(this.editingProductId, this.newProduct).subscribe(() => {
        alert('Producto actualizado correctamente');
        this.resetForm();
        this.loadAllProducts();
      });
    } else {
      this.productService.createProduct(this.newProduct).subscribe(() => {
        alert('Producto agregado correctamente');
        this.resetForm();
        this.loadAllProducts();
      });
    }
  }

  editProduct(p: ProductExtended) {
    this.newProduct = { ...p };
    this.editingProductId = p._id || null;
  }

  deleteProduct(id: string) {
    if (confirm('¿Seguro que deseas eliminar este producto?')) {
      this.productService.deleteProduct(id).subscribe(() => {
        this.products = this.products.filter(prod => prod._id !== id);
        this.filteredProducts = [...this.products];
      });
    }
  }

  filterByCategory(category: string) {
    this.selectedCategory = category;
    this.filteredProducts =
      category === 'all' ? this.products : this.products.filter(p => p.category === category);
  }

  buscar() {
    const term = this.searchTerm.toLowerCase();
    this.filteredProducts = this.products.filter(
      (p) => p.name.toLowerCase().includes(term) || p.codigo.toString().includes(term)
    );
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
      destacado: false
    };
    this.editingProductId = null;
  }

  getProductCountByCategory(category: string): number {
    return this.products.filter(p => p.category === category).length;
  }
}
