import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Modelo del producto
export interface Product {
  _id?: string;
  codigo: string;
  name: string;
  description: string;
  image: string;
  image1?: string;
  image2?: string;
  image3?: string;
  stock: number;
  price: number;
  precioReal?: number | null; 
    category: string;
  estado: string;
  videoURL?: string;
  featuresText?: string;
  tagsText?: string;
  destacado?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private apiUrl = 'https://backend-dinsac-hlf0.onrender.com/products';

  constructor(private http: HttpClient) {}

  // Obtener todos los productos
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  // Obtener productos por categoría
  getProductsByCategory(category: string): Observable<Product[]> {
    const url = `${this.apiUrl}?category=${encodeURIComponent(category)}`;
    return this.http.get<Product[]>(url);
  }

  // Crear un nuevo producto
  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product);
  }

  // Actualizar un producto existente
updateProduct(id: string, product: Partial<Product>): Observable<Product> {
  // ✅ Crear copia sin _id
  const { _id, ...productWithoutId } = product as any;
  
  console.log('🔧 Service updateProduct - ID:', id);
  console.log('🔧 Service updateProduct - Body (sin _id):', productWithoutId);
  
  return this.http.put<Product>(`${this.apiUrl}/${id}`, productWithoutId);
}

  // Eliminar un producto
  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
