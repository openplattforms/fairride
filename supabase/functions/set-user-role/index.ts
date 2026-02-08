// Lovable Cloud backend function: assign role on signup/login safely server-side
// Uses service role to write to user_roles; identifies user from Authorization header.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";

    const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const requestedRole = body?.role;

    if (requestedRole !== "customer" && requestedRole !== "driver") {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user_id = userData.user.id;

    // Check if user already has a role
    const { data: existing } = await adminClient
      .from("user_roles")
      .select("role, created_at")
      .eq("user_id", user_id);

    if (existing && existing.length > 0) {
      const existingRole = existing[0];
      const createdAt = new Date(existingRole.created_at);
      const now = new Date();
      const secondsSinceCreation = (now.getTime() - createdAt.getTime()) / 1000;

      // Allow role change only if it was set within the last 60 seconds (fresh signup)
      // This handles the case where old trigger set 'customer' but user wants 'driver'
      if (secondsSinceCreation < 60 && existingRole.role !== requestedRole) {
        const { error: updateErr } = await adminClient
          .from("user_roles")
          .update({ role: requestedRole })
          .eq("user_id", user_id);

        if (updateErr) {
          return new Response(JSON.stringify({ error: updateErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: true, role: requestedRole, updated: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Role was set more than 60 seconds ago, don't allow change
      return new Response(JSON.stringify({ ok: true, role: existingRole.role, already_set: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No existing role, insert new one
    const { error: insertErr } = await adminClient
      .from("user_roles")
      .insert({ user_id, role: requestedRole });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, role: requestedRole }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
