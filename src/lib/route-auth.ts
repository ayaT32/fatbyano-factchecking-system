import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export async function requireAdmin() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw redirect({ to: "/auth" });

  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  if (roleError) throw roleError;
  if (!(roles ?? []).some((role) => role.role === "manager")) throw redirect({ to: "/dashboard" });
}
