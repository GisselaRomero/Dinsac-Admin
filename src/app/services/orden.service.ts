// src/app/services/orden.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrdenService {
  private apiUrl = 'https://backend-dinsac-hlf0.onrender.com/ordenes';

  constructor(private http: HttpClient) {}

  getOrdenes(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
