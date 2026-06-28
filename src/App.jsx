import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Download,
  Heart,
  Home,
  Loader2,
  LogOut,
  NotebookPen,
  Phone,
  Plus,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const tabs = [
  { name: 'Home', icon: Home },
  { name: 'Log', icon: NotebookPen },
  { name: 'Trends', icon: BarChart3 },
  { name: 'Help', icon: ShieldAlert },
];

const painAreas = [
  '🔵 Left temple',
  '🔴 Right temple',
  '🟡 Forehead',
  '👁️ Behind left eye',
  '👁️ Behind right eye',
  '🧠 Back of head',
  '⬆️ Top of head',
  '⬇️ Base of skull',
  '🌐 Whole head',
  '⬅️ Left side',
  '➡️ Right side',
];

const symptomOptions = [
  '👁️ Aura (visual)',
  '🤢 Nausea',
  '◻️ Visual disturbances',
  '😵 Dizziness',
  '💢 Throbbing pain',
  '💡 Sensitivity to light',
  '🔊 Sensitivity to sound',
  '👃 Sensitivity to smell',
  '🤮 Vomiting',
  '😴 Fatigue',
];

const triggerOptions = [
  '😟 Stress',
  '😴 Sleep deprivation',
  '🩸 Menstruation',
  '🍫 Certain foods',
  '☕ Caffeine',
  '🍷 Alcohol',
  '🌧️ Weather change',
  '☀️ Bright lights',
  '📢 Loud noises',
  '💻 Screen time',
];

const psychologicalStates = [
  '😰 Stressed',
  '😟 Anxious',
  '😤 Irritable',
  '😞 Depressed',
  '😌 Calm',
  '😫 Frustrated',
  '😵 Overwhelmed',
  '🙂 Normal',
];

const emergencyFlags = [
  'Sudden explosive onset of maximum pain',
  'Severe vision loss or new double vision',
  'Facial drooping, weakness, numbness, or difficulty speaking',
  'Progressive confusion, fainting, seizure, or neck stiffness',
  'Headache after head injury or during pregnancy',
];

const managementTips = [
  {
    title: 'Rest in a Dark, Quiet Room',
    body: 'During a migraine attack, move to a dark, quiet room. Light and sound sensitivity are common triggers that worsen pain. Lie down with a cool cloth over your forehead and try to sleep if possible.',
    tag: 'Comfort',
  },
  {
    title: 'Track Your Patterns',
    body: 'Use this diary consistently. Recognizing patterns in your triggers and symptoms is the most powerful tool for prevention. Note what you ate, how you slept, and your stress level before each attack.',
    tag: 'Prevention',
  },
  {
    title: 'Cold Compress Relief',
    body: 'Apply a cold compress or ice pack wrapped in a towel to your forehead or the back of your neck for 15-20 minutes. This can constrict blood vessels and reduce migraine intensity.',
    tag: 'Relief',
  },
  {
    title: 'Stay Hydrated',
    body: 'Dehydration is a common migraine trigger. Aim for steady water intake and add electrolytes when sweating, exercising, or recovering from vomiting.',
    tag: 'Prevention',
  },
  {
    title: 'Caffeine Awareness',
    body: 'Caffeine can help some attacks, but regular use can lead to rebound headaches. Track your caffeine intake and notice whether it appears near symptom onset.',
    tag: 'Trigger',
  },
  {
    title: 'Sleep Hygiene',
    body: 'Irregular sleep is a major trigger. Go to bed and wake up around the same time daily. Avoid screens for at least 30 minutes before bed when possible.',
    tag: 'Prevention',
  },
];

const triageTips = [
  {
    title: 'Emergency Warning Signs',
    body: 'Seek immediate medical care for sudden severe headache unlike any before, headache with fever and stiff neck, headache after head injury, weakness on one side of the body, confusion, trouble speaking, or vision loss.',
  },
  {
    title: 'When to Call Your Doctor',
    body: 'Contact your healthcare provider if migraines occur more than twice a week, over-the-counter medications stop working, you need pain relievers more than 2-3 times per week, attacks interfere with daily life, or symptoms change.',
  },
  {
    title: 'Medication Safety',
    body: 'Follow prescribed doses and avoid mixing medicines unless your clinician approves it. Record side effects, relief response, and frequency of use so your care team can assess safety.',
  },
];

