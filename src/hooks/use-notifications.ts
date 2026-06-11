import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listLeads } from "@/lib/leads-api";
import { listTasks } from "@/lib/tasks-api";
import { buildNotifications } from "@/lib/notifications";

export function useNotifications() {
  const leadsQ = useQuery({ queryKey: ["leads"], queryFn: listLeads });
  const tasksQ = useQuery({ queryKey: ["tasks"], queryFn: listTasks });

  const notifications = useMemo(
    () => buildNotifications(leadsQ.data ?? [], tasksQ.data ?? []),
    [leadsQ.data, tasksQ.data],
  );

  return { notifications, isLoading: leadsQ.isLoading || tasksQ.isLoading };
}
