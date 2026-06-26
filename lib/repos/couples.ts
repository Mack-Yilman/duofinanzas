import notion, { notionWithRetry } from '../notion/client';

const DB_ID = process.env.COUPLES_DB_ID || '';

export async function createCouple(name: string, ownerUserId: string): Promise<{ id: string; inviteCode: string }> {
  // Generate random 6-char code
  const inviteCode = 'DUO-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  
  const response = await notionWithRetry(() => notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      Name: { title: [{ text: { content: name } }] },
      inviteCode: { rich_text: [{ text: { content: inviteCode } }] },
      baseCurrency: { select: { name: 'PEN' } },
      splitDefaultMode: { select: { name: 'proportional' } },
      members: { relation: [{ id: ownerUserId }] }
    }
  }));
  
  return { id: response.id, inviteCode };
}

export async function getCoupleByInviteCode(inviteCode: string): Promise<string | null> {
  const response = await notionWithRetry(() => notion.databases.query({
    database_id: DB_ID,
    filter: {
      property: 'inviteCode',
      rich_text: { equals: inviteCode }
    },
    page_size: 1
  }));
  
  if (response.results.length === 0) return null;
  return response.results[0].id;
}

export async function addMemberToCouple(coupleId: string, userId: string): Promise<void> {
  // In a real app we'd fetch existing members to not overwrite them, but Notion API 
  // lets us append relations if we update properly, but relation arrays overwrite.
  // Actually, wait, updating a relation property overwrites it. 
  // Let's fetch the couple first.
  const couple = await notionWithRetry(() => notion.pages.retrieve({ page_id: coupleId }));
  const membersProp = (couple as any).properties.members.relation;
  const newMembers = [...membersProp, { id: userId }];
  
  await notionWithRetry(() => notion.pages.update({
    page_id: coupleId,
    properties: {
      members: { relation: newMembers }
    }
  }));
}

export async function getCouple(id: string) {
  const page: any = await notionWithRetry(() => notion.pages.retrieve({ page_id: id }));
  return {
    id: page.id,
    name: page.properties.Name?.title?.[0]?.plain_text || "Couple",
    inviteCode: page.properties.inviteCode?.rich_text?.[0]?.plain_text || "",
    fxRate: page.properties.fxRate?.number || 3.80, // Default to 3.80 if not set
  };
}

export async function updateCouple(id: string, fxRate: number) {
  await notionWithRetry(() => notion.pages.update({
    page_id: id,
    properties: {
      fxRate: { number: fxRate }
    }
  }));
}
