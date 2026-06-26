import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function main() {
  const couplesId = process.env.COUPLES_DB_ID;
  if (!couplesId) throw new Error("No COUPLES_DB_ID");

  console.log("Adding inviteCode to Couples DB...");
  await notion.databases.update({
    database_id: couplesId,
    properties: {
      inviteCode: { rich_text: {} }
    }
  });
  console.log("Done!");
}

main().catch(console.error);
