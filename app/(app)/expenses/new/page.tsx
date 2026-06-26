import { auth } from "@/auth";
import { getCategories } from "@/lib/repos/categories";
import { ExpenseForm } from "@/components/expense-form";

export default async function NewExpensePage() {
  const session = await auth();
  if (!session?.user) return null;

  const coupleId = (session.user as any).coupleId;
  const categories = await getCategories(coupleId);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Gasto</h1>
        <p className="text-muted-foreground mt-2">Registra un nuevo gasto compartido.</p>
      </div>

      <ExpenseForm categories={categories} />
    </div>
  );
}
