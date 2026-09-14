import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { Category } from './category.model';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/categories`;

  const mockCategories: Category[] = [
    { id: 1, label: 'Alimentation', isActive: true, position: 0 },
    { id: 2, label: 'Loisirs', isActive: true, position: 1 },
    { id: 3, label: 'Santé', isActive: false, position: 2 },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CategoryService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CategoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch categories and compute active ones correctly', () => {
    service.getCategories().subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockCategories);

    expect(service.allCategories()).toHaveLength(3);
    expect(service.activeCategories()).toHaveLength(2);
  });

  it('should POST a new category and push it to the state array', () => {
    const newCat: Category = { label: 'Cadeaux', isActive: true, position: 4 };
    const savedCat: Category = { id: 4, ...newCat };

    service['allCategoriesSignal'].set(mockCategories);

    service.createCategory(newCat).subscribe((result) => {
      expect(result).toEqual(savedCat);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    req.flush(savedCat);

    expect(service.allCategories()).toHaveLength(4);
    expect(service.allCategories()[3].id).toBe(4);
  });

  it('should PUT updates for a category and replace it in the state array', () => {
    service['allCategoriesSignal'].set(mockCategories);

    const updatedCat: Category = { id: 2, label: 'Cinéma & Restos', isActive: true, position: 1 };

    service.updateCategory(2, updatedCat).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/2`);
    expect(req.request.method).toBe('PUT');
    req.flush(updatedCat);

    const targetCat = service.allCategories().find((c) => c.id === 2);
    expect(targetCat?.label).toBe('Cinéma & Restos');
  });

  it('should process soft-delete by setting isActive to false when API returns false', () => {
    service['allCategoriesSignal'].set(mockCategories);

    service.deleteCategory(2).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush(false);

    expect(service.allCategories()).toHaveLength(3);
    const category2 = service.allCategories().find((c) => c.id === 2);
    expect(category2?.isActive).toBe(false);
    expect(service.activeCategories()).toHaveLength(1);
  });

  it('should process hard-delete by evicting the row from the signal when API returns true', () => {
    service['allCategoriesSignal'].set(mockCategories);

    service.deleteCategory(2).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/2`);
    expect(req.request.method).toBe('DELETE');

    req.flush(true);

    expect(service.allCategories()).toHaveLength(2);
    expect(service.allCategories().some((c) => c.id === 2)).toBe(false);
  });

  it('should overwrite entire state when bulk saveAll API is triggered', () => {
    service['allCategoriesSignal'].set(mockCategories);

    const orderedCollection: Category[] = [
      { id: 2, label: 'Loisirs', isActive: true, position: 0 },
      { id: 1, label: 'Alimentation', isActive: true, position: 1 },
    ];

    service.saveAll(orderedCollection).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/saveAll`);
    expect(req.request.method).toBe('POST');
    req.flush(orderedCollection);

    expect(service.allCategories()).toHaveLength(2);
    expect(service.allCategories()[0].id).toBe(2);
  });
});
