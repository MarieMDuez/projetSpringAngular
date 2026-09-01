import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appSelectLoop]',
  standalone: true,
})
export class SelectLoopDirective {
  @HostListener('keydown', ['$event'])
  protected handleSelectLoop(event: KeyboardEvent): void {
    const select = event.target as HTMLSelectElement;
    const currentIndex = select.selectedIndex;
    const maxIndex = select.options.length - 1;

    if (event.key === 'ArrowDown' && currentIndex === maxIndex) {
      event.preventDefault();
      select.selectedIndex = 0;
      select.dispatchEvent(new Event('change'));
    } else if (event.key === 'ArrowUp' && currentIndex === 0) {
      event.preventDefault();
      select.selectedIndex = maxIndex;
      select.dispatchEvent(new Event('change'));
    }
  }
}
