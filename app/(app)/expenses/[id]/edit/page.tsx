import { getCategories } from "@/lib/repos/categories";
import { getExpense } from "@/lib/repos/expenses";
import { auth } from "@/auth";
import { ExpenseForm } from "@/components/expense-form";

export default async function EditExpensePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return null;

  const coupleId = (session.user as any).coupleId;
  const categories = await getCategories(coupleId);
  const expense = await getExpense(params.id);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Gasto</h1>
        <p className="text-muted-foreground mt-2">Modifica los detalles del gasto.</p>
      </div>

      <ExpenseForm categories={categories} initialData={expense} />
    </div>
  );
}
