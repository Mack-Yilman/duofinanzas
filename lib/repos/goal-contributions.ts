import notion, { queryAll, notionWithRetry } from '../notion/client';
import { getString, getNumber, getSelect, getDate, getRelation } from '../notion/helpers';
import { GoalContribution, CurrencySchema } from '../types';

const DB_ID = process.env.GOALS_CONTRIBUTIONS_DB_ID || '';

export function toGoalContribution(page: any): GoalContribution {
  return {
    id: page.id,
    name: getString(page, 'Name'),
    goalId: getRelation(page, 'Goal'),
    userId: getRelation(page, 'User'),
    amount: getNumber(page, 'Amount') || 0,
    currency: CurrencySchema.parse(getSelect(page, 'Currency') || 'PEN'),
    date: getDate(page, 'Date') || new Date(),
  };
}

export async function getGoalContributions(goalId: string): Promise<GoalContribution[]> {
  if (!DB_ID) return []; // Fallback if DB is not created yet

  try {
    const pages = await queryAll((cursor) => notion.databases.query({
      database_id: DB_ID,
      filter: {
        property: "Goal",
        relation: { contains: goalId }
      },
      sorts: [
        { property: "Date", direction: "descending" }
      ],
      start_cursor: cursor,
    }));
    
    return pages.map(toGoalContribution);
  } catch (error) {
    console.error("Error fetching goal contributions:", error);
    return [];
  }
}

export async function createGoalContribution(data: Omit<GoalContribution, 'id'>) {
  if (!DB_ID) throw new Error("La base de datos de aportes no está configurada.");

  const response = await notionWithRetry(() => notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      Goal: { relation: [{ id: data.goalId }] },
      User: { relation: [{ id: data.userId }] },
      Amount: { number: data.amount },
      Currency: { select: { name: data.currency } },
      Date: { date: { start: data.date.toISOString().split('T')[0] } },
    }
  }));

  return toGoalContribution(response);
}

export async function deleteGoalContribution(id: string) {
  if (!DB_ID) return;
  
  await notionWithRetry(() => notion.pages.update({
    page_id: id,
    archived: true
  }));
}
