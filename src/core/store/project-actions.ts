// Project Actions
// Operations for managing project metadata and settings

import type { GraphStore, ImmerSet } from './types';
import type { MusicalContext, GlobalSettings, ProjectMeta, ScaleName } from '../types';
import { SCALES } from '../constants';

export const createProjectActions = (
  set: ImmerSet,
  _get: () => GraphStore
) => ({
  setMusicalContext: (ctx: Partial<MusicalContext>): void => {
    set(state => {
      const newContext = { ...state.musicalContext };
      
      if (ctx.scaleName !== undefined) {
        const scale = SCALES[ctx.scaleName as ScaleName];
        if (scale) {
          newContext.scale = [...scale] as typeof newContext.scale;
          newContext.scaleName = ctx.scaleName as ScaleName;
        }
      }
      if (ctx.root !== undefined) {
        newContext.root = ctx.root;
      }
      
      state.musicalContext = newContext;
    });
  },
  
  setGlobalSettings: (settings: Partial<GlobalSettings>): void => {
    set(state => {
      Object.assign(state.globalSettings, settings);
    });
  },
  
  setProjectMeta: (meta: Partial<ProjectMeta>): void => {
    set(state => {
      Object.assign(state.projectMeta, meta);
      state.isDirty = true;
    });
  },

  setProjectPath: (path: string | null): void => {
    set(state => {
      state.project.path = path;
    });
  },

  setProjectName: (name: string | null): void => {
    set(state => {
      state.project.name = name;
    });
  },

  setCompositions: (files: string[]): void => {
    set(state => {
      state.project.compositions = files;
    });
  },

  setCurrentComposition: (filename: string | null): void => {
    set(state => {
      state.project.currentComposition = filename;
    });
  },

  setProjectMode: (isProjectMode: boolean): void => {
    set(state => {
      state.project.isProjectMode = isProjectMode;
    });
  },

  setShowProjectStartup: (show: boolean): void => {
    set(state => {
      state.showProjectStartup = show;
    });
  },
  
  markDirty: (): void => {
    set(state => {
      state.isDirty = true;
    });
  },
  
  markClean: (): void => {
    set(state => {
      state.isDirty = false;
    });
  },
  
  setCloudProjectId: (id: string | null): void => {
    set(state => {
      state.cloudProjectId = id;
    });
  },
});
