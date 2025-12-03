import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-bannerofertas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bannerofertas.component.html',
  styleUrls: ['./bannerofertas.component.css']
})
export class BannerofertasComponent {
  // Para banners individuales
  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  
  // Para carrusel (3 archivos separados)
  carruselFiles: (File | null)[] = [null, null, null];
  carruselPreviews: (string | ArrayBuffer | null)[] = [null, null, null];
  
  mensaje: string = '';
  tipoBanner: string = 'principal';

  constructor(private http: HttpClient) {}

  // ========== BANNER INDIVIDUAL ==========
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];

    if (this.selectedFile) {
      const reader = new FileReader();
      reader.onload = () => this.previewUrl = reader.result;
      reader.readAsDataURL(this.selectedFile);
    }
  }

  subirBanner() {
    if (!this.selectedFile) {
      this.mensaje = "❌ Por favor selecciona una imagen.";
      return;
    }

    const formData = new FormData();
    formData.append('image', this.selectedFile);
    formData.append('tipo', this.tipoBanner);

    this.http.post('http://localhost:3000/banner', formData)
      .subscribe({
        next: (res: any) => {
          this.mensaje = `✅ Banner ${this.tipoBanner} subido correctamente.`;
          this.selectedFile = null;
          this.previewUrl = null;
          
          // Resetear input
          const fileInput = document.querySelector('input[type="file"]:not(.file-input-carrusel)') as HTMLInputElement;
          if (fileInput) fileInput.value = '';

          // Emitir evento
          window.dispatchEvent(new Event('bannerActualizado'));
        },
        error: (err) => {
          console.error('Error:', err);
          this.mensaje = `❌ Error al subir el banner ${this.tipoBanner}.`;
        }
      });
  }

  // ========== CARRUSEL (3 INPUTS SEPARADOS) ==========
  onCarruselFileSelected(event: any, index: number) {
    const file = event.target.files[0];
    
    if (file) {
      this.carruselFiles[index] = file;
      
      const reader = new FileReader();
      reader.onload = () => {
        this.carruselPreviews[index] = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  eliminarImagenCarrusel(index: number) {
    this.carruselFiles[index] = null;
    this.carruselPreviews[index] = null;
    
    // Resetear el input específico
    const inputs = document.querySelectorAll('.file-input-carrusel');
    if (inputs[index]) {
      (inputs[index] as HTMLInputElement).value = '';
    }
  }

  contarImagenesCarrusel(): number {
    return this.carruselFiles.filter(file => file !== null).length;
  }

  subirCarrusel() {
    const archivosParaSubir = this.carruselFiles.filter(file => file !== null) as File[];
    
    if (archivosParaSubir.length === 0) {
      this.mensaje = "❌ Por favor selecciona al menos una imagen.";
      return;
    }

    this.mensaje = '⏳ Subiendo imágenes...';
    let uploadedCount = 0;
    let errorCount = 0;

    // Subir cada archivo que no sea null
    archivosParaSubir.forEach((file, index) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('tipo', 'carrusel');

      this.http.post('https://backend-dinsac-hlf0.onrender.com/banner', formData)
        .subscribe({
          next: (res: any) => {
            uploadedCount++;
            console.log(`✅ Imagen ${index + 1} subida:`, res);
            
            // Cuando terminen todas
            if (uploadedCount + errorCount === archivosParaSubir.length) {
              this.finalizarCargaCarrusel(uploadedCount, errorCount);
            }
          },
          error: (err) => {
            errorCount++;
            console.error(`❌ Error subiendo imagen ${index + 1}:`, err);
            
            // Cuando terminen todas
            if (uploadedCount + errorCount === archivosParaSubir.length) {
              this.finalizarCargaCarrusel(uploadedCount, errorCount);
            }
          }
        });
    });
  }

  finalizarCargaCarrusel(exitosas: number, fallidas: number) {
    if (fallidas === 0) {
      this.mensaje = `✅ ${exitosas} imagen(es) subidas correctamente al carrusel.`;
    } else {
      this.mensaje = `⚠️ ${exitosas} exitosas, ${fallidas} fallidas.`;
    }

    // Limpiar todo
    this.carruselFiles = [null, null, null];
    this.carruselPreviews = [null, null, null];
    
    // Resetear todos los inputs del carrusel
    const inputs = document.querySelectorAll('.file-input-carrusel');
    inputs.forEach(input => {
      (input as HTMLInputElement).value = '';
    });

    // Emitir evento
    window.dispatchEvent(new Event('bannerActualizado'));
  }
}