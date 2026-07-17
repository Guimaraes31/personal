-- Ativelo - initial Supabase/PostgreSQL schema
-- Security posture:
--   * auth.users is the identity source of truth.
--   * every tenant-owned relationship carries organization_id.
--   * child FKs are composite (organization_id, parent_id) whenever possible.
--   * sensitive state transitions use SECURITY DEFINER RPCs with an empty search_path.
--   * platform operators never receive an implicit bypass to health data.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

create type public.organization_status as enum
  ('trialing', 'active', 'past_due', 'suspended', 'cancelled');
create type public.membership_status as enum
  ('invited', 'active', 'suspended', 'left');
create type public.person_status as enum
  ('active', 'inactive', 'archived');
create type public.relationship_status as enum
  ('active', 'paused', 'ended');
create type public.plan_record_status as enum
  ('draft', 'active', 'archived');
create type public.template_status as enum
  ('draft', 'published', 'archived');
create type public.workout_session_status as enum
  ('in_progress', 'paused', 'completed', 'abandoned');
create type public.class_status as enum
  ('draft', 'published', 'cancelled', 'completed');
create type public.booking_status as enum
  ('confirmed', 'waitlisted', 'cancelled', 'checked_in', 'attended', 'no_show');
create type public.attendance_status as enum
  ('present', 'absent', 'excused');
create type public.subscription_status as enum
  ('trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired');
create type public.goal_status as enum
  ('active', 'completed', 'cancelled');
create type public.notification_channel as enum
  ('in_app', 'push', 'email');

-- ---------------------------------------------------------------------------
-- Identity, tenancy and authorization
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 500),
  locale text not null default 'pt-BR' check (char_length(locale) <= 16),
  timezone text not null default 'America/Sao_Paulo' check (char_length(timezone) <= 64),
  terms_version text check (terms_version is null or char_length(terms_version) <= 32),
  terms_accepted_at timestamptz,
  privacy_version text check (privacy_version is null or char_length(privacy_version) <= 32),
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  legal_name text check (legal_name is null or char_length(legal_name) <= 180),
  display_name text not null check (char_length(display_name) between 2 and 120),
  status public.organization_status not null default 'trialing',
  branding jsonb not null default '{}'::jsonb check (jsonb_typeof(branding) = 'object'),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  trial_ends_at timestamptz,
  suspended_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_key unique (slug)
);

create table public.roles (
  key text primary key check (key ~ '^[a-z][a-z0-9_.-]{1,63}$'),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 300),
  is_system boolean not null default true
);

create table public.permissions (
  key text primary key check (key ~ '^[a-z][a-z0-9_.-]{2,80}$'),
  description text not null default '' check (char_length(description) <= 300)
);

create table public.role_permissions (
  role_key text not null references public.roles(key) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_key, permission_key)
);

create table public.organization_members (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  status public.membership_status not null default 'active',
  display_name text not null default '' check (char_length(display_name) <= 120),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 500),
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_org_user_key unique (organization_id, user_id),
  constraint organization_members_tenant_key unique (organization_id, id)
);

create table public.organization_member_roles (
  organization_id uuid not null,
  member_id uuid not null,
  role_key text not null references public.roles(key) on delete restrict,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (organization_id, member_id, role_key),
  foreign key (organization_id, member_id)
    references public.organization_members(organization_id, id) on delete cascade
);

-- Kept outside the exposed API schema. This is only for SaaS operational metadata.
create table private.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_-]{1,63}$'),
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  monthly_price_cents integer check (monthly_price_cents is null or monthly_price_cents >= 0),
  annual_price_cents integer check (annual_price_cents is null or annual_price_cents >= 0),
  currency char(3) not null default 'BRL',
  student_limit integer check (student_limit is null or student_limit > 0),
  professional_limit integer check (professional_limit is null or professional_limit > 0),
  unit_limit integer check (unit_limit is null or unit_limit > 0),
  features jsonb not null default '{}'::jsonb check (jsonb_typeof(features) = 'object'),
  is_public boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status public.subscription_status not null default 'trialing',
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'annual', 'custom')),
  provider text check (provider is null or provider in ('stripe', 'mercado_pago', 'mock')),
  provider_customer_ref text,
  provider_subscription_ref text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_tenant_key unique (organization_id, id)
);

create unique index subscriptions_one_current_per_org_idx
  on public.subscriptions (organization_id)
  where status in ('trialing', 'active', 'past_due', 'paused');

-- ---------------------------------------------------------------------------
-- People and consent
-- ---------------------------------------------------------------------------

create table public.units (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  timezone text not null default 'America/Sao_Paulo' check (char_length(timezone) <= 64),
  address jsonb not null default '{}'::jsonb check (jsonb_typeof(address) = 'object'),
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint units_tenant_key unique (organization_id, id)
);

create table public.students (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  member_id uuid not null,
  status public.person_status not null default 'active',
  objective text check (objective is null or char_length(objective) <= 500),
  experience_level text check (experience_level is null or experience_level in ('beginner', 'intermediate', 'advanced')),
  birth_date date,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, member_id)
    references public.organization_members(organization_id, id) on delete restrict,
  constraint students_org_member_key unique (organization_id, member_id),
  constraint students_tenant_key unique (organization_id, id)
);

create table public.professionals (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  member_id uuid not null,
  status public.person_status not null default 'active',
  registration_number text check (registration_number is null or char_length(registration_number) <= 80),
  specialties text[] not null default '{}',
  bio text check (bio is null or char_length(bio) <= 1200),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, member_id)
    references public.organization_members(organization_id, id) on delete restrict,
  constraint professionals_org_member_key unique (organization_id, member_id),
  constraint professionals_tenant_key unique (organization_id, id)
);

create table public.professional_students (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  professional_id uuid not null,
  student_id uuid not null,
  status public.relationship_status not null default 'active',
  starts_on date not null default current_date,
  ends_on date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, professional_id)
    references public.professionals(organization_id, id) on delete restrict,
  foreign key (organization_id, student_id)
    references public.students(organization_id, id) on delete restrict,
  constraint professional_students_pair_key unique (organization_id, professional_id, student_id),
  constraint professional_students_tenant_key unique (organization_id, id),
  check (ends_on is null or ends_on >= starts_on)
);

create table public.consent_records (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  student_id uuid not null,
  subject_user_id uuid not null references auth.users(id) on delete restrict,
  grantee_professional_id uuid,
  consent_type text not null check (consent_type in (
    'privacy_terms', 'health_processing', 'health_share_professional',
    'progress_photo_share', 'marketing'
  )),
  document_version text not null check (char_length(document_version) between 1 and 32),
  purpose text not null default '' check (char_length(purpose) <= 500),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (organization_id, student_id)
    references public.students(organization_id, id) on delete cascade,
  foreign key (organization_id, grantee_professional_id)
    references public.professionals(organization_id, id) on delete cascade,
  constraint consent_records_tenant_key unique (organization_id, id),
  check (revoked_at is null or revoked_at >= granted_at),
  check (
    (consent_type in ('health_share_professional', 'progress_photo_share') and grantee_professional_id is not null)
    or (consent_type not in ('health_share_professional', 'progress_photo_share'))
  )
);

create unique index consent_active_unique_idx
  on public.consent_records (
    organization_id,
    student_id,
    consent_type,
    coalesce(grantee_professional_id, '00000000-0000-0000-0000-000000000000'::uuid),
    document_version
  ) where revoked_at is null;

create table public.student_health_profiles (
  student_id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  limitations text check (limitations is null or char_length(limitations) <= 2000),
  injuries text check (injuries is null or char_length(injuries) <= 2000),
  notes text check (notes is null or char_length(notes) <= 3000),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, student_id)
    references public.students(organization_id, id) on delete cascade,
  constraint student_health_profiles_tenant_key unique (organization_id, student_id)
);

-- ---------------------------------------------------------------------------
-- Exercise catalog, prescriptions and workout execution
-- ---------------------------------------------------------------------------

create table public.exercises (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 140),
  description text not null default '' check (char_length(description) <= 2000),
  instructions text not null default '' check (char_length(instructions) <= 5000),
  primary_muscle text not null check (char_length(primary_muscle) <= 80),
  secondary_muscles text[] not null default '{}',
  equipment text check (equipment is null or char_length(equipment) <= 100),
  difficulty text check (difficulty is null or difficulty in ('beginner', 'intermediate', 'advanced')),
  movement_type text check (movement_type is null or char_length(movement_type) <= 80),
  cautions text check (cautions is null or char_length(cautions) <= 2000),
  common_mistakes text check (common_mistakes is null or char_length(common_mistakes) <= 2000),
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_tenant_key unique (organization_id, id)
);

create table public.exercise_media (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  storage_path text not null check (char_length(storage_path) <= 500),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  sort_order smallint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  constraint exercise_media_path_key unique (storage_path),
  constraint exercise_media_tenant_key unique (organization_id, id)
);

create table public.workout_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  lineage_id uuid not null default extensions.gen_random_uuid(),
  version integer not null default 1 check (version > 0),
  status public.template_status not null default 'draft',
  name text not null check (char_length(name) between 2 and 140),
  description text not null default '' check (char_length(description) <= 2000),
  objective text check (objective is null or char_length(objective) <= 300),
  level text check (level is null or level in ('beginner', 'intermediate', 'advanced')),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 600),
  weekly_frequency smallint check (weekly_frequency is null or weekly_frequency between 1 and 14),
  supersedes_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, supersedes_id)
    references public.workout_templates(organization_id, id) on delete restrict,
  constraint workout_templates_lineage_version_key unique (organization_id, lineage_id, version),
  constraint workout_templates_tenant_key unique (organization_id, id)
);

create table public.workout_template_days (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  template_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  weekday smallint check (weekday is null or weekday between 0 and 6),
  sort_order smallint not null default 0 check (sort_order >= 0),
  notes text check (notes is null or char_length(notes) <= 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, template_id)
    references public.workout_templates(organization_id, id) on delete cascade,
  constraint workout_template_days_order_key unique (organization_id, template_id, sort_order),
  constraint workout_template_days_tenant_key unique (organization_id, id)
);

create table public.workout_template_exercises (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  template_day_id uuid not null,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  sort_order smallint not null default 0 check (sort_order >= 0),
  block_key text check (block_key is null or char_length(block_key) <= 40),
  technique text check (technique is null or technique in ('standard', 'superset', 'circuit', 'drop_set')),
  planned_sets smallint not null default 3 check (planned_sets between 1 and 30),
  reps_min smallint check (reps_min is null or reps_min >= 0),
  reps_max smallint check (reps_max is null or reps_max >= reps_min),
  target_load numeric(9,3) check (target_load is null or target_load >= 0),
  load_unit text not null default 'kg' check (load_unit in ('kg', 'lb', 'bodyweight', 'band', 'none')),
  rest_seconds integer check (rest_seconds is null or rest_seconds between 0 and 3600),
  tempo text check (tempo is null or char_length(tempo) <= 32),
  target_rpe numeric(3,1) check (target_rpe is null or target_rpe between 0 and 10),
  target_rir smallint check (target_rir is null or target_rir between 0 and 10),
  notes text check (notes is null or char_length(notes) <= 1500),
  alternatives uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, template_day_id)
    references public.workout_template_days(organization_id, id) on delete cascade,
  constraint workout_template_exercises_order_key unique (organization_id, template_day_id, sort_order),
  constraint workout_template_exercises_tenant_key unique (organization_id, id)
);

create table public.workout_plans (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  lineage_id uuid not null default extensions.gen_random_uuid(),
  version integer not null default 1 check (version > 0),
  status public.plan_record_status not null default 'draft',
  student_id uuid not null,
  professional_id uuid,
  template_id uuid,
  name text not null check (char_length(name) between 2 and 140),
  description text not null default '' check (char_length(description) <= 2000),
  objective text check (objective is null or char_length(objective) <= 300),
  level text check (level is null or level in ('beginner', 'intermediate', 'advanced')),
  starts_on date,
  ends_on date,
  supersedes_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict,
  activated_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, student_id)
    references public.students(organization_id, id) on delete restrict,
  foreign key (organization_id, professional_id)
    references public.professionals(organization_id, id) on delete restrict,
  foreign key (organization_id, template_id)
    references public.workout_templates(organization_id, id) on delete restrict,
  foreign key (organization_id, supersedes_id)
    references public.workout_plans(organization_id, id) on delete restrict,
  constraint workout_plans_lineage_version_key unique (organization_id, lineage_id, version),
  constraint workout_plans_tenant_key unique (organization_id, id),
  constraint workout_plans_student_key unique (organization_id, id, student_id),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create unique index workout_plans_one_active_lineage_idx
  on public.workout_plans (organization_id, student_id, lineage_id)
  where status = 'active' and deleted_at is null;