const initialLogForm = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return {
    logged_at: now.toISOString().slice(0, 16),
    duration_hours: 0,
    duration_minutes: 30,
    pain_level: 5,
    pain_areas: [],
    symptoms: [],
    triggers: [],
    custom_triggers: '',
    psychological_state: '',
    medication_taken: '',
    side_effects: '',
    overall_relief_achieved: false,
    notes: '',
  };
};

function formatDate(value, options = {}) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options,
  }).format(new Date(value));
}

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function getTriggerCounts(logs) {
  const counts = new Map();
  logs.forEach((log) => {
    [...(log.triggers || []), ...(log.custom_triggers ? [log.custom_triggers] : [])].forEach((trigger) => {
      counts.set(trigger, (counts.get(trigger) || 0) + 1);
    });
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function getChartLogs(logs) {
  return logs
    .slice()
    .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
    .slice(-10)
    .map((log) => ({
      date: formatDate(log.logged_at, { month: 'short', day: 'numeric', hour: undefined, minute: undefined }),
      pain: log.pain_level,
    }));
}

function getAveragePain(logs) {
  if (!logs.length) return '0.0';
  const total = logs.reduce((sum, log) => sum + Number(log.pain_level || 0), 0);
  return (total / logs.length).toFixed(1);
}

function getDateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getHeatmapCells(logs, year = new Date().getFullYear()) {
  const counts = new Map();
  logs.forEach((log) => {
    const loggedAt = new Date(log.logged_at);
    if (loggedAt.getFullYear() === year) {
      const key = getDateKey(log.logged_at);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  });

  const cells = [];
  const firstDay = new Date(year, 0, 1);
  const lastDay = new Date(year, 11, 31);

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    cells.push({ key: `blank-${index}`, blank: true });
  }

  for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
    const key = getDateKey(date);
    cells.push({
      key,
      count: counts.get(key) || 0,
      label: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date),
    });
  }

  return cells;
}

function HeatmapCell({ cell }) {
  const levels = ['bg-zinc-700/50', 'bg-emerald-950', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400'];
  const level = Math.min(cell.count || 0, levels.length - 1);

  if (cell.blank) {
    return <span className="h-3 w-3 rounded-sm opacity-0" />;
  }

  return (
    <span
      aria-label={`${cell.label}: ${cell.count} attack${cell.count === 1 ? '' : 's'}`}
      className={`h-3 w-3 rounded-sm ${levels[level]}`}
      title={`${cell.label}: ${cell.count} attack${cell.count === 1 ? '' : 's'}`}
    />
  );
}

function AttackHeatmap({ logs }) {
  const year = new Date().getFullYear();
  const cells = getHeatmapCells(logs, year);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#242424] p-5">
      <h2 className="flex items-center gap-3 text-2xl font-bold">
        <Activity className="text-zinc-400" />
        Attack Heatmap (Year)
      </h2>
      <p className="mt-3 text-lg text-zinc-400">Each cell is one day. Darker green means more attacks that day.</p>
      <div className="mt-5 overflow-x-auto pb-2 scrollbar-calm">
        <div className="min-w-[720px]">
          <div className="mb-2 grid grid-cols-12 text-xs font-medium text-zinc-500">
            {months.map((month) => (
              <span key={month}>{month}</span>
            ))}
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-1">
            {cells.map((cell) => (
              <HeatmapCell cell={cell} key={cell.key} />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-zinc-500">
            <span>Fewer</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span
                className={`h-4 w-4 rounded-sm ${['bg-zinc-700/50', 'bg-emerald-950', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400'][level]}`}
                key={level}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function AuthGuard({ onAuth }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const result = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName || 'MigraLog User' } },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (isSignUp && !result.data.session) {
      setMessage('Account created. Check your email if confirmation is enabled.');
      return;
    }

    onAuth(result.data.session);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111111] px-5 py-10 text-zinc-50">
      <section className="w-full max-w-md rounded-[28px] border border-zinc-800 bg-[#222222] p-6 shadow-2xl shadow-black/40">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">MigraLog</h1>
            <p className="text-sm text-zinc-400">Smart migraine diary and nursing support</p>
          </div>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            Supabase URL or anon key is missing from the environment.
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isSignUp && (
            <label className="block text-sm font-medium text-zinc-200">
              Full Name
              <input
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-[#2a2a2a] px-4 py-4 text-zinc-50 placeholder:text-zinc-500"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Patient name"
                required
              />
            </label>
          )}

          <label className="block text-sm font-medium text-zinc-200">
            Email Address
            <input
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-[#2a2a2a] px-4 py-4 text-zinc-50 placeholder:text-zinc-500"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block text-sm font-medium text-zinc-200">
            Password
            <input
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-[#2a2a2a] px-4 py-4 text-zinc-50 placeholder:text-zinc-500"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
          </label>

          {message && <p className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-200">{message}</p>}

          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#06b843] px-4 py-4 text-lg font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || !isSupabaseConfigured}
            type="submit"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button
          className="mt-5 w-full rounded-xl px-3 py-3 text-sm font-medium text-emerald-300 transition hover:bg-zinc-800"
          onClick={() => {
            setIsSignUp((value) => !value);
            setMessage('');
          }}
          type="button"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </section>
    </main>
  );
}

function Shell({ activeTab, setActiveTab, onSignOut, children }) {
  return (
    <div className="min-h-screen bg-[#111111] text-zinc-50">
      <header className="sticky top-0 z-20 border-b border-transparent bg-[#111111]/95 backdrop-blur md:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 md:px-6">
          <button className="flex items-center gap-3 text-left" onClick={() => setActiveTab('Home')} type="button">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <Activity size={22} />
            </span>
            <span>
              <span className="block text-lg font-semibold">MigraLog</span>
              <span className="block text-xs text-zinc-500">Clinical diary</span>
            </span>
          </button>

          <nav className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-[#202020] p-2 md:flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === tab.name ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  title={tab.name}
                  type="button"
                >
                  <Icon size={17} />
                  {tab.name}
                </button>
              );
            })}
          </nav>

          <button
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-zinc-400 transition hover:bg-zinc-800"
            onClick={onSignOut}
            title="Sign out"
            type="button"
          >
            <LogOut size={19} />
            <span className="hidden text-sm font-medium sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 pb-32 pt-5 md:px-6 md:pb-10">{children}</div>

      <nav className="fixed bottom-7 left-1/2 z-30 grid w-[min(82vw,420px)] -translate-x-1/2 grid-cols-4 rounded-full border border-zinc-800 bg-[#222222]/95 p-2 shadow-2xl shadow-black/60 backdrop-blur md:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={`flex flex-col items-center gap-1 rounded-full px-2 py-3 text-xs font-medium transition ${
                activeTab === tab.name ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-400'
              }`}
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              title={tab.name}
              type="button"
            >
              <Icon size={20} />
              {tab.name}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#242424] p-4 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400">
        <Icon size={25} />
      </div>
      <p className="text-3xl font-bold text-zinc-50">{value}</p>
      <p className="mt-1 text-sm text-zinc-400">{label}</p>
    </div>
  );
}

function EmptyState({ title, action, onAction }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-700 bg-[#202020] p-6 text-center">
      <p className="font-medium text-zinc-200">{title}</p>
      {action && (
        <button
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#06b843] px-4 py-3 font-bold text-white hover:bg-emerald-500"
          onClick={onAction}
          type="button"
        >
          <Plus size={17} />
          {action}
        </button>
      )}
    </div>
  );
}

function HomeView({ profile, logs, setActiveTab }) {
  const latestLog = logs[0];
  const chartLogs = getChartLogs(logs);

  return (
    <div className="space-y-6">
      <section className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
          <h1 className="text-[34px] font-bold leading-tight tracking-normal text-zinc-50">
            Welcome back, {profile?.full_name || 'MigraLog User'}!
          </h1>
          <p className="mt-2 text-xl text-zinc-400">
            Today: {new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}
          </p>
          </div>
        </div>
          <button
            className="flex w-full items-center justify-center gap-3 rounded-[24px] bg-[#06b843] px-5 py-7 text-3xl font-bold text-white transition hover:bg-emerald-500"
            onClick={() => setActiveTab('Log')}
            type="button"
          >
            <Plus size={36} />
            + LOG NEW ATTACK
          </button>

        <div className="rounded-2xl border border-emerald-500 bg-emerald-950/30 p-5">
          <p className="flex items-center gap-3 text-xl text-emerald-400">
            <CheckCircle2 size={23} />
            Last migraine logged: <strong>{latestLog ? 'today.' : 'no entries yet.'}</strong>
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-[#242424] p-5">
          <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold"><BarChart3 className="text-zinc-400" /> Pain Trend</h2>
          <div className="h-64">
            {chartLogs.length ? (
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={chartLogs} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <YAxis domain={[1, 10]} stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} />
                  <Line dataKey="pain" stroke="#34d399" strokeWidth={3} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Trend data appears after your first saved attack." />
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-3xl font-bold">Recent Attacks</h2>
          <div className="space-y-3">
            {logs.slice(0, 4).map((log) => (
              <article className="rounded-2xl border border-zinc-800 bg-[#242424] p-5" key={log.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-3 text-2xl font-bold"><CalendarClock className="text-zinc-400" /> {formatDate(log.logged_at, { weekday: 'short', month: 'short', day: 'numeric', hour: undefined, minute: undefined })}</p>
                  <span className="rounded-full bg-amber-500/25 px-3 py-1 text-xl font-bold text-amber-400">
                    Pain {log.pain_level}/10
                  </span>
                </div>
                <p className="mt-2 text-xl text-zinc-400">
                  Triggers: {[...(log.triggers || []), log.custom_triggers].filter(Boolean).join(', ') || 'None logged'}
                </p>
              </article>
            ))}
            {!logs.length && <EmptyState action="Log Attack" onAction={() => setActiveTab('Log')} title="No attack logs yet." />}
          </div>
        </div>
      </section>
    </div>
  );
}

function OptionGrid({ options, selected, onToggle, single = false }) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => {
        const active = single ? selected === option : selected.includes(option);
        return (
          <button
            className={`min-h-12 rounded-xl border px-4 py-3 text-left text-xl font-semibold transition ${
              active
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                : 'border-zinc-800 bg-[#292929] text-zinc-300 hover:border-zinc-600'
            }`}
            key={option}
            onClick={() => onToggle(option)}
            type="button"
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function LogView({ session, onSaved, setActiveTab }) {
  const [form, setForm] = useState(initialLogForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    const payload = {
      ...form,
      user_id: session.user.id,
      logged_at: new Date(form.logged_at).toISOString(),
      duration_hours: Number(form.duration_hours) || 0,
      duration_minutes: Number(form.duration_minutes) || 0,
      pain_level: Number(form.pain_level),
    };

    const { error } = await supabase.from('attack_logs').insert(payload);
    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm(initialLogForm());
    await onSaved();
    setActiveTab('Home');
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 pb-3">
        <button className="rounded-full p-1 text-zinc-400" onClick={() => setActiveTab('Home')} type="button">
          <ArrowLeft size={32} />
        </button>
        <h1 className="text-[34px] font-bold tracking-normal">Log Attack</h1>
      </div>

      {message && <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200">{message}</p>}

      <FormSection title="Date, Time, and Duration">
        <div className="grid grid-cols-[1fr_0.48fr] gap-3">
          <label className="text-sm font-medium text-zinc-200">
            <span className="sr-only">Date & Time</span>
            <input
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-[#292929] px-4 py-4 text-2xl"
              onChange={(event) => updateField('logged_at', `${event.target.value}T${form.logged_at.slice(11, 16)}`)}
              type="date"
              value={form.logged_at.slice(0, 10)}
            />
          </label>
          <label className="text-sm font-medium text-zinc-200">
            <span className="sr-only">Time</span>
            <input
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-[#292929] px-4 py-4 text-2xl"
              onChange={(event) => updateField('logged_at', `${form.logged_at.slice(0, 10)}T${event.target.value}`)}
              type="time"
              value={form.logged_at.slice(11, 16)}
            />
          </label>
        </div>
        <h3 className="mt-8 text-2xl font-bold">Duration</h3>
        <div className="mt-2 flex items-center gap-4">
          <input
            className="w-28 rounded-xl border border-zinc-800 bg-[#292929] px-4 py-4 text-2xl"
            min="0"
            onChange={(event) => updateField('duration_hours', event.target.value)}
            type="number"
            value={form.duration_hours}
          />
          <span className="text-xl text-zinc-400">hrs</span>
          <input
            className="w-28 rounded-xl border border-zinc-800 bg-[#292929] px-4 py-4 text-2xl"
            max="59"
            min="0"
            onChange={(event) => updateField('duration_minutes', event.target.value)}
            type="number"
            value={form.duration_minutes}
          />
          <span className="text-xl text-zinc-400">min</span>
        </div>
        <p className="mt-2 text-xl text-zinc-400">How long did the attack last?</p>
      </FormSection>

      <FormSection title="Pain level">
        <p className="text-2xl font-bold">{form.pain_level}/10</p>
        <input
          className="w-full accent-emerald-500"
          max="10"
          min="1"
          onChange={(event) => updateField('pain_level', event.target.value)}
          type="range"
          value={form.pain_level}
        />
        <div className="mt-3 flex justify-between text-xl text-zinc-500">
          <span>Mild</span>
          <span>Moderate</span>
          <span>Severe</span>
        </div>
      </FormSection>

      <FormSection title="Pain Areas">
        <p className="-mt-2 mb-3 text-xl text-zinc-400">Where does the pain occur?</p>
        <OptionGrid
          onToggle={(value) => updateField('pain_areas', toggleValue(form.pain_areas, value))}
          options={painAreas}
          selected={form.pain_areas}
        />
      </FormSection>

      <FormSection title="Symptoms">
        <p className="-mt-2 mb-3 text-xl text-zinc-400">Select all that apply</p>
        <OptionGrid
          onToggle={(value) => updateField('symptoms', toggleValue(form.symptoms, value))}
          options={symptomOptions}
          selected={form.symptoms}
        />
      </FormSection>

      <FormSection title="Trigger Factors">
        <p className="-mt-2 mb-3 text-xl text-zinc-400">Select suspected triggers</p>
        <OptionGrid
          onToggle={(value) => updateField('triggers', toggleValue(form.triggers, value))}
          options={triggerOptions}
          selected={form.triggers}
        />
        <label className="mt-4 block text-sm font-medium text-zinc-200">
          Other / Custom triggers
          <input
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-[#292929] px-4 py-4 text-2xl"
            onChange={(event) => updateField('custom_triggers', event.target.value)}
            placeholder="Type any additional trigger"
            value={form.custom_triggers}
          />
        </label>
      </FormSection>

      <FormSection title="Psychological Baseline">
        <p className="-mt-2 mb-3 text-xl text-zinc-400">How were you feeling before the attack?</p>
        <OptionGrid
          onToggle={(value) => updateField('psychological_state', form.psychological_state === value ? '' : value)}
          options={psychologicalStates}
          selected={form.psychological_state}
          single
        />
      </FormSection>

      <FormSection title="Treatment Feedback">
        <div className="grid gap-5">
          <label className="text-sm font-medium text-zinc-200">
            <span className="block text-2xl font-bold">Medication taken</span>
            <input
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-[#292929] px-4 py-4 text-2xl"
              onChange={(event) => updateField('medication_taken', event.target.value)}
              placeholder="Medicine and dosage"
              value={form.medication_taken}
            />
          </label>
          <label className="text-sm font-medium text-zinc-200">
            <span className="block text-2xl font-bold">Side effects</span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-xl border border-zinc-800 bg-[#292929] px-4 py-4 text-2xl"
              onChange={(event) => updateField('side_effects', event.target.value)}
              placeholder="Nausea, drowsiness, none"
              value={form.side_effects}
            />
          </label>
        </div>
        <label className="mt-4 flex items-center gap-3 text-2xl font-medium text-zinc-100">
          <input
            checked={form.overall_relief_achieved}
            className="h-7 w-7 accent-emerald-500"
            onChange={(event) => updateField('overall_relief_achieved', event.target.checked)}
            type="checkbox"
          />
          Overall relief achieved?
        </label>
        <label className="mt-4 block text-sm font-medium text-zinc-200">
          <span className="block text-2xl font-bold">Patient email</span>
          <input
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-[#292929] px-4 py-4 text-2xl text-zinc-400"
            readOnly
            value={session.user.email || ''}
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-zinc-200">
          <span className="block text-2xl font-bold">Notes</span>
          <textarea
            className="mt-2 min-h-36 w-full rounded-xl border border-zinc-800 bg-[#292929] px-4 py-4 text-2xl"
            onChange={(event) => updateField('notes', event.target.value)}
            placeholder="Additional clinical notes"
            value={form.notes}
          />
        </label>
      </FormSection>

      <button
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#06b843] px-5 py-4 text-xl font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
        disabled={saving}
        type="submit"
      >
        {saving ? <Loader2 className="animate-spin" size={22} /> : <NotebookPen size={22} />}
        Save
      </button>
    </form>
  );
}

function TrendsView({ logs, profile, setActiveTab }) {
  const triggerCounts = getTriggerCounts(logs);
  const topTrigger = triggerCounts[0]?.[0] || 'None yet';
  const triggerChartData = triggerCounts.slice(0, 6).map(([name, value]) => ({ name, value }));

  function exportReport() {
    const reportRows = logs
      .map(
        (log) => `
          <tr>
            <td>${formatDate(log.logged_at)}</td>
            <td>${log.pain_level}/10</td>
            <td>${[...(log.triggers || []), log.custom_triggers].filter(Boolean).join(', ') || 'None'}</td>
            <td>${log.medication_taken || 'None'}</td>
            <td>${log.overall_relief_achieved ? 'Yes' : 'No'}</td>
          </tr>
        `,
      )
      .join('');

    const html = `
      <html>
        <head>
          <title>MigraLog Nursing Insight Report</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111; padding: 28px; }
            h1 { margin-bottom: 4px; }
            .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
            .metric { border: 1px solid #ccc; padding: 12px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>MigraLog Nursing Insight Report</h1>
          <p>Patient: ${profile?.full_name || 'MigraLog User'}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <div class="metrics">
            <div class="metric"><strong>Total Attacks</strong><br />${logs.length}</div>
            <div class="metric"><strong>Average Pain</strong><br />${getAveragePain(logs)}/10</div>
            <div class="metric"><strong>Top Trigger</strong><br />${topTrigger}</div>
          </div>
          <table>
            <thead>
              <tr><th>Date</th><th>Pain</th><th>Triggers</th><th>Medication</th><th>Relief</th></tr>
            </thead>
            <tbody>${reportRows || '<tr><td colspan="5">No logs available.</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `;
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  }

  const treated = logs.filter((log) => log.medication_taken).length;
  const relieved = logs.filter((log) => log.overall_relief_achieved).length;
  const successRate = logs.length ? Math.round((relieved / logs.length) * 100) : 0;
  const avgMinutes = logs.length
    ? Math.round(logs.reduce((sum, log) => sum + (log.duration_hours || 0) * 60 + (log.duration_minutes || 0), 0) / logs.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button className="rounded-full p-1 text-zinc-400" onClick={() => setActiveTab('Home')} type="button">
          <ArrowLeft size={32} />
        </button>
        <h1 className="min-w-0 flex-1 text-[34px] font-bold leading-tight tracking-normal">Nursing Insight Report</h1>
        <div className="hidden rounded-xl bg-[#2a2a2a] p-1 sm:flex">
          <button className="rounded-lg bg-[#06b843] px-4 py-2 text-lg font-bold text-white" type="button">7 days</button>
          <button className="rounded-lg px-4 py-2 text-lg font-bold text-zinc-400" type="button">30 days</button>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#06b843] px-4 py-3 text-lg font-bold text-white hover:bg-emerald-500"
          onClick={exportReport}
          type="button"
        >
          <Printer size={18} />
          Export PDF
        </button>
      </div>
      <p className="text-xl text-zinc-400">7-day summary for clinician review. Use Export PDF to save or print.</p>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard icon={Activity} label="Attacks" value={logs.length} />
        <MetricCard icon={Stethoscope} label="Avg Pain" value={getAveragePain(logs)} />
        <MetricCard icon={Download} label="Treated" value={treated} />
        <MetricCard icon={BarChart3} label="Avg Duration" value={avgMinutes ? `${avgMinutes}m` : '—'} />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#242424] p-5">
        <h2 className="mb-5 flex items-center gap-3 text-2xl font-bold"><NotebookPen className="text-zinc-400" /> Relief Outcome</h2>
        <div className="grid grid-cols-3 gap-4 text-center text-2xl font-bold">
          <p className="text-emerald-400"><CheckCircle2 className="mx-auto mb-2" />{relieved} relieved</p>
          <p className="text-red-400"><AlertTriangle className="mx-auto mb-2" />{logs.length - relieved} not relieved</p>
          <p>{successRate}%<span className="block text-xl font-medium text-zinc-300">success</span></p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-[#242424] p-5">
          <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold"><BarChart3 className="text-zinc-400" /> Pain Trend</h2>
          <div className="h-72">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={getChartLogs(logs)} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis domain={[1, 10]} stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} />
                <Line dataKey="pain" stroke="#ef4444" strokeWidth={3} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#242424] p-5">
          <h2 className="mb-4 text-2xl font-bold">Trigger Breakdown</h2>
          <div className="h-72">
            {triggerChartData.length ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={triggerChartData} margin={{ top: 8, right: 12, left: -18, bottom: 48 }}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis
                    angle={-20}
                    dataKey="name"
                    interval={0}
                    stroke="#a1a1aa"
                    textAnchor="end"
                    tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  />
                  <YAxis allowDecimals={false} stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#06b843" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Trigger distribution appears after logs are saved." />
            )}
          </div>
        </div>
      </section>

      <AttackHeatmap logs={logs} />
    </div>
  );
}

function HelpView() {
  const [activeHelpTab, setActiveHelpTab] = useState('Management');
  const helpTabs = [
    { name: 'Management', icon: Heart },
    { name: 'Triage Tips', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-red-500/50 bg-red-950/50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase text-red-200">When to seek emergency care</p>
            <h1 className="mt-1 text-3xl font-bold tracking-normal">Red Flag Protocols</h1>
          </div>
        </div>
        <ul className="mt-6 space-y-3">
          {emergencyFlags.map((flag) => (
            <li className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xl text-red-50" key={flag}>
              {flag}
            </li>
          ))}
        </ul>
        <a
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-4 text-xl font-bold text-white hover:bg-red-400"
          href="tel:911"
        >
          <Phone size={18} />
          Call Emergency Hotline
        </a>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#242424] p-5">
        <h2 className="text-2xl font-bold">Clinical Note</h2>
        <p className="mt-2 text-xl text-zinc-300">
          MigraLog supports tracking and nursing review. It does not diagnose, replace emergency care, or replace a
          clinician&apos;s treatment plan.
        </p>
      </section>

      <div className="inline-flex rounded-xl border border-zinc-800 bg-[#202020] p-1">
        {helpTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeHelpTab === tab.name;
          return (
            <button
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                active ? 'bg-zinc-700 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
              key={tab.name}
              onClick={() => setActiveHelpTab(tab.name)}
              type="button"
            >
              <Icon size={17} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {activeHelpTab === 'Management' ? (
        <section className="space-y-4">
          {managementTips.map((tip) => (
            <article className="rounded-2xl border border-zinc-800 bg-[#242424] p-5" key={tip.title}>
              <h2 className="text-xl font-bold">{tip.title}</h2>
              <p className="mt-2 text-base leading-7 text-zinc-300">{tip.body}</p>
              <span className="mt-3 inline-flex rounded-lg bg-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300">
                {tip.tag}
              </span>
            </article>
          ))}
        </section>
      ) : (
        <section className="space-y-4">
          {triageTips.map((tip) => (
            <article className="rounded-2xl border border-zinc-800 bg-[#242424] p-5" key={tip.title}>
              <h2 className="text-xl font-bold">{tip.title}</h2>
              <p className="mt-3 text-lg leading-8 text-zinc-300">{tip.body}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('Home');
  const [loading, setLoading] = useState(true);

  const loadAppData = useCallback(
    async (currentSession) => {
      if (!currentSession?.user) return;

      const [profileResult, logsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentSession.user.id).single(),
        supabase.from('attack_logs').select('*').eq('user_id', currentSession.user.id).order('logged_at', { ascending: false }),
      ]);

      if (!profileResult.error) setProfile(profileResult.data);
      if (!logsResult.error) setLogs(logsResult.data || []);
    },
    [],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) loadAppData(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        loadAppData(nextSession);
      } else {
        setProfile(null);
        setLogs([]);
        setActiveTab('Home');
      }
    });

    return () => subscription.unsubscribe();
  }, [loadAppData]);

  const activeView = useMemo(() => {
    if (activeTab === 'Log') return <LogView onSaved={() => loadAppData(session)} session={session} setActiveTab={setActiveTab} />;
    if (activeTab === 'Trends') return <TrendsView logs={logs} profile={profile} setActiveTab={setActiveTab} />;
    if (activeTab === 'Help') return <HelpView />;
    return <HomeView logs={logs} profile={profile} setActiveTab={setActiveTab} />;
  }, [activeTab, loadAppData, logs, profile, session]);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#111111] text-zinc-50">
        <Loader2 className="animate-spin text-emerald-300" size={32} />
      </main>
    );
  }

  if (!session) {
    return <AuthGuard onAuth={setSession} />;
  }

  return (
    <Shell activeTab={activeTab} onSignOut={handleSignOut} setActiveTab={setActiveTab}>
      {activeView}
    </Shell>
  );
}
