


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."active_timers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "task_id" "uuid",
    "description" "text",
    "start_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."active_timers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cli_test_check" (
    "id" integer NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cli_test_check" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."cli_test_check_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."cli_test_check_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cli_test_check_id_seq" OWNED BY "public"."cli_test_check"."id";



CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "status" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "expertise" "text"[] DEFAULT '{}'::"text"[],
    "avatar_url" "text",
    "is_admin" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_access" (
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "task_id" "uuid",
    "description" "text",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "duration_seconds" integer,
    "billable" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."time_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_tracker_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "billable" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone
);


ALTER TABLE "public"."time_tracker_projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_tracker_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."time_tracker_tasks" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cli_test_check" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cli_test_check_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."active_timers"
    ADD CONSTRAINT "active_timers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."active_timers"
    ADD CONSTRAINT "active_timers_user_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."cli_test_check"
    ADD CONSTRAINT "cli_test_check_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_access"
    ADD CONSTRAINT "project_access_pkey" PRIMARY KEY ("project_id", "user_id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_tracker_projects"
    ADD CONSTRAINT "time_tracker_projects_client_name" UNIQUE ("client_id", "name");



ALTER TABLE ONLY "public"."time_tracker_projects"
    ADD CONSTRAINT "time_tracker_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_tracker_tasks"
    ADD CONSTRAINT "time_tracker_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_tracker_tasks"
    ADD CONSTRAINT "time_tracker_tasks_project_name" UNIQUE ("project_id", "name");



CREATE INDEX "active_timers_project_idx" ON "public"."active_timers" USING "btree" ("project_id");



CREATE INDEX "active_timers_task_idx" ON "public"."active_timers" USING "btree" ("task_id");



CREATE INDEX "active_timers_user_idx" ON "public"."active_timers" USING "btree" ("user_id");



CREATE INDEX "clients_name_idx" ON "public"."clients" USING "btree" ("name");



CREATE INDEX "project_access_project_idx" ON "public"."project_access" USING "btree" ("project_id");



CREATE INDEX "project_access_user_idx" ON "public"."project_access" USING "btree" ("user_id");



CREATE INDEX "time_entries_project_idx" ON "public"."time_entries" USING "btree" ("project_id");



CREATE INDEX "time_entries_start_time_idx" ON "public"."time_entries" USING "btree" ("start_time");



CREATE INDEX "time_entries_task_idx" ON "public"."time_entries" USING "btree" ("task_id");



CREATE INDEX "time_entries_user_idx" ON "public"."time_entries" USING "btree" ("user_id");



CREATE INDEX "time_tracker_projects_client_idx" ON "public"."time_tracker_projects" USING "btree" ("client_id");



CREATE INDEX "time_tracker_tasks_project_idx" ON "public"."time_tracker_tasks" USING "btree" ("project_id");



CREATE OR REPLACE TRIGGER "active_timers_touch" BEFORE UPDATE ON "public"."active_timers" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "clients_touch" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "time_entries_touch" BEFORE UPDATE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "time_tracker_projects_touch" BEFORE UPDATE ON "public"."time_tracker_projects" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "time_tracker_tasks_touch" BEFORE UPDATE ON "public"."time_tracker_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."active_timers"
    ADD CONSTRAINT "active_timers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."time_tracker_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."active_timers"
    ADD CONSTRAINT "active_timers_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."time_tracker_tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."active_timers"
    ADD CONSTRAINT "active_timers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_access"
    ADD CONSTRAINT "project_access_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."time_tracker_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_access"
    ADD CONSTRAINT "project_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."time_tracker_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."time_tracker_tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_tracker_projects"
    ADD CONSTRAINT "time_tracker_projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_tracker_projects"
    ADD CONSTRAINT "time_tracker_projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."time_tracker_tasks"
    ADD CONSTRAINT "time_tracker_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."time_tracker_tasks"
    ADD CONSTRAINT "time_tracker_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."time_tracker_projects"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can manage profiles" ON "public"."profiles" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can view all profiles" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."active_timers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "active_timers_delete" ON "public"."active_timers" FOR DELETE USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR ("auth"."uid"() = "user_id")));



