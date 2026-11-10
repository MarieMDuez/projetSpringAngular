import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
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

  /** Copie profonde pour isoler chaque test du jeu de données partagé. */
  const fresh = (): Category[] => structuredClone(mockCategories);

  /** Charge l'état initial du service avec les 3 catégories de test. */
  const loadInitialState = (): void => {
    service.getCategories().subscribe();
    httpMock.expectOne(apiUrl).flush(fresh());
  };

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

  describe('Initial State & Signals', () => {
    it('should have empty signals by default', () => {
      expect(service.allCategories()).toEqual([]);
      expect(service.activeCategories()).toEqual([]);
      expect(service.editingCategory()).toBeNull();
    });

    it('should store and reset the editing category', () => {
      service.editingCategory.set(mockCategories[0]);
      expect(service.editingCategory()).toEqual(mockCategories[0]);

      service.editingCategory.set(null);
      expect(service.editingCategory()).toBeNull();
    });
  });

  describe('getCategories()', () => {
    it('should fetch categories via GET and compute active ones correctly', () => {
      let result: Category[] | undefined;
      service.getCategories().subscribe((c) => (result = c));

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(fresh());

      expect(result).toEqual(mockCategories);
      expect(service.allCategories()).toEqual(mockCategories);
      expect(service.activeCategories().map((c) => c.id)).toEqual([1, 2]);
    });

    it('should replace the previous state on a new fetch', () => {
      loadInitialState();

      service.getCategories().subscribe();
      httpMock.expectOne(apiUrl).flush([mockCategories[0]]);

      expect(service.allCategories()).toEqual([mockCategories[0]]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      loadInitialState();

      let error: HttpErrorResponse | undefined;
      service.getCategories().subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(apiUrl).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allCategories()).toEqual(mockCategories);
    });
  });

  describe('createCategory()', () => {
    beforeEach(() => loadInitialState());

    it('should POST a new category and append it to the state array', () => {
      const newCat: Category = { label: 'Cadeaux', isActive: true, position: 3 };
      const savedCat: Category = { id: 4, ...newCat };

      let result: Category | undefined;
      service.createCategory(newCat).subscribe((r) => (result = r));

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newCat);
      req.flush(savedCat);

      expect(result).toEqual(savedCat);
      const categories = service.allCategories();
      expect(categories).toHaveLength(4);
      expect(categories[3]).toEqual(savedCat);
      expect(categories.slice(0, 3)).toEqual(mockCategories);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service
        .createCategory({ label: 'Cadeaux', isActive: true, position: 3 })
        .subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(apiUrl).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allCategories()).toEqual(mockCategories);
    });
  });

  describe('updateCategory()', () => {
    beforeEach(() => loadInitialState());

    it('should PUT updates and replace only the matching category', () => {
      const updatedCat: Category = { id: 2, label: 'Cinéma & Restos', isActive: true, position: 1 };

      service.updateCategory(2, updatedCat).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/2`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updatedCat);
      req.flush(updatedCat);

      const categories = service.allCategories();
      expect(categories).toHaveLength(3);
      expect(categories.find((c) => c.id === 2)).toEqual(updatedCat);
      expect(categories.find((c) => c.id === 1)).toEqual(mockCategories[0]);
      expect(categories.find((c) => c.id === 3)).toEqual(mockCategories[2]);
    });

    it('should leave the state unchanged when the ID does not exist', () => {
      const ghost: Category = { id: 999, label: 'Fantôme', isActive: true, position: 9 };

      service.updateCategory(999, ghost).subscribe();
      httpMock.expectOne(`${apiUrl}/999`).flush(ghost);

      expect(service.allCategories()).toEqual(mockCategories);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service
        .updateCategory(2, { ...mockCategories[1], label: 'X' })
        .subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(`${apiUrl}/2`).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allCategories()).toEqual(mockCategories);
    });
  });

  describe('deleteCategory()', () => {
    beforeEach(() => loadInitialState());

    it('should process soft-delete by setting isActive to false when API returns false', () => {
      let result: boolean | undefined;
      service.deleteCategory(2).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/2`);
      expect(req.request.method).toBe('DELETE');
      req.flush(false);

      expect(result).toBe(false);
      const categories = service.allCategories();
      expect(categories).toHaveLength(3);
      expect(categories.find((c) => c.id === 2)).toEqual({ ...mockCategories[1], isActive: false });
      expect(categories.find((c) => c.id === 1)).toEqual(mockCategories[0]);
      expect(categories.find((c) => c.id === 3)).toEqual(mockCategories[2]);
      expect(service.activeCategories().map((c) => c.id)).toEqual([1]);
    });

    it('should process hard-delete by evicting the row when API returns true', () => {
      let result: boolean | undefined;
      service.deleteCategory(2).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/2`);
      expect(req.request.method).toBe('DELETE');
      req.flush(true);

      expect(result).toBe(true);
      expect(service.allCategories()).toEqual([mockCategories[0], mockCategories[2]]);
      expect(service.activeCategories().map((c) => c.id)).toEqual([1]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service.deleteCategory(2).subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(`${apiUrl}/2`).flush('boom', { status: 404, statusText: 'Not Found' });

      expect(error?.status).toBe(404);
      expect(service.allCategories()).toEqual(mockCategories);
    });
  });

  describe('setCategoryActive()', () => {
    beforeEach(() => loadInitialState());

    it('should activate the target category without affecting others', () => {
      const activated: Category = { ...mockCategories[2], isActive: true };

      service.setCategoryActive(3, activated).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/3/set-active`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(activated);
      req.flush(activated);

      const categories = service.allCategories();
      expect(categories).toHaveLength(3);
      expect(categories.find((c) => c.id === 3)).toEqual(activated);
      expect(categories.find((c) => c.id === 1)).toEqual(mockCategories[0]);
      expect(categories.find((c) => c.id === 2)).toEqual(mockCategories[1]);
      expect(service.activeCategories().map((c) => c.id)).toEqual([1, 2, 3]);
    });

    it('should deactivate the target category and update activeCategories', () => {
      const deactivated: Category = { ...mockCategories[1], isActive: false };

      service.setCategoryActive(2, deactivated).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/2/set-active`);
      expect(req.request.body).toEqual(deactivated);
      req.flush(deactivated);

      expect(service.allCategories().find((c) => c.id === 2)?.isActive).toBe(false);
      expect(service.activeCategories().map((c) => c.id)).toEqual([1]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service
        .setCategoryActive(3, { ...mockCategories[2], isActive: true })
        .subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne(`${apiUrl}/3/set-active`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allCategories()).toEqual(mockCategories);
    });
  });

  describe('saveAll()', () => {
    beforeEach(() => loadInitialState());

    it('should POST the collection and overwrite the entire state', () => {
      const ordered: Category[] = [
        { id: 2, label: 'Loisirs', isActive: true, position: 0 },
        { id: 1, label: 'Alimentation', isActive: true, position: 1 },
      ];

      let result: Category[] | undefined;
      service.saveAll(ordered).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/saveAll`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(ordered);
      req.flush(structuredClone(ordered));

      expect(result).toEqual(ordered);
      expect(service.allCategories().map((c) => c.id)).toEqual([2, 1]);
      expect(service.allCategories().map((c) => c.position)).toEqual([0, 1]);
    });

    it('should handle an empty collection', () => {
      service.saveAll([]).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/saveAll`);
      expect(req.request.body).toEqual([]);
      req.flush([]);

      expect(service.allCategories()).toEqual([]);
      expect(service.activeCategories()).toEqual([]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service.saveAll([mockCategories[0]]).subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne(`${apiUrl}/saveAll`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allCategories()).toEqual(mockCategories);
    });
  });
});
