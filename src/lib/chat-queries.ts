import { queryOptions } from "@tanstack/react-query";
import { getInvestigation, listInvestigations } from "./chat.functions";
export const investigationsOptions = () => queryOptions({ queryKey: ["investigations"], queryFn: () => listInvestigations() });
export const investigationOptions = (id: string) => queryOptions({ queryKey: ["investigation", id], queryFn: () => getInvestigation({ data: { id } }) });