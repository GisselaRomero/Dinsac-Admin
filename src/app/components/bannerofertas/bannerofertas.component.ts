import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BannerResponse {
  success: boolean;
  mensaje: string;
  data?: any;
  error?: string;
}

@Component({
  selector: 'app-bannerofertas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bannerofertas.component.html',
  styleUrls: ['./bannerofertas.component.css']
})
export class BannerofertasComponent {
  // =================== PROPIEDADES ===================
  
  // Para banners individuales
  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  
  // Para carrusel (3 archivos separados)
  carruselFiles: (File | null)[] = [null, null, null];
  carruselPreviews: (string | ArrayBuffer | null)[] = [null, null, null];
  
  mensaje: string = '';
  tipoBanner: string = 'principal';
  isLoading: boolean = false;

  private readonly API_URL = 'https://backend-dinsac-hlf0.onrender.com/banner';

  constructor(private http: HttpClient) {}

  // =================== BANNER INDIVIDUAL ===================
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        this.mensaje = "❌ La imagen no debe superar los 5MB";
        input.value = '';
        return;
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        this.mensaje = "❌ Solo se permiten imágenes";
        input.value = '';
        return;
      }

      this.selectedFile = file;

      // Generar preview
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result;
      };
      reader.readAsDataURL(file);
      
      this.mensaje = '';
    }
  }

  subirBanner(): void {
    if (!this.selectedFile) {
      this.mensaje = "❌ Por favor selecciona una imagen.";
      return;
    }

    this.isLoading = true;
    this.mensaje = '⏳ Subiendo banner...';

    const formData = new FormData();
    formData.append('image', this.selectedFile);
    formData.append('tipo', this.tipoBanner);

    this.http.post<BannerResponse>(this.API_URL, formData)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.mensaje = `✅ Banner ${this.tipoBanner} subido correctamente.`;
            this.limpiarBannerIndividual();
            window.dispatchEvent(new Event('bannerActualizado'));
          } else {
            this.mensaje = `❌ ${res.mensaje}`;
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error:', err);
          this.mensaje = `❌ Error al subir el banner: ${err.error?.mensaje || err.message}`;
          this.isLoading = false;
        }
      });
  }

  private limpiarBannerIndividual(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    
    const fileInput = document.querySelector('input[type="file"]:not(.file-input-carrusel)') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // =================== CARRUSEL ===================
  
  onCarruselFileSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        this.mensaje = `❌ La imagen ${index + 1} no debe superar los 5MB`;
        input.value = '';
        return;
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        this.mensaje = `❌ Solo se permiten imágenes`;
        input.value = '';
        return;
      }

      this.carruselFiles[index] = file;
      
      // Generar preview
      const reader = new FileReader();
      reader.onload = () => {
        this.carruselPreviews[index] = reader.result;
      };
      reader.readAsDataURL(file);
      
      this.mensaje = '';
    }
  }

  eliminarImagenCarrusel(index: number): void {
    this.carruselFiles[index] = null;
    this.carruselPreviews[index] = null;
    
    const inputs = document.querySelectorAll('.file-input-carrusel');
    if (inputs[index]) {
      (inputs[index] as HTMLInputElement).value = '';
    }
  }

  contarImagenesCarrusel(): number {
    return this.carruselFiles.filter(file => file !== null).length;
  }

  // ✅ SUBIR CARRUSEL SECUENCIALMENTE (evita errores 500)
  async subirCarrusel(): Promise<void> {
    const totalImagenes = this.contarImagenesCarrusel();
    
    if (totalImagenes === 0) {
      this.mensaje = "❌ Por favor selecciona al menos una imagen.";
      return;
    }

    this.isLoading = true;
    this.mensaje = '⏳ Subiendo imágenes...';
    
    let uploadedCount = 0;
    let errorCount = 0;

    // ✅ Subir secuencialmente (una por una)
    for (let index = 0; index < this.carruselFiles.length; index++) {
      const file = this.carruselFiles[index];
      
      if (file === null) continue; // Saltar slots vacíos

      const formData = new FormData();
      formData.append('image', file);
      formData.append('tipo', 'carrusel');
      formData.append('orden', index.toString());

      try {
        const res = await this.http.post<BannerResponse>(this.API_URL, formData).toPromise();
        
        if (res?.success) {
          uploadedCount++;
          console.log(`✅ Imagen ${index + 1} (orden ${index}) subida:`, res);
        } else {
          errorCount++;
          console.error(`❌ Error imagen ${index + 1}:`, res?.mensaje);
        }
        
        // Actualizar progreso
        this.mensaje = `⏳ Subiendo... ${uploadedCount + errorCount} de ${totalImagenes}`;
        
      } catch (err: any) {
        errorCount++;
        console.error(`❌ Error subiendo imagen ${index + 1}:`, err);
      }
    }

    // Finalizar
    this.finalizarCargaCarrusel(uploadedCount, errorCount);
  }

  private finalizarCargaCarrusel(exitosas: number, fallidas: number): void {
    if (fallidas === 0) {
      this.mensaje = `✅ ${exitosas} imagen(es) subidas correctamente al carrusel.`;
    } else if (exitosas === 0) {
      this.mensaje = `❌ No se pudo subir ninguna imagen. Verifica tu conexión.`;
    } else {
      this.mensaje = `⚠️ ${exitosas} exitosas, ${fallidas} fallidas.`;
    }

    // Limpiar todo
    this.carruselFiles = [null, null, null];
    this.carruselPreviews = [null, null, null];
    
    const inputs = document.querySelectorAll('.file-input-carrusel');
    inputs.forEach(input => {
      (input as HTMLInputElement).value = '';
    });

    this.isLoading = false;
    window.dispatchEvent(new Event('bannerActualizado'));
  }
}