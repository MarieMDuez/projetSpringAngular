import { Pipe, PipeTransform } from '@angular/core';

interface Identifiable {
  id?: number;
}
@Pipe({
  name: 'findById',
  pure: true,
})
export class FindByIdPipe implements PipeTransform {
  transform<T extends Identifiable>(items: T[] | null, id: number | undefined): T | null {
    if (!items || id === undefined) return null;
    return items.find((item) => item.id === id) ?? null;
  }
}
