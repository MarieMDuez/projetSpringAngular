import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { ProjectedBudgetCategoryType } from '../../projected_budget/projected-budget-items.model';
import { ProjectedBudgetSettings } from './projected-budget-settings.model';
import { ProjectedBudgetSettingsService } from './projected-budget-settings.service';

describe('ProjectedBudgetSettingsService', () => {
  let service: ProjectedBudgetSettingsService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/projected_budget_settings`;

  const TYPE_A = 'COURANT' as unknown as ProjectedBudgetCategoryType;
  const TYPE_B = 'EPARGNE' as unknown as ProjectedBudgetCategoryType;

  const mockSettings: ProjectedBudgetSettings[] = [
    { id: 1, category: { id: 10, label: 'Alimentation' }, type: TYPE_A },
    { id: 2, category: { id: 20, label: 'Loisirs' }, type: TYPE_B },
    { id: 3, category: { id: 30 }, type: TYPE_A }, // label optionnel absent
  ];

  /** Copie profonde pour isoler chaque test du jeu de données partagé. */
  const fresh = (): ProjectedBudgetSettings[] => structuredClone(mockSettings);

  /** Charge l'état initial du service avec les 3 réglages de test. */
  const loadInitialState = (): void => {
    service.getProjectedBudgetSettings().subscribe();
    httpMock.expectOne(apiUrl).flush(fresh());
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProjectedBudgetSettingsService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ProjectedBudgetSettingsService);
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
      expect(service.allProjectedBudgetSettings()).toEqual([]);
      expect(service.editingProjectedBudgetSettings()).toBeNull();
    });

    it('should store and reset the editing setting', () => {
      service.editingProjectedBudgetSettings.set(mockSettings[0]);
      expect(service.editingProjectedBudgetSettings()).toEqual(mockSettings[0]);

      service.editingProjectedBudgetSettings.set(null);
      expect(service.editingProjectedBudgetSettings()).toBeNull();
    });
  });

  describe('getProjectedBudgetSettings()', () => {
    it('should fetch settings via GET and populate the signal', () => {
      let result: ProjectedBudgetSettings[] | undefined;
      service.getProjectedBudgetSettings().subscribe((s) => (result = s));

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(fresh());

      expect(result).toEqual(mockSettings);
      expect(service.allProjectedBudgetSettings()).toEqual(mockSettings);
    });

    it('should replace the previous state on a new fetch', () => {
      loadInitialState();

      service.getProjectedBudgetSettings().subscribe();
      httpMock.expectOne(apiUrl).flush([mockSettings[0]]);

      expect(service.allProjectedBudgetSettings()).toEqual([mockSettings[0]]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      loadInitialState();

      let error: HttpErrorResponse | undefined;
      service.getProjectedBudgetSettings().subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(apiUrl).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allProjectedBudgetSettings()).toEqual(mockSettings);
    });
  });

  describe('createProjectedBudgetSettings()', () => {
    beforeEach(() => loadInitialState());

    it('should POST a new setting and append it to the state array', () => {
      const newSetting: ProjectedBudgetSettings = {
        category: { id: 40, label: 'Transport' },
        type: TYPE_B,
      };
      const savedSetting: ProjectedBudgetSettings = { id: 4, ...newSetting };

      let result: ProjectedBudgetSettings | undefined;
      service.createProjectedBudgetSettings(newSetting).subscribe((r) => (result = r));

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newSetting);
      req.flush(savedSetting);

      expect(result).toEqual(savedSetting);
      const settings = service.allProjectedBudgetSettings();
      expect(settings).toHaveLength(4);
      expect(settings[3]).toEqual(savedSetting);
      expect(settings.slice(0, 3)).toEqual(mockSettings);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service
        .createProjectedBudgetSettings({ category: { id: 40 }, type: TYPE_B })
        .subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(apiUrl).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allProjectedBudgetSettings()).toEqual(mockSettings);
    });
  });

  describe('updateProjectedBudgetSettings()', () => {
    beforeEach(() => loadInitialState());

    it('should PUT updates and replace only the matching setting', () => {
      const updated: ProjectedBudgetSettings = {
        id: 2,
        category: { id: 20, label: 'Loisirs' },
        type: TYPE_A,
      };

      service.updateProjectedBudgetSettings(2, updated).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/2`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updated);
      req.flush(updated);

      const settings = service.allProjectedBudgetSettings();
      expect(settings).toHaveLength(3);
      expect(settings.find((s) => s.id === 2)).toEqual(updated);
      expect(settings.find((s) => s.id === 1)).toEqual(mockSettings[0]);
      expect(settings.find((s) => s.id === 3)).toEqual(mockSettings[2]);
    });

    it('should leave the state unchanged when the ID does not exist', () => {
      const ghost: ProjectedBudgetSettings = { id: 999, category: { id: 99 }, type: TYPE_A };

      service.updateProjectedBudgetSettings(999, ghost).subscribe();
      httpMock.expectOne(`${apiUrl}/999`).flush(ghost);

      expect(service.allProjectedBudgetSettings()).toEqual(mockSettings);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service
        .updateProjectedBudgetSettings(2, { ...mockSettings[1], type: TYPE_A })
        .subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(`${apiUrl}/2`).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allProjectedBudgetSettings()).toEqual(mockSettings);
    });
  });

  describe('deleteProjectedBudgetSettings()', () => {
    beforeEach(() => loadInitialState());

    it('should DELETE and remove only the matching setting from the state', () => {
      service.deleteProjectedBudgetSettings(2).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/2`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);

      expect(service.allProjectedBudgetSettings()).toEqual([mockSettings[0], mockSettings[2]]);
    });

    it('should leave the state unchanged when the ID does not exist', () => {
      service.deleteProjectedBudgetSettings(999).subscribe();
      httpMock.expectOne(`${apiUrl}/999`).flush(null);

      expect(service.allProjectedBudgetSettings()).toEqual(mockSettings);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service.deleteProjectedBudgetSettings(2).subscribe({ error: (e) => (error = e) });
      httpMock.expectOne(`${apiUrl}/2`).flush('boom', { status: 404, statusText: 'Not Found' });

      expect(error?.status).toBe(404);
      expect(service.allProjectedBudgetSettings()).toEqual(mockSettings);
    });
  });

  describe('saveAll()', () => {
    beforeEach(() => loadInitialState());

    it('should POST the collection and overwrite the entire state', () => {
      const collection: ProjectedBudgetSettings[] = [mockSettings[1], mockSettings[0]];

      let result: ProjectedBudgetSettings[] | undefined;
      service.saveAll(collection).subscribe((r) => (result = r));

      const req = httpMock.expectOne(`${apiUrl}/saveAll`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(collection);
      req.flush(structuredClone(collection));

      expect(result).toEqual(collection);
      expect(service.allProjectedBudgetSettings().map((s) => s.id)).toEqual([2, 1]);
    });

    it('should handle an empty collection', () => {
      service.saveAll([]).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/saveAll`);
      expect(req.request.body).toEqual([]);
      req.flush([]);

      expect(service.allProjectedBudgetSettings()).toEqual([]);
    });

    it('should propagate the error and leave the state unchanged on failure', () => {
      let error: HttpErrorResponse | undefined;
      service.saveAll([mockSettings[0]]).subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne(`${apiUrl}/saveAll`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error?.status).toBe(500);
      expect(service.allProjectedBudgetSettings()).toEqual(mockSettings);
    });
  });
});
