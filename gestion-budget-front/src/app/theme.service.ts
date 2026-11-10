import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'budget-app-theme';

  public isDarkMode = signal<boolean>(this.getInitialTheme());

  constructor() {
    effect(() => {
      const darkActive = this.isDarkMode();
      if (darkActive) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(darkActive));
    });
  }

  public toggleTheme(): void {
    this.isDarkMode.update((dark) => !dark);
  }

  private getInitialTheme(): boolean {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : false;
  }
}
