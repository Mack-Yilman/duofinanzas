import { action, str } from "./safe";
import { createCategory, updateCategory, deleteCategory } from "../repos/categories";

export const addCategoryAction = action(async (fd: FormData) => {
  const name = str(fd, "name");
  if (!name) throw new Error("El nombre es obligatorio");
  await createCategory({ name, icon: str(fd, "icon") || "🏷️", color: "blue", kind: "shared" });
}, "Categoría creada");

export const editCategoryAction = action(async (fd: FormData) => {
  await updateCategory(str(fd, "id"), { name: str(fd, "name"), icon: str(fd, "icon") });
}, "Categoría actualizada");

export const deleteCategoryAction = action(async (fd: FormData) => {
  if (!confirm("¿Eliminar esta categoría?")) return;
  await deleteCategory(str(fd, "id"));
  return "Categoría eliminada";
});
