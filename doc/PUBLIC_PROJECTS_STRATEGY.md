# Public/Common Projects Strategy & Implementation Plan

## Overview
Enable users to discover, browse, and load publicly shared Stochastic projects/compositions, creating a community library of works that inspire and educate.

## Goals
1. **Discovery**: Users can browse and search community projects
2. **Learning**: Beginners can study well-crafted compositions
3. **Inspiration**: Artists can remix and build upon others' work
4. **Community**: Foster collaboration and knowledge sharing
5. **Quality**: Curate high-quality examples alongside user submissions

---

## Architecture Options

### Option A: Supabase Storage + Metadata (Recommended)
**Pros:**
- Already using Supabase for auth
- Built-in storage with CDN
- Structured metadata in PostgreSQL
- Easy access control and privacy settings
- Can version projects
- Rich querying (tags, search, filters)

**Cons:**
- Requires backend setup
- Storage costs (minimal for JSON files)

### Option B: GitHub Repository
**Pros:**
- Free hosting
- Version control built-in
- Community can PR improvements
- GitHub's CDN is fast

**Cons:**
- Manual curation required
- No user submissions without PR process
- Limited metadata/search
- Harder to integrate dynamic features

### Option C: Hybrid Approach (Recommended)
- **Curated Examples**: GitHub repo (current `examples.ts`)
- **User Projects**: Supabase storage + metadata
- Best of both worlds: editorial control + community content

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
**Database Schema**

```sql
-- Public projects table
CREATE TABLE public_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  author_name TEXT,
  
  -- Project data
  project_data JSONB NOT NULL, -- Full .sto file content
  thumbnail_url TEXT, -- Generated preview image
  
  -- Metadata
  bpm INTEGER,
  node_count INTEGER,
  edge_count INTEGER,
  scene_count INTEGER,
  
  -- Categorization
  tags TEXT[] DEFAULT '{}',
  category TEXT, -- 'tutorial', 'ambient', 'techno', 'experimental', etc.
  difficulty TEXT, -- 'beginner', 'intermediate', 'advanced'
  
  -- Engagement
  view_count INTEGER DEFAULT 0,
  fork_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  
  -- Status
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- Curated by team
  status TEXT DEFAULT 'published', -- 'draft', 'published', 'archived'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User likes
CREATE TABLE project_likes (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public_projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, project_id)
);

-- Indexes
CREATE INDEX idx_public_projects_user ON public_projects(user_id);
CREATE INDEX idx_public_projects_category ON public_projects(category);
CREATE INDEX idx_public_projects_tags ON public_projects USING GIN(tags);
CREATE INDEX idx_public_projects_created ON public_projects(created_at DESC);
CREATE INDEX idx_public_projects_likes ON public_projects(like_count DESC);

-- Row Level Security
ALTER TABLE public_projects ENABLE ROW LEVEL SECURITY;

-- Anyone can view published projects
CREATE POLICY "Public projects are viewable by everyone"
  ON public_projects FOR SELECT
  USING (status = 'published');

-- Users can insert their own projects
CREATE POLICY "Users can create projects"
  ON public_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON public_projects FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects"
  ON public_projects FOR DELETE
  USING (auth.uid() = user_id);
```

**Storage Setup**
```typescript
// src/io/public-projects.ts
import { supabase } from '@auth/supabase';

export interface PublicProject {
  id: string;
  user_id: string;
  name: string;
  description: string;
  author_name: string;
  project_data: any; // Full .sto format
  thumbnail_url?: string;
  bpm?: number;
  node_count?: number;
  edge_count?: number;
  scene_count?: number;
  tags: string[];
  category?: string;
  difficulty?: string;
  view_count: number;
  fork_count: number;
  like_count: number;
  is_featured: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProjectFilters {
  category?: string;
  tags?: string[];
  difficulty?: string;
  search?: string;
  sortBy?: 'recent' | 'popular' | 'trending';
  limit?: number;
  offset?: number;
}
```

### Phase 2: API Layer (Week 2-3)

