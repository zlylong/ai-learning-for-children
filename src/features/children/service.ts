import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withFallback } from '@/lib/with-fallback';
import { memoryChildStore } from './memory-store';
import type { ChildFormValues, ChildPatchValues, ChildProfile } from './schema';

const DEMO_USER_ID = 'demo-user';

function toProfile(child: {
  id: string;
  name: string;
  age: number | null;
  grade: string | null;
  province: string | null;
  city: string | null;
  textbookVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ChildProfile {
  return {
    id: child.id,
    name: child.name,
    age: child.age ?? 0,
    grade: child.grade ?? '',
    province: child.province ?? '',
    city: child.city ?? '',
    textbookVersion: child.textbookVersion ?? '',
    createdAt: child.createdAt.toISOString(),
    updatedAt: child.updatedAt.toISOString(),
  };
}

async function ensureDemoUser() {
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID, name: 'H5 Demo User' },
  });
}

export const childService = {
  list(): Promise<ChildProfile[]> {
    return withFallback(async () => {
      const children = await prisma.child.findMany({
        orderBy: { updatedAt: 'desc' },
      });
      return children.map(toProfile);
    }, () => memoryChildStore.list());
  },

  get(id: string): Promise<ChildProfile | null> {
    return withFallback(async () => {
      const child = await prisma.child.findUnique({ where: { id } });
      return child ? toProfile(child) : null;
    }, () => memoryChildStore.get(id));
  },

  create(data: ChildFormValues): Promise<ChildProfile> {
    return withFallback(async () => {
      await ensureDemoUser();
      const child = await prisma.child.create({
        data: {
          userId: DEMO_USER_ID,
          name: data.name,
          age: data.age,
          grade: data.grade,
          province: data.province,
          city: data.city,
          textbookVersion: data.textbookVersion,
        },
      });
      return toProfile(child);
    }, () => memoryChildStore.create(data));
  },

  update(id: string, data: ChildPatchValues): Promise<ChildProfile | null> {
    return withFallback(async () => {
      try {
        const child = await prisma.child.update({ where: { id }, data });
        return toProfile(child);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          return null;
        }
        throw error;
      }
    }, () => memoryChildStore.update(id, data));
  },

  delete(id: string): Promise<boolean> {
    return withFallback(async () => {
      try {
        await prisma.child.delete({ where: { id } });
        return true;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          return false;
        }
        throw error;
      }
    }, () => memoryChildStore.delete(id));
  },
};
