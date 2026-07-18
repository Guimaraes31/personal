-- Ativelo local/demo seed.
-- All names and content are fictitious and original. No login, password or token
-- is created here. User-bound demo data should be provisioned through Auth and
-- the normal onboarding RPC so auth.users remains the identity source of truth.

insert into public.plans (
  id, code, name, description, monthly_price_cents, annual_price_cents,
  student_limit, professional_limit, unit_limit, features, is_public, is_active
) values
  (
    '01000000-0000-0000-0000-000000000001',
    'personal',
    'Personal',
    'Para profissionais independentes que acompanham uma carteira enxuta de alunos.',
    4900,
    49000,
    30,
    2,
    1,
    '{"workouts": true, "progress": true, "classes": false}'::jsonb,
    true,
    true
  ),
  (
    '01000000-0000-0000-0000-000000000002',
    'academy_essential',
    'Academia Essencial',
    'Operação de treinos, alunos e agenda para uma unidade.',
    19900,
    199000,
    300,
    15,
    1,
    '{"workouts": true, "progress": true, "classes": true, "branding": true}'::jsonb,
    true,
    true
  ),
  (
    '01000000-0000-0000-0000-000000000003',
    'academy_pro',
    'Academia Profissional',
    'Gestão avançada para academias com múltiplas equipes e maior volume.',
    44900,
    449000,
    1500,
    60,
    5,
    '{"workouts": true, "progress": true, "classes": true, "branding": true, "audit": true, "reports": true}'::jsonb,
    true,
    true
  ),
  (
    '01000000-0000-0000-0000-000000000004',
    'network',
    'Rede de Academias',
    'Estrutura multiunidade com limites e condições personalizados.',
    null,
    null,
    null,
    null,
    null,
    '{"workouts": true, "progress": true, "classes": true, "branding": true, "audit": true, "reports": true, "multi_unit": true}'::jsonb,
    true,
    true
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  monthly_price_cents = excluded.monthly_price_cents,
  annual_price_cents = excluded.annual_price_cents,
  student_limit = excluded.student_limit,
  professional_limit = excluded.professional_limit,
  unit_limit = excluded.unit_limit,
  features = excluded.features,
  is_public = excluded.is_public,
  is_active = excluded.is_active;

insert into public.feature_flags (key, description, default_enabled) values
  ('workout_offline_sync', 'Sincronização idempotente de sessões iniciadas sem conexão.', true),
  ('class_waitlist', 'Lista de espera e promoção automática em aulas.', true),
  ('progress_photos', 'Fotos privadas de evolução física.', true),
  ('gamification', 'Conquistas, pontos e desafios saudáveis.', false),
  ('billing_real_provider', 'Cobrança por provedor real em vez do adaptador simulado.', false)
on conflict (key) do update set
  description = excluded.description,
  default_enabled = excluded.default_enabled;

insert into public.exercises (
  id, organization_id, name, description, instructions, primary_muscle,
  secondary_muscles, equipment, difficulty, movement_type, cautions,
  common_mistakes, tags, is_active
) values
  (
    '02000000-0000-0000-0000-000000000001', null, 'Agachamento livre',
    'Padrão de agachamento com carga livre e amplitude confortável.',
    'Apoie os pés com estabilidade, mantenha o tronco organizado e desça sem perder o alinhamento dos joelhos. Retorne empurrando o chão.',
    'quadríceps', array['glúteos', 'posteriores de coxa', 'core'], 'barra', 'intermediate', 'agachamento',
    'Ajuste amplitude e carga às condições individuais.',
    'Perder a estabilidade dos pés ou acelerar a descida sem controle.',
    array['pernas', 'força', 'composto'], true
  ),
  (
    '02000000-0000-0000-0000-000000000002', null, 'Agachamento com peso corporal',
    'Variação sem carga externa para aprender e praticar o padrão de agachamento.',
    'Posicione os pés de forma confortável, sente o quadril para baixo e mantenha os joelhos acompanhando a direção dos pés.',
    'quadríceps', array['glúteos', 'core'], 'peso corporal', 'beginner', 'agachamento',
    'Interrompa se houver dor e reduza a amplitude quando necessário.',
    'Elevar os calcanhares ou deixar os joelhos colapsarem para dentro.',
    array['pernas', 'iniciante', 'mobilidade'], true
  ),
  (
    '02000000-0000-0000-0000-000000000003', null, 'Supino com halteres',
    'Empurrada horizontal com liberdade de ajuste entre os lados.',
    'Deite com apoio firme, aproxime as escápulas do banco, desça os halteres com controle e empurre sem chocar as cargas.',
    'peitoral', array['tríceps', 'deltoide anterior'], 'halteres', 'intermediate', 'empurrar',
    'Use uma carga que permita controle do ombro durante todo o trajeto.',
    'Abrir excessivamente os cotovelos ou perder o apoio dos pés.',
    array['peito', 'força', 'halteres'], true
  ),
  (
    '02000000-0000-0000-0000-000000000004', null, 'Flexão de braços inclinada',
    'Empurrada com as mãos apoiadas acima do nível dos pés.',
    'Apoie as mãos em uma superfície estável, forme uma linha firme entre cabeça e quadril, aproxime o peito do apoio e empurre.',
    'peitoral', array['tríceps', 'core'], 'banco', 'beginner', 'empurrar',
    'Escolha uma altura que permita repetições sem desconforto nos punhos ou ombros.',
    'Deixar o quadril cair ou encurtar o movimento sem necessidade.',
    array['peito', 'peso corporal', 'iniciante'], true
  ),
  (
    '02000000-0000-0000-0000-000000000005', null, 'Remada sentada no cabo',
    'Puxada horizontal realizada com o tronco estável.',
    'Sente-se com apoio firme, inicie aproximando as escápulas e conduza a alça em direção ao tronco. Retorne devagar.',
    'dorsais', array['bíceps', 'romboides'], 'cabo', 'beginner', 'puxar',
    'Evite compensar com movimentos bruscos da lombar.',
    'Encolher os ombros ou usar balanço para mover a carga.',
    array['costas', 'puxada', 'máquina'], true
  ),
  (
    '02000000-0000-0000-0000-000000000006', null, 'Puxada frontal',
    'Puxada vertical para desenvolvimento dos músculos das costas.',
    'Segure a barra de modo confortável, mantenha o peito organizado e conduza os cotovelos para baixo. Retorne com controle.',
    'dorsais', array['bíceps', 'deltoide posterior'], 'cabo', 'beginner', 'puxar',
    'Não leve a barra atrás da cabeça e ajuste a amplitude aos ombros.',
    'Inclinar demais o tronco ou soltar a carga na volta.',
    array['costas', 'puxada', 'vertical'], true
  ),
  (
    '02000000-0000-0000-0000-000000000007', null, 'Levantamento romeno com halteres',
    'Movimento de dobradiça de quadril com joelhos levemente flexionados.',
    'Mantenha os halteres próximos às pernas, leve o quadril para trás com coluna estável e retorne contraindo os glúteos.',
    'posteriores de coxa', array['glúteos', 'eretores da coluna'], 'halteres', 'intermediate', 'dobradiça',
    'A amplitude termina antes de perder a posição estável do tronco.',
    'Transformar o movimento em agachamento ou afastar a carga do corpo.',
    array['posterior', 'glúteos', 'força'], true
  ),
  (
    '02000000-0000-0000-0000-000000000008', null, 'Elevação pélvica',
    'Extensão de quadril com apoio das costas em superfície estável.',
    'Apoie a parte superior das costas, mantenha os pés firmes e eleve o quadril até alinhar o tronco, sem exagerar a extensão lombar.',
    'glúteos', array['posteriores de coxa', 'core'], 'banco', 'beginner', 'extensão de quadril',
    'Use proteção e posicionamento confortável caso adicione carga.',
    'Empurrar com a ponta dos pés ou terminar o movimento pela lombar.',
    array['glúteos', 'quadril', 'iniciante'], true
  ),
  (
    '02000000-0000-0000-0000-000000000009', null, 'Desenvolvimento sentado com halteres',
    'Empurrada vertical com apoio para o tronco.',
    'Sente-se com os pés apoiados, posicione os halteres ao lado dos ombros e empurre para cima mantendo o movimento controlado.',
    'deltoides', array['tríceps', 'core'], 'halteres', 'intermediate', 'empurrar',
    'Reduza amplitude ou carga se houver desconforto no ombro.',
    'Arquear a lombar ou bater os halteres no alto.',
    array['ombros', 'halteres', 'força'], true
  ),
  (
    '02000000-0000-0000-0000-000000000010', null, 'Prancha frontal',
    'Exercício isométrico para controle do tronco.',
    'Apoie antebraços e pés, organize costelas e quadril e mantenha uma linha firme enquanto respira de forma contínua.',
    'core', array['glúteos', 'ombros'], 'peso corporal', 'beginner', 'isométrico',
    'Prefira séries curtas com boa posição a sustentações longas sem controle.',
    'Prender a respiração ou deixar a região lombar ceder.',
    array['core', 'estabilidade', 'peso corporal'], true
  ),
  (
    '02000000-0000-0000-0000-000000000011', null, 'Avanço alternado',
    'Passada unilateral alternando as pernas.',
    'Dê um passo estável, flexione os joelhos dentro de uma amplitude confortável e retorne empurrando o chão com o pé da frente.',
    'quadríceps', array['glúteos', 'posteriores de coxa'], 'peso corporal', 'intermediate', 'unilateral',
    'Use apoio próximo se o equilíbrio ainda estiver em desenvolvimento.',
    'Dar um passo estreito demais ou perder o alinhamento do joelho.',
    array['pernas', 'unilateral', 'equilíbrio'], true
  ),
  (
    '02000000-0000-0000-0000-000000000012', null, 'Caminhada confortável',
    'Atividade cíclica de baixa complexidade com intensidade ajustável.',
    'Mantenha postura natural e ritmo que permita respirar de modo controlado. Ajuste velocidade e duração ao objetivo do dia.',
    'cardiorrespiratório', array['pernas'], 'esteira', 'beginner', 'cardiorrespiratório',
    'Respeite sinais de tontura, dor ou falta de ar fora do esperado.',
    'Começar rápido demais ou ignorar sinais de desconforto.',
    array['cardio', 'aquecimento', 'iniciante'], true
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  instructions = excluded.instructions,
  primary_muscle = excluded.primary_muscle,
  secondary_muscles = excluded.secondary_muscles,
  equipment = excluded.equipment,
  difficulty = excluded.difficulty,
  movement_type = excluded.movement_type,
  cautions = excluded.cautions,
  common_mistakes = excluded.common_mistakes,
  tags = excluded.tags,
  is_active = excluded.is_active,
  deleted_at = null;

insert into public.achievements (
  id, organization_id, code, name, description, points, criteria, is_active
) values
  (
    '03000000-0000-0000-0000-000000000001', null, 'first_workout',
    'Primeiro passo', 'Concluiu a primeira sessão de treino.', 50,
    '{"event": "workout.completed", "count": 1}'::jsonb, true
  ),
  (
    '03000000-0000-0000-0000-000000000002', null, 'consistent_week',
    'Semana em movimento', 'Cumpriu a meta semanal de treinos definida para o período.', 100,
    '{"metric": "weekly_goal_completed"}'::jsonb, true
  ),
  (
    '03000000-0000-0000-0000-000000000003', null, 'personal_best',
    'Nova marca', 'Registrou uma evolução pessoal em um exercício.', 75,
    '{"event": "personal_record.created", "count": 1}'::jsonb, true
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  points = excluded.points,
  criteria = excluded.criteria,
  is_active = excluded.is_active;

-- Service-readable fictional organization for screenshots and catalog smoke tests.
-- It intentionally has no member or login; create real local demo users through Auth.
insert into public.organizations (
  id, slug, legal_name, display_name, status, branding, settings, trial_ends_at
) values (
  '04000000-0000-0000-0000-000000000001',
  'estudio-horizonte-demo',
  'Estúdio Horizonte Demonstração Ltda.',
  'Estúdio Horizonte',
  'active',
  '{"primary": "#16A394", "accent": "#F3A83B", "logo_path": null}'::jsonb,
  '{"cancellation_policy_hours": 4, "demo": true}'::jsonb,
  now() + interval '30 days'
)
on conflict (id) do update set
  display_name = excluded.display_name,
  status = excluded.status,
  branding = excluded.branding,
  settings = excluded.settings,
  deleted_at = null;

insert into public.subscriptions (
  id, organization_id, plan_id, status, billing_cycle, provider,
  current_period_start, current_period_end, trial_ends_at
) values (
  '05000000-0000-0000-0000-000000000001',
  '04000000-0000-0000-0000-000000000001',
  '01000000-0000-0000-0000-000000000002',
  'trialing',
  'monthly',
  'mock',
  now(),
  now() + interval '30 days',
  now() + interval '30 days'
)
on conflict (id) do update set
  plan_id = excluded.plan_id,
  status = excluded.status,
  current_period_start = excluded.current_period_start,
  current_period_end = excluded.current_period_end,
  trial_ends_at = excluded.trial_ends_at;

insert into public.units (
  id, organization_id, name, timezone, address, is_active
) values (
  '06000000-0000-0000-0000-000000000001',
  '04000000-0000-0000-0000-000000000001',
  'Unidade Aurora',
  'America/Sao_Paulo',
  '{"city": "São Paulo", "state": "SP", "country": "BR", "demo": true}'::jsonb,
  true
)
on conflict (id) do update set
  name = excluded.name,
  timezone = excluded.timezone,
  address = excluded.address,
  is_active = excluded.is_active,
  deleted_at = null;

insert into public.class_types (
  id, organization_id, name, description, color, default_duration_minutes, is_active
) values
  (
    '07000000-0000-0000-0000-000000000001',
    '04000000-0000-0000-0000-000000000001',
    'Mobilidade Ativa',
    'Sessão coletiva para explorar movimentos confortáveis e controle corporal.',
    '#16A394', 45, true
  ),
  (
    '07000000-0000-0000-0000-000000000002',
    '04000000-0000-0000-0000-000000000001',
    'Força Essencial',
    'Aula guiada com padrões fundamentais e progressões individuais.',
    '#F3A83B', 55, true
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  color = excluded.color,
  default_duration_minutes = excluded.default_duration_minutes,
  is_active = excluded.is_active;

insert into public.classes (
  id, organization_id, unit_id, class_type_id, instructor_professional_id,
  title, description, starts_at, ends_at, capacity, booking_opens_at,
  booking_closes_at, cancellation_deadline_at, status, created_by
) values
  (
    '08000000-0000-0000-0000-000000000001',
    '04000000-0000-0000-0000-000000000001',
    '06000000-0000-0000-0000-000000000001',
    '07000000-0000-0000-0000-000000000001',
    null,
    'Mobilidade ao Entardecer',
    'Aula demonstrativa com movimentos progressivos e opções para diferentes níveis.',
    date_trunc('day', now()) + interval '1 day 18 hours',
    date_trunc('day', now()) + interval '1 day 18 hours 45 minutes',
    12,
    date_trunc('day', now()) - interval '6 days',
    date_trunc('day', now()) + interval '1 day 17 hours 45 minutes',
    date_trunc('day', now()) + interval '1 day 14 hours',
    'published',
    null
  ),
  (
    '08000000-0000-0000-0000-000000000002',
    '04000000-0000-0000-0000-000000000001',
    '06000000-0000-0000-0000-000000000001',
    '07000000-0000-0000-0000-000000000002',
    null,
    'Força Essencial — Turma A',
    'Aula demonstrativa de padrões fundamentais com progressão individual.',
    date_trunc('day', now()) + interval '2 days 7 hours',
    date_trunc('day', now()) + interval '2 days 7 hours 55 minutes',
    8,
    date_trunc('day', now()) - interval '5 days',
    date_trunc('day', now()) + interval '2 days 6 hours 45 minutes',
    date_trunc('day', now()) + interval '1 day 19 hours',
    'published',
    null
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  capacity = excluded.capacity,
  booking_opens_at = excluded.booking_opens_at,
  booking_closes_at = excluded.booking_closes_at,
  cancellation_deadline_at = excluded.cancellation_deadline_at,
  status = excluded.status;

insert into public.organization_feature_flags (organization_id, feature_key, enabled)
select '04000000-0000-0000-0000-000000000001'::uuid, flag.key, flag.default_enabled
from public.feature_flags flag
on conflict (organization_id, feature_key) do update set enabled = excluded.enabled;