create table public.workout_days (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  workout_plan_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  weekday smallint check (weekday is null or weekday between 0 and 6),
  sort_order smallint not null default 0 check (sort_order >= 0),
  notes text check (notes is null or char_length(notes) <= 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, workout_plan_id)
    references public.workout_plans(organization_id, id) on delete cascade,
  constraint workout_days_order_key unique (organization_id, workout_plan_id, sort_order),
  constraint workout_days_tenant_key unique (organization_id, id),
  constraint workout_days_plan_key unique (organization_id, id, workout_plan_id)
);

create table public.workout_exercises (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  workout_day_id uuid not null,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  sort_order smallint not null default 0 check (sort_order >= 0),
  block_key text check (block_key is null or char_length(block_key) <= 40),
  technique text check (technique is null or technique in ('standard', 'superset', 'circuit', 'drop_set')),
  planned_sets smallint not null default 3 check (planned_sets between 1 and 30),
  reps_min smallint check (reps_min is null or reps_min >= 0),
  reps_max smallint check (reps_max is null or reps_max >= reps_min),
  target_load numeric(9,3) check (target_load is null or target_load >= 0),
  load_unit text not null default 'kg' check (load_unit in ('kg', 'lb', 'bodyweight', 'band', 'none')),
  rest_seconds integer check (rest_seconds is null or rest_seconds between 0 and 3600),
  tempo text check (tempo is null or char_length(tempo) <= 32),
  target_rpe numeric(3,1) check (target_rpe is null or target_rpe between 0 and 10),
  target_rir smallint check (target_rir is null or target_rir between 0 and 10),
  notes text check (notes is null or char_length(notes) <= 1500),
  alternatives uuid[] not null default '{}',
  allow_substitution boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, workout_day_id)
    references public.workout_days(organization_id, id) on delete cascade,
  constraint workout_exercises_order_key unique (organization_id, workout_day_id, sort_order),
  constraint workout_exercises_tenant_key unique (organization_id, id)
);

create table public.workout_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  workout_plan_id uuid not null,
  workout_day_id uuid not null,
  student_id uuid not null,
  client_session_id uuid not null,
  status public.workout_session_status not null default 'in_progress',
  plan_version integer not null check (plan_version > 0),
  prescription_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(prescription_snapshot) = 'object'),
  started_at timestamptz not null default now(),
  paused_at timestamptz,
  completed_at timestamptz,
  abandoned_at timestamptz,
  last_saved_at timestamptz not null default now(),
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  completed_sets integer not null default 0 check (completed_sets >= 0),
  total_volume numeric(14,3) not null default 0 check (total_volume >= 0),
  perceived_effort numeric(3,1) check (perceived_effort is null or perceived_effort between 0 and 10),
  feedback text check (feedback is null or char_length(feedback) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, workout_plan_id)
    references public.workout_plans(organization_id, id) on delete restrict,
  foreign key (organization_id, workout_day_id)
    references public.workout_days(organization_id, id) on delete restrict,
  foreign key (organization_id, student_id)
    references public.students(organization_id, id) on delete restrict,
  foreign key (organization_id, workout_plan_id, student_id)
    references public.workout_plans(organization_id, id, student_id) on delete restrict,
  foreign key (organization_id, workout_day_id, workout_plan_id)
    references public.workout_days(organization_id, id, workout_plan_id) on delete restrict,
  constraint workout_sessions_client_key unique (organization_id, student_id, client_session_id),
  constraint workout_sessions_tenant_key unique (organization_id, id),
  check ((status = 'completed') = (completed_at is not null)),
  check ((status = 'abandoned') = (abandoned_at is not null))
);

create unique index workout_sessions_one_open_per_student_idx
  on public.workout_sessions (organization_id, student_id)
  where status in ('in_progress', 'paused');

create table public.workout_session_exercises (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  workout_session_id uuid not null,
  prescribed_workout_exercise_id uuid,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  exercise_name text not null check (char_length(exercise_name) between 1 and 140),
  sort_order smallint not null check (sort_order >= 0),
  prescription jsonb not null default '{}'::jsonb check (jsonb_typeof(prescription) = 'object'),
  substituted_from_exercise_id uuid references public.exercises(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (organization_id, workout_session_id)
    references public.workout_sessions(organization_id, id) on delete cascade,
  foreign key (organization_id, prescribed_workout_exercise_id)
    references public.workout_exercises(organization_id, id) on delete restrict,
  constraint workout_session_exercises_order_key unique (organization_id, workout_session_id, sort_order),
  constraint workout_session_exercises_tenant_key unique (organization_id, id),
  constraint workout_session_exercises_session_key unique (organization_id, workout_session_id, id)
);

create table public.exercise_sets (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  workout_session_id uuid not null,
  session_exercise_id uuid not null,
  set_number smallint not null check (set_number between 1 and 100),
  target_reps_min smallint check (target_reps_min is null or target_reps_min >= 0),
  target_reps_max smallint check (target_reps_max is null or target_reps_max >= target_reps_min),
  target_load numeric(9,3) check (target_load is null or target_load >= 0),
  actual_reps smallint check (actual_reps is null or actual_reps >= 0),
  actual_load numeric(9,3) check (actual_load is null or actual_load >= 0),
  load_unit text not null default 'kg' check (load_unit in ('kg', 'lb', 'bodyweight', 'band', 'none')),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  rpe numeric(3,1) check (rpe is null or rpe between 0 and 10),
  rir smallint check (rir is null or rir between 0 and 10),
  is_completed boolean not null default false,
  completed_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 1000),
  last_client_mutation_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, workout_session_id)
    references public.workout_sessions(organization_id, id) on delete cascade,
  foreign key (organization_id, workout_session_id, session_exercise_id)
    references public.workout_session_exercises(organization_id, workout_session_id, id) on delete cascade,
  constraint exercise_sets_position_key unique (organization_id, workout_session_id, session_exercise_id, set_number),
  constraint exercise_sets_tenant_key unique (organization_id, id),
  check (not is_completed or completed_at is not null)
);

create table public.workout_mutation_receipts (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_mutation_id uuid not null,
  workout_session_id uuid not null,
  result_table text not null check (result_table in ('exercise_sets', 'workout_sessions')),
  result_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id, client_mutation_id),
  foreign key (organization_id, workout_session_id)
    references public.workout_sessions(organization_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Physical progress
-- ---------------------------------------------------------------------------

create table public.body_measurements (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  student_id uuid not null,
  measured_at timestamptz not null default now(),
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg between 20 and 500),
  height_cm numeric(5,2) check (height_cm is null or height_cm between 50 and 260),
  body_fat_percent numeric(5,2) check (body_fat_percent is null or body_fat_percent between 0 and 80),
  circumferences jsonb not null default '{}'::jsonb check (jsonb_typeof(circumferences) = 'object'),
  skinfolds jsonb not null default '{}'::jsonb check (jsonb_typeof(skinfolds) = 'object'),
  custom_metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(custom_metrics) = 'object'),
  notes text check (notes is null or char_length(notes) <= 1500),
  recorded_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, student_id)
    references public.students(organization_id, id) on delete cascade,
  constraint body_measurements_tenant_key unique (organization_id, id)
);

create table public.progress_photos (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  student_id uuid not null,
  taken_at timestamptz not null default now(),
  view_angle text check (view_angle is null or view_angle in ('front', 'side', 'back', 'other')),
  storage_path text not null unique check (char_length(storage_path) <= 500),
  notes text check (notes is null or char_length(notes) <= 500),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, student_id)
    references public.students(organization_id, id) on delete cascade,
  constraint progress_photos_tenant_key unique (organization_id, id)
);

create table public.goals (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  student_id uuid not null,
  goal_type text not null check (char_length(goal_type) <= 80),
  title text not null check (char_length(title) between 2 and 160),
  target_value numeric(14,3),
  current_value numeric(14,3),
  unit text check (unit is null or char_length(unit) <= 32),
  target_date date,
  status public.goal_status not null default 'active',
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, student_id)
    references public.students(organization_id, id) on delete cascade,
  constraint goals_tenant_key unique (organization_id, id)
);

create table public.personal_records (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  student_id uuid not null,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  record_type text not null check (record_type in ('max_load', 'estimated_1rm', 'max_reps', 'duration', 'distance')),
  value numeric(14,3) not null,
  unit text not null check (char_length(unit) <= 32),
  achieved_at timestamptz not null,
  workout_session_id uuid,
  created_at timestamptz not null default now(),
  foreign key (organization_id, student_id)
    references public.students(organization_id, id) on delete cascade,
  foreign key (organization_id, workout_session_id)
    references public.workout_sessions(organization_id, id) on delete restrict,
  constraint personal_records_tenant_key unique (organization_id, id)
);

-- ---------------------------------------------------------------------------
-- Classes, booking and attendance
-- ---------------------------------------------------------------------------

create table public.class_types (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '' check (char_length(description) <= 1200),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  default_duration_minutes integer not null default 60 check (default_duration_minutes between 5 and 360),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_types_tenant_key unique (organization_id, id)
);

create table public.classes (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  unit_id uuid not null,
  class_type_id uuid not null,
  instructor_professional_id uuid,
  title text not null check (char_length(title) between 2 and 140),
  description text not null default '' check (char_length(description) <= 1500),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity between 1 and 10000),
  booking_opens_at timestamptz,
  booking_closes_at timestamptz,
  cancellation_deadline_at timestamptz,
  status public.class_status not null default 'draft',
  created_by uuid references auth.users(id) on delete restrict,
  cancelled_at timestamptz,
  cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, unit_id)
    references public.units(organization_id, id) on delete restrict,
  foreign key (organization_id, class_type_id)
    references public.class_types(organization_id, id) on delete restrict,
  foreign key (organization_id, instructor_professional_id)
    references public.professionals(organization_id, id) on delete restrict,
  constraint classes_tenant_key unique (organization_id, id),
  check (ends_at > starts_at),
  check (booking_closes_at is null or booking_opens_at is null or booking_closes_at >= booking_opens_at),
  check ((status = 'cancelled') = (cancelled_at is not null))
);

create table public.class_bookings (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  class_id uuid not null,
  student_id uuid not null,
  status public.booking_status not null,
  booked_at timestamptz,
  waitlisted_at timestamptz,
  cancelled_at timestamptz,
  promoted_at timestamptz,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, class_id)
    references public.classes(organization_id, id) on delete restrict,
  foreign key (organization_id, student_id)
    references public.students(organization_id, id) on delete restrict,
  constraint class_bookings_student_key unique (organization_id, class_id, student_id),
  constraint class_bookings_tenant_key unique (organization_id, id),
  constraint class_bookings_attendance_key unique (organization_id, id, class_id, student_id),
  check (status <> 'waitlisted' or waitlisted_at is not null),
  check (status <> 'confirmed' or booked_at is not null),
  check (status <> 'cancelled' or cancelled_at is not null)
);

-- A booking has one lifecycle row; this append-only table preserves every transition.
create table public.class_booking_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  booking_id uuid not null,
  from_status public.booking_status,
  to_status public.booking_status not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  reason text check (reason is null or char_length(reason) <= 500),
  occurred_at timestamptz not null default now(),
  foreign key (organization_id, booking_id)
    references public.class_bookings(organization_id, id) on delete cascade
);

create table public.attendance (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  class_id uuid not null,
  booking_id uuid not null,
  student_id uuid not null,
  status public.attendance_status not null,
  checked_in_at timestamptz,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, class_id)
    references public.classes(organization_id, id) on delete restrict,
  foreign key (organization_id, booking_id)
    references public.class_bookings(organization_id, id) on delete restrict,
  foreign key (organization_id, student_id)
    references public.students(organization_id, id) on delete restrict,
  foreign key (organization_id, booking_id, class_id, student_id)
    references public.class_bookings(organization_id, id, class_id, student_id) on delete restrict,
  constraint attendance_booking_key unique (organization_id, booking_id),
  constraint attendance_tenant_key unique (organization_id, id)
);

-- ---------------------------------------------------------------------------
-- Communication, engagement, flags and audit
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid not null,
  channel public.notification_channel not null default 'in_app',
  kind text not null check (char_length(kind) <= 80),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) <= 2000),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  read_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, recipient_user_id)
    references public.organization_members(organization_id, user_id) on delete cascade,
  constraint notifications_tenant_key unique (organization_id, id)
);

create table public.messages (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sender_user_id uuid not null,
  recipient_user_id uuid not null,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  deleted_by_sender_at timestamptz,
  deleted_by_recipient_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, sender_user_id)
    references public.organization_members(organization_id, user_id) on delete restrict,
  foreign key (organization_id, recipient_user_id)
    references public.organization_members(organization_id, user_id) on delete restrict,
  constraint messages_tenant_key unique (organization_id, id),
  check (sender_user_id <> recipient_user_id)
);

