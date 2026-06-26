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
