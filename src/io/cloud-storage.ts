// Cloud Project Storage - Save/Load projects to Supabase

import { supabase, isSupabaseConfigured } from '@auth/supabase';
import { useAuthStore } from '@auth/store';
import type { SerializedComposition } from './file-io';

// ============================================================================
// TYPES
// ============================================================================

export interface CloudProject {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  isPublic: boolean;
  data: SerializedComposition;
  createdAt: string;
  updatedAt: string;
}

export interface CloudProjectSummary {
  id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CLOUD PROJECT OPERATIONS
// ============================================================================

/**
 * Check if cloud storage is available (user logged in + Supabase configured)
 */
export function isCloudStorageAvailable(): boolean {
  if (!isSupabaseConfigured()) return false;
  const { user } = useAuthStore.getState();
  return !!user;
}

/**
 * Save a project to the cloud
 */
export async function saveProjectToCloud(
  data: SerializedComposition,
  options: {
    id?: string; // If provided, updates existing project
    name?: string;
    description?: string;
    thumbnail?: string;
    isPublic?: boolean;
  } = {}
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Cloud storage not configured' };
  }

  const { user } = useAuthStore.getState();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const projectName = options.name || data.meta.name || 'Untitled Project';
  
  try {
    if (options.id) {
      // Update existing project
      const { error } = await supabase
        .from('projects')
        .update({
          name: projectName,
          description: options.description ?? null,
          thumbnail: options.thumbnail ?? null,
          is_public: options.isPublic ?? false,
          data: data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', options.id)
        .eq('user_id', user.id); // Ensure user owns the project

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, projectId: options.id };
    } else {
      // Create new project
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectName,
          description: options.description ?? null,
          thumbnail: options.thumbnail ?? null,
          is_public: options.isPublic ?? false,
          data: data,
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, projectId: newProject.id };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save project',
    };
  }
}

/**
 * Load a project from the cloud
 */
export async function loadProjectFromCloud(
  projectId: string
): Promise<{ success: boolean; project?: CloudProject; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Cloud storage not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const project: CloudProject = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      thumbnail: data.thumbnail,
      isPublic: data.is_public,
      data: data.data as SerializedComposition,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { success: true, project };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load project',
    };
  }
}

/**
 * List user's projects from the cloud
 */
export async function listCloudProjects(): Promise<{
  success: boolean;
  projects?: CloudProjectSummary[];
  error?: string;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Cloud storage not configured' };
  }

  const { user } = useAuthStore.getState();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, thumbnail, is_public, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const projects: CloudProjectSummary[] = data.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      thumbnail: p.thumbnail,
      isPublic: p.is_public,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return { success: true, projects };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list projects',
    };
  }
}

/**
 * Delete a project from the cloud
 */
export async function deleteCloudProject(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Cloud storage not configured' };
  }

  const { user } = useAuthStore.getState();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id); // Ensure user owns the project

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete project',
    };
  }
}

/**
 * Duplicate a project (creates a copy)
 */
export async function duplicateCloudProject(
  projectId: string,
  newName?: string
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  // Load the original
  const loadResult = await loadProjectFromCloud(projectId);
  if (!loadResult.success || !loadResult.project) {
    return { success: false, error: loadResult.error || 'Project not found' };
  }

  // Save as new with modified name
  const project = loadResult.project;
  const copyName = newName || `${project.name} (Copy)`;
  
  return saveProjectToCloud(project.data, {
    name: copyName,
    description: project.description ?? undefined,
    isPublic: false, // Copies are private by default
  });
}

/**
 * Get public projects (for community sharing)
 */
export async function listPublicProjects(
  limit = 20,
  offset = 0
): Promise<{
  success: boolean;
  projects?: (CloudProjectSummary & { authorName: string })[];
  error?: string;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Cloud storage not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id, name, description, thumbnail, is_public, created_at, updated_at,
        profiles!inner(display_name)
      `)
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: error.message };
    }

    const projects = data.map((p: Record<string, unknown>) => ({
      id: p.id as string,
      name: p.name as string,
      description: p.description as string | null,
      thumbnail: p.thumbnail as string | null,
      isPublic: p.is_public as boolean,
      createdAt: p.created_at as string,
      updatedAt: p.updated_at as string,
      authorName: (p.profiles as { display_name: string })?.display_name || 'Anonymous',
    }));

    return { success: true, projects };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list public projects',
    };
  }
}
