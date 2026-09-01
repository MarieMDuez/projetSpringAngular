import { FindByIdPipe } from './find-by-id-pipe';

describe('FindByIdPipe', () => {
  let pipe: FindByIdPipe;

  interface TestItem {
    id?: number;
    name: string;
  }

  const mockItems: TestItem[] = [
    { id: 10, name: 'Compte Courant' },
    { id: 20, name: 'Livret A' },
    { id: 30, name: 'Alimentation' },
  ];

  beforeEach(() => {
    pipe = new FindByIdPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return the correct item when a valid ID is provided', () => {
    const result = pipe.transform(mockItems, 20);

    expect(result).toEqual({ id: 20, name: 'Livret A' });
  });

  it('should return null if the ID does not match any item', () => {
    const result = pipe.transform(mockItems, 999);

    expect(result).toBeNull();
  });

  it('should return null if the items list is null or ID is undefined', () => {
    expect(pipe.transform(null, 10)).toBeNull();
    expect(pipe.transform(mockItems, undefined)).toBeNull();
  });
});