```typescript
// src/io/public-projects.ts (continued)

/**
 * Publish current project to public library
 */
export async function publishProject(
  name: string,
  description: string,
  category?: string,
  tags?: string[],
  difficulty?: string
): Promise<{ success: boolean; error?: string; projectId?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Get current project data
    const projectData = await exportProjectToJSON();
    
    // Extract metadata
    const stats = calculateProjectStats(projectData);
    
    const { data, error } = await supabase
      .from('public_projects')
      .insert({
        user_id: user.id,
        author_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Anonymous',
        name,
        description,
        project_data: projectData,
        bpm: projectData.bpm,
        node_count: stats.nodeCount,
        edge_count: stats.edgeCount,
        scene_count: stats.sceneCount,
        tags: tags || [],
        category,
        difficulty
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, projectId: data.id };
  } catch (error) {
    console.error('Failed to publish project:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Browse public projects with filters
 */
export async function browseProjects(
  filters: PublicProjectFilters = {}
): Promise<{ projects: PublicProject[]; error?: string }> {
  try {
    let query = supabase
      .from('public_projects')
      .select('*')
      .eq('status', 'published');

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
    
    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Sorting
    switch (filters.sortBy) {
      case 'popular':
        query = query.order('like_count', { ascending: false });
        break;
      case 'trending':
        // Weighted score: likes + recent views
        query = query.order('view_count', { ascending: false });
        break;
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    
    if (error) throw error;
    return { projects: data || [] };
  } catch (error) {
    console.error('Failed to browse projects:', error);
    return { projects: [], error: (error as Error).message };
  }
}

/**
 * Load a public project
 */
export async function loadPublicProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch project
    const { data, error } = await supabase
      .from('public_projects')
      .select('project_data')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    
    // Increment view count
    await supabase.rpc('increment_view_count', { project_id: projectId });
    
    // Load into current workspace
    await importProjectFromJSON(data.project_data);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to load public project:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Like/unlike a project
 */
export async function toggleProjectLike(projectId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if already liked
    const { data: existing } = await supabase
      .from('project_likes')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (existing) {
      // Unlike
      await supabase
        .from('project_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('project_id', projectId);
      
      await supabase.rpc('decrement_like_count', { project_id: projectId });
      return false;
    } else {
      // Like
      await supabase
        .from('project_likes')
        .insert({ user_id: user.id, project_id: projectId });
      
      await supabase.rpc('increment_like_count', { project_id: projectId });
      return true;
    }
  } catch (error) {
    console.error('Failed to toggle like:', error);
    return false;
  }
}

/**
 * Fork a public project (create a copy)
 */
export async function forkProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await loadPublicProject(projectId);
    
    // Increment fork count
    await supabase.rpc('increment_fork_count', { project_id: projectId });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to fork project:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Helper functions
function calculateProjectStats(projectData: any) {
  const nodeCount = projectData.nodes?.length || 0;
  const edgeCount = projectData.edges?.length || 0;
  const sceneCount = projectData.scenes?.length || 0;
  return { nodeCount, edgeCount, sceneCount };
}

// Database functions (add to Supabase)
/*
CREATE OR REPLACE FUNCTION increment_view_count(project_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public_projects
  SET view_count = view_count + 1
  WHERE id = project_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_like_count(project_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public_projects
  SET like_count = like_count + 1
  WHERE id = project_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_like_count(project_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public_projects
  SET like_count = GREATEST(like_count - 1, 0)
  WHERE id = project_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_fork_count(project_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public_projects
  SET fork_count = fork_count + 1
  WHERE id = project_id;
END;
$$ LANGUAGE plpgsql;
*/
```

### Phase 3: UI Components (Week 3-4)

