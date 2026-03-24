// frontend/src/utils/memoryStorage.js

class MemoryStorage {
  constructor() {
    this.storage = new Map();
  }

  getItem(key) {
    return this.storage.get(key) || null;
  }

  setItem(key, value) {
    this.storage.set(key, value);
  }

  removeItem(key) {
    this.storage.delete(key);
  }

  clear() {
    this.storage.clear();
  }
}

const memoryStorage = new MemoryStorage();

class HybridStorage {
  constructor() {
    this.storageType = this.detectStorage();
  }

  detectStorage() {
    try {
      if (typeof window === 'undefined') return 'memory';
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return 'localStorage';
    } catch (e) {
      return 'memory';
    }
  }

  getItem(key) {
    try {
      if (this.storageType === 'localStorage') {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('Error en localStorage, fallback a memoria');
      this.storageType = 'memory';
    }
    return memoryStorage.getItem(key);
  }

  setItem(key, value) {
    try {
      if (this.storageType === 'localStorage') {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn('Error en localStorage, fallback a memoria');
      this.storageType = 'memory';
    }
    memoryStorage.setItem(key, value);
  }

  removeItem(key) {
    try {
      if (this.storageType === 'localStorage') {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      this.storageType = 'memory';
    }
    memoryStorage.removeItem(key);
  }

  clear() {
    try {
      if (this.storageType === 'localStorage') {
        window.localStorage.clear();
        return;
      }
    } catch (e) {
      this.storageType = 'memory';
    }
    memoryStorage.clear();
  }
}

export const storage = new HybridStorage();