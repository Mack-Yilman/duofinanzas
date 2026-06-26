import notion, { notionWithRetry } from '../notion/client';
import { getString, getSelect, getCreatedTime, getRelation } from '../notion/helpers';
import { User, UserRoleSchema } from '../types';

const DB_ID = process.env.USERS_DB_ID || '';

export function toUser(page: any): User {
  return {
    id: page.id,
    name: getString(page, 'Name'),
    email: getString(page, 'email'),
    passwordHash: getString(page, 'passwordHash'),
    avatarColor: getSelect(page, 'avatarColor'),
    role: UserRoleSchema.parse(getSelect(page, 'role') || 'member'),
    coupleId: getRelation(page, 'couple'),
    createdAt: getCreatedTime(page, 'createdAt'),
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const response = await notionWithRetry(() => notion.databases.query({
    database_id: DB_ID,
    filter: {
      property: 'email',
      email: { equals: email }
    },
    page_size: 1
  }));

  if (response.results.length === 0) return null;
  return toUser(response.results[0]);
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const response = await notionWithRetry(() => notion.pages.retrieve({ page_id: id }));
    return toUser(response);
  } catch (error: any) {
    if (error.status === 404) return null;
    throw error;
  }
}

export async function createUser(data: { name: string; email: string; passwordHash: string }): Promise<User> {
  const response = await notionWithRetry(() => notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      email: { email: data.email },
      passwordHash: { rich_text: [{ text: { content: data.passwordHash } }] },
      role: { select: { name: 'owner' } }, // default for new user
      avatarColor: { select: { name: 'indigo' } },
    }
  }));
  return toUser(response);
}

export async function updateUserCouple(userId: string, coupleId: string, role: 'owner' | 'member'): Promise<User> {
  const response = await notionWithRetry(() => notion.pages.update({
    page_id: userId,
    properties: {
      couple: { relation: [{ id: coupleId }] },
      role: { select: { name: role } }
    }
  }));
  return toUser(response);
}

export async function getUsersByCoupleId(coupleId: string): Promise<User[]> {
  const response = await notionWithRetry(() => notion.databases.query({
    database_id: DB_ID,
    filter: {
      property: 'couple',
      relation: { contains: coupleId }
    }
  }));
  return response.results.map(toUser);
}
