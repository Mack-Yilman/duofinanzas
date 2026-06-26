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

export async function createCategory(data: Partial<Category>, coupleId: string) {
  const response = await notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      Name: { title: [{ text: { content: data.name! } }] },
      icon: { rich_text: [{ text: { content: data.icon || "🏷️" } }] },
      color: { rich_text: [{ text: { content: data.color || "blue" } }] },
      kind: { select: { name: data.kind || "shared" } },
      couple: { relation: [{ id: coupleId }] },
    },
  });
  return toCategory(response);
}

export async function seedDefaultCategories(coupleId: string): Promise<Category[]> {
  const defaults = [
    { name: "Hogar", icon: "🏠", color: "blue" },
    { name: "Comida", icon: "🛒", color: "green" },
    { name: "Transporte", icon: "🚗", color: "yellow" },
    { name: "Entretenimiento", icon: "🎬", color: "purple" },
    { name: "Salud", icon: "🏥", color: "red" },
  ];
  
  const categories = [];
  for (const def of defaults) {
    const cat = await createCategory(def, coupleId);
    categories.push(cat);
  }
  return categories;
}

export async function getCategories(coupleId: string): Promise<Category[]> {
  const pages = await queryAll((cursor) => notion.databases.query({
    database_id: DB_ID,
    filter: {
      property: "couple",
      relation: { contains: coupleId }
    },
    start_cursor: cursor,
  }));
  
  let results = pages.map(toCategory).filter(c => !c.isArchived);
  
  if (results.length === 0) {
    results = await seedDefaultCategories(coupleId);
  }
  
  return results;
}
