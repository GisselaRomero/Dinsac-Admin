import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BannerofertasComponent } from './bannerofertas.component';

describe('BannerofertasComponent', () => {
  let component: BannerofertasComponent;
  let fixture: ComponentFixture<BannerofertasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BannerofertasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BannerofertasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
