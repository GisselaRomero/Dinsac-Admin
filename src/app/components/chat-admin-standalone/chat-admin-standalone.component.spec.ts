import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatAdminStandaloneComponent } from './chat-admin-standalone.component';

describe('ChatAdminStandaloneComponent', () => {
  let component: ChatAdminStandaloneComponent;
  let fixture: ComponentFixture<ChatAdminStandaloneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatAdminStandaloneComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatAdminStandaloneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
