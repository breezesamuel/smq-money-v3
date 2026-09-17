-- ============================================================
-- 痛点小工具商城 数据库结构 (Supabase PostgreSQL)
-- 在 Supabase 控制台 -> SQL Editor 中运行一次
-- ============================================================

-- 用户表
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,          -- 游客也用自己的 device_id
  email text unique,                       -- 注册邮箱（可选）
  nickname text,
  lang text default 'zh',                  -- 默认语言
  referral_code text unique,               -- 自己的推荐码 e.g. ABC1X2
  referred_by text references public.users(referral_code), -- 谁推荐的我
  verified_friends int default 0,          -- 有效付费推荐数
  lifetime_free_tools text[] default '{}', -- 拉10人后永久免费的工具
  created_at timestamptz default now()
);

-- 工具表（内置 317 条从 tools.json 导入）
create table if not exists public.tools (
  id text primary key,                     -- g1000 / l1000 / w1000
  slug text unique not null,
  category text not null,                  -- ai_games | life | worker
  type text default 'generator',           -- 交互类型
  name_zh text not null,
  name_en text not null,
  name_ar text not null,
  pain_zh text, pain_en text, pain_ar text,
  free_uses int default 10,                -- 免费使用次数
  monthly_cny numeric default 15,          -- 月费
  lifetime_cny numeric default 199,        -- 买断价
  active boolean default true,
  created_at timestamptz default now()
);

-- 付费套餐/许可表
create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  tool_id text references public.tools(id),
  type text not null,                      -- subscription | lifetime | free_permanent
  status text default 'active',            -- active | expired | revoked
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, tool_id, type)
);

-- 使用记录（统计免费10次）
create table if not exists public.usages (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id),
  tool_id text references public.tools(id),
  used_at timestamptz default now()
);
create index if not exists idx_usages_user_tool on public.usages(user_id, tool_id);

-- 支付记录
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  tool_id text references public.tools(id),
  amount numeric not null,
  currency text default 'CNY',
  method text default 'moltspay',          -- 支付渠道
  type text not null,                      -- subscription | lifetime
  status text default 'pending',           -- pending | paid | refunded
  external_ref text,                       -- 外部支付单号
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- 推荐记录
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid references public.users(id),   -- 发起者（返钱的人）
  invitee_id uuid references public.users(id),   -- 被拉来的朋友
  invitee_tool_id text references public.tools(id), -- 朋友有效使用的工具
  status text default 'pending',           -- pending | verified(已付费) | paid(已返现)
  rebate_ratio numeric default 0.10,
  rebate_amount numeric default 0,
  created_at timestamptz default now(),
  verified_at timestamptz
);

-- 多语言文案表（可扩展翻译管理）
create table if not exists public.i18n (
  key text primary key,
  zh text, en text, ar text
);

-- 状态更新触发器：朋友付费后，给邀请者 verified_friends+1, 记录返佣
create or replace function public.on_payment_verified()
returns trigger as $$
begin
  -- 被邀请的人完成付费 -> 标记 referral 为 verified
  update public.referrals
     set status = 'verified', verified_at = now()
   where invitee_id = new.user_id and status = 'pending';

  -- 更新邀请者的有效朋友计数
  update public.users u
     set verified_friends = (
       select count(*) from public.referrals r
        where r.inviter_id = u.id and r.status = 'verified'
     )
   where u.id in (select inviter_id from public.referrals where invitee_id = new.user_id);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_payment_verified on public.payments;
create trigger trg_payment_verified
  after update of status on public.payments
  for each row
  when (new.status = 'paid')
  execute function public.on_payment_verified();

-- 推荐等级对应返现比例
--   1 friend -> 10%, 2 -> 30%, 3 -> 50%, 5 -> 70%, 10 -> 100% (永久免费)

-- RLS 策略（安全）
alter table public.users enable row level security;
alter table public.payments enable row level security;

create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

-- 示例：导入工具（用 psql 或 supabase 导入 tools.json）
-- psql "postgres://..." -c "\copy public.tools from 'tools.csv' with csv"