create table public.achievements (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text not null check (code ~ '^[a-z][a-z0-9_.-]{1,80}$'),
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '' check (char_length(description) <= 800),
  points integer not null default 0 check (points >= 0),
  criteria jsonb not null default '{}'::jsonb check (jsonb_typeof(criteria) = 'object'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint achievements_scope_code_key unique nulls not distinct (organization_id, code),
  constraint achievements_tenant_key unique (organization_id, id)
);

create table public.user_achievements (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null,
  achievement_id uuid not null references public.achievements(id) on delete restrict,
  earned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  foreign key (organization_id, student_id)
    references public.students(organization_id, id) on delete cascade,
  constraint user_achievements_once_key unique (organization_id, student_id, achievement_id),
  constraint user_achievements_tenant_key unique (organization_id, id)
);

create table public.challenges (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  description text not null default '' check (char_length(description) <= 1500),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  rules jsonb not null default '{}'::jsonb check (jsonb_typeof(rules) = 'object'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenges_tenant_key unique (organization_id, id),
  check (ends_at > starts_at)
);

create table public.feature_flags (
  key text primary key check (key ~ '^[a-z][a-z0-9_.-]{1,80}$'),
  description text not null default '' check (char_length(description) <= 500),
  default_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.organization_feature_flags (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  feature_key text not null references public.feature_flags(key) on delete cascade,
  enabled boolean not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (organization_id, feature_key)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) <= 120),
  entity_type text not null check (char_length(entity_type) <= 80),
  entity_id text not null check (char_length(entity_id) <= 160),
  changes jsonb not null default '{}'::jsonb check (jsonb_typeof(changes) = 'object'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now()
);

create table private.platform_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

-- Transactional outbox. A trusted worker claims rows and sends push/email/webhooks.
create table private.outbox_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  topic text not null check (char_length(topic) <= 120),
  idempotency_key text not null unique check (char_length(idempotency_key) <= 200),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  available_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes used by RLS predicates and common timelines
-- ---------------------------------------------------------------------------

create index organization_members_user_status_idx
  on public.organization_members (user_id, status, organization_id);
create index organization_member_roles_member_idx
  on public.organization_member_roles (organization_id, member_id, role_key);
create index professional_students_student_idx
  on public.professional_students (organization_id, student_id, status, professional_id);
create index professional_students_professional_idx
  on public.professional_students (organization_id, professional_id, status, student_id);
create index consent_records_lookup_idx
  on public.consent_records (organization_id, student_id, grantee_professional_id, consent_type)
  where revoked_at is null;
create index exercises_org_active_idx
  on public.exercises (organization_id, is_active, name) where deleted_at is null;
create index exercises_tags_gin_idx on public.exercises using gin (tags);
create index workout_plans_student_idx
  on public.workout_plans (organization_id, student_id, status, starts_on desc) where deleted_at is null;
create index workout_sessions_student_started_idx
  on public.workout_sessions (organization_id, student_id, started_at desc);
create index exercise_sets_session_idx
  on public.exercise_sets (organization_id, workout_session_id, session_exercise_id, set_number);
create index body_measurements_student_date_idx
  on public.body_measurements (organization_id, student_id, measured_at desc) where deleted_at is null;
create index classes_calendar_idx
  on public.classes (organization_id, unit_id, starts_at, status);
create index classes_instructor_idx
  on public.classes (organization_id, instructor_professional_id, starts_at);
create index class_bookings_capacity_idx
  on public.class_bookings (organization_id, class_id, status);
create index class_bookings_waitlist_idx
  on public.class_bookings (organization_id, class_id, waitlisted_at, id)
  where status = 'waitlisted';
create index class_bookings_student_idx
  on public.class_bookings (organization_id, student_id, created_at desc);
create index notifications_recipient_idx
  on public.notifications (recipient_user_id, read_at, created_at desc);
create index messages_participants_idx
  on public.messages (organization_id, sender_user_id, recipient_user_id, created_at desc);
create index audit_logs_org_time_idx
  on public.audit_logs (organization_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Fixed RBAC vocabulary. Client code may read it but cannot mutate it.
-- ---------------------------------------------------------------------------

insert into public.roles (key, name, description) values
  ('owner', 'Proprietário', 'Responsável legal e operacional pela organização.'),
  ('org_admin', 'Administrador', 'Administra a academia sem acesso automático a dados de saúde.'),
  ('coach', 'Professor', 'Prescreve treinos para alunos vinculados e conduz aulas.'),
  ('receptionist', 'Recepção', 'Opera agenda, reservas e cadastros não clínicos.'),
  ('student', 'Aluno', 'Acessa somente seus próprios dados e atividades.')
on conflict (key) do nothing;

insert into public.permissions (key, description) values
  ('org.manage', 'Gerenciar configurações operacionais da organização.'),
  ('members.manage', 'Convidar, suspender e atribuir papéis a membros.'),
  ('students.manage', 'Criar e alterar cadastros operacionais de alunos.'),
  ('workouts.manage', 'Criar modelos e prescrever treinos.'),
  ('classes.manage', 'Criar e alterar aulas.'),
  ('bookings.manage', 'Gerenciar reservas de terceiros.'),
  ('attendance.manage', 'Registrar presença.'),
  ('health.record', 'Registrar dados de saúde quando houver vínculo e consentimento.'),
  ('audit.read', 'Consultar auditoria administrativa da organização.'),
  ('billing.manage', 'Consultar e gerenciar assinatura.'),
  ('branding.manage', 'Gerenciar identidade visual da organização.')
on conflict (key) do nothing;

insert into public.role_permissions (role_key, permission_key)
select role_key, permission_key
from (values
  ('owner', 'org.manage'), ('owner', 'members.manage'),
  ('owner', 'students.manage'), ('owner', 'workouts.manage'),
  ('owner', 'classes.manage'), ('owner', 'bookings.manage'),
  ('owner', 'attendance.manage'), ('owner', 'audit.read'),
  ('owner', 'billing.manage'), ('owner', 'branding.manage'),
  ('org_admin', 'org.manage'), ('org_admin', 'members.manage'),
  ('org_admin', 'students.manage'), ('org_admin', 'workouts.manage'),
  ('org_admin', 'classes.manage'), ('org_admin', 'bookings.manage'),
  ('org_admin', 'attendance.manage'), ('org_admin', 'audit.read'),
  ('org_admin', 'billing.manage'), ('org_admin', 'branding.manage'),
  ('coach', 'workouts.manage'), ('coach', 'classes.manage'),
  ('coach', 'attendance.manage'), ('coach', 'health.record'),
  ('receptionist', 'students.manage'), ('receptionist', 'classes.manage'),
  ('receptionist', 'bookings.manage'), ('receptionist', 'attendance.manage')
) as grants(role_key, permission_key)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Non-recursive RLS helpers
-- ---------------------------------------------------------------------------

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from private.platform_admins pa
      where pa.user_id = auth.uid() and pa.active
    );
$$;

create or replace function private.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.organization_members m
      where m.organization_id = p_organization_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    );
$$;

create or replace function private.can_use_org(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_org_member(p_organization_id)
    and exists (
      select 1
      from public.organizations o
      where o.id = p_organization_id
        and o.deleted_at is null
        and o.status in ('trialing', 'active', 'past_due')
    );
$$;

create or replace function private.has_role(p_organization_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.organization_members m
      join public.organization_member_roles mr
        on mr.organization_id = m.organization_id and mr.member_id = m.id
      where m.organization_id = p_organization_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and mr.role_key = any (p_roles)
    );
$$;

create or replace function private.has_permission(p_organization_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_use_org(p_organization_id)
    and exists (
      select 1
      from public.organization_members m
      join public.organization_member_roles mr
        on mr.organization_id = m.organization_id and mr.member_id = m.id
      join public.role_permissions rp on rp.role_key = mr.role_key
      where m.organization_id = p_organization_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and rp.permission_key = p_permission
    );
$$;

create or replace function private.current_student_id(p_organization_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.students s
  join public.organization_members m
    on m.organization_id = s.organization_id and m.id = s.member_id
  where s.organization_id = p_organization_id
    and s.status = 'active'
    and s.deleted_at is null
    and m.status = 'active'
    and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function private.current_professional_id(p_organization_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.professionals p
  join public.organization_members m
    on m.organization_id = p.organization_id and m.id = p.member_id
  where p.organization_id = p_organization_id
    and p.status = 'active'
    and p.deleted_at is null
    and m.status = 'active'
    and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function private.is_student_self(p_organization_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_use_org(p_organization_id)
    and private.current_student_id(p_organization_id) = p_student_id;
$$;

create or replace function private.can_view_student(p_organization_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_student_self(p_organization_id, p_student_id)
    or (
      private.can_use_org(p_organization_id)
      and (
        private.has_role(p_organization_id, array['owner', 'org_admin', 'receptionist'])
        or exists (
          select 1
          from public.professional_students ps
          where ps.organization_id = p_organization_id
            and ps.student_id = p_student_id
            and ps.professional_id = private.current_professional_id(p_organization_id)
            and ps.status = 'active'
        )
      )
    );
$$;

create or replace function private.can_manage_student(p_organization_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_use_org(p_organization_id)
    and (
      private.has_role(p_organization_id, array['owner', 'org_admin'])
      or (
        private.has_permission(p_organization_id, 'workouts.manage')
        and exists (
          select 1
          from public.professional_students ps
          where ps.organization_id = p_organization_id
            and ps.student_id = p_student_id
            and ps.professional_id = private.current_professional_id(p_organization_id)
            and ps.status = 'active'
        )
      )
    );
$$;

create or replace function private.has_health_consent(
  p_organization_id uuid,
  p_student_id uuid,
  p_professional_id uuid,
  p_consent_type text default 'health_share_professional'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.consent_records c
    where c.organization_id = p_organization_id
      and c.student_id = p_student_id
      and c.grantee_professional_id = p_professional_id
      and c.consent_type = p_consent_type
      and c.revoked_at is null
  );
$$;

create or replace function private.can_view_health(
  p_organization_id uuid,
  p_student_id uuid,
  p_consent_type text default 'health_share_professional'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_student_self(p_organization_id, p_student_id)
    or (
      private.has_permission(p_organization_id, 'health.record')
      and exists (
        select 1
        from public.professional_students ps
        where ps.organization_id = p_organization_id
          and ps.student_id = p_student_id
          and ps.professional_id = private.current_professional_id(p_organization_id)
          and ps.status = 'active'
      )
      and private.has_health_consent(
        p_organization_id,
        p_student_id,
        private.current_professional_id(p_organization_id),
        p_consent_type
      )
    );
$$;

create or replace function private.can_view_plan(p_organization_id uuid, p_workout_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workout_plans wp
    where wp.organization_id = p_organization_id
      and wp.id = p_workout_plan_id
      and wp.deleted_at is null
      and (
        private.is_student_self(p_organization_id, wp.student_id)
        or private.can_manage_student(p_organization_id, wp.student_id)
      )
  );
$$;

create or replace function private.can_view_workout_day(p_organization_id uuid, p_workout_day_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workout_days wd
    where wd.organization_id = p_organization_id
      and wd.id = p_workout_day_id
      and private.can_view_plan(p_organization_id, wd.workout_plan_id)
  );
$$;

create or replace function private.can_manage_plan(p_organization_id uuid, p_workout_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workout_plans wp
    where wp.organization_id = p_organization_id
      and wp.id = p_workout_plan_id
      and wp.deleted_at is null
      and private.can_manage_student(p_organization_id, wp.student_id)
  );
$$;

create or replace function private.can_view_session(p_organization_id uuid, p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workout_sessions ws
    where ws.organization_id = p_organization_id
      and ws.id = p_session_id
      and (
        private.is_student_self(p_organization_id, ws.student_id)
        or private.can_manage_student(p_organization_id, ws.student_id)
      )
  );
$$;

create or replace function private.can_manage_class(p_organization_id uuid, p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission(p_organization_id, 'classes.manage')
    or exists (
      select 1 from public.classes c
      where c.organization_id = p_organization_id
        and c.id = p_class_id
        and c.instructor_professional_id = private.current_professional_id(p_organization_id)
    );
$$;

create or replace function private.can_view_booking(p_organization_id uuid, p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_bookings b
    where b.organization_id = p_organization_id
      and b.id = p_booking_id
      and (
        private.is_student_self(p_organization_id, b.student_id)
        or private.can_manage_class(p_organization_id, b.class_id)
        or private.has_permission(p_organization_id, 'bookings.manage')
      )
  );
$$;

create or replace function private.exercise_visible_to_org(p_exercise_id uuid, p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exercises e
    where e.id = p_exercise_id
      and e.deleted_at is null
      and e.is_active
      and (e.organization_id is null or e.organization_id = p_organization_id)
  );
$$;

revoke all on function private.is_platform_admin() from public, anon;
revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.can_use_org(uuid) from public, anon;
revoke all on function private.has_role(uuid, text[]) from public, anon;
revoke all on function private.has_permission(uuid, text) from public, anon;
revoke all on function private.current_student_id(uuid) from public, anon;
revoke all on function private.current_professional_id(uuid) from public, anon;
revoke all on function private.is_student_self(uuid, uuid) from public, anon;
revoke all on function private.can_view_student(uuid, uuid) from public, anon;
revoke all on function private.can_manage_student(uuid, uuid) from public, anon;
revoke all on function private.has_health_consent(uuid, uuid, uuid, text) from public, anon;
revoke all on function private.can_view_health(uuid, uuid, text) from public, anon;
revoke all on function private.can_view_plan(uuid, uuid) from public, anon;
revoke all on function private.can_view_workout_day(uuid, uuid) from public, anon;
revoke all on function private.can_manage_plan(uuid, uuid) from public, anon;
revoke all on function private.can_view_session(uuid, uuid) from public, anon;
revoke all on function private.can_manage_class(uuid, uuid) from public, anon;
revoke all on function private.can_view_booking(uuid, uuid) from public, anon;
revoke all on function private.exercise_visible_to_org(uuid, uuid) from public, anon;

grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.can_use_org(uuid) to authenticated;
grant execute on function private.has_role(uuid, text[]) to authenticated;
grant execute on function private.has_permission(uuid, text) to authenticated;
grant execute on function private.current_student_id(uuid) to authenticated;
grant execute on function private.current_professional_id(uuid) to authenticated;
grant execute on function private.is_student_self(uuid, uuid) to authenticated;
grant execute on function private.can_view_student(uuid, uuid) to authenticated;
grant execute on function private.can_manage_student(uuid, uuid) to authenticated;
grant execute on function private.has_health_consent(uuid, uuid, uuid, text) to authenticated;
grant execute on function private.can_view_health(uuid, uuid, text) to authenticated;
grant execute on function private.can_view_plan(uuid, uuid) to authenticated;
grant execute on function private.can_view_workout_day(uuid, uuid) to authenticated;
grant execute on function private.can_manage_plan(uuid, uuid) to authenticated;
grant execute on function private.can_view_session(uuid, uuid) to authenticated;
grant execute on function private.can_manage_class(uuid, uuid) to authenticated;
grant execute on function private.can_view_booking(uuid, uuid) to authenticated;
grant execute on function private.exercise_visible_to_org(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Integrity and audit triggers
-- ---------------------------------------------------------------------------

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'profiles', 'organizations', 'plans', 'subscriptions',
    'organization_members', 'units', 'students', 'professionals',
    'professional_students', 'student_health_profiles', 'exercises',
    'workout_templates', 'workout_template_days', 'workout_template_exercises',
    'workout_plans', 'workout_days', 'workout_exercises', 'workout_sessions',
    'exercise_sets', 'body_measurements', 'goals', 'class_types', 'classes',
    'class_bookings', 'attendance', 'challenges'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.touch_updated_at()',
      v_table || '_touch_updated_at',
      v_table
    );
  end loop;
end;
$$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name', ''), 120)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

create or replace function private.validate_exercise_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.exercise_visible_to_org(new.exercise_id, new.organization_id) then
    raise exception 'Exercise is not available to this organization.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_exercise_scope() from public, anon, authenticated;

create trigger workout_template_exercises_validate_scope
before insert or update of organization_id, exercise_id
on public.workout_template_exercises
for each row execute function private.validate_exercise_scope();

create trigger workout_exercises_validate_scope
before insert or update of organization_id, exercise_id
on public.workout_exercises
for each row execute function private.validate_exercise_scope();

create trigger workout_session_exercises_validate_scope
before insert or update of organization_id, exercise_id
on public.workout_session_exercises
for each row execute function private.validate_exercise_scope();

create trigger personal_records_validate_scope
before insert or update of organization_id, exercise_id
on public.personal_records
for each row execute function private.validate_exercise_scope();

create or replace function private.validate_exercise_media_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exercise_org uuid;
begin
  select e.organization_id into v_exercise_org
  from public.exercises e
  where e.id = new.exercise_id;

  if not found or v_exercise_org is distinct from new.organization_id then
    raise exception 'Exercise media scope does not match its exercise.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_exercise_media_scope() from public, anon, authenticated;

create trigger exercise_media_validate_scope
before insert or update of organization_id, exercise_id
on public.exercise_media
for each row execute function private.validate_exercise_media_scope();

create or replace function private.validate_achievement_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_achievement_org uuid;
begin
  select a.organization_id into v_achievement_org
  from public.achievements a
  where a.id = new.achievement_id and a.is_active;

  if not found or (v_achievement_org is not null and v_achievement_org <> new.organization_id) then
    raise exception 'Achievement is not available to this organization.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_achievement_scope() from public, anon, authenticated;

create trigger user_achievements_validate_scope
before insert or update of organization_id, achievement_id
on public.user_achievements
for each row execute function private.validate_achievement_scope();

create or replace function private.assert_workout_plan_child_mutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_plan_status public.plan_record_status;
begin
  if tg_table_name = 'workout_days' then
    select wp.status into v_plan_status
    from public.workout_plans wp
    where wp.organization_id = (v_row ->> 'organization_id')::uuid
      and wp.id = (v_row ->> 'workout_plan_id')::uuid;
  else
    select wp.status into v_plan_status
    from public.workout_days wd
    join public.workout_plans wp
      on wp.organization_id = wd.organization_id and wp.id = wd.workout_plan_id
    where wd.organization_id = (v_row ->> 'organization_id')::uuid
      and wd.id = (v_row ->> 'workout_day_id')::uuid;
  end if;

  if v_plan_status is distinct from 'draft'::public.plan_record_status then
    raise exception 'An active or archived prescription is immutable; create a new version.'
      using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.assert_workout_plan_child_mutable() from public, anon, authenticated;

create trigger workout_days_require_draft
before insert or update or delete on public.workout_days
for each row execute function private.assert_workout_plan_child_mutable();

create trigger workout_exercises_require_draft
before insert or update or delete on public.workout_exercises
for each row execute function private.assert_workout_plan_child_mutable();

create or replace function private.assert_workout_plan_record_mutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('active', 'archived')
     and (
       to_jsonb(new) - array['status', 'archived_at', 'updated_at']::text[]
       is distinct from
       to_jsonb(old) - array['status', 'archived_at', 'updated_at']::text[]
     ) then
    raise exception 'An active or archived prescription is immutable; create a new version.'
      using errcode = '55000';
  end if;

  if old.status = 'archived' and new.status <> 'archived' then
    raise exception 'An archived prescription cannot be reactivated.' using errcode = '55000';
  end if;
  if old.status = 'active' and new.status not in ('active', 'archived') then
    raise exception 'An active prescription can only be archived.' using errcode = '55000';
  end if;
  return new;
end;
$$;

revoke all on function private.assert_workout_plan_record_mutable() from public, anon, authenticated;

create trigger workout_plans_record_immutable
before update on public.workout_plans
for each row execute function private.assert_workout_plan_record_mutable();

create or replace function private.assert_template_child_mutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_status public.template_status;
begin
  if tg_table_name = 'workout_template_days' then
    select wt.status into v_status
    from public.workout_templates wt
    where wt.organization_id = (v_row ->> 'organization_id')::uuid
      and wt.id = (v_row ->> 'template_id')::uuid;
  else
    select wt.status into v_status
    from public.workout_template_days wd
    join public.workout_templates wt
      on wt.organization_id = wd.organization_id and wt.id = wd.template_id
    where wd.organization_id = (v_row ->> 'organization_id')::uuid
      and wd.id = (v_row ->> 'template_day_id')::uuid;
  end if;

  if v_status is distinct from 'draft'::public.template_status then
    raise exception 'A published or archived template is immutable; create a new version.'
      using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.assert_template_child_mutable() from public, anon, authenticated;

create trigger workout_template_days_require_draft
before insert or update or delete on public.workout_template_days
for each row execute function private.assert_template_child_mutable();

create trigger workout_template_exercises_require_draft
before insert or update or delete on public.workout_template_exercises
for each row execute function private.assert_template_child_mutable();

create or replace function private.assert_template_record_mutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('published', 'archived')
     and (
       to_jsonb(new) - array['status', 'updated_at']::text[]
       is distinct from
       to_jsonb(old) - array['status', 'updated_at']::text[]
     ) then
    raise exception 'A published or archived template is immutable; create a new version.'
      using errcode = '55000';
  end if;
  if old.status = 'archived' and new.status <> 'archived' then
    raise exception 'An archived template cannot be restored.' using errcode = '55000';
  end if;
  if old.status = 'published' and new.status not in ('published', 'archived') then
    raise exception 'A published template can only be archived.' using errcode = '55000';
  end if;
  return new;
end;
$$;

revoke all on function private.assert_template_record_mutable() from public, anon, authenticated;

create trigger workout_templates_record_immutable
before update on public.workout_templates
for each row execute function private.assert_template_record_mutable();

create or replace function private.guard_booking_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity integer;
  v_reserved integer;
  v_old_consumed boolean := tg_op = 'UPDATE' and old.status in ('confirmed', 'checked_in', 'attended', 'no_show');
  v_new_consumes boolean := new.status in ('confirmed', 'checked_in', 'attended', 'no_show');
begin
  if not v_new_consumes or v_old_consumed then
    return new;
  end if;

  select c.capacity into v_capacity
  from public.classes c
  where c.organization_id = new.organization_id and c.id = new.class_id
  for update;

  if not found then
    raise exception 'Class not found.' using errcode = '23503';
  end if;

  select count(*)::integer into v_reserved
  from public.class_bookings b
  where b.organization_id = new.organization_id
    and b.class_id = new.class_id
    and b.status in ('confirmed', 'checked_in', 'attended', 'no_show')
    and b.id <> new.id;

  if v_reserved >= v_capacity then
    raise exception 'Class capacity has been reached.'
      using errcode = '23514', hint = 'Place the student on the waitlist instead.';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_booking_capacity() from public, anon, authenticated;

create trigger class_bookings_capacity_guard
before insert or update of status, class_id, organization_id
on public.class_bookings
for each row execute function private.guard_booking_capacity();

create or replace function private.guard_class_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reserved integer;
begin
  if new.capacity >= old.capacity then
    return new;
  end if;

  select count(*)::integer into v_reserved
  from public.class_bookings b
  where b.organization_id = old.organization_id
    and b.class_id = old.id
    and b.status in ('confirmed', 'checked_in', 'attended', 'no_show');

  if new.capacity < v_reserved then
    raise exception 'Capacity cannot be lower than the current confirmed booking count.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_class_capacity() from public, anon, authenticated;

create trigger classes_capacity_guard
before update of capacity on public.classes
for each row execute function private.guard_class_capacity();

create or replace function private.record_booking_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.class_booking_events (
      organization_id, booking_id, from_status, to_status, actor_user_id
    ) values (
      new.organization_id,
      new.id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

revoke all on function private.record_booking_transition() from public, anon, authenticated;

create trigger class_bookings_record_transition
after insert or update of status on public.class_bookings
for each row execute function private.record_booking_transition();

create or replace function private.jsonb_pick(p_document jsonb, p_keys text[])
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(item.key, item.value), '{}'::jsonb)
  from jsonb_each(coalesce(p_document, '{}'::jsonb)) item
  where item.key = any (p_keys);
$$;

create or replace function private.audit_allowed_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_source jsonb := case when tg_op = 'DELETE' then v_old else v_new end;
  v_keys text[] := string_to_array(tg_argv[0], ',');
  v_before jsonb := private.jsonb_pick(v_old, v_keys);
  v_after jsonb := private.jsonb_pick(v_new, v_keys);
  v_org uuid := coalesce(
    (v_source ->> 'organization_id')::uuid,
    case when tg_table_name = 'organizations' then (v_source ->> 'id')::uuid end
  );
  v_entity_id text := coalesce(
    v_source ->> 'id',
    v_source ->> 'member_id',
    v_source ->> 'feature_key',
    'unknown'
  );
begin
  if v_org is null or (tg_op = 'UPDATE' and v_before = v_after) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, changes
  ) values (
    v_org,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    v_entity_id,
    jsonb_build_object('before', v_before, 'after', v_after)
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.jsonb_pick(jsonb, text[]) from public, anon, authenticated;
revoke all on function private.audit_allowed_fields() from public, anon, authenticated;

create trigger organizations_audit
after insert or update or delete on public.organizations
for each row execute function private.audit_allowed_fields('display_name,status,trial_ends_at,suspended_at,deleted_at');

create trigger units_audit
after insert or update or delete on public.units
for each row execute function private.audit_allowed_fields('name,timezone,is_active,deleted_at');

create trigger organization_members_audit
after insert or update or delete on public.organization_members
for each row execute function private.audit_allowed_fields('status,joined_at,left_at');

create trigger organization_member_roles_audit
after insert or update or delete on public.organization_member_roles
for each row execute function private.audit_allowed_fields('role_key');

create trigger professional_students_audit
after insert or update or delete on public.professional_students
for each row execute function private.audit_allowed_fields('professional_id,student_id,status,starts_on,ends_on');

create trigger classes_audit
after insert or update or delete on public.classes
for each row execute function private.audit_allowed_fields('title,starts_at,ends_at,capacity,status,cancelled_at');

create trigger subscriptions_audit
after insert or update or delete on public.subscriptions
for each row execute function private.audit_allowed_fields('plan_id,status,billing_cycle,current_period_start,current_period_end,cancel_at_period_end');

create trigger workout_plans_audit
after insert or update or delete on public.workout_plans
for each row execute function private.audit_allowed_fields('lineage_id,version,status,starts_on,ends_on,activated_at,archived_at');

create trigger organization_feature_flags_audit
after insert or update or delete on public.organization_feature_flags
for each row execute function private.audit_allowed_fields('feature_key,enabled');

create or replace function private.protect_created_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
    end if;
  else
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

revoke all on function private.protect_created_by() from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'professional_students', 'exercises', 'workout_templates',
    'workout_plans', 'goals', 'classes'
  ]
  loop
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function private.protect_created_by()',
      v_table || '_protect_created_by',
      v_table
    );
  end loop;
end;
$$;

create or replace function private.protect_recorded_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.recorded_by := auth.uid();
    end if;
  else
    new.recorded_by := old.recorded_by;
  end if;
  return new;
end;
$$;

revoke all on function private.protect_recorded_by() from public, anon, authenticated;

create trigger body_measurements_protect_recorded_by
before insert or update on public.body_measurements
for each row execute function private.protect_recorded_by();

create trigger attendance_protect_recorded_by
before insert or update on public.attendance
for each row execute function private.protect_recorded_by();

create or replace function private.set_updated_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

revoke all on function private.set_updated_by() from public, anon, authenticated;

create trigger student_health_profiles_set_updated_by
before insert or update on public.student_health_profiles
for each row execute function private.set_updated_by();

create trigger organization_feature_flags_set_updated_by
before insert or update on public.organization_feature_flags
for each row execute function private.set_updated_by();

create trigger organization_feature_flags_touch_updated_at
before update on public.organization_feature_flags
for each row execute function private.touch_updated_at();

create or replace function private.protect_immutable_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_column text;
begin
  foreach v_column in array tg_argv
  loop
    if (to_jsonb(new) -> v_column) is distinct from (to_jsonb(old) -> v_column) then
      raise exception 'Column % is immutable after insert.', v_column using errcode = '55000';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function private.protect_immutable_columns() from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'subscriptions', 'organization_members', 'organization_member_roles',
    'units', 'students', 'professionals', 'professional_students',
    'consent_records', 'student_health_profiles', 'exercises', 'exercise_media',
    'workout_templates', 'workout_template_days', 'workout_template_exercises',
    'workout_plans', 'workout_days', 'workout_exercises', 'workout_sessions',
    'workout_session_exercises', 'exercise_sets', 'workout_mutation_receipts',
    'body_measurements', 'progress_photos', 'goals', 'personal_records',
    'class_types', 'classes', 'class_bookings', 'class_booking_events',
    'attendance', 'notifications', 'messages', 'achievements',
    'user_achievements', 'challenges', 'organization_feature_flags', 'audit_logs'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.protect_immutable_columns(''organization_id'')',
      v_table || '_protect_organization_id',
      v_table
    );
  end loop;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'subscriptions', 'organization_members', 'units', 'students', 'professionals',
    'professional_students', 'consent_records', 'exercises', 'exercise_media',
    'workout_templates', 'workout_template_days', 'workout_template_exercises',
    'workout_plans', 'workout_days', 'workout_exercises', 'workout_sessions',
    'workout_session_exercises', 'exercise_sets', 'body_measurements',
    'progress_photos', 'goals', 'personal_records', 'class_types', 'classes',
    'class_bookings', 'attendance', 'notifications', 'messages', 'achievements',
    'user_achievements', 'challenges'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.protect_immutable_columns(''id'')',
      v_table || '_protect_id',
      v_table
    );
  end loop;
end;
$$;

create trigger students_protect_identity
before update on public.students
for each row execute function private.protect_immutable_columns('member_id');

create trigger professionals_protect_identity
before update on public.professionals
for each row execute function private.protect_immutable_columns('member_id');

create trigger professional_students_protect_identity
before update on public.professional_students
for each row execute function private.protect_immutable_columns('professional_id', 'student_id');

create trigger consents_protect_subject
before update on public.consent_records
for each row execute function private.protect_immutable_columns(
  'student_id', 'subject_user_id', 'grantee_professional_id', 'consent_type', 'document_version', 'granted_at'
);

create trigger health_profiles_protect_subject
before update on public.student_health_profiles
for each row execute function private.protect_immutable_columns('student_id');

create trigger measurements_protect_subject
before update on public.body_measurements
for each row execute function private.protect_immutable_columns('student_id');

create trigger progress_photos_protect_subject
before update on public.progress_photos
for each row execute function private.protect_immutable_columns('student_id', 'storage_path');

create trigger goals_protect_subject
before update on public.goals
for each row execute function private.protect_immutable_columns('student_id');

create trigger workout_templates_protect_identity
before update on public.workout_templates
for each row execute function private.protect_immutable_columns('lineage_id', 'version');

create trigger workout_template_days_protect_identity
before update on public.workout_template_days
for each row execute function private.protect_immutable_columns('template_id');

create trigger workout_template_exercises_protect_identity
before update on public.workout_template_exercises
for each row execute function private.protect_immutable_columns('template_day_id');

create trigger workout_plans_protect_identity
before update on public.workout_plans
for each row execute function private.protect_immutable_columns('lineage_id', 'version', 'student_id');

create trigger workout_days_protect_identity
before update on public.workout_days
for each row execute function private.protect_immutable_columns('workout_plan_id');

create trigger workout_exercises_protect_identity
before update on public.workout_exercises
for each row execute function private.protect_immutable_columns('workout_day_id');

create trigger workout_sessions_protect_identity
before update on public.workout_sessions
for each row execute function private.protect_immutable_columns(
  'workout_plan_id', 'workout_day_id', 'student_id', 'client_session_id', 'plan_version', 'prescription_snapshot'
);

create trigger class_bookings_protect_identity
before update on public.class_bookings
for each row execute function private.protect_immutable_columns('class_id', 'student_id');

create trigger attendance_protect_identity
before update on public.attendance
for each row execute function private.protect_immutable_columns('class_id', 'booking_id', 'student_id');

-- ---------------------------------------------------------------------------
-- Public RPCs. These are the only client mutation path for critical workflows.
-- ---------------------------------------------------------------------------

create or replace function public.create_organization(p_display_name text, p_slug text)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizations%rowtype;
  v_member_id uuid;
  v_display_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select nullif(trim(p.display_name), '') into v_display_name
  from public.profiles p where p.user_id = auth.uid();

  insert into public.organizations (display_name, slug)
  values (trim(p_display_name), lower(trim(p_slug)))
  returning * into v_org;

  insert into public.organization_members (
    organization_id, user_id, status, display_name, joined_at
  ) values (
    v_org.id, auth.uid(), 'active', coalesce(v_display_name, trim(p_display_name)), now()
  ) returning id into v_member_id;

  insert into public.organization_member_roles (organization_id, member_id, role_key, granted_by)
  values (v_org.id, v_member_id, 'owner', auth.uid());

  return v_org;
end;
$$;

create or replace function public.activate_workout_plan(p_workout_plan_id uuid)
returns public.workout_plans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.workout_plans%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_plan
  from public.workout_plans wp
  where wp.id = p_workout_plan_id
  for update;

  if not found then
    raise exception 'Workout plan not found.' using errcode = 'P0002';
  end if;
  if not private.can_manage_student(v_plan.organization_id, v_plan.student_id) then
    raise exception 'Not allowed to activate this prescription.' using errcode = '42501';
  end if;
  if v_plan.status <> 'draft' then
    raise exception 'Only draft prescriptions can be activated.' using errcode = '55000';
  end if;
  if not exists (
    select 1
    from public.workout_days wd
    join public.workout_exercises we
      on we.organization_id = wd.organization_id and we.workout_day_id = wd.id
    where wd.organization_id = v_plan.organization_id
      and wd.workout_plan_id = v_plan.id
  ) then
    raise exception 'A prescription must contain at least one exercise.' using errcode = '23514';
  end if;

  update public.workout_plans wp
  set status = 'archived', archived_at = now()
  where wp.organization_id = v_plan.organization_id
    and wp.student_id = v_plan.student_id
    and wp.lineage_id = v_plan.lineage_id
    and wp.status = 'active';

  update public.workout_plans wp
  set status = 'active', activated_at = now(), archived_at = null
  where wp.organization_id = v_plan.organization_id and wp.id = v_plan.id
  returning * into v_plan;

  return v_plan;
end;
$$;

create or replace function public.publish_workout_template(p_workout_template_id uuid)
returns public.workout_templates
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.workout_templates%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_template
  from public.workout_templates wt
  where wt.id = p_workout_template_id
  for update;

  if not found then
    raise exception 'Workout template not found.' using errcode = 'P0002';
  end if;
  if not private.has_permission(v_template.organization_id, 'workouts.manage') then
    raise exception 'Not allowed to publish this template.' using errcode = '42501';
  end if;
  if v_template.status <> 'draft' then
    return v_template;
  end if;
  if not exists (
    select 1
    from public.workout_template_days wd
    join public.workout_template_exercises we
      on we.organization_id = wd.organization_id and we.template_day_id = wd.id
    where wd.organization_id = v_template.organization_id
      and wd.template_id = v_template.id
  ) then
    raise exception 'A template must contain at least one exercise.' using errcode = '23514';
  end if;

  update public.workout_templates wt
  set status = 'published', published_at = now()
  where wt.organization_id = v_template.organization_id and wt.id = v_template.id
  returning * into v_template;

  return v_template;
end;
$$;

create or replace function public.book_class(p_class_id uuid)
returns public.class_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class public.classes%rowtype;
  v_booking public.class_bookings%rowtype;
  v_student_id uuid;
  v_reserved integer;
  v_next_status public.booking_status;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_class
  from public.classes c
  where c.id = p_class_id
  for update;

  if not found then
    raise exception 'Class not found.' using errcode = 'P0002';
  end if;
  if not private.can_use_org(v_class.organization_id) then
    raise exception 'Not a member of this organization.' using errcode = '42501';
  end if;
  if v_class.status <> 'published' then
    raise exception 'Class is not open for booking.' using errcode = '55000';
  end if;
  if v_class.booking_opens_at is not null and now() < v_class.booking_opens_at then
    raise exception 'Booking has not opened yet.' using errcode = '55000';
  end if;
  if now() >= coalesce(v_class.booking_closes_at, v_class.starts_at) then
    raise exception 'Booking is closed.' using errcode = '55000';
  end if;

  v_student_id := private.current_student_id(v_class.organization_id);
  if v_student_id is null then
    raise exception 'An active student profile is required.' using errcode = '42501';
  end if;

  select * into v_booking
  from public.class_bookings b
  where b.organization_id = v_class.organization_id
    and b.class_id = v_class.id
    and b.student_id = v_student_id
  for update;

  if found and v_booking.status in ('confirmed', 'waitlisted', 'checked_in', 'attended') then
    return v_booking;
  end if;
  if found and v_booking.status = 'no_show' then
    raise exception 'This completed booking cannot be reopened.' using errcode = '55000';
  end if;

  select count(*)::integer into v_reserved
  from public.class_bookings b
  where b.organization_id = v_class.organization_id
    and b.class_id = v_class.id
    and b.status in ('confirmed', 'checked_in', 'attended', 'no_show');

  v_next_status := case when v_reserved < v_class.capacity then 'confirmed' else 'waitlisted' end;

  if v_booking.id is null then
    insert into public.class_bookings (
      organization_id, class_id, student_id, status, booked_at, waitlisted_at
    ) values (
      v_class.organization_id,
      v_class.id,
      v_student_id,
      v_next_status,
      case when v_next_status = 'confirmed' then now() end,
      case when v_next_status = 'waitlisted' then now() end
    ) returning * into v_booking;
  else
    update public.class_bookings b
    set status = v_next_status,
        booked_at = case when v_next_status = 'confirmed' then now() else b.booked_at end,
        waitlisted_at = case when v_next_status = 'waitlisted' then now() else b.waitlisted_at end,
        cancelled_at = null,
        promoted_at = null,
        checked_in_at = null
    where b.organization_id = v_class.organization_id and b.id = v_booking.id
    returning * into v_booking;
  end if;

  return v_booking;
end;
$$;

create or replace function public.cancel_class_booking(p_booking_id uuid)
returns public.class_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.class_bookings%rowtype;
  v_class public.classes%rowtype;
  v_promoted public.class_bookings%rowtype;
  v_freed_seat boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select c.* into v_class
  from public.class_bookings b
  join public.classes c
    on c.organization_id = b.organization_id and c.id = b.class_id
  where b.id = p_booking_id
  for update of c;

  if not found then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;

  select * into v_booking
  from public.class_bookings b
  where b.organization_id = v_class.organization_id and b.id = p_booking_id
  for update;

  if not private.is_student_self(v_booking.organization_id, v_booking.student_id) then
    raise exception 'Not allowed to cancel this booking.' using errcode = '42501';
  end if;
  if v_booking.status = 'cancelled' then
    return v_booking;
  end if;
  if v_booking.status not in ('confirmed', 'waitlisted') then
    raise exception 'This booking can no longer be cancelled.' using errcode = '55000';
  end if;
  if v_booking.status = 'confirmed'
     and now() > coalesce(v_class.cancellation_deadline_at, v_class.starts_at) then
    raise exception 'The cancellation deadline has passed.' using errcode = '55000';
  end if;

  v_freed_seat := v_booking.status = 'confirmed';

  update public.class_bookings b
  set status = 'cancelled', cancelled_at = now()
  where b.organization_id = v_booking.organization_id and b.id = v_booking.id
  returning * into v_booking;

  -- Only a confirmed cancellation frees a seat. The class row lock serializes
  -- booking, cancellation and promotion for this class.
  if v_freed_seat then
    select * into v_promoted
    from public.class_bookings b
    where b.organization_id = v_class.organization_id
      and b.class_id = v_class.id
      and b.status = 'waitlisted'
    order by b.waitlisted_at, b.id
    for update skip locked
    limit 1;

    if found then
      update public.class_bookings b
      set status = 'confirmed', booked_at = now(), promoted_at = now()
      where b.organization_id = v_promoted.organization_id and b.id = v_promoted.id
      returning * into v_promoted;

      insert into private.outbox_events (organization_id, topic, idempotency_key, payload)
      values (
        v_promoted.organization_id,
        'class_booking.promoted',
        'class_booking.promoted:' || v_promoted.id::text || ':' || v_promoted.promoted_at::text,
        jsonb_build_object('booking_id', v_promoted.id, 'class_id', v_promoted.class_id)
      );
    end if;
  end if;

  return v_booking;
end;
$$;

create or replace function public.get_my_class_booking(p_class_id uuid)
returns table (
  booking_id uuid,
  booking_state public.booking_status,
  waitlist_position bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    b.status,
    case when b.status = 'waitlisted' then (
      select count(*) + 1
      from public.class_bookings ahead
      where ahead.organization_id = b.organization_id
        and ahead.class_id = b.class_id
        and ahead.status = 'waitlisted'
        and (ahead.waitlisted_at, ahead.id) < (b.waitlisted_at, b.id)
    ) end
  from public.class_bookings b
  join public.classes c
    on c.organization_id = b.organization_id and c.id = b.class_id
  where b.class_id = p_class_id
    and b.student_id = private.current_student_id(c.organization_id);
$$;

create or replace function public.check_in_class(p_booking_id uuid)
returns public.attendance
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.class_bookings%rowtype;
  v_class public.classes%rowtype;
  v_attendance public.attendance%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select c.* into v_class
  from public.class_bookings b
  join public.classes c
    on c.organization_id = b.organization_id and c.id = b.class_id
  where b.id = p_booking_id
  for update of c;

  if not found then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;

  select * into v_booking
  from public.class_bookings b
  where b.organization_id = v_class.organization_id and b.id = p_booking_id
  for update;

  if not private.is_student_self(v_booking.organization_id, v_booking.student_id) then
    raise exception 'Not allowed to check in this booking.' using errcode = '42501';
  end if;
  if v_booking.status = 'checked_in' then
    select * into v_attendance
    from public.attendance a
    where a.organization_id = v_booking.organization_id and a.booking_id = v_booking.id;
    return v_attendance;
  end if;
  if v_booking.status <> 'confirmed' then
    raise exception 'Only confirmed bookings can check in.' using errcode = '55000';
  end if;
  if now() < v_class.starts_at - interval '2 hours' or now() > v_class.ends_at then
    raise exception 'Check-in is outside the allowed time window.' using errcode = '55000';
  end if;

  update public.class_bookings b
  set status = 'checked_in', checked_in_at = now()
  where b.organization_id = v_booking.organization_id and b.id = v_booking.id;

  insert into public.attendance (
    organization_id, class_id, booking_id, student_id,
    status, checked_in_at, recorded_by
  ) values (
    v_booking.organization_id,
    v_booking.class_id,
    v_booking.id,
    v_booking.student_id,
    'present',
    now(),
    auth.uid()
  )
  on conflict (organization_id, booking_id)
  do update set status = 'present', checked_in_at = excluded.checked_in_at
  returning * into v_attendance;

  return v_attendance;
end;
$$;

create or replace function public.start_workout(
  p_workout_day_id uuid,
  p_client_session_id uuid
)
returns public.workout_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_context record;
  v_session public.workout_sessions%rowtype;
  v_open_session_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_client_session_id is null then
    raise exception 'A client session id is required for idempotency.' using errcode = '22004';
  end if;

  select
    wd.organization_id,
    wd.id as workout_day_id,
    wd.name as workout_day_name,
    wp.id as workout_plan_id,
    wp.name as workout_plan_name,
    wp.student_id,
    wp.version,
    wp.starts_on,
    wp.ends_on,
    wp.status
  into v_context
  from public.workout_days wd
  join public.workout_plans wp
    on wp.organization_id = wd.organization_id and wp.id = wd.workout_plan_id
  where wd.id = p_workout_day_id;

  if not found then
    raise exception 'Workout day not found.' using errcode = 'P0002';
  end if;
  if not private.is_student_self(v_context.organization_id, v_context.student_id) then
    raise exception 'This prescription is not assigned to the current student.' using errcode = '42501';
  end if;
  if v_context.status <> 'active'
     or (v_context.starts_on is not null and current_date < v_context.starts_on)
     or (v_context.ends_on is not null and current_date > v_context.ends_on) then
    raise exception 'This prescription is not active today.' using errcode = '55000';
  end if;

  select * into v_session
  from public.workout_sessions ws
  where ws.organization_id = v_context.organization_id
    and ws.student_id = v_context.student_id
    and ws.client_session_id = p_client_session_id;

  if found then
    return v_session;
  end if;

  select ws.id into v_open_session_id
  from public.workout_sessions ws
  where ws.organization_id = v_context.organization_id
    and ws.student_id = v_context.student_id
    and ws.status in ('in_progress', 'paused')
  limit 1;

  if found then
    raise exception 'The student already has an open workout session.'
      using errcode = '55000', detail = v_open_session_id::text;
  end if;

  if not exists (
    select 1 from public.workout_exercises we
    where we.organization_id = v_context.organization_id
      and we.workout_day_id = v_context.workout_day_id
  ) then
    raise exception 'This workout day has no exercises.' using errcode = '23514';
  end if;

  insert into public.workout_sessions (
    organization_id, workout_plan_id, workout_day_id, student_id,
    client_session_id, status, plan_version, prescription_snapshot
  ) values (
    v_context.organization_id,
    v_context.workout_plan_id,
    v_context.workout_day_id,
    v_context.student_id,
    p_client_session_id,
    'in_progress',
    v_context.version,
    jsonb_build_object(
      'plan_id', v_context.workout_plan_id,
      'plan_name', v_context.workout_plan_name,
      'day_id', v_context.workout_day_id,
      'day_name', v_context.workout_day_name,
      'version', v_context.version
    )
  ) returning * into v_session;

  insert into public.workout_session_exercises (
    organization_id, workout_session_id, prescribed_workout_exercise_id,
    exercise_id, exercise_name, sort_order, prescription
  )
  select
    we.organization_id,
    v_session.id,
    we.id,
    we.exercise_id,
    e.name,
    we.sort_order,
    jsonb_strip_nulls(jsonb_build_object(
      'planned_sets', we.planned_sets,
      'reps_min', we.reps_min,
      'reps_max', we.reps_max,
      'target_load', we.target_load,
      'load_unit', we.load_unit,
      'rest_seconds', we.rest_seconds,
      'tempo', we.tempo,
      'target_rpe', we.target_rpe,
      'target_rir', we.target_rir,
      'technique', we.technique,
      'block_key', we.block_key,
      'notes', we.notes,
      'allow_substitution', we.allow_substitution
    ))
  from public.workout_exercises we
  join public.exercises e on e.id = we.exercise_id
  where we.organization_id = v_context.organization_id
    and we.workout_day_id = v_context.workout_day_id
  order by we.sort_order;

  insert into public.exercise_sets (
    organization_id, workout_session_id, session_exercise_id, set_number,
    target_reps_min, target_reps_max, target_load, load_unit
  )
  select
    se.organization_id,
    se.workout_session_id,
    se.id,
    series.set_number::smallint,
    (se.prescription ->> 'reps_min')::smallint,
    (se.prescription ->> 'reps_max')::smallint,
    (se.prescription ->> 'target_load')::numeric,
    coalesce(se.prescription ->> 'load_unit', 'kg')
  from public.workout_session_exercises se
  cross join lateral generate_series(
    1,
    greatest(1, coalesce((se.prescription ->> 'planned_sets')::integer, 1))
  ) as series(set_number)
  where se.organization_id = v_session.organization_id
    and se.workout_session_id = v_session.id;

  return v_session;
end;
$$;

create or replace function public.save_exercise_set(
  p_session_id uuid,
  p_session_exercise_id uuid,
  p_set_number smallint,
  p_client_mutation_id uuid,
  p_actual_reps smallint default null,
  p_actual_load numeric default null,
  p_load_unit text default 'kg',
  p_duration_seconds integer default null,
  p_rpe numeric default null,
  p_rir smallint default null,
  p_is_completed boolean default true,
  p_notes text default null
)
returns public.exercise_sets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.workout_sessions%rowtype;
  v_set public.exercise_sets%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_client_mutation_id is null then
    raise exception 'A client mutation id is required for idempotency.' using errcode = '22004';
  end if;

  select * into v_session
  from public.workout_sessions ws
  where ws.id = p_session_id
  for update;

  if not found then
    raise exception 'Workout session not found.' using errcode = 'P0002';
  end if;
  if not private.is_student_self(v_session.organization_id, v_session.student_id) then
    raise exception 'Not allowed to update this workout session.' using errcode = '42501';
  end if;

  select es.* into v_set
  from public.workout_mutation_receipts mr
  join public.exercise_sets es
    on es.organization_id = mr.organization_id and es.id = mr.result_id
  where mr.organization_id = v_session.organization_id
    and mr.user_id = auth.uid()
    and mr.client_mutation_id = p_client_mutation_id
    and mr.result_table = 'exercise_sets';

  if found then
    return v_set;
  end if;
  if v_session.status not in ('in_progress', 'paused') then
    raise exception 'A closed workout session cannot be changed.' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.workout_session_exercises se
    where se.organization_id = v_session.organization_id
      and se.workout_session_id = v_session.id
      and se.id = p_session_exercise_id
  ) then
    raise exception 'Session exercise not found.' using errcode = '23503';
  end if;

  insert into public.exercise_sets (
    organization_id, workout_session_id, session_exercise_id, set_number,
    actual_reps, actual_load, load_unit, duration_seconds, rpe, rir,
    is_completed, completed_at, notes, last_client_mutation_id
  ) values (
    v_session.organization_id, v_session.id, p_session_exercise_id, p_set_number,
    p_actual_reps, p_actual_load, p_load_unit, p_duration_seconds, p_rpe, p_rir,
    p_is_completed, case when p_is_completed then now() end, p_notes, p_client_mutation_id
  )
  on conflict (organization_id, workout_session_id, session_exercise_id, set_number)
  do update set
    actual_reps = excluded.actual_reps,
    actual_load = excluded.actual_load,
    load_unit = excluded.load_unit,
    duration_seconds = excluded.duration_seconds,
    rpe = excluded.rpe,
    rir = excluded.rir,
    is_completed = excluded.is_completed,
    completed_at = case when excluded.is_completed then now() else null end,
    notes = excluded.notes,
    last_client_mutation_id = excluded.last_client_mutation_id
  returning * into v_set;

  insert into public.workout_mutation_receipts (
    organization_id, user_id, client_mutation_id, workout_session_id,
    result_table, result_id
  ) values (
    v_session.organization_id, auth.uid(), p_client_mutation_id,
    v_session.id, 'exercise_sets', v_set.id
  );

  update public.workout_sessions ws
  set last_saved_at = now()
  where ws.organization_id = v_session.organization_id and ws.id = v_session.id;

  return v_set;
end;
$$;

create or replace function public.set_workout_session_state(
  p_session_id uuid,
  p_state public.workout_session_status
)
returns public.workout_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.workout_sessions%rowtype;
begin
  select * into v_session
  from public.workout_sessions ws
  where ws.id = p_session_id
  for update;

  if not found then
    raise exception 'Workout session not found.' using errcode = 'P0002';
  end if;
  if not private.is_student_self(v_session.organization_id, v_session.student_id) then
    raise exception 'Not allowed to update this workout session.' using errcode = '42501';
  end if;
  if p_state not in ('in_progress', 'paused', 'abandoned') then
    raise exception 'Use finish_workout to complete a session.' using errcode = '22023';
  end if;
  if v_session.status in ('completed', 'abandoned') then
    return v_session;
  end if;

  update public.workout_sessions ws
  set status = p_state,
      paused_at = case when p_state = 'paused' then now() else null end,
      abandoned_at = case when p_state = 'abandoned' then now() else null end,
      last_saved_at = now()
  where ws.organization_id = v_session.organization_id and ws.id = v_session.id
  returning * into v_session;

  return v_session;
end;
$$;

create or replace function public.finish_workout(
  p_session_id uuid,
  p_client_mutation_id uuid,
  p_elapsed_seconds integer default null,
  p_perceived_effort numeric default null,
  p_feedback text default null
)
returns public.workout_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.workout_sessions%rowtype;
  v_completed_sets integer;
  v_total_volume numeric(14,3);
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_client_mutation_id is null then
    raise exception 'A client mutation id is required for idempotency.' using errcode = '22004';
  end if;

  select * into v_session
  from public.workout_sessions ws
  where ws.id = p_session_id
  for update;

  if not found then
    raise exception 'Workout session not found.' using errcode = 'P0002';
  end if;
  if not private.is_student_self(v_session.organization_id, v_session.student_id) then
    raise exception 'Not allowed to finish this workout session.' using errcode = '42501';
  end if;
  if v_session.status = 'completed' then
    return v_session;
  end if;
  if v_session.status = 'abandoned' then
    raise exception 'An abandoned workout session cannot be completed.' using errcode = '55000';
  end if;

  select
    count(*) filter (where es.is_completed)::integer,
    coalesce(sum(
      case when es.is_completed
        then coalesce(es.actual_load, 0) * coalesce(es.actual_reps, 0)
        else 0
      end
    ), 0)::numeric(14,3)
  into v_completed_sets, v_total_volume
  from public.exercise_sets es
  where es.organization_id = v_session.organization_id
    and es.workout_session_id = v_session.id;

  if v_completed_sets = 0 then
    raise exception 'Complete at least one set before finishing the workout.' using errcode = '23514';
  end if;

  update public.workout_sessions ws
  set status = 'completed',
      completed_at = now(),
      paused_at = null,
      elapsed_seconds = coalesce(p_elapsed_seconds, greatest(0, extract(epoch from now() - ws.started_at)::integer)),
      completed_sets = v_completed_sets,
      total_volume = v_total_volume,
      perceived_effort = p_perceived_effort,
      feedback = p_feedback,
      last_saved_at = now()
  where ws.organization_id = v_session.organization_id and ws.id = v_session.id
  returning * into v_session;

  insert into public.workout_mutation_receipts (
    organization_id, user_id, client_mutation_id, workout_session_id,
    result_table, result_id
  ) values (
    v_session.organization_id, auth.uid(), p_client_mutation_id,
    v_session.id, 'workout_sessions', v_session.id
  ) on conflict do nothing;

  insert into private.outbox_events (organization_id, topic, idempotency_key, payload)
  values (
    v_session.organization_id,
    'workout.completed',
    'workout.completed:' || v_session.id::text,
    jsonb_build_object('workout_session_id', v_session.id, 'student_id', v_session.student_id)
  ) on conflict (idempotency_key) do nothing;

  return v_session;
end;
$$;

revoke all on function public.create_organization(text, text) from public, anon;
revoke all on function public.activate_workout_plan(uuid) from public, anon;
revoke all on function public.publish_workout_template(uuid) from public, anon;
revoke all on function public.book_class(uuid) from public, anon;
revoke all on function public.cancel_class_booking(uuid) from public, anon;
revoke all on function public.get_my_class_booking(uuid) from public, anon;
revoke all on function public.check_in_class(uuid) from public, anon;
revoke all on function public.start_workout(uuid, uuid) from public, anon;
revoke all on function public.save_exercise_set(uuid, uuid, smallint, uuid, smallint, numeric, text, integer, numeric, smallint, boolean, text) from public, anon;
revoke all on function public.set_workout_session_state(uuid, public.workout_session_status) from public, anon;
revoke all on function public.finish_workout(uuid, uuid, integer, numeric, text) from public, anon;

grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.activate_workout_plan(uuid) to authenticated;
grant execute on function public.publish_workout_template(uuid) to authenticated;
grant execute on function public.book_class(uuid) to authenticated;
grant execute on function public.cancel_class_booking(uuid) to authenticated;
grant execute on function public.get_my_class_booking(uuid) to authenticated;
grant execute on function public.check_in_class(uuid) to authenticated;
grant execute on function public.start_workout(uuid, uuid) to authenticated;
grant execute on function public.save_exercise_set(uuid, uuid, smallint, uuid, smallint, numeric, text, integer, numeric, smallint, boolean, text) to authenticated;
grant execute on function public.set_workout_session_state(uuid, public.workout_session_status) to authenticated;
grant execute on function public.finish_workout(uuid, uuid, integer, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'profiles', 'organizations', 'roles', 'permissions', 'role_permissions',
    'organization_members', 'organization_member_roles', 'plans', 'subscriptions',
    'units', 'students', 'professionals', 'professional_students', 'consent_records',
    'student_health_profiles', 'exercises', 'exercise_media', 'workout_templates',
    'workout_template_days', 'workout_template_exercises', 'workout_plans',
    'workout_days', 'workout_exercises', 'workout_sessions',
    'workout_session_exercises', 'exercise_sets', 'workout_mutation_receipts',
    'body_measurements', 'progress_photos', 'goals', 'personal_records',
    'class_types', 'classes', 'class_bookings', 'class_booking_events', 'attendance',
    'notifications', 'messages', 'achievements', 'user_achievements', 'challenges',
    'feature_flags', 'organization_feature_flags', 'audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
  end loop;
end;
$$;

create policy profiles_select_own on public.profiles
for select to authenticated using (user_id = auth.uid());
create policy profiles_insert_own on public.profiles
for insert to authenticated with check (user_id = auth.uid());
create policy profiles_update_own on public.profiles
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy organizations_select_member_or_platform on public.organizations
for select to authenticated
using (private.is_org_member(id) or private.is_platform_admin());

create policy roles_read on public.roles
for select to authenticated using (true);
create policy permissions_read on public.permissions
for select to authenticated using (true);
create policy role_permissions_read on public.role_permissions
for select to authenticated using (true);

create policy organization_members_read_same_org on public.organization_members
for select to authenticated using (private.is_org_member(organization_id));
create policy organization_member_roles_read_same_org on public.organization_member_roles
for select to authenticated using (private.is_org_member(organization_id));

create policy public_plans_read on public.plans
for select to anon, authenticated
using (is_public and is_active);
create policy platform_plans_read on public.plans
for select to authenticated
using (private.is_platform_admin());

create policy subscriptions_read_billing on public.subscriptions
for select to authenticated
using (
  private.is_platform_admin()
  or (
    private.is_org_member(organization_id)
    and private.has_role(organization_id, array['owner', 'org_admin'])
  )
);

create policy units_read_member on public.units
for select to authenticated
using (private.can_use_org(organization_id) and deleted_at is null);
create policy units_insert_manager on public.units
for insert to authenticated
with check (private.has_permission(organization_id, 'org.manage'));
create policy units_update_manager on public.units
for update to authenticated
using (private.has_permission(organization_id, 'org.manage'))
with check (private.has_permission(organization_id, 'org.manage'));

create policy students_read_authorized on public.students
for select to authenticated
using (deleted_at is null and private.can_view_student(organization_id, id));
create policy students_insert_manager on public.students
for insert to authenticated
with check (private.has_permission(organization_id, 'students.manage'));
create policy students_update_manager on public.students
for update to authenticated
using (private.has_permission(organization_id, 'students.manage'))
with check (private.has_permission(organization_id, 'students.manage'));

create policy professionals_read_member on public.professionals
for select to authenticated
using (deleted_at is null and private.can_use_org(organization_id));
create policy professionals_insert_manager on public.professionals
for insert to authenticated
with check (private.has_permission(organization_id, 'members.manage'));
create policy professionals_update_manager_or_self on public.professionals
for update to authenticated
using (
  private.has_permission(organization_id, 'members.manage')
  or id = private.current_professional_id(organization_id)
)
with check (
  private.has_permission(organization_id, 'members.manage')
  or id = private.current_professional_id(organization_id)
);

create policy professional_students_read_authorized on public.professional_students
for select to authenticated
using (
  private.is_student_self(organization_id, student_id)
  or professional_id = private.current_professional_id(organization_id)
  or private.has_role(organization_id, array['owner', 'org_admin', 'receptionist'])
);
create policy professional_students_insert_manager on public.professional_students
for insert to authenticated
with check (private.has_permission(organization_id, 'members.manage'));
create policy professional_students_update_manager on public.professional_students
for update to authenticated
using (private.has_permission(organization_id, 'members.manage'))
with check (private.has_permission(organization_id, 'members.manage'));

create policy consents_read_subject_or_grantee on public.consent_records
for select to authenticated
using (
  subject_user_id = auth.uid()
  or grantee_professional_id = private.current_professional_id(organization_id)
);
create policy consents_insert_subject on public.consent_records
for insert to authenticated
with check (
  subject_user_id = auth.uid()
  and private.is_student_self(organization_id, student_id)
);
create policy consents_update_subject on public.consent_records
for update to authenticated
using (subject_user_id = auth.uid() and private.is_student_self(organization_id, student_id))
with check (subject_user_id = auth.uid() and private.is_student_self(organization_id, student_id));

create policy health_profiles_read_authorized on public.student_health_profiles
for select to authenticated
using (private.can_view_health(organization_id, student_id));
create policy health_profiles_insert_authorized on public.student_health_profiles
for insert to authenticated
with check (private.can_view_health(organization_id, student_id));
create policy health_profiles_update_authorized on public.student_health_profiles
for update to authenticated
using (private.can_view_health(organization_id, student_id))
with check (private.can_view_health(organization_id, student_id));

create policy exercises_read_visible on public.exercises
for select to authenticated
using (
  deleted_at is null
  and is_active
  and (organization_id is null or private.can_use_org(organization_id))
);
create policy exercises_insert_coach on public.exercises
for insert to authenticated
with check (
  organization_id is not null
  and private.has_permission(organization_id, 'workouts.manage')
  and created_by = auth.uid()
);
create policy exercises_update_coach on public.exercises
for update to authenticated
using (organization_id is not null and private.has_permission(organization_id, 'workouts.manage'))
with check (organization_id is not null and private.has_permission(organization_id, 'workouts.manage'));

create policy exercise_media_read_visible on public.exercise_media
for select to authenticated
using (private.exercise_visible_to_org(exercise_id, organization_id));
create policy exercise_media_insert_coach on public.exercise_media
for insert to authenticated
with check (organization_id is not null and private.has_permission(organization_id, 'workouts.manage'));
create policy exercise_media_update_coach on public.exercise_media
for update to authenticated
using (organization_id is not null and private.has_permission(organization_id, 'workouts.manage'))
with check (organization_id is not null and private.has_permission(organization_id, 'workouts.manage'));
create policy exercise_media_delete_coach on public.exercise_media
for delete to authenticated
using (organization_id is not null and private.has_permission(organization_id, 'workouts.manage'));

create policy workout_templates_read_coach on public.workout_templates
for select to authenticated
using (deleted_at is null and private.has_permission(organization_id, 'workouts.manage'));
create policy workout_templates_insert_coach on public.workout_templates
for insert to authenticated
with check (
  private.has_permission(organization_id, 'workouts.manage')
  and created_by = auth.uid()
  and status = 'draft'
);
create policy workout_templates_update_coach on public.workout_templates
for update to authenticated
using (private.has_permission(organization_id, 'workouts.manage'))
with check (private.has_permission(organization_id, 'workouts.manage'));
create policy workout_templates_delete_draft on public.workout_templates
for delete to authenticated
using (status = 'draft' and private.has_permission(organization_id, 'workouts.manage'));

create policy workout_template_days_read_coach on public.workout_template_days
for select to authenticated
using (private.has_permission(organization_id, 'workouts.manage'));
create policy workout_template_days_write_coach on public.workout_template_days
for all to authenticated
using (private.has_permission(organization_id, 'workouts.manage'))
with check (private.has_permission(organization_id, 'workouts.manage'));

create policy workout_template_exercises_read_coach on public.workout_template_exercises
for select to authenticated
using (private.has_permission(organization_id, 'workouts.manage'));
create policy workout_template_exercises_write_coach on public.workout_template_exercises
for all to authenticated
using (private.has_permission(organization_id, 'workouts.manage'))
with check (private.has_permission(organization_id, 'workouts.manage'));

create policy workout_plans_read_authorized on public.workout_plans
for select to authenticated
using (private.can_view_plan(organization_id, id));
create policy workout_plans_insert_coach on public.workout_plans
for insert to authenticated
with check (
  status = 'draft'
  and created_by = auth.uid()
  and private.can_manage_student(organization_id, student_id)
  and (
    professional_id is null
    or professional_id = private.current_professional_id(organization_id)
    or private.has_role(organization_id, array['owner', 'org_admin'])
  )
);
create policy workout_plans_update_coach on public.workout_plans
for update to authenticated
using (private.can_manage_student(organization_id, student_id))
with check (
  private.can_manage_student(organization_id, student_id)
  and (
    professional_id is null
    or professional_id = private.current_professional_id(organization_id)
    or private.has_role(organization_id, array['owner', 'org_admin'])
  )
);
create policy workout_plans_delete_draft on public.workout_plans
for delete to authenticated
using (status = 'draft' and private.can_manage_student(organization_id, student_id));

create policy workout_days_read_authorized on public.workout_days
for select to authenticated
using (private.can_view_plan(organization_id, workout_plan_id));
create policy workout_days_write_coach on public.workout_days
for all to authenticated
using (private.can_manage_plan(organization_id, workout_plan_id))
with check (private.can_manage_plan(organization_id, workout_plan_id));

create policy workout_exercises_read_authorized on public.workout_exercises
for select to authenticated
using (private.can_view_workout_day(organization_id, workout_day_id));
create policy workout_exercises_write_coach on public.workout_exercises
for all to authenticated
using (
  exists (
    select 1 from public.workout_days wd
    where wd.organization_id = workout_exercises.organization_id
      and wd.id = workout_exercises.workout_day_id
      and private.can_manage_plan(wd.organization_id, wd.workout_plan_id)
  )
)
with check (
  exists (
    select 1 from public.workout_days wd
    where wd.organization_id = workout_exercises.organization_id
      and wd.id = workout_exercises.workout_day_id
      and private.can_manage_plan(wd.organization_id, wd.workout_plan_id)
  )
);

create policy workout_sessions_read_authorized on public.workout_sessions
for select to authenticated
using (private.can_view_session(organization_id, id));
create policy workout_session_exercises_read_authorized on public.workout_session_exercises
for select to authenticated
using (private.can_view_session(organization_id, workout_session_id));
create policy exercise_sets_read_authorized on public.exercise_sets
for select to authenticated
using (private.can_view_session(organization_id, workout_session_id));

create policy measurements_read_authorized on public.body_measurements
for select to authenticated
using (deleted_at is null and private.can_view_health(organization_id, student_id));
create policy measurements_insert_authorized on public.body_measurements
for insert to authenticated
with check (
  private.can_view_health(organization_id, student_id)
  and recorded_by = auth.uid()
);
create policy measurements_update_authorized on public.body_measurements
for update to authenticated
using (private.can_view_health(organization_id, student_id))
with check (private.can_view_health(organization_id, student_id));

create policy progress_photos_read_authorized on public.progress_photos
for select to authenticated
using (
  deleted_at is null
  and private.can_view_health(organization_id, student_id, 'progress_photo_share')
);
create policy progress_photos_insert_self on public.progress_photos
for insert to authenticated
with check (private.is_student_self(organization_id, student_id));
create policy progress_photos_update_self on public.progress_photos
for update to authenticated
using (private.is_student_self(organization_id, student_id))
with check (private.is_student_self(organization_id, student_id));

create policy goals_read_authorized on public.goals
for select to authenticated
using (private.can_view_health(organization_id, student_id));
create policy goals_insert_authorized on public.goals
for insert to authenticated
with check (private.can_view_health(organization_id, student_id));
create policy goals_update_authorized on public.goals
for update to authenticated
using (private.can_view_health(organization_id, student_id))
with check (private.can_view_health(organization_id, student_id));

create policy personal_records_read_authorized on public.personal_records
for select to authenticated
using (private.can_view_health(organization_id, student_id));

create policy class_types_read_member on public.class_types
for select to authenticated using (private.can_use_org(organization_id));
create policy class_types_insert_manager on public.class_types
for insert to authenticated with check (private.has_permission(organization_id, 'classes.manage'));
create policy class_types_update_manager on public.class_types
for update to authenticated
using (private.has_permission(organization_id, 'classes.manage'))
with check (private.has_permission(organization_id, 'classes.manage'));

create policy classes_read_member on public.classes
for select to authenticated
using (
  private.can_use_org(organization_id)
  and (status = 'published' or private.has_permission(organization_id, 'classes.manage'))
);
create policy classes_insert_manager on public.classes
for insert to authenticated
with check (
  private.has_permission(organization_id, 'classes.manage')
  and created_by = auth.uid()
);
create policy classes_update_manager on public.classes
for update to authenticated
using (private.has_permission(organization_id, 'classes.manage'))
with check (private.has_permission(organization_id, 'classes.manage'));

create policy class_bookings_read_authorized on public.class_bookings
for select to authenticated
using (private.can_view_booking(organization_id, id));
create policy class_booking_events_read_authorized on public.class_booking_events
for select to authenticated
using (private.can_view_booking(organization_id, booking_id));

create policy attendance_read_authorized on public.attendance
for select to authenticated
using (
  private.is_student_self(organization_id, student_id)
  or private.can_manage_class(organization_id, class_id)
);
create policy attendance_insert_manager on public.attendance
for insert to authenticated
with check (
  private.can_manage_class(organization_id, class_id)
  and recorded_by = auth.uid()
);
create policy attendance_update_manager on public.attendance
for update to authenticated
using (private.can_manage_class(organization_id, class_id))
with check (private.can_manage_class(organization_id, class_id));

create policy notifications_read_own on public.notifications
for select to authenticated using (recipient_user_id = auth.uid());

create policy messages_read_participant on public.messages
for select to authenticated
using (
  private.can_use_org(organization_id)
  and auth.uid() in (sender_user_id, recipient_user_id)
);
create policy messages_insert_sender on public.messages
for insert to authenticated
with check (
  private.can_use_org(organization_id)
  and sender_user_id = auth.uid()
  and exists (
    select 1 from public.organization_members recipient
    where recipient.organization_id = messages.organization_id
      and recipient.user_id = messages.recipient_user_id
      and recipient.status = 'active'
  )
);

create policy achievements_read_visible on public.achievements
for select to authenticated
using (is_active and (organization_id is null or private.can_use_org(organization_id)));
create policy user_achievements_read_own on public.user_achievements
for select to authenticated
using (private.is_student_self(organization_id, student_id));
create policy challenges_read_member on public.challenges
for select to authenticated using (private.can_use_org(organization_id));

create policy feature_flags_read on public.feature_flags
for select to authenticated using (true);
create policy organization_feature_flags_read_member on public.organization_feature_flags
for select to authenticated using (private.is_org_member(organization_id));

create policy audit_logs_read_admin on public.audit_logs
for select to authenticated
using (private.has_permission(organization_id, 'audit.read'));

-- RLS is only half of authorization: grants below intentionally omit direct writes
-- for bookings, sessions, sets, receipts, notifications, achievements and audit.
revoke all on all tables in schema public from anon;
grant select on public.plans to anon;

grant select on all tables in schema public to authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update on public.units to authenticated;
grant insert, update on public.students to authenticated;
grant insert, update on public.professionals to authenticated;
grant insert, update on public.professional_students to authenticated;
grant insert, update on public.consent_records to authenticated;
grant insert, update on public.student_health_profiles to authenticated;
grant insert, update on public.exercises to authenticated;
grant insert, update, delete on public.exercise_media to authenticated;
grant insert, delete on public.workout_templates to authenticated;
grant update (
  name, description, objective, level, estimated_minutes,
  weekly_frequency, supersedes_id, deleted_at
) on public.workout_templates to authenticated;
grant insert, update, delete on public.workout_template_days to authenticated;
grant insert, update, delete on public.workout_template_exercises to authenticated;
grant insert, delete on public.workout_plans to authenticated;
grant update (
  professional_id, template_id, name, description, objective,
  level, starts_on, ends_on, supersedes_id, deleted_at
) on public.workout_plans to authenticated;
grant insert, update, delete on public.workout_days to authenticated;
grant insert, update, delete on public.workout_exercises to authenticated;
grant insert, update on public.body_measurements to authenticated;
grant insert, update on public.progress_photos to authenticated;
grant insert, update on public.goals to authenticated;
grant insert, update on public.class_types to authenticated;
grant insert, update on public.classes to authenticated;
grant insert, update on public.attendance to authenticated;
grant insert on public.messages to authenticated;

revoke all on table private.platform_admins from public, anon, authenticated;
revoke all on table private.platform_audit_logs from public, anon, authenticated;
revoke all on table private.outbox_events from public, anon, authenticated;
grant all on all tables in schema private to service_role;
grant usage, select on all sequences in schema private to service_role;
grant execute on all functions in schema private to service_role;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Compatibility/read model: waitlisting is deliberately represented by the
-- same lifecycle row as a booking, which makes the one-student-per-class
-- invariant enforceable with a single unique constraint.
create view public.waitlists
with (security_invoker = true)
as
select
  b.id,
  b.organization_id,
  b.class_id,
  b.student_id,
  b.waitlisted_at,
  b.created_at,
  b.updated_at
from public.class_bookings b
where b.status = 'waitlisted';

grant select on public.waitlists to authenticated;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notification public.notifications%rowtype;
begin
  update public.notifications n
  set read_at = coalesce(n.read_at, now())
  where n.id = p_notification_id
    and n.recipient_user_id = auth.uid()
  returning * into v_notification;

  if not found then
    raise exception 'Notification not found.' using errcode = 'P0002';
  end if;
  return v_notification;
end;
$$;

create or replace function public.mark_message_read(p_message_id uuid)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message public.messages%rowtype;
begin
  update public.messages m
  set read_at = coalesce(m.read_at, now())
  where m.id = p_message_id
    and m.recipient_user_id = auth.uid()
  returning * into v_message;

  if not found then
    raise exception 'Message not found.' using errcode = 'P0002';
  end if;
  return v_message;
end;
$$;

revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.mark_message_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_message_read(uuid) to authenticated;

-- Private Storage buckets. Applications store only paths in domain tables and
-- request signed URLs; neither bucket is public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'progress-photos', 'progress-photos', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'exercise-media', 'exercise-media', false, 104857600,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.path_uuid(p_path text, p_segment integer)
returns uuid
language plpgsql
immutable
security definer
set search_path = ''
as $$
begin
  return nullif(split_part(p_path, '/', p_segment), '')::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

revoke all on function private.path_uuid(text, integer) from public, anon;
grant execute on function private.path_uuid(text, integer) to authenticated;

create policy progress_photos_storage_read
on storage.objects for select to authenticated
using (
  bucket_id = 'progress-photos'
  and private.can_view_health(
    private.path_uuid(name, 1),
    private.path_uuid(name, 2),
    'progress_photo_share'
  )
);

create policy progress_photos_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'progress-photos'
  and private.is_student_self(
    private.path_uuid(name, 1),
    private.path_uuid(name, 2)
  )
  and owner_id = auth.uid()::text
);

create policy progress_photos_storage_update
on storage.objects for update to authenticated
using (
  bucket_id = 'progress-photos'
  and private.is_student_self(private.path_uuid(name, 1), private.path_uuid(name, 2))
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'progress-photos'
  and private.is_student_self(private.path_uuid(name, 1), private.path_uuid(name, 2))
  and owner_id = auth.uid()::text
);

create policy progress_photos_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'progress-photos'
  and private.is_student_self(private.path_uuid(name, 1), private.path_uuid(name, 2))
  and owner_id = auth.uid()::text
);

create policy exercise_media_storage_read
on storage.objects for select to authenticated
using (
  bucket_id = 'exercise-media'
  and private.can_use_org(private.path_uuid(name, 1))
);

create policy exercise_media_storage_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'exercise-media'
  and private.has_permission(private.path_uuid(name, 1), 'workouts.manage')
  and owner_id = auth.uid()::text
);

create policy exercise_media_storage_update
on storage.objects for update to authenticated
using (
  bucket_id = 'exercise-media'
  and private.has_permission(private.path_uuid(name, 1), 'workouts.manage')
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'exercise-media'
  and private.has_permission(private.path_uuid(name, 1), 'workouts.manage')
  and owner_id = auth.uid()::text
);

create policy exercise_media_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'exercise-media'
  and private.has_permission(private.path_uuid(name, 1), 'workouts.manage')
  and owner_id = auth.uid()::text
);
