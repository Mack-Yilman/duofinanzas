import notion, { queryAll } from '../notion/client';
import { getString, getNumber, getSelect, getDate, getCheckbox, getRelation } from '../notion/helpers';
import { Goal, CurrencySchema, GoalContributionModeSchema } from '../types';

const DB_ID = process.env.GOALS_DB_ID || '';

export function toGoal(page: any): Goal {
  return {
    id: page.id,
    name: getString(page, 'Name'),
    targetAmount: getNumber(page, 'targetAmount') || 0,
    currentAmount: getNumber(page, 'currentAmount') || 0,
    currency: CurrencySchema.parse(getSelect(page, 'currency') || 'PEN'),
    targetDate: getDate(page, 'targetDate') || new Date(),
    contributionMode: GoalContributionModeSchema.parse(getSelect(page, 'contributionMode') || 'proportional'),
    icon: getString(page, 'icon'),
    coupleId: getRelation(page, 'couple'),
    isAchieved: getCheckbox(page, 'isAchieved'),
  };
}

export async function getGoals(coupleId: string): Promise<Goal[]> {
  const pages = await queryAll((cursor) => notion.databases.query({
    database_id: DB_ID,
    filter: {
      property: "couple",
      relation: { contains: coupleId }
    },
    start_cursor: cursor,
  }));
  
  return pages.map(toGoal).filter(g => !g.isAchieved);
}

export async function createGoal(data: Partial<Goal>) {
  const response = await notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      Name: { title: [{ text: { content: data.name! } }] },
      targetAmount: { number: data.targetAmount || 0 },
      currentAmount: { number: data.currentAmount || 0 },
      currency: { select: { name: data.currency || "PEN" } },
      targetDate: { date: { start: data.targetDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0] } },
      contributionMode: { select: { name: data.contributionMode || "proportional" } },
      icon: { rich_text: [{ text: { content: data.icon || "🎯" } }] },
      couple: { relation: [{ id: data.coupleId! }] },
      isAchieved: { checkbox: false },
    },
  });
  return toGoal(response);
}

export async function updateGoal(id: string, data: Partial<Goal>) {
  const properties: any = {};
  if (data.name) properties.Name = { title: [{ text: { content: data.name } }] };
  if (data.targetAmount !== undefined) properties.targetAmount = { number: data.targetAmount };
  if (data.currentAmount !== undefined) properties.currentAmount = { number: data.currentAmount };
  if (data.currency) properties.currency = { select: { name: data.currency } };
  if (data.icon) properties.icon = { rich_text: [{ text: { content: data.icon } }] };
  
  const response = await notion.pages.update({
    page_id: id,
    properties,
  });
  return toGoal(response);
}

export async function deleteGoal(id: string) {
  await notion.pages.update({
    page_id: id,
    archived: true
  });
}
