import notion, { notionWithRetry, queryAll } from '../notion/client';
import { getString, getNumber, getSelect, getDate, getCheckbox, getRelation } from '../notion/helpers';
import { Income, CurrencySchema, IncomeTypeSchema, IncomePeriodSchema } from '../types';

const DB_ID = process.env.INCOMES_DB_ID || '';

export function toIncome(page: any): Income {
  return {
    id: page.id,
    name: getString(page, 'Name'),
    userId: getRelation(page, 'user'),
    amount: getNumber(page, 'amount'),
    currency: CurrencySchema.parse(getSelect(page, 'currency') || 'PEN'),
    type: IncomeTypeSchema.parse(getSelect(page, 'type') || 'salary'),
    period: IncomePeriodSchema.parse(getSelect(page, 'period') || 'monthly'),
    effectiveDate: getDate(page, 'effectiveDate') || new Date(),
    isActive: getCheckbox(page, 'isActive'),
    notes: getString(page, 'notes'),
  };
}

export async function getIncomes(userId?: string): Promise<Income[]> {
  const pages = await queryAll((cursor) => notion.databases.query({
    database_id: DB_ID,
    start_cursor: cursor,
  }));
  
  let incomes = pages.map(toIncome);
  if (userId) {
    incomes = incomes.filter(i => i.userId === userId);
  }
  return incomes;
}

export async function createIncome(data: Partial<Income>) {
  const response = await notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      Name: { title: [{ text: { content: data.name! } }] },
      user: { relation: [{ id: data.userId! }] },
      amount: { number: data.amount || 0 },
      currency: { select: { name: data.currency || "PEN" } },
      type: { select: { name: data.type || "salary" } },
      period: { select: { name: data.period || "monthly" } },
      effectiveDate: { date: { start: data.effectiveDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0] } },
      isActive: { checkbox: data.isActive !== false },
      notes: { rich_text: [{ text: { content: data.notes || "" } }] },
    },
  });
  return toIncome(response);
}

export async function updateIncome(id: string, data: Partial<Income>) {
  const properties: any = {};
  if (data.name) properties.Name = { title: [{ text: { content: data.name } }] };
  if (data.amount !== undefined) properties.amount = { number: data.amount };
  if (data.currency) properties.currency = { select: { name: data.currency } };
  if (data.type) properties.type = { select: { name: data.type } };
  if (data.period) properties.period = { select: { name: data.period } };
  
  const response = await notion.pages.update({
    page_id: id,
    properties,
  });
  return toIncome(response);
}

export async function deleteIncome(id: string) {
  await notion.pages.update({
    page_id: id,
    archived: true
  });
}