CREATE POLICY "active_timers_insert" ON "public"."active_timers" FOR INSERT WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR ("auth"."uid"() = "user_id")));



CREATE POLICY "active_timers_select" ON "public"."active_timers" FOR SELECT USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR ("auth"."uid"() = "user_id")));



CREATE POLICY "active_timers_update" ON "public"."active_timers" FOR UPDATE USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR ("auth"."uid"() = "user_id"))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR ("auth"."uid"() = "user_id")));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_delete" ON "public"."clients" FOR DELETE USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."email" = COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")) AND ("p"."is_admin" = true))))));



CREATE POLICY "clients_insert" ON "public"."clients" FOR INSERT WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."email" = COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")) AND ("p"."is_admin" = true))))));



CREATE POLICY "clients_select" ON "public"."clients" FOR SELECT USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."email" = COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")) AND ("p"."is_admin" = true)))) OR (EXISTS ( SELECT 1
   FROM ("public"."time_tracker_projects" "p"
     JOIN "public"."project_access" "pa" ON (("pa"."project_id" = "p"."id")))
  WHERE (("p"."client_id" = "clients"."id") AND ("pa"."user_id" IN ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."email" = COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")))))))));



CREATE POLICY "clients_update" ON "public"."clients" FOR UPDATE USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."email" = COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")) AND ("p"."is_admin" = true)))))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."email" = COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")) AND ("p"."is_admin" = true))))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_access_delete" ON "public"."project_access" FOR DELETE USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR ("auth"."uid"() = "user_id")));



CREATE POLICY "project_access_insert" ON "public"."project_access" FOR INSERT WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR ("auth"."uid"() = "user_id")));



CREATE POLICY "project_access_select" ON "public"."project_access" FOR SELECT USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR ("auth"."uid"() = "user_id")));



CREATE POLICY "project_access_update" ON "public"."project_access" FOR UPDATE USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR ("auth"."uid"() = "user_id"))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR ("auth"."uid"() = "user_id")));



CREATE POLICY "service_role_full_access" ON "public"."profiles" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."time_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "time_entries_delete" ON "public"."time_entries" FOR DELETE USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."user_id" = "auth"."uid"()) AND ("pa"."project_id" = COALESCE("time_entries"."project_id", ( SELECT "t"."project_id"
           FROM "public"."time_tracker_tasks" "t"
          WHERE ("t"."id" = "time_entries"."task_id"))))))))));



CREATE POLICY "time_entries_insert" ON "public"."time_entries" FOR INSERT WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (("auth"."uid"() = "user_id") AND (("project_id" = '00000000-0000-0000-0000-000000000002'::"uuid") OR (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."user_id" = "auth"."uid"()) AND ("pa"."project_id" = COALESCE("time_entries"."project_id", ( SELECT "t"."project_id"
           FROM "public"."time_tracker_tasks" "t"
          WHERE ("t"."id" = "time_entries"."task_id")))))))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."time_tracker_projects" "p"
  WHERE (("p"."id" = COALESCE("time_entries"."project_id", ( SELECT "t"."project_id"
           FROM "public"."time_tracker_tasks" "t"
          WHERE ("t"."id" = "time_entries"."task_id")))) AND ("p"."archived" = true))))))));



CREATE POLICY "time_entries_select" ON "public"."time_entries" FOR SELECT USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."user_id" = "auth"."uid"()) AND ("pa"."project_id" = COALESCE("time_entries"."project_id", ( SELECT "t"."project_id"
           FROM "public"."time_tracker_tasks" "t"
          WHERE ("t"."id" = "time_entries"."task_id"))))))))));



