import { open } from '@tauri-apps/api/dialog';
import { readTextFile, writeTextFile, readDir, exists } from '@tauri-apps/api/fs';
import { join } from '@tauri-apps/api/path';

// Check if running in Tauri
export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

export interface FileEntry {
  name?: string;
  path: string;
  children?: FileEntry[];
}

export const fs = {
  // Open a directory selection dialog
  openProjectDir: async (): Promise<string | null> => {
    if (!isTauri()) return null;
    
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Folder'
      });
      
      if (selected === null) return null;
      if (Array.isArray(selected)) return selected[0] || null;
      return selected;
    } catch (err) {
      console.error('Failed to open directory:', err);
      return null;
    }
  },

  // List JSON files in a directory
  listCompositions: async (dirPath: string): Promise<string[]> => {
    if (!isTauri()) return [];
    
    try {
      const entries = await readDir(dirPath);
      return entries
        .filter(entry => !entry.children && entry.name?.endsWith('.json'))
        .map(entry => entry.name || '')
        .filter(name => name !== '');
    } catch (err) {
      console.error('Failed to list compositions:', err);
      return [];
    }
  },

  // Read a composition file
  readComposition: async (dirPath: string, filename: string): Promise<string | null> => {
    if (!isTauri()) return null;
    
    try {
      const path = await join(dirPath, filename);
      return await readTextFile(path);
    } catch (err) {
      console.error('Failed to read composition:', err);
      return null;
    }
  },

  // Write a composition file
  writeComposition: async (dirPath: string, filename: string, content: string): Promise<boolean> => {
    if (!isTauri()) return false;
    
    try {
      const path = await join(dirPath, filename);
      await writeTextFile(path, content);
      return true;
    } catch (err) {
      console.error('Failed to write composition:', err);
      return false;
    }
  },
  
  // Create a new project file (optional, if we want a project.json)
  initProject: async (dirPath: string, name: string): Promise<boolean> => {
    if (!isTauri()) return false;
    
    try {
      const path = await join(dirPath, 'project.json');
      const existsFile = await exists(path);
      if (!existsFile) {
        await writeTextFile(path, JSON.stringify({ name, created: Date.now() }, null, 2));
      }
      return true;
    } catch (err) {
      console.error('Failed to init project:', err);
      return false;
    }
  }
};