**Project Browser Modal**
```typescript
// src/ui/PublicProjectsBrowser.tsx
import React, { useState, useEffect } from 'react';
import { browseProjects, loadPublicProject, forkProject } from '@io/public-projects';
import type { PublicProject, PublicProjectFilters } from '@io/public-projects';
import styles from './PublicProjectsBrowser.module.css';

export function PublicProjectsBrowser({ onClose }: { onClose: () => void }) {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [filters, setFilters] = useState<PublicProjectFilters>({ sortBy: 'recent' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [filters]);

  async function loadProjects() {
    setLoading(true);
    const { projects } = await browseProjects(filters);
    setProjects(projects);
    setLoading(false);
  }

  async function handleLoad(projectId: string) {
    const { success } = await loadPublicProject(projectId);
    if (success) {
      onClose();
    }
  }

  return (
    <div className={styles.modal}>
      <div className={styles.header}>
        <h2>Community Projects</h2>
        <button onClick={onClose}>✕</button>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search projects..."
          onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
        />
        
        <select onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}>
          <option value="">All Categories</option>
          <option value="tutorial">Tutorial</option>
          <option value="ambient">Ambient</option>
          <option value="techno">Techno</option>
          <option value="experimental">Experimental</option>
        </select>

        <select onChange={e => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}>
          <option value="recent">Recent</option>
          <option value="popular">Popular</option>
          <option value="trending">Trending</option>
        </select>
      </div>

      <div className={styles.grid}>
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onLoad={() => handleLoad(project.id)}
            onFork={() => forkProject(project.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Publish Dialog**
```typescript
// src/ui/PublishProjectDialog.tsx
export function PublishProjectDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  async function handlePublish() {
    const result = await publishProject(name, description, category, tags);
    if (result.success) {
      alert('Project published successfully!');
      onClose();
    }
  }

  return (
    <div className={styles.dialog}>
      <h2>Publish to Community</h2>
      
      <input
        type="text"
        placeholder="Project name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      
      <textarea
        placeholder="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      
      <select value={category} onChange={e => setCategory(e.target.value)}>
        <option value="">Category</option>
        <option value="tutorial">Tutorial</option>
        <option value="ambient">Ambient</option>
        <option value="techno">Techno</option>
      </select>

      <button onClick={handlePublish}>Publish</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
```

### Phase 4: Thumbnail Generation (Week 4-5)

```typescript
// src/viz/thumbnail-generator.ts
/**
 * Generate a thumbnail preview of the current canvas
 */
export async function generateThumbnail(width = 400, height = 300): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Render nodes and edges to canvas
  const store = getGraphStore();
  const nodes = store.nodes;
  const edges = store.edges;

  // Calculate bounds
  const bounds = calculateBounds(nodes);
  
  // Draw with proper scaling
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);
  
  // Draw edges
  edges.forEach(edge => {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (from && to) {
      ctx.strokeStyle = '#444';
      ctx.beginPath();
      ctx.moveTo(scaleX(from.x), scaleY(from.y));
      ctx.lineTo(scaleX(to.x), scaleY(to.y));
      ctx.stroke();
    }
  });

  // Draw nodes
  nodes.forEach(node => {
    ctx.fillStyle = getNodeColor(node.type);
    ctx.fillRect(scaleX(node.x) - 4, scaleY(node.y) - 4, 8, 8);
  });

  return canvas.toDataURL('image/png');
}
```

---

## User Experience Flow

### Publishing a Project
1. User clicks "Share" → "Publish to Community"
2. Dialog appears with form fields
3. Auto-generates thumbnail from canvas
4. User fills metadata (name, description, tags)
5. Click "Publish" → uploads to Supabase
6. Success notification with shareable link

### Discovering Projects
1. User clicks "File" → "Browse Community"
2. Modal shows grid of project cards
3. Filter by category, tags, sort by recent/popular
4. Click project card → shows details + preview
5. Click "Load" → imports into current workspace
6. Click "Fork" → creates a copy to modify

### Featured/Curated Section
- Homepage carousel of featured projects
- "Staff picks" curated by team
- "Trending this week" algorithmic selection

---

## Migration Plan

### Seed Initial Content
```typescript
// scripts/seed-public-projects.ts
// Convert current examples.ts to public projects
import { EXAMPLES } from '../src/data/examples';

async function seedExamples() {
  for (const [key, example] of Object.entries(EXAMPLES)) {
    await publishProject(
      example.name,
      example.description,
      'tutorial', // categorize
      [], // add tags
      'beginner' // difficulty
    );
  }
}
```

---

## Privacy & Moderation

### User Controls
- Projects default to "draft" status
- Users can unpublish/archive anytime
- Username or "Anonymous" authorship
- Option to disable forks/remixes

### Moderation Tools
- Report button on projects
- Admin dashboard to review reports
- Featured/verified badges from team
- Auto-hide projects with reports pending review

---

## Future Enhancements

### Phase 5+
- **Comments & Discussions**: Threaded comments on projects
- **Remixes**: Track remix lineage (X is a fork of Y)
- **Playlists/Collections**: Users curate themed collections
- **Embedded Player**: Preview audio without loading full project
- **Social Features**: Follow creators, activity feed
- **Analytics**: View detailed stats for published projects
- **Monetization**: Optional tip jar for creators
- **API Access**: RESTful API for external integrations
- **Export to NPM**: Package projects as installable presets

---

## Success Metrics

### Launch Goals (Month 1)
- 50+ community projects published
- 500+ project loads
- 20+ active contributors

### Growth Goals (Month 3)
- 200+ projects
- 5,000+ loads
- 100+ contributors
- 50+ likes per featured project

---

## Technical Considerations

### Performance
- Lazy load project thumbnails
- Paginate results (20 per page)
- Cache popular projects in localStorage
- CDN for static assets

### Storage Optimization
- Compress JSON (gzip)
- Limit project size (5MB max)
- Automatic cleanup of drafts older than 30 days

### Security
- Rate limiting on API endpoints
- Validate project JSON structure before storing
- Sanitize user-generated content
- Require auth for publishing (view is public)

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|-------------|
| 1-2 | Foundation | Database schema, migrations |
| 2-3 | API Layer | CRUD operations, filtering |
| 3-4 | UI Components | Browser modal, publish dialog |
| 4-5 | Polish | Thumbnails, featured section |
| 5-6 | Testing | Beta with select users |
| 6+ | Launch | Public release, monitoring |

---

## Cost Estimate

### Supabase
- Storage: ~$0.02/GB (JSON files are tiny)
- Bandwidth: ~$0.09/GB
- Database: Free tier sufficient initially

**Estimated Monthly Cost**: $0-5 for first 1000 users

---

## Conclusion

This system creates a virtuous cycle:
1. Users discover inspiring projects
2. They learn by studying and remixing
3. They publish their own creations
4. Community grows organically

The hybrid approach (curated examples + user content) ensures quality while enabling community creativity.
