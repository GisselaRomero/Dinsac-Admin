import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Modelo del producto
export interface Product {
  _id?: string;
  codigo: number;
  name: string;
  description: string;
  image: string;
  image1?: string;
  image2?: string;
  image3?: string;
  stock: number;
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
  private apiUrl = 'http://localhost:3000/products';

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
  updateProduct(id: string, product: Product): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, product);
  }

  // Eliminar un producto
  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
