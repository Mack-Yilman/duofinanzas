import notion, { notionWithRetry, queryAll } from '../notion/client';
import { getString, getNumber, getSelect, getDate, getCheckbox, getRelation, getCreatedTime } from '../notion/helpers';
import { Expense, SplitModeSchema, CurrencySchema } from '../types';

const DB_ID = process.env.EXPENSES_DB_ID || '';

export function toExpense(page: any): Expense {
  return {
    id: page.id,
    name: getString(page, 'Name'),
    amount: getNumber(page, 'amount'),
    currency: CurrencySchema.parse(getSelect(page, 'currency') || 'PEN'),
    amountBase: getNumber(page, 'amountBase'),
    fxRate: getNumber(page, 'fxRate'),
    fxDate: getDate(page, 'fxDate') || new Date(),
    date: getDate(page, 'date') || new Date(),
    categoryId: getRelation(page, 'category'),
    paidById: getRelation(page, 'paidBy'),
    splitMode: SplitModeSchema.parse(getSelect(page, 'splitMode') || 'proportional'),
    splitShareA: getNumber(page, 'splitShareA'),
    splitShareB: getNumber(page, 'splitShareB'),
    isShared: getCheckbox(page, 'isShared'),
    isSettled: getCheckbox(page, 'isSettled'),
    settlementId: getRelation(page, 'settlement') || undefined,
    recurringSourceId: getRelation(page, 'recurringSource') || undefined,
    receiptUrl: getString(page, 'receiptUrl') || undefined, // url is string
    notes: getString(page, 'notes'),
    createdById: getRelation(page, 'createdBy'),
    createdAt: getCreatedTime(page, 'createdAt'),
  };
}

export async function getExpenses(coupleId: string, monthPrefix?: string): Promise<Expense[]> {
  const pages = await queryAll((cursor) => notion.databases.query({
    database_id: DB_ID,
    start_cursor: cursor,
  }));
  
  return pages.map(toExpense);
}

export async function getExpense(id: string): Promise<Expense> {
  const page = await notion.pages.retrieve({ page_id: id });
  return toExpense(page);
}

export async function createExpense(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  const response = await notionWithRetry(() => notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      Name: { title: [{ text: { content: data.name } }] },
      amount: { number: data.amount },
      currency: { select: { name: data.currency } },
      amountBase: { number: data.amountBase },
      fxRate: { number: data.fxRate },
      fxDate: { date: { start: data.fxDate.toISOString().split('T')[0] } },
      date: { date: { start: data.date.toISOString().split('T')[0] } },
      splitMode: { select: { name: data.splitMode } },
      splitShareA: { number: data.splitShareA },
      splitShareB: { number: data.splitShareB },
      isShared: { checkbox: data.isShared },
      isSettled: { checkbox: data.isSettled },
      category: data.categoryId ? { relation: [{ id: data.categoryId }] } : { relation: [] },
      paidBy: data.paidById ? { relation: [{ id: data.paidById }] } : { relation: [] },
      createdBy: data.createdById ? { relation: [{ id: data.createdById }] } : { relation: [] },
    }
  }));

  return toExpense(response);
}

export async function updateExpense(id: string, data: Partial<Expense>) {
  const properties: any = {};
  if (data.name) properties.Name = { title: [{ text: { content: data.name } }] };
  if (data.amount !== undefined) properties.amount = { number: data.amount };
  if (data.currency) properties.currency = { select: { name: data.currency } };
  if (data.amountBase !== undefined) properties.amountBase = { number: data.amountBase };
  if (data.fxRate !== undefined) properties.fxRate = { number: data.fxRate };
  if (data.splitMode) properties.splitMode = { select: { name: data.splitMode } };
  if (data.categoryId) properties.category = { relation: [{ id: data.categoryId }] };
  if (data.isShared !== undefined) properties.isShared = { checkbox: data.isShared };
  
  await notion.pages.update({
    page_id: id,
    properties
  });
}

export async function deleteExpense(id: string) {
  await notion.pages.update({
    page_id: id,
    archived: true
  });
}

export async function settleExpense(id: string) {
  await notion.pages.update({
    page_id: id,
    properties: {
      isSettled: { checkbox: true }
    }
  });
}
