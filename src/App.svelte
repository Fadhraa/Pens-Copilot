<script>
  import { onMount } from 'svelte';
  import { supabase } from './lib/supabase.js';
  import LandingPage from './lib/LandingPage.svelte';
  import Login from './lib/Login.svelte';
  import RegisterStep1 from './lib/RegisterStep1.svelte';
  import RegisterStep2 from './lib/RegisterStep2.svelte';
  import ForgotPassword from './lib/ForgotPassword.svelte';
  import Dashboard from './lib/Dashboard.svelte';

  /** @type {Record<string, string>} */
  const viewPaths = {
    landing: '/',
    login: '/login',
    register: '/register',
    'forgot-password': '/forgot-password',
    'register-step2': '/register-step2',
    dashboard: '/dashboard',
    profile: '/profile',
    tasks: '/tasks',
    materials: '/materials',
    subscription: '/subscription'
  };

  /**
   * @param {string} pathname
   */
  function pathToView(pathname) {
    const normalized = pathname.replace(/\/+$/, '') || '/';
    const matched = Object.entries(viewPaths).find(([, path]) => path === normalized);
    return matched ? matched[0] : 'landing';
  }

  let currentView = $state(
    typeof window !== 'undefined' ? pathToView(window.location.pathname) : 'landing'
  );
  /** @type {'all' | 'deadlines' | 'status'} */
  let activeTaskTab = $state('all');
  let scheduleReturnView = $state('dashboard');

  /**
   * @type {{
   *   id?: string,
   *   name: string,
   *   nrp: string,
   *   prodi: string,
   *   email: string,
   *   password?: string,
   *   schedules: Array<any>
   * }}
   */
  let currentUser = $state({
    name: 'Fadhra Dzaki',
    nrp: '3124600001',
    prodi: 'D4 Teknik Informatika',
    email: 'fadhradzaki.s@gmail.com',
    schedules: []
  });

  /**
   * @param {string} view
   * @param {boolean} replace
   */
  function navigateTo(view, replace = false) {
    currentView = view;
    if (typeof window === 'undefined') return;

    const targetPath = viewPaths[view] || '/';
    if (replace || window.location.pathname === targetPath) {
      window.history.replaceState({ view }, '', targetPath);
    } else {
      window.history.pushState({ view }, '', targetPath);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  /**
   * @param {PopStateEvent} e
   */
  function handlePopState(e) {
    currentView = e.state?.view || pathToView(window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  onMount(async () => {
    const initialView = pathToView(window.location.pathname);
    navigateTo(initialView, true);

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, nrp, prodi, email')
        .eq('id', session.user.id)
        .maybeSingle();

      currentUser = {
        id: session.user.id,
        name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email,
        nrp: profile?.nrp || session.user.user_metadata?.nrp || '',
        prodi: profile?.prodi || session.user.user_metadata?.prodi || '',
        email: profile?.email || session.user.email,
        schedules: []
      };

      if (initialView === 'landing' || initialView === 'login' || initialView === 'register') {
        navigateTo('dashboard', true);
      }
    }
  });

  /** @param {Record<string, any>} data */
  function handleRegisterStep1Next(data) {
    currentUser = { ...currentUser, ...data };
    scheduleReturnView = 'dashboard';
    navigateTo('register-step2');
  }

  /** @param {Record<string, any>} data */
  function handleRegisterFinish(data) {
    currentUser = { ...currentUser, ...data };
    const nextView = scheduleReturnView === 'profile' ? 'profile' : 'dashboard';
    scheduleReturnView = 'dashboard';
    navigateTo(nextView);
  }

  /** @param {Record<string, any>} data */
  function handleLoginSuccess(data) {
    currentUser = { ...currentUser, ...data };
    navigateTo('dashboard');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigateTo('landing');
  }
</script>

<svelte:window onpopstate={handlePopState} />

<div class="min-h-screen bg-[#EEF2F6] flex flex-col font-sans">
  
  {#if currentView === 'landing'}
    <div class="flex-1">
      <LandingPage onNavigate={(view) => navigateTo(view)} />
    </div>
  {:else if currentView === 'dashboard' || currentView === 'profile' || currentView === 'tasks' || currentView === 'materials' || currentView === 'subscription'}
    <div class="flex-1">
      <Dashboard
        user={currentUser}
        activeSection={currentView === 'profile'
          ? 'profile'
          : currentView === 'tasks'
            ? 'tasks'
            : currentView === 'materials'
              ? 'materials'
              : currentView === 'subscription'
                ? 'subscription'
                : 'chat'}
        {activeTaskTab}
        onNavigate={(view, options) => {
          if (options?.taskTab) {
            activeTaskTab = options.taskTab;
          } else if (view === 'tasks' && !options?.taskTab) {
            activeTaskTab = 'all';
          }
          if (view === 'register-step2') {
            scheduleReturnView = currentView === 'profile' ? 'profile' : 'dashboard';
          }
          navigateTo(view);
        }}
        onLogout={handleLogout}
      />
    </div>
  {:else if currentView === 'login'}
    <div class="flex-1">
      <Login
        onNavigate={(view) => navigateTo(view)}
        onLogin={handleLoginSuccess}
      />
    </div>
  {:else if currentView === 'register'}
    <div class="flex-1">
      <RegisterStep1
        initialData={currentUser}
        onNavigate={(view) => navigateTo(view)}
        onNext={handleRegisterStep1Next}
      />
    </div>
  {:else if currentView === 'forgot-password'}
    <div class="flex-1">
      <ForgotPassword
        onNavigate={(view) => navigateTo(view)}
      />
    </div>
  {:else if currentView === 'register-step2'}
    <div class="flex-1">
      <RegisterStep2
        userData={currentUser}
        fromProfile={scheduleReturnView === 'profile'}
        onBack={() => {
          const target = scheduleReturnView === 'profile' ? 'profile' : 'register';
          scheduleReturnView = 'dashboard';
          navigateTo(target);
        }}
        onSkip={() => {
          const target = scheduleReturnView === 'profile' ? 'profile' : 'dashboard';
          scheduleReturnView = 'dashboard';
          navigateTo(target);
        }}
        onFinish={handleRegisterFinish}
      />
    </div>
  {/if}

</div>
