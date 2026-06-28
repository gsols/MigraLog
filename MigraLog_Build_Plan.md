# MigraLog Build Plan: 1-Day Vibe Coding Blueprint (With Auth)

## 1. Project Context & Objectives
You are building **MigraLog**, a smart migraine diary and clinical nursing support application prototype.
- **Stack:** React, Tailwind CSS, Supabase BaaS (Auth + PostgreSQL).
- **Core Design Ethos:** Strict dark-mode only (calming, low-light environment using `bg-zinc-950` to avoid triggering photophobia during active attacks).
- **Target Architecture:** Single-Page Application (SPA) utilizing a conditional rendering state: If unauthenticated → show **Auth Guard View**. If authenticated → show **App Layout** with tab/view switcher (`Home`, `Log`, `Trends`, `Help`).

---

## 2. Database Schema & RLS Triggers (Supabase SQL)
Run this execution script in your Supabase SQL editor. It builds the profiles and logs tables, sets up secure Row-Level Security (RLS), and establishes an automated PostgreSQL trigger to instantly copy newly signed-up auth users straight into your `public.profiles` table.

```sql
create extension if not exists "uuid-ossp";

-- User Profiles linked directly to Supabase Auth Metadata
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text,
  role text default 'patient' check (role in ('patient', 'nurse'))
);

-- Migraine Attack Tracking Logs
create table public.attack_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  logged_at timestamp with time zone default timezone('utc'::text, now()) not null,
  duration_hours integer default 0,
  duration_minutes integer default 0,
  pain_level integer not null check (pain_level between 1 and 10),
  
  -- Array-based multi-select structural data representation
  pain_areas text[] default '{}', 
  symptoms text[] default '{}',
  triggers text[] default '{}',
  custom_triggers text,
  psychological_state text,
  
  -- Pharmacological adherence & intervention evaluation
  medication_taken text,
  side_effects text,
  overall_relief_achieved boolean default false,
  notes text
);

-- Enable Security Layers
alter table public.profiles enable row level security;
alter table public.attack_logs enable row level security;

-- Setup basic RLS isolation policies
create policy "Users can manage own profile" on public.profiles for all using (auth.uid() = id);
create policy "Patients can manage own logs" on public.attack_logs for all using (auth.uid() = user_id);

-- TRIGGER: Automatically create a profile entry when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'MigraLog User'), 'patient');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 3. Frontend Component Mapping

### Pre-App View: Auth Guard Component (`!userSession`)
A beautiful, low-contrast centralized authorization card managing dual-state toggle layouts (`isSignUp === true` or `false`).

**Sign In Form Layout:**
- Standard text input fields capturing Email Address and Password.
- Tactical submit action linking directly to `supabase.auth.signInWithPassword()`.
- Toggle link text: "Don't have an account? Sign Up".

**Sign Up Form Layout:**
- Additional field capturing Full Name (passed cleanly via the `options.data` user metadata argument during account creation).
- Standard text inputs capturing Email Address and Password.
- Tactical submit action linking directly to `supabase.auth.signUp()`.
- Toggle link text: "Already have an account? Sign In".

### App Framework View (`userSession === true`)
Once authenticated, open up the app layout wrapper. Provide a persistent top or bottom application navbar containing a "Sign Out" click action targeting `supabase.auth.signOut()`.

### View 1: Home / Dashboard State (activeTab === 'Home')
- **Header Block:** "Welcome back, {profile.full_name}!" greeting layout displaying the active client timestamp context dynamically.
- **Hero CTA:** High-contrast prominent green button: `+ LOG NEW ATTACK`. Clicking this forces `setActiveTab('Log')`.
- **Status Indicator Card:** Simple verification alert box showing text matching "Last migraine logged: today."
- **Trend Snapshot:** Micro line-chart tracking subjective pain over time using recharts `<LineChart>`.
- **Recent Logs Feed:** Vertical stack mapping historical entry cards showing date, explicit pain scale badge, and list of logged triggers.

### View 2: Log Attack Form View (activeTab === 'Log')
Build an elegant, interactive form using pure Tailwind grid items to minimize active text typing requirements.

- **DateTime & Duration Block:** Two inline fields defaulting to the active current time, tracking hours and minutes.
- **Pain Level Slider:** Native HTML range element stylized with `accent-emerald-500` reporting real-time sliding numbers 1 to 10.
- **Anatomy Selector Grid:** Interactive multi-select choice pills matching options: Left temple, Right temple, Forehead, Behind left eye, Behind right eye, Back of head, Top of head, Base of skull, Whole head, Left side, Right side.
- **Symptom Tracker Grid:** Multi-select option pills matching options: Aura (visual), Nausea, Visual disturbances, Dizziness, Throbbing pain, Sensitivity to light, Sensitivity to sound, Sensitivity to smell, Vomiting, Fatigue. Highlights clear emerald green when selected.
- **Trigger Factor Tracker Grid:** Interactive emoji selection pills: Stress 😓, Sleep deprivation 😵‍💫, Menstruation 🩸, Certain foods 🍫, Caffeine ☕, Alcohol 🍷, Weather change 🌧️, Bright lights ☀️, Loud noises 📢, Screen time 💻. Include an "Other/Custom triggers" text fallback input box.
- **Psychological Baseline Grid:** Explicit state selection array: Stressed 😰, Anxious 😟, Irritable 😤, Depressed 😞, Calm 😌, Frustrated 😫, Overwhelmed 😵, Normal 🙂.
- **Treatment Feedback Inputs:** Clean tracking text box fields for "Medication taken" and "Side effects," an active boolean checkbox for "Overall relief achieved?," and a Save Attack Entry submit button that targets `supabase.from('attack_logs').insert()`.

### View 3: Clinician/Trends View (activeTab === 'Trends')
- **Key Metric Indicators:** Quick-scanning aggregate data layout cards displaying Total Attacks, Average Pain Severity, and Top Logged Trigger.
- **Medication Performance Distribution:** Interactive horizontal bar-chart rendering the proportion of successful pain intervention reliefs versus failures based on the saved `overall_relief_achieved` boolean field.

### View 4: Safety & Triage Guidance (activeTab === 'Help')
- **Emergency Action Layout:** Static high-visibility component wrapped completely in a red cautionary warning layout.
- **Red Flag Protocols:** Bullet-pointed list of immediate neurological indicators signaling acute clinical emergencies (e.g., sudden explosive onset of maximum pain, severe vision loss, facial drooping, progressive confusion).
- **Direct Emergency Anchor:** High-contrast tactical action button: Call Emergency Hotline.

## 4. Prompt Instructions For AI Generation Workflow
When building, pass these explicit operational rules sequentially to your assistant:

1. "Establish a root authentication gateway block in `App.jsx` using `supabase.auth.onAuthStateChange()`. If there is no active session, swap views instantly to render the unauthenticated dark-themed Login/Register switchable card container."

2. "Ensure the Sign Up logic passes `full_name` inside the `options` metadata packet like this: `options: { data: { full_name: fullName } }` so the PostgreSQL database profile trigger catches it instantly."

3. "Implement the full scrolling Log form component view. Make sure every selection item operates inside React state variables as simple text arrays (`selectedSymptoms`, `selectedAreas`) so they match the Supabase string array configuration parameters."

4. "Inject recharts directly into the Home and Trends loops. Use real query arrays targeted at `supabase.from('attack_logs').select('*')` to pull down records tied to the logged-in user session."
