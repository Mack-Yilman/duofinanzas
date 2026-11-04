import { useQuery } from "@tanstack/react-query";
import { getGoals, getGoal } from "./repos/goals";
import { getGoalContributions } from "./repos/goal-contributions";

export function useGoals(coupleId: string | undefined) {
  return useQuery({ queryKey: ["goals", coupleId], queryFn: () => getGoals(coupleId!), enabled: !!coupleId });
}

export function useGoal(id: string) {
  return useQuery({ queryKey: ["goal", id], queryFn: () => getGoal(id), enabled: !!id });
}

export function useGoalContributions(goalId: string) {
  return useQuery({
    queryKey: ["goal-contributions", goalId],
    queryFn: () => getGoalContributions(goalId),
    enabled: !!goalId,
  });
}
