


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."tipo_producto_temporada_enum" AS ENUM (
    'fruta',
    'verdura',
    'hortaliza',
    'pescado',
    'marisco'
);


ALTER TYPE "public"."tipo_producto_temporada_enum" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'user_full',
    'user_restricted'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_ai_usage"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT COALESCE(usage_count, 0)
  INTO current_count
  FROM ai_usage_tracking
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
  
  RETURN COALESCE(current_count, 0);
END;
$$;


ALTER FUNCTION "public"."get_daily_ai_usage"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_email" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Lista de emails de administradores
    IF user_email IN (
        'roberto.quintela@protonmail.com'
    ) THEN
        RETURN 'admin';
    ELSE
        RETURN 'user_full';
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_user_role"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Insertar nuevo perfil de usuario
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    alias,
    role,
    avatar_url,
    phone,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    SPLIT_PART(NEW.email, '@', 1),
    'user_restricted',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.phone,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_ai_usage"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Insertar o actualizar el contador para hoy
  INSERT INTO ai_usage_tracking (user_id, usage_date, usage_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET 
    usage_count = ai_usage_tracking.usage_count + 1,
    updated_at = NOW()
  RETURNING usage_count INTO current_count;
  
  RETURN current_count;
END;
$$;


ALTER FUNCTION "public"."increment_ai_usage"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_actualizado_en"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_actualizado_en"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ai_usage_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ai_usage_updated_at"() OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."ai_usage_tracking" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "usage_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_usage_tracking" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ai_usage_tracking_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ai_usage_tracking_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ai_usage_tracking_id_seq" OWNED BY "public"."ai_usage_tracking"."id";



CREATE TABLE IF NOT EXISTS "public"."cajones_congelador" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "congelador_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "posicion" integer DEFAULT 0 NOT NULL,
    "descripcion" "text",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cajones_congelador" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."categories_id_seq" OWNED BY "public"."categories"."id";



CREATE TABLE IF NOT EXISTS "public"."congeladores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "nombre" "text" DEFAULT 'Mi congelador'::"text" NOT NULL,
    "descripcion" "text",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."congeladores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."congeladores_usuarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "congelador_id" "uuid" NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "rol" "text" DEFAULT 'editor'::"text" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "congeladores_usuarios_rol_check" CHECK (("rol" = ANY (ARRAY['owner'::"text", 'editor'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."congeladores_usuarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."elementos_cajon" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cajon_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "cantidad" numeric,
    "unidad" "text",
    "estado" "text" DEFAULT 'fresco'::"text" NOT NULL,
    "categoria" "text",
    "fecha_compra" "date",
    "fecha_congelacion" "date",
    "fecha_caducidad" "date",
    "notas" "text",
    "imagen_url" "text",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reservado" boolean DEFAULT false NOT NULL,
    CONSTRAINT "elementos_cajon_cantidad_no_negativa" CHECK ((("cantidad" IS NULL) OR ("cantidad" >= (0)::numeric))),
    CONSTRAINT "elementos_cajon_estado_valido" CHECK (("estado" = ANY (ARRAY['fresco'::"text", 'abierto'::"text", 'bajo'::"text", 'agotado'::"text"])))
);


ALTER TABLE "public"."elementos_cajon" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."menu_items" (
    "id" integer NOT NULL,
    "weekly_menu_id" integer,
    "recipe_id" integer,
    "day_of_week" integer NOT NULL,
    "meal_type" character varying(50) NOT NULL,
    "dish_order" integer DEFAULT 1 NOT NULL,
    "sacado_del_congelador" boolean DEFAULT false NOT NULL,
    CONSTRAINT "menu_items_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "menu_items_meal_type_check" CHECK ((("meal_type")::"text" = ANY (ARRAY[('comida'::character varying)::"text", ('cena'::character varying)::"text"])))
);


ALTER TABLE "public"."menu_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."menu_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."menu_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."menu_items_id_seq" OWNED BY "public"."menu_items"."id";



CREATE TABLE IF NOT EXISTS "public"."productos_temporada" (
    "id" bigint NOT NULL,
    "mes" smallint NOT NULL,
    "tipo" "public"."tipo_producto_temporada_enum" NOT NULL,
    "nombre" "text" NOT NULL,
    "observaciones" "text",
    "creado_el" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ck_mes_valido" CHECK ((("mes" >= 1) AND ("mes" <= 12)))
);


ALTER TABLE "public"."productos_temporada" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."productos_temporada_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."productos_temporada_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."productos_temporada_id_seq" OWNED BY "public"."productos_temporada"."id";



CREATE TABLE IF NOT EXISTS "public"."recipe_categories" (
    "recipe_id" integer NOT NULL,
    "category_id" integer NOT NULL
);


ALTER TABLE "public"."recipe_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_ratings" (
    "id" integer NOT NULL,
    "recipe_id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recipe_ratings_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."recipe_ratings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."recipe_ratings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."recipe_ratings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."recipe_ratings_id_seq" OWNED BY "public"."recipe_ratings"."id";



CREATE TABLE IF NOT EXISTS "public"."recipes" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "ingredients" "text",
    "preparation" "text",
    "image_url" "text",
    "is_ai_generated" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "video_url" "text",
    "source_url" "text",
    "calories" integer,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."recipes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."recipes_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."recipes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."recipes_id_seq" OWNED BY "public"."recipes"."id";



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "role" "public"."user_role" DEFAULT 'user_restricted'::"public"."user_role",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text",
    "last_name" "text",
    "alias" "text",
    "avatar_url" "text",
    "phone" "text"
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_menus" (
    "id" integer NOT NULL,
    "name" character varying(255),
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "is_saved" boolean DEFAULT false,
    "saved_at" timestamp with time zone,
    "user_id" "uuid"
);


ALTER TABLE "public"."weekly_menus" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."weekly_menus_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."weekly_menus_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."weekly_menus_id_seq" OWNED BY "public"."weekly_menus"."id";



ALTER TABLE ONLY "public"."ai_usage_tracking" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ai_usage_tracking_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."menu_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."menu_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."productos_temporada" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."productos_temporada_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."recipe_ratings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."recipe_ratings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."recipes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."recipes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."weekly_menus" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."weekly_menus_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ai_usage_tracking"
    ADD CONSTRAINT "ai_usage_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage_tracking"
    ADD CONSTRAINT "ai_usage_tracking_user_id_usage_date_key" UNIQUE ("user_id", "usage_date");



ALTER TABLE ONLY "public"."cajones_congelador"
    ADD CONSTRAINT "cajones_congelador_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."congeladores"
    ADD CONSTRAINT "congeladores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."congeladores_usuarios"
    ADD CONSTRAINT "congeladores_usuarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."elementos_cajon"
    ADD CONSTRAINT "elementos_cajon_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_weekly_menu_id_day_of_week_meal_type_dish_order_key" UNIQUE ("weekly_menu_id", "day_of_week", "meal_type", "dish_order");



ALTER TABLE ONLY "public"."productos_temporada"
    ADD CONSTRAINT "productos_temporada_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_categories"
    ADD CONSTRAINT "recipe_categories_pkey" PRIMARY KEY ("recipe_id", "category_id");



ALTER TABLE ONLY "public"."recipe_ratings"
    ADD CONSTRAINT "recipe_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_ratings"
    ADD CONSTRAINT "recipe_ratings_recipe_id_user_id_key" UNIQUE ("recipe_id", "user_id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_menus"
    ADD CONSTRAINT "weekly_menus_pkey" PRIMARY KEY ("id");



CREATE INDEX "cajones_congelador_congelador_id_idx" ON "public"."cajones_congelador" USING "btree" ("congelador_id");



CREATE UNIQUE INDEX "congeladores_usuario_id_key" ON "public"."congeladores" USING "btree" ("usuario_id");



CREATE INDEX "congeladores_usuarios_congelador_idx" ON "public"."congeladores_usuarios" USING "btree" ("congelador_id");



CREATE UNIQUE INDEX "congeladores_usuarios_unique_idx" ON "public"."congeladores_usuarios" USING "btree" ("congelador_id", "usuario_id");



CREATE INDEX "congeladores_usuarios_usuario_idx" ON "public"."congeladores_usuarios" USING "btree" ("usuario_id");



CREATE INDEX "elementos_cajon_cajon_id_idx" ON "public"."elementos_cajon" USING "btree" ("cajon_id");



CREATE INDEX "idx_ai_usage_user_date" ON "public"."ai_usage_tracking" USING "btree" ("user_id", "usage_date");



CREATE INDEX "idx_recipe_ratings_recipe_id" ON "public"."recipe_ratings" USING "btree" ("recipe_id");



CREATE INDEX "idx_recipe_ratings_user_id" ON "public"."recipe_ratings" USING "btree" ("user_id");



CREATE INDEX "idx_recipes_calories" ON "public"."recipes" USING "btree" ("calories");



CREATE INDEX "idx_recipes_user_id" ON "public"."recipes" USING "btree" ("user_id");



CREATE INDEX "idx_weekly_menus_is_saved" ON "public"."weekly_menus" USING "btree" ("is_saved");



CREATE INDEX "idx_weekly_menus_saved_at" ON "public"."weekly_menus" USING "btree" ("saved_at");



CREATE INDEX "idx_weekly_menus_user_id" ON "public"."weekly_menus" USING "btree" ("user_id");



CREATE INDEX "ix_prodtemp_mes_tipo" ON "public"."productos_temporada" USING "btree" ("mes", "tipo");



CREATE OR REPLACE TRIGGER "trg_cajones_congelador_updated_at" BEFORE UPDATE ON "public"."cajones_congelador" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trg_congeladores_updated_at" BEFORE UPDATE ON "public"."congeladores" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trg_elementos_cajon_updated_at" BEFORE UPDATE ON "public"."elementos_cajon" FOR EACH ROW EXECUTE FUNCTION "public"."set_actualizado_en"();



CREATE OR REPLACE TRIGGER "trigger_update_ai_usage_updated_at" BEFORE UPDATE ON "public"."ai_usage_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."update_ai_usage_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ai_usage_tracking"
    ADD CONSTRAINT "ai_usage_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cajones_congelador"
    ADD CONSTRAINT "cajones_congelador_congelador_id_fkey" FOREIGN KEY ("congelador_id") REFERENCES "public"."congeladores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."congeladores"
    ADD CONSTRAINT "congeladores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."congeladores_usuarios"
    ADD CONSTRAINT "congeladores_usuarios_congelador_id_fkey" FOREIGN KEY ("congelador_id") REFERENCES "public"."congeladores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."congeladores_usuarios"
    ADD CONSTRAINT "congeladores_usuarios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."elementos_cajon"
    ADD CONSTRAINT "elementos_cajon_cajon_id_fkey" FOREIGN KEY ("cajon_id") REFERENCES "public"."cajones_congelador"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "fk_recipes_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."menu_items"
    ADD CONSTRAINT "menu_items_weekly_menu_id_fkey" FOREIGN KEY ("weekly_menu_id") REFERENCES "public"."weekly_menus"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_categories"
    ADD CONSTRAINT "recipe_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_categories"
    ADD CONSTRAINT "recipe_categories_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_ratings"
    ADD CONSTRAINT "recipe_ratings_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_ratings"
    ADD CONSTRAINT "recipe_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_menus"
    ADD CONSTRAINT "weekly_menus_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Anyone can view recipes" ON "public"."recipes" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can delete categories" ON "public"."categories" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete menu_items" ON "public"."menu_items" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete recipe_categories" ON "public"."recipe_categories" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can delete recipes" ON "public"."recipes" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert categories" ON "public"."categories" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert menu_items" ON "public"."menu_items" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert recipe_categories" ON "public"."recipe_categories" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert recipes" ON "public"."recipes" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update categories" ON "public"."categories" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update menu_items" ON "public"."menu_items" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update recipe_categories" ON "public"."recipe_categories" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update recipes" ON "public"."recipes" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view menu_items" ON "public"."menu_items" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view recipe_categories" ON "public"."recipe_categories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."categories" FOR SELECT USING (true);



ALTER TABLE "public"."ai_usage_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cajones_congelador" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cajones_congelador_delete_own" ON "public"."cajones_congelador" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."congeladores" "c"
  WHERE (("c"."id" = "cajones_congelador"."congelador_id") AND ("c"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "cajones_congelador_insert_own" ON "public"."cajones_congelador" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."congeladores" "c"
  WHERE (("c"."id" = "cajones_congelador"."congelador_id") AND ("c"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "cajones_congelador_select_own" ON "public"."cajones_congelador" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."congeladores" "c"
  WHERE (("c"."id" = "cajones_congelador"."congelador_id") AND ("c"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "cajones_congelador_update_own" ON "public"."cajones_congelador" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."congeladores" "c"
  WHERE (("c"."id" = "cajones_congelador"."congelador_id") AND ("c"."usuario_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."congeladores" "c"
  WHERE (("c"."id" = "cajones_congelador"."congelador_id") AND ("c"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."congeladores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "congeladores_delete_own" ON "public"."congeladores" FOR DELETE USING (("auth"."uid"() = "usuario_id"));



CREATE POLICY "congeladores_insert_own" ON "public"."congeladores" FOR INSERT WITH CHECK (("auth"."uid"() = "usuario_id"));



CREATE POLICY "congeladores_select_own" ON "public"."congeladores" FOR SELECT USING (("auth"."uid"() = "usuario_id"));



CREATE POLICY "congeladores_update_own" ON "public"."congeladores" FOR UPDATE USING (("auth"."uid"() = "usuario_id")) WITH CHECK (("auth"."uid"() = "usuario_id"));



ALTER TABLE "public"."elementos_cajon" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "elementos_cajon_delete_own" ON "public"."elementos_cajon" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."cajones_congelador" "cj"
     JOIN "public"."congeladores" "c" ON (("c"."id" = "cj"."congelador_id")))
  WHERE (("cj"."id" = "elementos_cajon"."cajon_id") AND ("c"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "elementos_cajon_insert_own" ON "public"."elementos_cajon" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."cajones_congelador" "cj"
     JOIN "public"."congeladores" "c" ON (("c"."id" = "cj"."congelador_id")))
  WHERE (("cj"."id" = "elementos_cajon"."cajon_id") AND ("c"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "elementos_cajon_select_own" ON "public"."elementos_cajon" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."cajones_congelador" "cj"
     JOIN "public"."congeladores" "c" ON (("c"."id" = "cj"."congelador_id")))
  WHERE (("cj"."id" = "elementos_cajon"."cajon_id") AND ("c"."usuario_id" = "auth"."uid"())))));



CREATE POLICY "elementos_cajon_update_own" ON "public"."elementos_cajon" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."cajones_congelador" "cj"
     JOIN "public"."congeladores" "c" ON (("c"."id" = "cj"."congelador_id")))
  WHERE (("cj"."id" = "elementos_cajon"."cajon_id") AND ("c"."usuario_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."cajones_congelador" "cj"
     JOIN "public"."congeladores" "c" ON (("c"."id" = "cj"."congelador_id")))
  WHERE (("cj"."id" = "elementos_cajon"."cajon_id") AND ("c"."usuario_id" = "auth"."uid"())))));



ALTER TABLE "public"."menu_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_ratings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "simple_policy_for_authenticated" ON "public"."weekly_menus" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles delete own" ON "public"."user_profiles" FOR DELETE TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "user_profiles insert own" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "user_profiles select anon" ON "public"."user_profiles" FOR SELECT TO "anon" USING (true);



CREATE POLICY "user_profiles select own" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "user_profiles update own" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."weekly_menus" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_daily_ai_usage"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_ai_usage"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_ai_usage"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_ai_usage"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_ai_usage"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_ai_usage"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_actualizado_en"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_actualizado_en"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_actualizado_en"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ai_usage_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ai_usage_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ai_usage_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_usage_tracking" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_usage_tracking" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."ai_usage_tracking" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ai_usage_tracking_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ai_usage_tracking_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ai_usage_tracking_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cajones_congelador" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cajones_congelador" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."cajones_congelador" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."categories" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."categories" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."congeladores" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."congeladores" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."congeladores" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."congeladores_usuarios" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."congeladores_usuarios" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."congeladores_usuarios" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."elementos_cajon" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."elementos_cajon" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."elementos_cajon" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menu_items" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menu_items" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."menu_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."menu_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."menu_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."menu_items_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."productos_temporada" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."productos_temporada" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."productos_temporada" TO "service_role";



GRANT ALL ON SEQUENCE "public"."productos_temporada_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."productos_temporada_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."productos_temporada_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."recipe_categories" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."recipe_categories" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."recipe_categories" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."recipe_ratings" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."recipe_ratings" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."recipe_ratings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."recipe_ratings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."recipe_ratings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."recipe_ratings_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."recipes" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."recipes" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."recipes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."recipes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."recipes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."recipes_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_profiles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."weekly_menus" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."weekly_menus" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."weekly_menus" TO "service_role";



GRANT ALL ON SEQUENCE "public"."weekly_menus_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."weekly_menus_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."weekly_menus_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";







