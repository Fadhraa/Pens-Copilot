<script>
  import { onMount } from "svelte";
  import { supabase } from "./supabase.js";
  import { askPensCopilotStream, ingestMaterialDocument } from "./ai.js";
  import {
    parseAssistantContent,
    serializeAssistantContent,
  } from "./chatFormat.js";
  import {
    buildScheduleKey,
    dispatchReminderEmail,
    evaluateDueNotifications,
    evaluateDueTaskDeadlines,
    fetchNotificationStatus,
    getWibClock,
    loadAttendanceMap,
    loadNotifiedMap,
    normalizeWeekday,
    saveAttendanceMap,
    saveNotifiedMap,
    showBrowserNotification,
  } from "./notifications.js";
  import Sidebar from "./components/dashboard/Sidebar.svelte";
  import ChatWorkspace from "./components/dashboard/ChatWorkspace.svelte";
  import ProfileView from "./components/dashboard/ProfileView.svelte";
  import TasksView from "./components/dashboard/TasksView.svelte";
  import MaterialsView from "./components/dashboard/MaterialsView.svelte";
  import SubscriptionView from "./components/dashboard/SubscriptionView.svelte";
  import EtholToastBanner from "./components/dashboard/EtholToastBanner.svelte";
  import {
    getSubscriptionTier,
    getRagUsageState,
    incrementRagUsage,
    isSessionRagLocked,
  } from "./subscription.js";

  /**
   * @type {{
   *   user?: { id?: string, name?: string, nrp?: string, prodi?: string, email?: string, schedules?: Array<any> },
   *   activeSection?: 'chat' | 'profile' | 'tasks' | 'materials' | 'subscription',
   *   activeTaskTab?: 'all' | 'deadlines' | 'status',
   *   onNavigate?: (view: string, options?: { taskTab?: 'all' | 'deadlines' | 'status' }) => void,
   *   onLogout?: () => void
   * }}
   */
  let {
    user = { name: "Mahasiswa PENS", email: "mahasiswa@gmail.com" },
    activeSection = "chat",
    activeTaskTab = "all",
    onNavigate = () => {},
    onLogout = () => {},
  } = $props();

  let subscriptionTier = $state(getSubscriptionTier());
  let ragUsageState = $state(getRagUsageState());
  const isCurrentSessionRagLocked = $derived(
    isSessionRagLocked(activeSessionId, subscriptionTier)
  );

  let promptText = $state("");
  let searchQuery = $state("");
  let isSending = $state(false);
  let chatError = $state("");
  let selectedModel = $state("gemini-3.6-flash");
  let elapsedSeconds = $state(0);

  /** @type {string | number | null} */
  let deletingMessageId = $state(null);

  /** @type {string | null} */
  let activeSessionId = $state(null);
  /** @type {Array<{ id: string, title: string, created_at: string }>} */
  let chatSessions = $state([]);
  /** @type {Array<{ id: string | number, dbId?: string, sender: 'user' | 'assistant', text: string, card?: Record<string, any> | null, blocks?: Array<Record<string, any>> }>} */
  let messages = $state([]);

  /** @type {Array<any>} */
  let schedules = $state([]);
  /** @type {Array<any>} */
  let tasks = $state([]);
  /** @type {Array<{ id: string, title: string, subject?: string, created_at?: string }>} */
  let materials = $state([]);

  let isSavingTask = $state(false);
  let taskError = $state("");
  let isIngesting = $state(false);
  let ragStatus = $state("");
  let ragError = $state("");

  /** @type {string | null} */
  let authUserId = $state(null);

  /** @type {Array<Record<string, any>>} */
  let etholAlerts = $state([]);
  /** @type {Record<string, boolean>} */
  let attendedMap = $state(loadAttendanceMap());
  /** @type {Record<string, boolean>} */
  let notifiedMap = $state(loadNotifiedMap());
  let notificationPermission = $state(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  /** @type {{ emailConfigured: boolean, emailFrom: string } | null} */
  let emailStatus = $state(null);
  let isTestingNotif = $state(false);
  let notifTestFeedback = $state("");

  const todaySchedules = $derived.by(() => {
    const clock = getWibClock();
    return schedules
      .filter((s) => normalizeWeekday(s.day) === clock.normalizedDay)
      .map((s) => {
        const key = buildScheduleKey(s);
        return {
          key,
          subject: s.subject || "Mata Kuliah",
          time: s.time_range || s.time || "-",
          room: s.room || "",
          attended: Boolean(attendedMap[`${clock.dateKey}:${key}`]),
        };
      });
  });

  const filteredSessions = $derived(
    searchQuery.trim()
      ? chatSessions.filter((s) =>
          s.title.toLowerCase().includes(searchQuery.trim().toLowerCase()),
        )
      : chatSessions,
  );

  const urgentTasksCount = $derived(
    tasks.filter((t) => {
      if (t.status === "completed" || !t.deadline) return false;
      const ms = new Date(t.deadline).getTime();
      if (Number.isNaN(ms)) return false;
      return ms - Date.now() <= 48 * 60 * 60 * 1000;
    }).length,
  );

  async function refreshSchedules() {
    if (!authUserId) {
      schedules = user?.schedules || [];
      return;
    }

    const { data } = await supabase
      .from("schedules")
      .select("id, day, time_range, subject, lecturer, room")
      .eq("user_id", authUserId);

    schedules = data?.length ? data : user?.schedules || [];
    runNotificationCheck();
  }

  async function refreshTasks() {
    if (!authUserId) return;

    const { data } = await supabase
      .from("tasks")
      .select(
        "id, schedule_id, title, description, status, priority, deadline",
      )
      .eq("user_id", authUserId)
      .order("created_at", { ascending: false });

    if (data) tasks = data;
    runNotificationCheck();
  }

  async function runNotificationCheck() {
    const nowClock = getWibClock();
    const dueItems = schedules.length
      ? evaluateDueNotifications({
          schedules,
          nowClock,
          attendedMap,
          notifiedMap,
        })
      : [];
    const dueTaskItems = tasks.length
      ? evaluateDueTaskDeadlines({
          tasks,
          nowMs: Date.now(),
          notifiedMap,
        })
      : [];

    if (!dueItems.length && !dueTaskItems.length) return;

    const nextNotified = { ...notifiedMap };
    for (const item of dueItems) {
      nextNotified[item.slotLogKey] = true;
    }
    for (const taskItem of dueTaskItems) {
      nextNotified[taskItem.slotLogKey] = true;
    }
    notifiedMap = nextNotified;
    saveNotifiedMap(nextNotified);

    for (const item of dueItems) {
      const alertId = item.slotLogKey;
      const newAlert = {
        id: alertId,
        kind: /** @type {'schedule'} */ ("schedule"),
        scheduleKey: item.scheduleKey,
        subject: item.schedule.subject || "Mata Kuliah",
        time: item.schedule.time_range || item.schedule.time || "-",
        room: item.schedule.room || "",
        stageShortLabel: item.slot.shortLabel,
        stageLabel: item.slot.label,
        message: item.message,
        emailNote: user?.email
          ? `Mengirim email pengingat ke ${user.email}...`
          : "",
      };

      etholAlerts = [
        newAlert,
        ...etholAlerts.filter((a) => a.id !== alertId),
      ].slice(0, 4);

      showBrowserNotification({
        title: `${item.slot.shortLabel}: ${newAlert.subject}`,
        body: item.message,
        tag: alertId,
      });

      if (user?.email) {
        dispatchReminderEmail({
          toEmail: user.email,
          studentName: user?.name || "Mahasiswa PENS",
          schedule: item.schedule,
          stageLabel: item.slot.label,
          stageKey: item.slot.key,
          dateKey: nowClock.dateKey,
          message: item.message,
        })
          .then((res) => {
            const note =
              res?.mode === "gmail-smtp" || res?.mode === "resend"
                ? `Email terkirim ke ${user.email}`
                : res?.detail || "Tercatat di log server";
            etholAlerts = etholAlerts.map((a) =>
              a.id === alertId ? { ...a, emailNote: note } : a,
            );
          })
          .catch((err) => {
            const msg =
              err instanceof Error ? err.message : "Gagal mengirim email.";
            etholAlerts = etholAlerts.map((a) =>
              a.id === alertId ? { ...a, emailNote: `Email gagal: ${msg}` } : a,
            );
          });
      }
    }

    for (const taskItem of dueTaskItems) {
      const alertId = taskItem.slotLogKey;
      const linkedSchedule = schedules.find(
        (s) => s.id === taskItem.task.schedule_id,
      );
      const newAlert = {
        id: alertId,
        kind: /** @type {'task'} */ ("task"),
        taskId: taskItem.taskId,
        subject: taskItem.task.title || "Tugas Kuliah",
        time: taskItem.deadlineLabel,
        room: linkedSchedule?.subject || "",
        stageShortLabel: taskItem.shortLabel,
        stageLabel: taskItem.stageLabel,
        message: taskItem.message,
        emailNote: user?.email
          ? `Mengirim email pengingat ke ${user.email}...`
          : "",
      };

      etholAlerts = [
        newAlert,
        ...etholAlerts.filter((a) => a.id !== alertId),
      ].slice(0, 4);

      showBrowserNotification({
        title: `${taskItem.shortLabel}: ${newAlert.subject}`,
        body: taskItem.message,
        tag: alertId,
      });

      if (user?.email) {
        dispatchReminderEmail({
          toEmail: user.email,
          studentName: user?.name || "Mahasiswa PENS",
          schedule: {
            subject: `[Tugas] ${newAlert.subject}`,
            time_range: taskItem.deadlineLabel,
            room: linkedSchedule?.subject || "ETHOL PENS",
          },
          stageLabel: taskItem.stageLabel,
          stageKey: taskItem.stageKey,
          dateKey: nowClock.dateKey,
          message: taskItem.message,
        })
          .then((res) => {
            const note =
              res?.mode === "gmail-smtp" || res?.mode === "resend"
                ? `Email terkirim ke ${user.email}`
                : res?.detail || "Tercatat di log server";
            etholAlerts = etholAlerts.map((a) =>
              a.id === alertId ? { ...a, emailNote: note } : a,
            );
          })
          .catch((err) => {
            const msg =
              err instanceof Error ? err.message : "Gagal mengirim email.";
            etholAlerts = etholAlerts.map((a) =>
              a.id === alertId ? { ...a, emailNote: `Email gagal: ${msg}` } : a,
            );
          });
      }
    }
  }

  /** @param {string} scheduleKey */
  function handleMarkAttended(scheduleKey) {
    const clock = getWibClock();
    const key = `${clock.dateKey}:${scheduleKey}`;
    attendedMap = { ...attendedMap, [key]: true };
    saveAttendanceMap(attendedMap);
    etholAlerts = etholAlerts.filter((a) => a.scheduleKey !== scheduleKey);
  }

  /**
   * @param {string} taskId
   * @param {string} alertId
   */
  async function handleMarkTaskCompleted(taskId, alertId) {
    etholAlerts = etholAlerts.filter(
      (a) => a.id !== alertId && a.taskId !== taskId,
    );
    if (!taskId) return;
    await handleUpdateTask(taskId, { status: "completed" });
  }

  /** @param {string} alertId */
  function handleDismissAlert(alertId) {
    etholAlerts = etholAlerts.filter((a) => a.id !== alertId);
  }

  async function handleEnableBrowserNotif() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    notificationPermission = perm;
  }

  async function handleTestNotif() {
    isTestingNotif = true;
    notifTestFeedback = "";
    const clock = getWibClock();
    const sample = schedules.find(
      (s) => normalizeWeekday(s.day) === clock.normalizedDay,
    ) ||
      schedules[0] || {
        day: clock.dayName,
        time_range: "08:00 - 10:30",
        subject: "Workshop Pemrograman Web (Uji Coba)",
        lecturer: "Dosen Pengampu",
        room: "Lab Terpadu 304",
      };

    const alertId = `test-${Date.now()}`;
    const testMessage = `Uji coba pengingat presensi ETHOL untuk ${sample.subject}. Sistem aktif dengan pre-alert -15 menit dan 3 interval selama kelas.`;

    etholAlerts = [
      {
        id: alertId,
        scheduleKey: buildScheduleKey(sample),
        subject: sample.subject,
        time: sample.time_range || sample.time || "08:00 - 10:30",
        room: sample.room || "",
        stageShortLabel: "Uji Notifikasi",
        stageLabel: "Uji Notifikasi Web & Email",
        message: testMessage,
        emailNote: user?.email
          ? `Mengirim email uji ke ${user.email}...`
          : "Email user tidak ditemukan.",
        isTest: true,
      },
      ...etholAlerts,
    ].slice(0, 4);

    if (notificationPermission === "default") {
      await handleEnableBrowserNotif();
    }

    showBrowserNotification({
      title: `Uji Notifikasi ETHOL: ${sample.subject}`,
      body: testMessage,
      tag: alertId,
    });

    try {
      if (user?.email) {
        const res = await dispatchReminderEmail({
          toEmail: user.email,
          studentName: user?.name || "Mahasiswa PENS",
          schedule: sample,
          stageLabel: "Uji Notifikasi ETHOL",
          stageKey: "test",
          dateKey: clock.dateKey,
          message: testMessage,
          isTest: true,
        });
        const feedback =
          res?.mode === "gmail-smtp" || res?.mode === "resend"
            ? `Email uji terkirim ke ${user.email}`
            : res?.detail || "Tercatat di log terminal backend.";
        notifTestFeedback = feedback;
        etholAlerts = etholAlerts.map((a) =>
          a.id === alertId ? { ...a, emailNote: feedback } : a,
        );
      } else {
        notifTestFeedback = "Notifikasi web tampil (email akun belum diisi).";
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal uji email.";
      notifTestFeedback = msg;
      etholAlerts = etholAlerts.map((a) =>
        a.id === alertId ? { ...a, emailNote: msg } : a,
      );
    } finally {
      isTestingNotif = false;
    }
  }

  onMount(() => {
    let timer = null;

    (async () => {
      fetchNotificationStatus().then((st) => {
        if (st) emailStatus = st;
      });

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      authUserId = authUser?.id || user?.id || null;

      if (!authUserId) {
        schedules = user?.schedules || [];
        runNotificationCheck();
        return;
      }

      const [sessionsRes, schedulesRes, tasksRes, materialsRes] =
        await Promise.all([
          supabase
            .from("chat_sessions")
            .select("id, title, created_at")
            .eq("user_id", authUserId)
            .order("updated_at", { ascending: false })
            .limit(20),
          supabase
            .from("schedules")
            .select("id, day, time_range, subject, lecturer, room")
            .eq("user_id", authUserId),
          supabase
            .from("tasks")
            .select(
              "id, schedule_id, title, description, status, priority, deadline",
            )
            .eq("user_id", authUserId)
            .order("created_at", { ascending: false }),
          supabase
            .from("study_materials")
            .select("id, title, subject, created_at")
            .eq("user_id", authUserId)
            .order("created_at", { ascending: false }),
        ]);

      if (sessionsRes.data) chatSessions = sessionsRes.data;
      schedules = schedulesRes.data?.length
        ? schedulesRes.data
        : user?.schedules || [];
      if (tasksRes.data) tasks = tasksRes.data;
      if (materialsRes.data) materials = materialsRes.data;

      runNotificationCheck();
    })();

    timer = setInterval(runNotificationCheck, 20000);

    const handleSubChanged = (/** @type {CustomEvent} */ e) => {
      subscriptionTier = e.detail?.tier || getSubscriptionTier();
      ragUsageState = getRagUsageState(subscriptionTier);
    };
    const handleUsageUpdated = (/** @type {CustomEvent} */ e) => {
      ragUsageState = e.detail || getRagUsageState(subscriptionTier);
    };
    window.addEventListener("pens_subscription_changed", /** @type {EventListener} */ (handleSubChanged));
    window.addEventListener("pens_rag_usage_updated", /** @type {EventListener} */ (handleUsageUpdated));

    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener("pens_subscription_changed", /** @type {EventListener} */ (handleSubChanged));
      window.removeEventListener("pens_rag_usage_updated", /** @type {EventListener} */ (handleUsageUpdated));
    };
  });

  function startNewChat() {
    activeSessionId = null;
    messages = [];
    chatError = "";
    if (activeSection !== "chat") onNavigate("dashboard");
  }

  /** @param {string} sessionId */
  async function handleDeleteSession(sessionId) {
    chatError = "";
    if (authUserId) {
      const { error } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", authUserId);

      if (error) {
        chatError = `Gagal menghapus percakapan: ${error.message}`;
        return;
      }
    }

    chatSessions = chatSessions.filter((s) => s.id !== sessionId);
    if (activeSessionId === sessionId) {
      activeSessionId = null;
      messages = [];
    }
  }

  /** @param {string} sessionId */
  async function loadSession(sessionId) {
    activeSessionId = sessionId;
    chatError = "";
    if (activeSection !== "chat") onNavigate("dashboard");

    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, sender, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      chatError = error.message;
      return;
    }

    messages = (data || []).map((m) => {
      if (m.sender === "user") {
        return {
          id: m.id,
          dbId: m.id,
          sender: /** @type {'user'} */ ("user"),
          text: m.content,
          card: null,
          blocks: [],
        };
      }
      const parsed = parseAssistantContent(m.content);
      return {
        id: m.id,
        dbId: m.id,
        sender: /** @type {'assistant'} */ ("assistant"),
        text: parsed.text,
        card: parsed.card,
        blocks: parsed.blocks,
      };
    });
  }

  /** @param {SubmitEvent} [e] */
  async function handleSend(e) {
    if (e) e.preventDefault();
    const userText = promptText.trim();
    if (!userText || isSending) return;

    chatError = "";
    const historySnapshot = messages.map((m) => ({
      sender: m.sender,
      text: m.text,
    }));
    const userMsgId = Date.now();
    const assistantMsgId = userMsgId + 1;

    messages = [
      ...messages,
      {
        id: userMsgId,
        sender: /** @type {'user'} */ ("user"),
        text: userText,
        card: null,
      },
      {
        id: assistantMsgId,
        sender: /** @type {'assistant'} */ ("assistant"),
        text: "",
        card: null,
      },
    ];
    promptText = "";
    isSending = true;
    elapsedSeconds = 0;
    const elapsedTimer = setInterval(() => {
      elapsedSeconds += 1;
    }, 1000);

    const dbSessionPromise = (async () => {
      if (!authUserId) return null;
      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        const title =
          userText.length > 42 ? `${userText.slice(0, 42)}...` : userText;
        const { data: newSession, error: sessError } = await supabase
          .from("chat_sessions")
          .insert({ user_id: authUserId, title })
          .select("id, title, created_at")
          .single();

        if (!sessError && newSession) {
          currentSessionId = newSession.id;
          activeSessionId = newSession.id;
          chatSessions = [newSession, ...chatSessions];
        }
      } else {
        await supabase
          .from("chat_sessions")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", currentSessionId);
      }

      if (currentSessionId) {
        await supabase.from("chat_messages").insert({
          session_id: currentSessionId,
          user_id: authUserId,
          sender: "user",
          content: userText,
        });
      }
      return currentSessionId;
    })();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const {
        text: aiReply,
        card,
        blocks,
        schedulesUpdated,
        tasksUpdated,
        ragUsed,
      } = await askPensCopilotStream({
        prompt: userText,
        history: historySnapshot,
        userContext: {
          name: user?.name,
          nrp: user?.nrp,
          prodi: user?.prodi,
          schedules,
          tasks,
        },
        userId: authUserId,
        hasMaterials: materials.length > 0,
        accessToken: session?.access_token || null,
        model: selectedModel,
        tier: subscriptionTier,
        ragQuotaExceeded: ragUsageState.isLimitReached,
        onDelta: (_delta, accumulated) => {
          messages = messages.map((m) =>
            m.id === assistantMsgId ? { ...m, text: accumulated } : m,
          );
        },
        onCard: (nextCard, _schedUpd, _taskUpd, nextBlocks) => {
          if (nextCard || (Array.isArray(nextBlocks) && nextBlocks.length > 0)) {
            messages = messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    card: nextCard || m.card || null,
                    blocks:
                      Array.isArray(nextBlocks) && nextBlocks.length > 0
                        ? nextBlocks
                        : m.blocks || [],
                  }
                : m,
            );
          }
        },
      });

      const finalBlocks =
        Array.isArray(blocks) && blocks.length > 0
          ? blocks
          : aiReply
            ? [{ type: "markdown", content: aiReply }]
            : [];

      messages = messages.map((m) =>
        m.id === assistantMsgId
          ? {
              ...m,
              text: aiReply,
              card: card || m.card || null,
              blocks: finalBlocks.length > 0 ? finalBlocks : m.blocks || [],
            }
          : m,
      );

      if (schedulesUpdated) {
        await refreshSchedules();
      }
      if (tasksUpdated) {
        await refreshTasks();
      }
      if (ragUsed) {
        const targetSessionId = activeSessionId || (await dbSessionPromise) || null;
        incrementRagUsage(targetSessionId, subscriptionTier);
        ragUsageState = getRagUsageState(subscriptionTier);
      }

      const savedSessionId = await dbSessionPromise;
      if (authUserId && savedSessionId) {
        const serialized = serializeAssistantContent(aiReply, card, finalBlocks);
        const { data: insertedMsg } = await supabase
          .from("chat_messages")
          .insert({
            session_id: savedSessionId,
            user_id: authUserId,
            sender: "assistant",
            content: serialized,
          })
          .select("id")
          .single();

        if (insertedMsg?.id) {
          messages = messages.map((m) =>
            m.id === assistantMsgId ? { ...m, dbId: insertedMsg.id } : m,
          );
        }
      }
    } catch (err) {
      messages = messages.filter(
        (m) =>
          m.id !== assistantMsgId ||
          m.text.trim() !== "" ||
          m.card ||
          (Array.isArray(m.blocks) && m.blocks.length > 0),
      );
      chatError =
        err instanceof Error ? err.message : "Gagal terhubung ke backend AI.";
    } finally {
      clearInterval(elapsedTimer);
      isSending = false;
    }
  }

  /**
   * Apply confirmation/cancellation state to matching card and blocks[] and persist to chat_messages.
   * @param {string | number} messageId
   * @param {string} cardType
   * @param {'deleted' | 'cancelled'} nextStatus
   * @param {string} nextText
   */
  async function syncConfirmationMessage(messageId, cardType, nextStatus, nextText) {
    let updatedDbId = null;
    let updatedSerialized = "";

    messages = messages.map((m) => {
      if (m.id !== messageId) return m;
      const nextCard =
        m.card && m.card.type === cardType
          ? { ...m.card, status: nextStatus }
          : m.card || null;
      const hasBlocks = Array.isArray(m.blocks) && m.blocks.length > 0;
      const nextBlocks = hasBlocks
        ? (m.blocks || []).map((b, idx) => {
            if (b.type === cardType) return { ...b, status: nextStatus };
            if (idx === 0 && b.type === "markdown") {
              return { ...b, content: nextText };
            }
            return b;
          })
        : [];

      if (m.dbId) {
        updatedDbId = m.dbId;
        updatedSerialized = serializeAssistantContent(
          nextText,
          nextCard,
          nextBlocks.length > 0 ? nextBlocks : null,
        );
      }
      return {
        ...m,
        text: nextText,
        card: nextCard,
        blocks: nextBlocks.length > 0 ? nextBlocks : m.blocks || [],
      };
    });

    if (authUserId && updatedDbId && updatedSerialized) {
      await supabase
        .from("chat_messages")
        .update({ content: updatedSerialized })
        .eq("id", updatedDbId)
        .eq("user_id", authUserId);
    }
  }

  /**
   * @param {string | number} messageId
   * @param {Record<string, any>} scheduleItem
   */
  async function handleConfirmDeleteSchedule(messageId, scheduleItem) {
    if (!scheduleItem?.id) return;
    deletingMessageId = messageId;
    chatError = "";

    try {
      if (authUserId) {
        const { error: deleteErr } = await supabase
          .from("schedules")
          .delete()
          .eq("id", scheduleItem.id)
          .eq("user_id", authUserId);

        if (deleteErr) {
          throw new Error(`Gagal menghapus jadwal: ${deleteErr.message}`);
        }
        await refreshSchedules();
      }

      await syncConfirmationMessage(
        messageId,
        "schedule_delete_confirm",
        "deleted",
        `Jadwal mata kuliah "${scheduleItem.subject}" telah dihapus.`,
      );
    } catch (err) {
      chatError =
        err instanceof Error ? err.message : "Gagal menghapus jadwal kuliah.";
    } finally {
      deletingMessageId = null;
    }
  }

  /** @param {string | number} messageId */
  async function handleCancelDeleteSchedule(messageId) {
    await syncConfirmationMessage(
      messageId,
      "schedule_delete_confirm",
      "cancelled",
      "Penghapusan jadwal dibatalkan. Jadwal Anda tetap tersimpan.",
    );
  }

  /** @param {Record<string, any>} payload */
  async function handleCreateTask(payload) {
    if (!authUserId) {
      taskError = "Silakan login dengan akun terdaftar untuk menyimpan tugas.";
      return false;
    }

    isSavingTask = true;
    taskError = "";
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: authUserId,
          title: payload.title,
          description: payload.description || null,
          schedule_id: payload.schedule_id || null,
          priority: payload.priority || "medium",
          status: payload.status || "pending",
          deadline: payload.deadline || null,
        })
        .select(
          "id, schedule_id, title, description, status, priority, deadline",
        )
        .single();

      if (error) {
        throw new Error(`Gagal menambah tugas: ${error.message}`);
      }
      if (data) {
        tasks = [data, ...tasks];
      }
      runNotificationCheck();
      return true;
    } catch (err) {
      taskError = err instanceof Error ? err.message : "Gagal menyimpan tugas.";
      return false;
    } finally {
      isSavingTask = false;
    }
  }

  /**
   * @param {string} taskId
   * @param {Record<string, any>} payload
   */
  async function handleUpdateTask(taskId, payload) {
    if (!authUserId) {
      taskError = "Silakan login untuk mengubah tugas.";
      return false;
    }

    isSavingTask = true;
    taskError = "";
    try {
      const updateBody = { ...payload, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from("tasks")
        .update(updateBody)
        .eq("id", taskId)
        .eq("user_id", authUserId)
        .select(
          "id, schedule_id, title, description, status, priority, deadline",
        )
        .single();

      if (error) {
        throw new Error(`Gagal memperbarui tugas: ${error.message}`);
      }
      if (data) {
        tasks = tasks.map((t) => (t.id === taskId ? data : t));
      }
      if (payload.status === "completed") {
        etholAlerts = etholAlerts.filter((a) => a.taskId !== taskId);
      } else {
        runNotificationCheck();
      }
      return true;
    } catch (err) {
      taskError =
        err instanceof Error ? err.message : "Gagal memperbarui tugas.";
      return false;
    } finally {
      isSavingTask = false;
    }
  }

  /** @param {string} taskId */
  async function handleDeleteTask(taskId) {
    if (!authUserId) return;
    taskError = "";
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", authUserId);

    if (error) {
      taskError = `Gagal menghapus tugas: ${error.message}`;
      return;
    }
    tasks = tasks.filter((t) => t.id !== taskId);
    etholAlerts = etholAlerts.filter((a) => a.taskId !== taskId);
  }

  /**
   * @param {string | number} messageId
   * @param {Record<string, any>} taskItem
   */
  async function handleConfirmDeleteTask(messageId, taskItem) {
    if (!taskItem?.id) return;
    deletingMessageId = messageId;
    chatError = "";

    try {
      if (authUserId) {
        const { error: deleteErr } = await supabase
          .from("tasks")
          .delete()
          .eq("id", taskItem.id)
          .eq("user_id", authUserId);

        if (deleteErr) {
          throw new Error(`Gagal menghapus tugas: ${deleteErr.message}`);
        }
        await refreshTasks();
        etholAlerts = etholAlerts.filter((a) => a.taskId !== taskItem.id);
      }

      await syncConfirmationMessage(
        messageId,
        "task_delete_confirm",
        "deleted",
        `Tugas "${taskItem.title}" telah dihapus.`,
      );
    } catch (err) {
      chatError =
        err instanceof Error ? err.message : "Gagal menghapus tugas.";
    } finally {
      deletingMessageId = null;
    }
  }

  /** @param {string | number} messageId */
  async function handleCancelDeleteTask(messageId) {
    await syncConfirmationMessage(
      messageId,
      "task_delete_confirm",
      "cancelled",
      "Penghapusan tugas dibatalkan. Tugas Anda tetap tersimpan.",
    );
  }

  /**
   * @param {{
   *   title: string,
   *   subject: string,
   *   fileData?: string,
   *   mimeType?: string,
   *   fileName?: string,
   *   rawText?: string
   * }} payload
   */
  async function handleIngestMaterialDocument(payload) {
    if (!authUserId) {
      ragError =
        "Silakan login dengan akun terdaftar untuk menyimpan materi RAG.";
      return false;
    }

    isIngesting = true;
    ragStatus = "";
    ragError = "";
    try {
      const { material, chunkCount, charCount, truncated } =
        await ingestMaterialDocument({
          ...payload,
          userId: authUserId,
          tier: subscriptionTier,
        });
      materials = [material, ...materials];
      const truncNote = truncated
        ? " (sebagian akhir teks dipotong ke maks 40 chunk agar ringan)"
        : "";
      ragStatus = `Tersimpan! ${chunkCount} chunk vektor RAG dibuat dari ${charCount} karakter${truncNote}.`;
      return true;
    } catch (err) {
      ragError =
        err instanceof Error ? err.message : "Gagal memproses materi RAG.";
      return false;
    } finally {
      isIngesting = false;
    }
  }

  /** @param {string} materialId */
  async function handleDeleteMaterial(materialId) {
    if (!authUserId) return;
    ragError = "";
    ragStatus = "";
    const { error } = await supabase
      .from("study_materials")
      .delete()
      .eq("id", materialId)
      .eq("user_id", authUserId);

    if (error) {
      ragError = `Gagal menghapus materi: ${error.message}`;
      return;
    }
    materials = materials.filter((m) => m.id !== materialId);
  }
</script>

<div class="flex h-screen w-full overflow-hidden font-sans">
  <Sidebar
    {user}
    bind:searchQuery
    sessions={filteredSessions}
    {activeSessionId}
    {activeSection}
    {activeTaskTab}
    {urgentTasksCount}
    materialsCount={materials.length}
    {subscriptionTier}
    onStartNewChat={startNewChat}
    onSelectSession={loadSession}
    onDeleteSession={handleDeleteSession}
    onOpenTasks={(tab) => onNavigate("tasks", { taskTab: tab })}
    onOpenMaterials={() => onNavigate("materials")}
    onOpenSubscription={() => onNavigate("subscription")}
    {todaySchedules}
    {notificationPermission}
    {emailStatus}
    {isTestingNotif}
    {notifTestFeedback}
    onEnableBrowserNotif={handleEnableBrowserNotif}
    onMarkAttended={handleMarkAttended}
    onTestNotif={handleTestNotif}
    onOpenProfile={() => onNavigate("profile")}
    {onLogout}
  />

  <EtholToastBanner
    alerts={etholAlerts}
    onMarkAttended={handleMarkAttended}
    onMarkTaskCompleted={handleMarkTaskCompleted}
    onDismiss={handleDismissAlert}
  />

  <main
    class="flex-1 bg-pens-canvas-gradient bg-pens-figma-grid relative flex flex-col justify-between p-6 sm:p-10 overflow-hidden"
  >
    <div
      class="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#FF8500]/15 rounded-full blur-3xl pointer-events-none"
    ></div>

    {#if activeSection === "profile"}
      <ProfileView
        {user}
        {schedules}
        onBackToChat={() => onNavigate("dashboard")}
        onUploadSchedule={() => onNavigate("register-step2")}
      />
    {:else if activeSection === "tasks"}
      <TasksView
        {tasks}
        {schedules}
        activeTab={activeTaskTab}
        isSaving={isSavingTask}
        {taskError}
        onTabChange={(tab) => onNavigate("tasks", { taskTab: tab })}
        onBackToChat={() => onNavigate("dashboard")}
        onCreateTask={handleCreateTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />
    {:else if activeSection === "materials"}
      <MaterialsView
        {materials}
        {schedules}
        {isIngesting}
        {ragStatus}
        {ragError}
        {subscriptionTier}
        onBackToChat={() => onNavigate("dashboard")}
        onIngestMaterial={handleIngestMaterialDocument}
        onDeleteMaterial={handleDeleteMaterial}
        onOpenSubscription={() => onNavigate("subscription")}
      />
    {:else if activeSection === "subscription"}
      <SubscriptionView
        currentTier={subscriptionTier}
        materialsCount={materials.length}
        onBackToChat={() => onNavigate("dashboard")}
        onTierChanged={(nextTier) => {
          subscriptionTier = nextTier;
          ragUsageState = getRagUsageState(nextTier);
        }}
      />
    {:else}
      <ChatWorkspace
        {messages}
        bind:promptText
        bind:selectedModel
        {isSending}
        {elapsedSeconds}
        {chatError}
        materialsCount={materials.length}
        {subscriptionTier}
        isSessionRagLocked={isCurrentSessionRagLocked}
        ragUsageCount={ragUsageState.count}
        {deletingMessageId}
        onSend={handleSend}
        onOpenMaterials={() => onNavigate("materials")}
        onOpenScheduleManager={() => onNavigate("register-step2")}
        onOpenProfile={() => onNavigate("profile")}
        onOpenTasks={() => onNavigate("tasks")}
        onStartNewChat={startNewChat}
        onOpenSubscription={() => onNavigate("subscription")}
        onConfirmDeleteSchedule={handleConfirmDeleteSchedule}
        onCancelDeleteSchedule={handleCancelDeleteSchedule}
        onConfirmDeleteTask={handleConfirmDeleteTask}
        onCancelDeleteTask={handleCancelDeleteTask}
      />
    {/if}
  </main>
</div>
