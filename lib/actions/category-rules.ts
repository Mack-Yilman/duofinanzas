import { action, str } from "./safe";
import { requireCoupleUser } from "../session";
import { deferDelete } from "../undo";
import { createCategoryRule, deleteCategoryRule } from "../repos/category-rules";

/** "Si la descripción contiene X → categoría Y" (se aplica al importar CSV). */
export const addCategoryRuleAction = action(async (fd: FormData) => {
  await requireCoupleUser();
  const pattern = str(fd, "pattern").replace(/\s+/g, " ").slice(0, 60);
  const categoryId = str(fd, "categoryId");
  if (pattern.length < 2) throw new Error("El texto debe tener al menos 2 caracteres");
  if (!categoryId) throw new Error("Elige una categoría");
  await createCategoryRule(pattern, categoryId);
}, "Regla guardada");

export function deleteCategoryRuleAction(id: string) {
  deferDelete({ id, label: "Regla eliminada", commit: () => deleteCategoryRule(id) });
}
