import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionCotizacionesComponent } from './gestion-cotizaciones.component';

describe('GestionCotizacionesComponent', () => {
  let component: GestionCotizacionesComponent;
  let fixture: ComponentFixture<GestionCotizacionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionCotizacionesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionCotizacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
