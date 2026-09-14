import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';
import { ElementRef } from '@angular/core';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;
  let mockNativeDialog: { showModal: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;

    mockNativeDialog = {
      showModal: vi.fn(),
      close: vi.fn(),
    };

    vi.spyOn(component, 'dialogEl').mockReturnValue(
      new ElementRef<HTMLDialogElement>(mockNativeDialog as unknown as HTMLDialogElement),
    );

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct default inputs', () => {
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.detectChanges();

    expect(component.title()).toBe('Test Title');
    expect(component.options()).toBe('accept-reject');
    expect(component.confirmText()).toBe('Confirmer');
    expect(component.cancelText()).toBe('Annuler');
    expect(component.type()).toBe('info');
  });

  it('should open the native dialog when open is called', () => {
    component.open();
    expect(mockNativeDialog.showModal).toHaveBeenCalled();
  });

  it('should close the native dialog when close is called', () => {
    component.close();
    expect(mockNativeDialog.close).toHaveBeenCalled();
  });

  it('should emit cancel event and close dialog on onCancel', () => {
    let emittedAction: 'confirm' | 'cancel' | null = null;
    component.resultAction.subscribe((action) => (emittedAction = action));

    component.onCancel();

    expect(emittedAction).toBe('cancel');
    expect(mockNativeDialog.close).toHaveBeenCalled();
  });

  it('should emit confirm event and close dialog on onConfirm', () => {
    let emittedAction: 'confirm' | 'cancel' | null = null;
    component.resultAction.subscribe((action) => (emittedAction = action));

    component.onConfirm();

    expect(emittedAction).toBe('confirm');
    expect(mockNativeDialog.close).toHaveBeenCalled();
  });
});