CREATE POLICY "time_entries_update" ON "public"."time_entries" FOR UPDATE USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."user_id" = "auth"."uid"()) AND ("pa"."project_id" = COALESCE("time_entries"."project_id", ( SELECT "t"."project_id"
           FROM "public"."time_tracker_tasks" "t"
          WHERE ("t"."id" = "time_entries"."task_id")))))))))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."user_id" = "auth"."uid"()) AND ("pa"."project_id" = COALESCE("time_entries"."project_id", ( SELECT "t"."project_id"
           FROM "public"."time_tracker_tasks" "t"
          WHERE ("t"."id" = "time_entries"."task_id"))))))))));



ALTER TABLE "public"."time_tracker_projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "time_tracker_projects_delete" ON "public"."time_tracker_projects" FOR DELETE USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."project_id" = "time_tracker_projects"."id") AND ("pa"."user_id" = "auth"."uid"()))))));



CREATE POLICY "time_tracker_projects_insert" ON "public"."time_tracker_projects" FOR INSERT WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR ("auth"."uid"() = "created_by")));



CREATE POLICY "time_tracker_projects_select" ON "public"."time_tracker_projects" FOR SELECT USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."project_id" = "time_tracker_projects"."id") AND ("pa"."user_id" = "auth"."uid"()))))));



CREATE POLICY "time_tracker_projects_update" ON "public"."time_tracker_projects" FOR UPDATE USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."project_id" = "time_tracker_projects"."id") AND ("pa"."user_id" = "auth"."uid"())))))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."project_id" = "time_tracker_projects"."id") AND ("pa"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."time_tracker_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "time_tracker_tasks_delete" ON "public"."time_tracker_tasks" FOR DELETE USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."project_id" = "pa"."project_id") AND ("pa"."user_id" = "auth"."uid"()))))));



CREATE POLICY "time_tracker_tasks_insert" ON "public"."time_tracker_tasks" FOR INSERT WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."project_id" = "pa"."project_id") AND ("pa"."user_id" = "auth"."uid"()))))));



CREATE POLICY "time_tracker_tasks_select" ON "public"."time_tracker_tasks" FOR SELECT USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."project_id" = "pa"."project_id") AND ("pa"."user_id" = "auth"."uid"()))))));



CREATE POLICY "time_tracker_tasks_update" ON "public"."time_tracker_tasks" FOR UPDATE USING ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."project_id" = "pa"."project_id") AND ("pa"."user_id" = "auth"."uid"())))))) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR (CURRENT_USER = 'postgres'::"name") OR (COALESCE(("auth"."jwt"() ->> 'role'::"text"), ''::"text") = 'admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."project_access" "pa"
  WHERE (("pa"."project_id" = "pa"."project_id") AND ("pa"."user_id" = "auth"."uid"()))))));



CREATE POLICY "users_can_read_own_profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "users_can_update_own_profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."active_timers";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."clients";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."project_access";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."time_entries";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."time_tracker_projects";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."time_tracker_tasks";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."active_timers" TO "anon";
GRANT ALL ON TABLE "public"."active_timers" TO "authenticated";
GRANT ALL ON TABLE "public"."active_timers" TO "service_role";



GRANT ALL ON TABLE "public"."cli_test_check" TO "anon";
GRANT ALL ON TABLE "public"."cli_test_check" TO "authenticated";
GRANT ALL ON TABLE "public"."cli_test_check" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cli_test_check_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cli_test_check_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cli_test_check_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_access" TO "anon";
GRANT ALL ON TABLE "public"."project_access" TO "authenticated";
GRANT ALL ON TABLE "public"."project_access" TO "service_role";



GRANT ALL ON TABLE "public"."time_entries" TO "anon";
GRANT ALL ON TABLE "public"."time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entries" TO "service_role";



GRANT ALL ON TABLE "public"."time_tracker_projects" TO "anon";
GRANT ALL ON TABLE "public"."time_tracker_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."time_tracker_projects" TO "service_role";



GRANT ALL ON TABLE "public"."time_tracker_tasks" TO "anon";
GRANT ALL ON TABLE "public"."time_tracker_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."time_tracker_tasks" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































