import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID || '';

if (!PARENT_PAGE_ID) {
  console.error("Missing NOTION_PARENT_PAGE_ID in .env");
  process.exit(1);
}

const dbIds: Record<string, string> = {};

async function createDB(title: string, properties: any) {
  console.log(`Creating database: ${title}...`);
  try {
    const response = await notion.databases.create({
      parent: { type: "page_id", page_id: PARENT_PAGE_ID },
      title: [{ type: "text", text: { content: title } }],
      properties,
    });
    console.log(`✅ Created ${title}: ${response.id}`);
    dbIds[title] = response.id;
    return response.id;
  } catch (err: any) {
    console.error(`❌ Error creating ${title}:`, err.message);
    throw err;
  }
}

async function main() {
  console.log("Starting Notion DB seeding...");

  // 1. Couples
  const couplesId = await createDB("Couples", {
    Name: { title: {} },
    inviteCode: { rich_text: {} },
    baseCurrency: { select: { options: [{ name: "PEN" }, { name: "USD" }, { name: "EUR" }] } },
    splitDefaultMode: { select: { options: [{ name: "proportional" }, { name: "equal" }, { name: "custom" }] } },
    createdAt: { created_time: {} },
  });

  // 2. Users
  const usersId = await createDB("Users", {
    Name: { title: {} },
    email: { email: {} },
    passwordHash: { rich_text: {} },
    avatarColor: { select: { options: [{ name: "emerald" }, { name: "amber" }, { name: "indigo" }, { name: "rose" }] } },
    role: { select: { options: [{ name: "owner" }, { name: "member" }] } },
    createdAt: { created_time: {} },
    couple: { relation: { database_id: couplesId, type: "single_property", single_property: {} } },
  });

  // Update Couples to have relation to Users (members)
  console.log("Updating Couples to add members relation...");
  await notion.databases.update({
    database_id: couplesId,
    properties: {
      members: { relation: { database_id: usersId, type: "single_property", single_property: {} } }
    }
  });

  // 3. Categories
  const categoriesId = await createDB("Categories", {
    Name: { title: {} },
    icon: { rich_text: {} },
    color: { rich_text: {} },
    kind: { select: { options: [{ name: "shared" }, { name: "personal" }, { name: "both" }] } },
    couple: { relation: { database_id: couplesId, type: "single_property", single_property: {} } },
    isArchived: { checkbox: {} },
  });

  // 4. Incomes
  const incomesId = await createDB("Incomes", {
    Name: { title: {} },
    amount: { number: {} },
    currency: { select: { options: [{ name: "PEN" }, { name: "USD" }, { name: "EUR" }] } },
    type: { select: { options: [{ name: "salary" }, { name: "freelance" }, { name: "bonus" }, { name: "other" }] } },
    period: { select: { options: [{ name: "monthly" }, { name: "one_time" }] } },
    effectiveDate: { date: {} },
    isActive: { checkbox: {} },
    notes: { rich_text: {} },
    user: { relation: { database_id: usersId, type: "single_property", single_property: {} } },
  });

  // 5. Settlements
  const settlementsId = await createDB("Settlements", {
    Name: { title: {} },
    periodStart: { date: {} },
    periodEnd: { date: {} },
    amountBase: { number: {} },
    status: { select: { options: [{ name: "draft" }, { name: "confirmed" }, { name: "paid" }] } },
    expensesCount: { number: {} },
    confirmedAt: { date: {} },
    fromUser: { relation: { database_id: usersId, type: "single_property", single_property: {} } },
    toUser: { relation: { database_id: usersId, type: "single_property", single_property: {} } },
    couple: { relation: { database_id: couplesId, type: "single_property", single_property: {} } },
  });

  // 6. RecurringExpenses
  const recurringId = await createDB("RecurringExpenses", {
    Name: { title: {} },
    amount: { number: {} },
    currency: { select: { options: [{ name: "PEN" }, { name: "USD" }, { name: "EUR" }] } },
    splitMode: { select: { options: [{ name: "proportional" }, { name: "equal" }, { name: "custom" }, { name: "owner_100" }] } },
    frequency: { select: { options: [{ name: "monthly" }, { name: "weekly" }, { name: "yearly" }] } },
    dayOfMonth: { number: {} },
    nextRun: { date: {} },
    isActive: { checkbox: {} },
    category: { relation: { database_id: categoriesId, type: "single_property", single_property: {} } },
    paidBy: { relation: { database_id: usersId, type: "single_property", single_property: {} } },
    couple: { relation: { database_id: couplesId, type: "single_property", single_property: {} } },
  });

  // 7. Expenses
  const expensesId = await createDB("Expenses", {
    Name: { title: {} },
    amount: { number: {} },
    currency: { select: { options: [{ name: "PEN" }, { name: "USD" }, { name: "EUR" }] } },
    amountBase: { number: {} },
    fxRate: { number: {} },
    fxDate: { date: {} },
    date: { date: {} },
    splitMode: { select: { options: [{ name: "proportional" }, { name: "equal" }, { name: "custom" }, { name: "owner_100" }] } },
    splitShareA: { number: {} },
    splitShareB: { number: {} },
    isShared: { checkbox: {} },
    isSettled: { checkbox: {} },
    receiptUrl: { url: {} },
    notes: { rich_text: {} },
    createdAt: { created_time: {} },
    category: { relation: { database_id: categoriesId, type: "single_property", single_property: {} } },
    paidBy: { relation: { database_id: usersId, type: "single_property", single_property: {} } },
    createdBy: { relation: { database_id: usersId, type: "single_property", single_property: {} } },
    settlement: { relation: { database_id: settlementsId, type: "single_property", single_property: {} } },
    recurringSource: { relation: { database_id: recurringId, type: "single_property", single_property: {} } },
  });

  // 8. Budgets
  const budgetsId = await createDB("Budgets", {
    Name: { title: {} },
    amountBase: { number: {} },
    month: { rich_text: {} },
    isRecurring: { checkbox: {} },
    category: { relation: { database_id: categoriesId, type: "single_property", single_property: {} } },
    couple: { relation: { database_id: couplesId, type: "single_property", single_property: {} } },
  });

  // 9. Debts
  const debtsId = await createDB("Debts", {
    Name: { title: {} },
    kind: { select: { options: [{ name: "loan_owed" }, { name: "loan_given" }, { name: "credit_card" }, { name: "mortgage" }] } },
    principal: { number: {} },
    currentBalance: { number: {} },
    currency: { select: { options: [{ name: "PEN" }, { name: "USD" }, { name: "EUR" }] } },
    interestRate: { number: {} },
    monthlyPayment: { number: {} },
    responsibility: { select: { options: [{ name: "shared" }, { name: "userA" }, { name: "userB" }] } },
    dueDay: { number: {} },
    startDate: { date: {} },
    endDate: { date: {} },
    isClosed: { checkbox: {} },
    couple: { relation: { database_id: couplesId, type: "single_property", single_property: {} } },
  });

  // 10. Goals
  const goalsId = await createDB("Goals", {
    Name: { title: {} },
    targetAmount: { number: {} },
    currentAmount: { number: {} },
    currency: { select: { options: [{ name: "PEN" }, { name: "USD" }, { name: "EUR" }] } },
    targetDate: { date: {} },
    contributionMode: { select: { options: [{ name: "proportional" }, { name: "equal" }, { name: "custom" }] } },
    icon: { rich_text: {} },
    isAchieved: { checkbox: {} },
    couple: { relation: { database_id: couplesId, type: "single_property", single_property: {} } },
  });

  // 11. GoalContributions
  const goalContribsId = await createDB("GoalContributions", {
    Name: { title: {} },
    amount: { number: {} },
    currency: { select: { options: [{ name: "PEN" }, { name: "USD" }, { name: "EUR" }] } },
    date: { date: {} },
    goal: { relation: { database_id: goalsId, type: "single_property", single_property: {} } },
    user: { relation: { database_id: usersId, type: "single_property", single_property: {} } },
  });

  // 12. ExchangeRates
  const ratesId = await createDB("ExchangeRates", {
    Name: { title: {} },
    base: { select: { options: [{ name: "USD" }, { name: "PEN" }, { name: "EUR" }] } },
    quote: { select: { options: [{ name: "PEN" }, { name: "USD" }, { name: "EUR" }] } },
    rate: { number: {} },
    date: { date: {} },
  });

  console.log("\n=================================");
  console.log("Databases created successfully!");
  console.log("Please update your .env with the following IDs:");
  console.log(`COUPLES_DB_ID=${couplesId}`);
  console.log(`USERS_DB_ID=${usersId}`);
  console.log(`INCOMES_DB_ID=${incomesId}`);
  console.log(`CATEGORIES_DB_ID=${categoriesId}`);
  console.log(`EXPENSES_DB_ID=${expensesId}`);
  console.log(`BUDGETS_DB_ID=${budgetsId}`);
  console.log(`DEBTS_DB_ID=${debtsId}`);
  console.log(`GOALS_DB_ID=${goalsId}`);
  console.log(`GOAL_CONTRIBUTIONS_DB_ID=${goalContribsId}`);
  console.log(`RECURRING_EXPENSES_DB_ID=${recurringId}`);
  console.log(`SETTLEMENTS_DB_ID=${settlementsId}`);
  console.log(`EXCHANGE_RATES_DB_ID=${ratesId}`);
  console.log("=================================\n");
  
  // Save to .env programmatically
  const envPath = path.resolve(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');
  envContent = envContent.replace(/COUPLES_DB_ID=.*/, `COUPLES_DB_ID=${couplesId}`);
  envContent = envContent.replace(/USERS_DB_ID=.*/, `USERS_DB_ID=${usersId}`);
  envContent = envContent.replace(/INCOMES_DB_ID=.*/, `INCOMES_DB_ID=${incomesId}`);
  envContent = envContent.replace(/CATEGORIES_DB_ID=.*/, `CATEGORIES_DB_ID=${categoriesId}`);
  envContent = envContent.replace(/EXPENSES_DB_ID=.*/, `EXPENSES_DB_ID=${expensesId}`);
  envContent = envContent.replace(/BUDGETS_DB_ID=.*/, `BUDGETS_DB_ID=${budgetsId}`);
  envContent = envContent.replace(/DEBTS_DB_ID=.*/, `DEBTS_DB_ID=${debtsId}`);
  envContent = envContent.replace(/GOALS_DB_ID=.*/, `GOALS_DB_ID=${goalsId}`);
  envContent = envContent.replace(/GOAL_CONTRIBUTIONS_DB_ID=.*/, `GOAL_CONTRIBUTIONS_DB_ID=${goalContribsId}`);
  envContent = envContent.replace(/RECURRING_EXPENSES_DB_ID=.*/, `RECURRING_EXPENSES_DB_ID=${recurringId}`);
  envContent = envContent.replace(/SETTLEMENTS_DB_ID=.*/, `SETTLEMENTS_DB_ID=${settlementsId}`);
  envContent = envContent.replace(/EXCHANGE_RATES_DB_ID=.*/, `EXCHANGE_RATES_DB_ID=${ratesId}`);
  fs.writeFileSync(envPath, envContent);
  console.log(".env file updated automatically.");
}

main().catch(console.error);
