import { Component, ElementRef, viewChild, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})
export class ModalComponent {
  title = input<string>(''); // Devient optionnel si options === 'empty'
  options = input<'accept-reject' | 'close-only' | 'empty'>('accept-reject');
  confirmText = input<string>('Confirmer');
  cancelText = input<string>('Annuler');
  type = input<'info' | 'danger' | 'warning'>('info');

  resultAction = output<'confirm' | 'cancel'>();

  dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('internalDialog');

  open(): void {
    this.dialogEl().nativeElement.showModal();
  }

  close(): void {
    this.dialogEl().nativeElement.close();
  }

  onCancel(): void {
    this.resultAction.emit('cancel');
    this.close();
  }

  onConfirm(): void {
    this.resultAction.emit('confirm');
    this.close();
  }
}
