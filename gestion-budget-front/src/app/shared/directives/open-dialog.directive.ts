import { Directive, HostListener, Input } from '@angular/core';
import { ModalComponent } from './../modal/modal.component';

@Directive({
  selector: '[appOpenDialog]',
  standalone: true,
})
export class OpenDialogDirective {
  @Input('appOpenDialog') dialogTarget!: HTMLDialogElement | ModalComponent;

  @HostListener('click')
  open() {
    if (!this.dialogTarget) return;

    if (this.dialogTarget instanceof ModalComponent) {
      this.dialogTarget.open();
    } else if (typeof this.dialogTarget.showModal === 'function') {
      this.dialogTarget.showModal();
    }
  }
}
