export function getString(page: any, propName: string): string {
  const prop = page.properties[propName];
  if (!prop) return '';
  if (prop.type === 'title') return prop.title?.[0]?.plain_text || '';
  if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text || '';
  if (prop.type === 'email') return prop.email || '';
  if (prop.type === 'url') return prop.url || '';
  return '';
}

export function getNumber(page: any, propName: string): number {
  const prop = page.properties[propName];
  if (!prop || prop.type !== 'number') return 0;
  return prop.number || 0;
}

export function getSelect(page: any, propName: string): string {
  const prop = page.properties[propName];
  if (!prop || prop.type !== 'select') return '';
  return prop.select?.name || '';
}

export function getCheckbox(page: any, propName: string): boolean {
  const prop = page.properties[propName];
  if (!prop || prop.type !== 'checkbox') return false;
  return prop.checkbox || false;
}

export function getDate(page: any, propName: string): Date | undefined {
  const prop = page.properties[propName];
  if (!prop || prop.type !== 'date' || !prop.date?.start) return undefined;
  return new Date(prop.date.start);
}

export function getRelation(page: any, propName: string): string {
  const prop = page.properties[propName];
  if (!prop || prop.type !== 'relation' || !prop.relation?.length) return '';
  return prop.relation[0].id;
}

export function getCreatedTime(page: any, propName: string): Date {
  const prop = page.properties[propName];
  if (!prop || prop.type !== 'created_time') return new Date();
  return new Date(prop.created_time);
}
