import notion, { queryAll } from '../notion/client';
import { getString, getSelect, getCheckbox, getRelation } from '../notion/helpers';
import { Category, CategoryKindSchema } from '../types';

const DB_ID = process.env.CATEGORIES_DB_ID || '';

export function toCategory(page: any): Category {
  return {
    id: page.id,
    name: getString(page, 'Name'),
    icon: getString(page, 'icon'),
    color: getString(page, 'color'),
    kind: CategoryKindSchema.parse(getSelect(page, 'kind') || 'shared'),
    coupleId: getRelation(page, 'couple'),
    isArchived: getCheckbox(page, 'isArchived'),
  };
}

export async function getCategories(coupleId: string): Promise<Category[]> {
  const pages = await queryAll((cursor) => notion.databases.query({
    database_id: DB_ID,
    start_cursor: cursor,
  }));
  
  // Assuming volume is low, filter in memory
  return pages.map(toCategory).filter(c => !c.isArchived);
}
