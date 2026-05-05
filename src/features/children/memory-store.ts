import type { ChildFormValues, ChildPatchValues, ChildProfile } from './schema';

type MemoryState = {
  children: ChildProfile[];
};

const globalForChildren = globalThis as typeof globalThis & {
  __aiLearningChildrenStore?: MemoryState;
};

function getState(): MemoryState {
  globalForChildren.__aiLearningChildrenStore ??= {
    children: [
      {
        id: 'demo-child-1',
        name: '小明',
        age: 8,
        grade: '二年级',
        province: '浙江省',
        city: '杭州市',
        textbookVersion: '人教版',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      },
    ],
  };

  return globalForChildren.__aiLearningChildrenStore;
}

function createId() {
  return `child_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const memoryChildStore = {
  list(): ChildProfile[] {
    return [...getState().children].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  get(id: string): ChildProfile | null {
    return getState().children.find((child) => child.id === id) ?? null;
  },

  create(data: ChildFormValues): ChildProfile {
    const now = new Date().toISOString();
    const child: ChildProfile = {
      id: createId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    getState().children.unshift(child);
    return child;
  },

  update(id: string, data: ChildPatchValues): ChildProfile | null {
    const state = getState();
    const index = state.children.findIndex((child) => child.id === id);
    if (index < 0) return null;

    const updated: ChildProfile = {
      ...state.children[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    state.children[index] = updated;
    return updated;
  },

  delete(id: string): boolean {
    const state = getState();
    const before = state.children.length;
    state.children = state.children.filter((child) => child.id !== id);
    return state.children.length !== before;
  },
};
