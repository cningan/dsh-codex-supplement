window.__ModuleLoader__.load({
  id: "@cningan/dsh-codex-supplement",
  factory: (require) => {
    const createCodexOAuth = (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const h = React.createElement;

    // The sole supported provider; retained in the Client package for stable presentation.
    const PROVIDERS = [
      { id: "codex", displayName: "ChatGPT / Codex" },
    ];

    const dictionaries = {
      zh: {
        oauthTitle: "Codex 订阅",
        oauthIntro: "登录 ChatGPT/Codex 订阅；普通模型由官方 Models 页管理。",
        signedIn: "已登录",
        signedOut: "未登录",
        checking: "检查中…",
        login: "登录",
        logout: "退出",
        working: "处理中…",
        loginPending: "授权中…",
        weeklyLimit: "每周额度",
        fiveHourLimit: "5 小时额度",
        usageWindow: "额度窗口",
        accountsHeading: "账号",
        noAccounts: "还没有账号",
        requestFailed: "请求失败",
        diagnostic: "诊断：",
        submit: "提交",
        manualCodeHint: "打开官方授权页完成授权后，粘贴回调地址或授权码：",
        manualCodePlaceholder: "粘贴授权码 / 回调地址",
        deviceTitle: "官方授权码（device code）",
        deviceWaiting: "官方授权页已打开；完成验证后系统会自动检测成功并登录（无需粘贴代码）。",
        deviceOpen: "重新打开官方授权页",
        codexSearch: "联网搜索",
        codexSearchHint: "切换 dsh 网页搜索 provider；会写入 web 配置。",
        codexSearchOn: "已开启",
        codexSearchOff: "已关闭",
        searchEnable: "开启搜索",
        searchDisable: "关闭搜索",
        rowUnavailable: "组件未启用",
        searchRowHint: "搜索是独立的 codex-supplement-search 组件行；在设置 → 插件中启用它。",
        fastModeLocationHint: "Fast Mode 在对话输入框右侧按模型切换。",
        codexFastMode: "Fast mode",
        codexFastModeHint: "service_tier=priority，更快但额度消耗更快。",
        codexUsageTitle: "用量 / 额度",
        codexUsageUnavailable: "用量不可用（未登录或接口失败）",
        codexUsageWindow: "额度窗口",
        codexUsageReset: "重置时间",
        codexUsageRemaining: "剩余",
        codexUsageError: "用量读取失败：",
        codexPlan: "套餐",
        codexQuotaButton: "额度 {percent}%",
        codexQuotaTitle: "额度详情",
        codexQuotaUnavailable: "额度 —",
        fastModeEnabledTitle: "当前：1.5 倍速度，额度消耗更快。点击切换到标准速度",
        fastModeDisabledTitle: "当前：标准速度。点击开启 1.5 倍速度",
        fastModeLoadingTitle: "正在加载此对话的 Fast mode 状态",
        fastModeUnavailableTitle: "此对话暂时无法使用 Fast mode",
      },
      en: {
        oauthTitle: "Codex Subscription",
        oauthIntro: "Sign in with ChatGPT/Codex; manage normal models on the official Models page.",
        signedIn: "Signed in",
        signedOut: "Not signed in",
        checking: "Checking…",
        login: "Sign in",
        logout: "Sign out",
        working: "Working…",
        loginPending: "Authorizing…",
        weeklyLimit: "Weekly quota",
        fiveHourLimit: "5-hour quota",
        usageWindow: "Usage window",
        accountsHeading: "Accounts",
        noAccounts: "No accounts yet",
        requestFailed: "Request failed",
        diagnostic: "Diagnostic: ",
        submit: "Submit",
        manualCodeHint: "After authorizing in the official page, paste the callback URL or authorization code here:",
        manualCodePlaceholder: "Paste authorization code / callback URL",
        deviceTitle: "Official authorization code (device code)",
        deviceWaiting: "The official authorization page is open; it will auto-detect completion and sign you in (no need to paste codes).",
        deviceOpen: "Reopen the official authorization page",
        codexSearch: "Web search",
        codexSearchHint: "On: switches DSH web search to ChatGPT (writes the web config). Off keeps the official DeepSeek search.",
        codexSearchOn: "On",
        codexSearchOff: "Off",
        searchEnable: "Enable search",
        searchDisable: "Disable search",
        rowUnavailable: "Component disabled",
        searchRowHint: "Search is a separate codex-supplement-search component row; enable it in Settings → Plugins.",
        fastModeLocationHint: "Fast Mode is toggled per model in the conversation input toolbar.",
        codexFastMode: "Fast mode",
        codexFastModeHint: "service_tier=priority; faster but consumes quota quicker.",
        codexUsageTitle: "Usage / quota",
        codexUsageUnavailable: "Usage unavailable (signed out or endpoint failed)",
        codexUsageWindow: "Usage window",
        codexUsageReset: "Resets",
        codexUsageRemaining: "Remaining",
        codexPlan: "Plan",
        codexQuotaButton: "Quota {percent}%",
        codexQuotaTitle: "Quota details",
        codexQuotaUnavailable: "Quota —",
        codexUsageError: "Usage fetch failed:",
        fastModeEnabledTitle: "Current: 1.5x speed, with faster quota consumption. Click to switch to Standard speed.",
        fastModeDisabledTitle: "Current: Standard speed. Click to enable 1.5x speed.",
        fastModeLoadingTitle: "Fast mode state is loading for this conversation.",
        fastModeUnavailableTitle: "Fast mode is unavailable for this conversation.",
      },
    };

    async function jsonRequest(path, method, body, signal) {
      const response = await fetch(path, {
        method: method || "GET",
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      return payload;
    }

    // 照官方 dsh-openai-auth client.js 的展示形态：codex 卡片增强（联网搜索开关 / 用量额度 / Fast mode）。
    function windowLabel(usage, t) {
      const seconds = Number(usage && usage.windowSeconds);
      if (Number.isFinite(seconds) && seconds >= 6.5 * 86400 && seconds <= 7.5 * 86400) return t("weeklyLimit");
      if (Number.isFinite(seconds) && seconds >= 4.5 * 3600 && seconds <= 5.5 * 3600) return t("fiveHourLimit");
      return t("usageWindow");
    }
    function planLabel(planType) {
      if (typeof planType !== "string" || planType.trim() === "") return "";
      const normalized = planType.toLowerCase().replace(/[\s_-]+/g, "");
      if (normalized === "prolite") return "Pro Lite";
      if (normalized === "plus") return "Plus";
      if (normalized === "pro") return "Pro";
      if (normalized === "team") return "Team";
      return planType;
    }
    function remainingPercent(usage) {
      const used = Number(usage && usage.usedPercent);
      if (!Number.isFinite(used)) return null;
      return Math.max(0, Math.min(100, 100 - used));
    }
    function formatResetAt(usage) {
      const at = Number(usage && usage.resetAt);
      // 1970/陈旧时间戳（接口异常）→ 不显示；合理重置时间应 ≥2022-01-01
      if (!Number.isFinite(at) || at <= 0 || at < 1640995200000) return "";
      try { return new Date(at).toLocaleString(); } catch { return ""; }
    }

    function CodexExtras({ status, search, refreshSearch, t }) {
      const [busy, setBusy] = React.useState(false);
      const usage = status.usage;
      const base = { minHeight: 30, padding: "4px 12px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 14, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", font: "inherit", fontSize: 12, cursor: "pointer" };
      const card = { display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", borderRadius: 10, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-1)" };
      const heading = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-label-primary)" };
      const pill = { padding: "2px 8px", borderRadius: 999, fontSize: 11, background: "var(--dsw-alias-bg-layer-3)", color: "var(--dsw-alias-label-secondary)" };

      const toggleSearch = async () => {
        setBusy(true);
        try {
          await jsonRequest("/plugins/dsh-codex-supplement/codex/search", "POST", { enabled: !search.enabled });
          await refreshSearch();
        } catch (cause) {
          window.alert(cause instanceof Error ? cause.message : String(cause));
        } finally { setBusy(false); }
      };

      const windows = usage ? [usage.primary, usage.secondary].filter(Boolean) : [];

      return h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 } },
        h("div", { style: card },
          h("div", { style: heading },
            h("span", {}, t("codexSearch")),
            h("span", { style: pill }, search.available === false ? t("rowUnavailable") : search.enabled ? t("codexSearchOn") : t("codexSearchOff"))),
          h("p", { style: { margin: 0, fontSize: 11, color: "var(--dsw-alias-label-tertiary)", lineHeight: 1.5 } }, t("codexSearchHint")),
          h("button", { type: "button", disabled: busy || search.available === false, onClick: () => void toggleSearch(), style: { ...base, alignSelf: "flex-start", cursor: busy || search.available === false ? "default" : "pointer" } },
            busy ? t("working") : search.available === false ? t("rowUnavailable") : search.enabled ? t("searchDisable") : t("searchEnable")),
          search.available === false ? h("p", { style: { margin: 0, fontSize: 11, color: "var(--dsw-alias-label-tertiary)" } }, t("searchRowHint")) : null),
        h("div", { style: card },
          h("div", { style: heading },
            h("span", {}, t("codexUsageTitle")),
            usage?.planType ? h("span", { style: pill }, `${t("codexPlan")}: ${planLabel(usage.planType)}`) : null),
          windows.length > 0
            ? h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
                h("div", { style: { height: 7, borderRadius: 999, overflow: "hidden", background: "var(--dsw-alias-bg-layer-3)" } },
                  h("div", { style: { height: "100%", width: `${Math.max(0, Math.min(100, remainingPercent(windows[0])))}%`, background: "var(--dsw-alias-brand-primary)" } })),
                windows.map((w) => h("div", { key: `${String(w.windowSeconds)}-${String(w.planType)}`, style: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, color: "var(--dsw-alias-label-secondary)" } },
                  h("span", {}, windowLabel(w, t)),
                  h("span", {}, `${Math.round(remainingPercent(w))}% · ${formatResetAt(w) || "—"}`))),
              )
            : h("p", { style: { margin: 0, fontSize: 11, color: "var(--dsw-alias-label-tertiary)" } },
                status.usageError ? `${t("codexUsageError")}${status.usageError}` : t("codexUsageUnavailable")),
          h("span", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary)" } }, t("fastModeLocationHint"))),
      );
    }

    function ProviderCard({ provider, t }) {
      const [status, setStatus] = React.useState({ loggedIn: false, loginPending: false, accounts: [] });
      const [search, setSearch] = React.useState({ enabled: false, available: true });
      const [loading, setLoading] = React.useState(true);
      const [busy, setBusy] = React.useState(false);
      const [open, setOpen] = React.useState(true);
      const [manual, setManual] = React.useState(false);
      const [code, setCode] = React.useState("");

      const refreshSearch = React.useCallback(async () => {
        try {
          const next = await jsonRequest("/plugins/dsh-codex-supplement/codex/search/status");
          setSearch({ enabled: next.enabled === true, available: next.available !== false });
        } catch {
          setSearch({ enabled: false, available: false });
        }
      }, []);

      const refresh = React.useCallback(async () => {
        try {
          const [next] = await Promise.all([
            jsonRequest(`/plugins/dsh-codex-supplement/${provider.id}/status`),
            refreshSearch(),
          ]);
          setStatus(next);
          return next;
        } catch (cause) {
          setStatus({ loggedIn: false, accounts: [], loginError: cause instanceof Error ? cause.message : String(cause) });
          return null;
        } finally {
          setLoading(false);
        }
      }, [provider.id, refreshSearch]);

      React.useEffect(() => { void refresh(); }, [refresh]);
      React.useEffect(() => { if (open) void refresh(); }, [open, refresh]);
      // 授权进行中 → 周期轮询登录结果
      React.useEffect(() => {
        if (!status.loginPending) return undefined;
        const timer = window.setInterval(() => void refresh(), 1500);
        return () => window.clearInterval(timer);
      }, [status.loginPending, refresh]);

      const login = async () => {
        setBusy(true);
        try {
          const result = await jsonRequest(`/plugins/dsh-codex-supplement/${provider.id}/login`, "POST");
          if (result?.authorizationUrl) {
            const popup = window.open("about:blank", `dsh-codex-supplement-auth-${provider.id}`, "popup,width=680,height=780");
            if (popup === null) { window.location.href = result.authorizationUrl; }
            else { popup.opener = null; popup.location.replace(result.authorizationUrl); }
          }
          if (result?.status === "pending" || result?.sessionId) setStatus((v) => ({ ...v, loginPending: true }));
          if (result?.authorizationCodeRequired) setManual(true);
          if (result?.error) setStatus((v) => ({ ...v, loginError: result.error }));
          setTimeout(() => void refresh(), 600);
        } catch (cause) {
          setStatus((v) => ({ ...v, loginError: cause instanceof Error ? cause.message : String(cause) }));
        } finally { setBusy(false); }
      };
      const submitCode = async () => {
        if (!code.trim()) return;
        setBusy(true);
        try {
          await jsonRequest(`/plugins/dsh-codex-supplement/${provider.id}/submit-code`, "POST", { code: code.trim() });
          setCode(""); setManual(false); await refresh();
        } catch (cause) {
          setStatus((v) => ({ ...v, loginError: cause instanceof Error ? cause.message : String(cause) }));
        } finally { setBusy(false); }
      };
      const logout = async () => {
        setBusy(true);
        try { await jsonRequest(`/plugins/dsh-codex-supplement/${provider.id}/logout`, "POST"); await refresh(); }
        catch { /* 占位 */ }
        finally { setBusy(false); }
      };

      const accounts = Array.isArray(status.accounts) ? status.accounts : [];
      const deviceSession = status?.loginSession && status.loginSession.userCode ? status.loginSession : null;
      const diag = [status.loginError].filter(Boolean).join("；");
      const stateText = loading ? t("checking") : status.loggedIn ? t("signedIn") : status.loginPending ? t("loginPending") : t("signedOut");

      const base = { minHeight: 32, padding: "5px 14px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 16, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", font: "inherit", fontSize: 13, cursor: "pointer" };
      const primary = { ...base, borderColor: "var(--dsw-alias-brand-primary)", background: "var(--dsw-alias-brand-primary)", color: "#fff" };

      return h("div", { style: { overflow: "hidden", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 10, background: "var(--dsw-alias-bg-module-platform)" } },
        h("button", { type: "button", "aria-expanded": open, onClick: () => setOpen(!open), style: { boxSizing: "border-box", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, border: 0, padding: "13px 14px", background: "transparent", color: "var(--dsw-alias-label-primary)", font: "inherit", textAlign: "left", cursor: "pointer" } },
          h("span", { style: { display: "flex", minWidth: 0, flexDirection: "column", gap: 3 } },
            h("span", { style: { fontSize: 14, lineHeight: "20px", fontWeight: 600 } }, provider.displayName),
            h("span", { style: { fontSize: 13, lineHeight: "18px", color: "var(--dsw-alias-label-tertiary)" } }, stateText),
          ),
          h("span", { "aria-hidden": "true", style: { color: "var(--dsw-alias-label-tertiary)", transition: "transform 160ms ease", transform: open ? "rotate(180deg)" : "none" } }, "▾"),
        ),
        open ? h("div", { style: { borderTop: "1px solid var(--dsw-alias-border-l2)", padding: "16px 14px 18px", display: "flex", flexDirection: "column", gap: 14 } },
          h("div", { style: { display: "flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 500, color: "var(--dsw-alias-label-primary)" } },
            h("span", { "aria-hidden": "true", style: { width: 9, height: 9, borderRadius: "50%", background: status.loggedIn ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-label-caption)" } }),
            h("span", { role: "status" }, stateText),
          ),
          h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            status.loggedIn
              ? h("button", { type: "button", disabled: busy || loading, onClick: () => void logout(), style: base }, busy ? t("working") : t("logout"))
              : h("button", { type: "button", disabled: busy || loading, onClick: () => void login(), style: primary }, busy ? t("working") : t("login")),
          ),
          // Codex device-code authorization status (display the code and verification link while polling).
          deviceSession && !status.loggedIn ? h("div", { style: { display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--dsw-alias-state-business-primary)", background: "var(--dsw-alias-state-business-tertiary)" } },
            h("div", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--dsw-alias-label-primary)" } },
              h("span", {}, t("deviceTitle")),
              deviceSession.userCode ? h("strong", { style: { fontSize: 14, letterSpacing: 2 } }, deviceSession.userCode) : null,
            ),
            h("p", { style: { margin: 0, fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, t("deviceWaiting")),
            h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
              h("a", { href: deviceSession.authorizationUrl, target: "_blank", rel: "noreferrer", style: { fontSize: 12, color: "var(--dsw-alias-state-business-primary)" } }, t("deviceOpen")),
            ),
          ) : null,
          manual && !status.loggedIn ? h("div", { style: { display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-2)" } },
            h("p", { style: { margin: 0, fontSize: 12, color: "var(--dsw-alias-label-tertiary)" } }, t("manualCodeHint")),
            h("div", { style: { display: "flex", gap: 8 } },
              h("input", { value: code, onChange: (e) => setCode(e.target.value), placeholder: t("manualCodePlaceholder"), style: { flex: 1, minWidth: 0, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", font: "inherit", fontSize: 12 } }),
              h("button", { type: "button", disabled: busy || !code.trim(), onClick: () => void submitCode(), style: base }, busy ? t("working") : t("submit")),
            ),
          ) : null,
          diag ? h("p", { role: "alert", style: { margin: 0, fontSize: 12, color: "var(--dsw-alias-label-tertiary)", overflowWrap: "anywhere" } }, `${t("diagnostic")}${diag}`) : null,
          accounts.length > 0
            ? h("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
                h("h4", { style: { margin: 0, fontSize: 13, fontWeight: 600, color: "var(--dsw-alias-label-primary)" } }, t("accountsHeading")),
                accounts.map((account) => h("span", { key: account.accountId, style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, account.email || account.displayName || account.accountId)),
              )
            : null,
          provider.id === "codex" ? h(CodexExtras, { status, search, refreshSearch, t }) : null,
        ) : null,
      );
    }

    function CodexSettingsIcon({ size = 16, active = false }) {
      return h("svg", {
        width: size,
        height: size,
        viewBox: "0 0 16 16",
        fill: "none",
        "aria-hidden": "true",
        style: { display: "block" },
      },
        h("path", {
          d: "M7.4 1.8c.5 2.7 1.15 3.35 3.85 3.85-2.7.5-3.35 1.15-3.85 3.85-.5-2.7-1.15-3.35-3.85-3.85 2.7-.5 3.35-1.15 3.85-3.85Z",
          stroke: "currentColor",
          strokeWidth: 1.35,
          strokeLinejoin: "round",
          fill: active ? "currentColor" : "none",
          fillOpacity: active ? 0.14 : 0,
        }),
        h("circle", { cx: 12.9, cy: 3.7, r: 1.15, fill: "currentColor" }),
        h("path", {
          d: "M12.2 9.6c.2 1.15.5 1.45 1.65 1.65-1.15.2-1.45.5-1.65 1.65-.2-1.15-.5-1.45-1.65-1.65 1.15-.2 1.45-.5 1.65-1.65Z",
          fill: "currentColor",
        }));
    }

    function OAuthSection({ t, media }) {
      return h("div", { style: { display: "flex", flexDirection: "column", gap: 14 } },
        h("div", { style: { display: "flex", flexDirection: "column", gap: 4 } },
          h("h3", { style: { margin: 0, fontSize: 17, fontWeight: 650, color: "var(--dsw-alias-label-primary)" } }, t("oauthTitle")),
          h("p", { style: { margin: 0, fontSize: 13, color: "var(--dsw-alias-label-secondary)" } }, t("oauthIntro"))),
        PROVIDERS.map((provider) => h(ProviderCard, { key: provider.id, provider, t })),
        media?.Section ? h(media.Section, { t: media.t, configScope: media.configScope }) : null,
      );
    }

    // ---- 对话级 Fast mode 切换（conversation.input.right 官方槽位）----
    // 照 dsh-openai-auth/client.js OpenAIGptFastModeToggle（250-382 行）原样移植，
    // 适配点：①路径 /plugins/dsh-codex-supplement/codex/fast-mode；②provider id 见 CODEX_PROVIDERS；
    // ③数据标记 data-dsh-codex-supplement-auth-fast-mode；④eligible 只按 provider 判定（见 isCodexModel 注）。
    const CODEX_PROVIDER = "codex";
    // 2026-09-22：codex 对话改走官方 llm-pi-ai 的 openai-codex 路由后，模型选择器里的
    // provider id 变成官方路由键 `openai-codex`（profile patch 的 llm-pi-ai.providers 键）；
    // 本插件自管的旧路由键 `codex` 已退役但保留（回退时用），故两者都视为 codex 对话。
    const CODEX_PROVIDERS = Object.freeze([CODEX_PROVIDER, "openai-codex"]);
    const FAST_MODE_PATH = "/plugins/dsh-codex-supplement/codex/fast-mode";

    function readFastModeEnabled(value) {
      return value && typeof value === "object" && typeof value.enabled === "boolean"
        ? value.enabled
        : undefined;
    }

    // 当前对话是否为 codex（ChatGPT/GPT 订阅）模型（照旧插件 isCodexGptModel）。
    // 适配点：旧插件额外要求模型 id 以 gpt- 开头（其 openai-codex 目录含非 GPT 模型）；
    // 官方 openai-codex 目录（对齐 pi-ai openai-codex.json）全部是 codex 模型，
    // 且 host fast-mode 注册表按模型 id 字符串键控（不限 gpt-*），故只按 provider 判定。
    // ⚠️ Fast mode 的注入器按**模型 id**匹配（service_tier 只认可 codex 端点 + 已开启的模型 id），
    // 这里的 provider 判定只决定「按钮是否出现」，两者不要混用。
    function isCodexModel(state) {
      const current = state && state.current;
      return Boolean(current && CODEX_PROVIDERS.includes(current.provider)
        && typeof current.model === "string");
    }

    function FastModeButton({ directory, t }) {
      const directoryState = React.useSyncExternalStore(
        (listener) => directory.subscribe(listener),
        () => directory.getSnapshot(),
        () => directory.getSnapshot(),
      );
      const eligible = isCodexModel(directoryState);
      const modelId = eligible ? directoryState.current.model : "";
      const [state, setState] = React.useState({ status: "loading", enabled: false });
      const [tooltipVisible, setTooltipVisible] = React.useState(false);
      const controllerRef = React.useRef(undefined);
      const tooltipId = React.useId();

      // 每次模型切换（eligible/modelId 变化）重新读取该模型的 Fast mode 状态（旧插件原样）
      React.useEffect(() => {
        controllerRef.current?.abort();
        controllerRef.current = undefined;
        if (!eligible) {
          setState({ status: "loading", enabled: false });
          return undefined;
        }
        const controller = new AbortController();
        controllerRef.current = controller;
        let disposed = false;
        setState({ status: "loading", enabled: false });
        void (async () => {
          try {
            const payload = await jsonRequest(`${FAST_MODE_PATH}?model=${encodeURIComponent(modelId)}`, undefined, undefined, controller.signal);
            const enabled = readFastModeEnabled(payload);
            if (!disposed && !controller.signal.aborted) {
              setState(enabled === undefined ? { status: "error", enabled: false } : { status: "ready", enabled });
            }
          } catch {
            if (!disposed && !controller.signal.aborted) setState({ status: "error", enabled: false });
          } finally {
            if (controllerRef.current === controller) controllerRef.current = undefined;
          }
        })();
        return () => {
          disposed = true;
          controller.abort();
          if (controllerRef.current === controller) controllerRef.current = undefined;
        };
      }, [eligible, modelId]);

      // Only render for Codex models, not for conversations owned by other providers.
      if (!eligible) return null;
      const busy = state.status !== "ready";
      const title = state.status === "loading"
        ? t("fastModeLoadingTitle")
        : state.status === "error"
          ? t("fastModeUnavailableTitle")
          : state.enabled
            ? t("fastModeEnabledTitle")
            : t("fastModeDisabledTitle");

      const toggle = () => {
        if (busy) return;
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        const next = !state.enabled;
        setState((current) => ({ ...current, status: "loading" }));
        void (async () => {
          try {
            const payload = await jsonRequest(FAST_MODE_PATH, "POST", { model: modelId, enabled: next }, controller.signal);
            const enabled = readFastModeEnabled(payload);
            if (!controller.signal.aborted) {
              setState(enabled === undefined ? { status: "error", enabled: state.enabled } : { status: "ready", enabled });
            }
          } catch {
            if (!controller.signal.aborted) setState({ status: "error", enabled: state.enabled });
          } finally {
            if (controllerRef.current === controller) controllerRef.current = undefined;
          }
        })();
      };

      const active = state.enabled;
      return h("span", {
        "data-dsh-codex-supplement-auth-fast-mode": active ? "on" : "off",
        onMouseEnter: () => setTooltipVisible(true),
        onMouseLeave: () => setTooltipVisible(false),
        onFocus: () => setTooltipVisible(true),
        onBlur: () => setTooltipVisible(false),
        style: { display: "inline-flex", position: "relative", width: 30, height: 30 },
      },
        h("button", {
          type: "button",
          "aria-label": title,
          "aria-describedby": tooltipVisible ? tooltipId : undefined,
          "aria-pressed": active,
          "aria-busy": busy,
          disabled: busy,
          onClick: toggle,
          style: {
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, padding: 0, border: 0, borderRadius: 8,
            background: "transparent", color: active ? "#f97316" : "var(--dsw-alias-label-secondary)",
            cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
          },
        },
          h("svg", { width: 16, height: 16, viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" },
            h("path", {
              d: "M13.1 2.75 5.35 13.1h5.8l-.95 8.15 8.45-11.2h-5.9l.35-7.3Z",
              fill: active ? "currentColor" : "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinejoin: "round",
            })),
        ),
        tooltipVisible ? h("span", {
          id: tooltipId,
          role: "tooltip",
          style: {
            position: "absolute", left: "50%", bottom: "calc(100% + 8px)", zIndex: 1000,
            transform: "translateX(-50%)", padding: "4px 8px", borderRadius: 6,
            background: "var(--dsw-specific-tip, #1f2329)", boxShadow: "var(--dsw-shadow-lv2)",
            color: "var(--dsw-alias-label-primary, #fff)", fontSize: 12, lineHeight: "18px",
            whiteSpace: "nowrap", pointerEvents: "none",
          },
        }, title) : null,
      );
    }

    // ---- 对话输入框额度入口（照旧 dsh-openai-auth QuotaButton：额度% + 进度条 + 点击弹窗口额度详情）----
    function QuotaButton({ t, directory }) {
      const [usage, setUsage] = React.useState(undefined);
      const [status, setStatus] = React.useState("unavailable");
      const [error, setError] = React.useState("");
      const [open, setOpen] = React.useState(false);
      React.useEffect(() => {
        let alive = true;
        const controller = new AbortController();
        const load = () => {
          jsonRequest("/plugins/dsh-codex-supplement/codex/status", undefined, undefined, controller.signal)
            .then((payload) => {
              if (!alive) return;
              if (payload && payload.loggedIn === true && payload.usage) {
                setUsage(payload.usage); setStatus("ready"); setError("");
              } else {
                setStatus("unavailable"); setError((payload && payload.usageError) || "");
              }
            })
            .catch((cause) => { if (alive) { setStatus("unavailable"); setError(String((cause && cause.message) || cause)); } });
        };
        load();
        const timer = window.setInterval(load, 60_000);
        return () => { alive = false; controller.abort(); window.clearInterval(timer); };
      }, []);
      // Quota is shown only in Codex model conversations.
      const directoryState = React.useSyncExternalStore(
        (listener) => directory.subscribe(listener),
        () => directory.getSnapshot(),
        () => directory.getSnapshot());
      const eligible = isCodexModel(directoryState);
      if (!eligible) return null;
      const windows = usage ? [usage.primary, usage.secondary].filter(Boolean) : [];
      const compact = windows[0];
      const ready = status === "ready" && compact !== undefined;
      const percent = ready ? Math.max(0, Math.min(100, remainingPercent(compact))) : 0;
      const buttonText = ready ? t("codexQuotaButton", { percent: String(Math.round(percent)) }) : t("codexQuotaUnavailable");
      const R = 9, CIRC = 2 * Math.PI * R;
      return h("span", { role: "status", style: { position: "relative", display: "inline-flex", alignItems: "center" } },
        h("button", { type: "button", "aria-expanded": open, title: buttonText, onClick: () => setOpen((value) => !value), style: { minHeight: 28, display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 4px", border: 0, borderRadius: 7, background: "transparent", color: "var(--dsw-alias-label-secondary)", font: "inherit", fontSize: 11, cursor: "pointer" } },
          // 圆圈（SVG 圆环，照"上下文"输入框圆环样式）
          h("svg", { width: 22, height: 22, viewBox: "0 0 22 22", "aria-hidden": "true" },
            h("circle", { cx: 11, cy: 11, r: R, fill: "none", stroke: "var(--dsw-alias-border-l2)", strokeWidth: 2 }),
            h("circle", { cx: 11, cy: 11, r: R, fill: "none", stroke: ready ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-label-tertiary)", strokeWidth: 2, strokeLinecap: "round", strokeDasharray: `${(percent / 100) * CIRC} ${CIRC}`, transform: "rotate(-90 11 11)" }),
          ),
          h("span", { style: { fontWeight: 500, fontVariantNumeric: "tabular-nums" } }, ready ? `${Math.round(percent)}%` : "—"),
        ),
        open ? h("div", { role: "dialog", "aria-label": t("codexQuotaTitle"), style: { position: "absolute", right: 0, bottom: "calc(100% + 8px)", zIndex: 1000, boxSizing: "border-box", width: 250, maxWidth: "calc(100vw - 24px)", padding: 10, border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 9, background: "var(--dsw-alias-bg-module-platform)", boxShadow: "var(--dsw-shadow-lv2, 0 4px 12px rgb(0 0 0 / 12%))" } },
          h("strong", { style: { display: "block", marginBottom: 8, fontSize: 13, color: "var(--dsw-alias-label-primary)" } }, t("codexQuotaTitle")),
          windows.length > 0
            ? h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
                windows.map((w) => h("div", { key: `${String(w.windowSeconds)}-${String(w.planType)}`, style: { display: "flex", flexDirection: "column", gap: 4 } },
                  h("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, windowLabel(w, t)),
                  h("div", { style: { height: 5, borderRadius: 999, overflow: "hidden", background: "var(--dsw-alias-bg-layer-3)" } },
                    h("div", { style: { height: "100%", width: `${Math.max(0, Math.min(100, remainingPercent(w)))}%`, background: "var(--dsw-alias-brand-primary)" } }),
                  ),
                  h("span", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary)" } },
                    `${Math.round(remainingPercent(w))}% · ${t("codexUsageReset")}: ${formatResetAt(w) || "—"}`),
                )),
              )
            : h("p", { style: { margin: 0, fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, status === "ready" ? t("codexUsageUnavailable") : (error || t("codexQuotaUnavailable"))),
          error ? h("p", { style: { margin: "8px 0 0", fontSize: 11, color: "var(--dsw-alias-state-error-primary)", overflowWrap: "anywhere" } }, `${t("codexUsageError")}${error}`) : null,
        ) : null,
      );
    }

    // 2026-09-10 修：`modelDirectories.directoryFor(sessionId)` 内部会用 **调用方的 ctx** 去解析
    // `sessions` / `remote.session`（Cordis 的 traceable 服务代理把 `service.ctx` 解析成调用方 ctx，
    // 见 @deepseek-ai/cordis/src/utils.ts `createTraceable` → `if (prop === tracker.property) return ctx`）。
    // 因此调用方必须自己声明这几个服务，否则页面报 `cannot get property "remote" without inject`。
    // 官方同形声明见 dsh-client-ui-model-selection（`["commandUi","locale","sessions","slots","remote","remote.session"]`）
    // 与 dsh-client-ui-chat（`["slots","sessions",...,"remote","remote.session",...]`）——都在模块级 inject。
    const inject = ["slots", "locale", "sessions", "remote", "remote.session"];

    function apply(ctx, media) {
      ctx.effect(() => ctx.locale.register("dsh-codex-supplement-auth", dictionaries), "dsh-codex-supplement-auth: dictionaries");
      const t = ctx.locale.bind("dsh-codex-supplement-auth");
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "@cningan/dsh-codex-supplement-settings",
        order: 12,
        label: () => t("oauthTitle"),
        inject: () => ({ t, media }),
      }, OAuthSection));
      ctx.slots.inject("settings.section.icon", () => ctx.slots.register({
        name: "settings.section.icon",
        id: "@cningan/dsh-codex-supplement-settings",
        order: 12,
      }, CodexSettingsIcon));
      // 对话输入框右侧 Fast mode 按钮：照旧插件经 modelDirectories 拿当前会话的模型选择
      // （provider/model 在 directory store 的 current 上；服务由 dsh-client-ui-model-selection
      // 提供，缺失时整段不激活——Fast mode 是增强，不让它阻塞设置区）。只在 codex 对话渲染
      // (FastModeButton performs the same Codex-model eligibility check).
      ctx.inject(["slots", "modelDirectories"], (scope) => {
        scope.slots.inject("conversation.input.right", () => scope.slots.register({
          name: "conversation.input.right",
          id: "@cningan/dsh-codex-supplement-fast-mode",
          order: 10,
          locale: "dsh-codex-supplement-auth",
          inject: (sessionId) => ({
            directory: scope.modelDirectories.directoryFor(sessionId).store,
          }),
        }, FastModeButton));
        // 对话输入框额度入口（照旧插件 QuotaButton：与 Fast 闪电并排，仅 codex 登录时显示有效额度）
        scope.slots.inject("conversation.input.right", () => scope.slots.register({
          name: "conversation.input.right",
          id: "@cningan/dsh-codex-supplement-quota",
          order: 11,
          locale: "dsh-codex-supplement-auth",
          inject: (sessionId) => ({
            directory: scope.modelDirectories.directoryFor(sessionId).store,
          }),
        }, QuotaButton));
      });
    }

    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
    };
    const createCodexMedia = (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const h = React.createElement;

    const NS = "dsh-codex-supplement-media";
    const SETTINGS_ENTRY = "codex-supplement-image";
    const CAPABILITIES_PATH = "/plugins/dsh-codex-supplement/capabilities";
    const TEST_IMAGE_PATH = "/plugins/dsh-codex-supplement/codex/test-image";
    /** 设置页“载入 2.6 两档”的固定清单（与 Host 出厂默认一致）。 */
    const LATEST_IMAGE_MODELS = ["gpt-image-2.6-flare", "gpt-image-2.6-sunburst"];

    const dictionaries = {
      zh: {
        title: "图片生成",
        subtitle: "Codex Images API；无需切换插件行。",
        tool: "生图工具",
        toolOn: "已开启",
        toolOff: "已关闭",
        toolMissing: "已开启 · 未注册",
        defaultModel: "默认",
        setDefault: "设为默认",
        modelSettings: "模型缺省",
        modelSettingsHint: "★ 设为默认；⚙ 编辑该模型的 quality。",
        models: "模型",
        modelsHint: "每行一个 id；★ 决定默认模型。",
        catalogShort: "内置候选，不是在线查询结果。",
        quality: "质量",
        qualityHint: "xhigh / max 仅 2.5",
        complexity: "复杂度",
        complexityHint: "2.6 规划强度",
        complexityDefault: "模型默认",
        addModel: "添加",
        loadCatalog: "内置目录",
        loadLatest: "2.6 两档",
        deprecated: "已下线",
        testTitle: "试生图",
        testHint: "最小请求；每次消耗 1 张订阅图。",
        testPromptPlaceholder: "描述一张测试图…",
        testModel: "模型",
        testQuality: "质量",
        testComplexity: "复杂度",
        testSize: "尺寸",
        testFormat: "格式",
        testRun: "生成",
        testRunning: "生成中…",
        testOk: "成功",
        testFailed: "失败",
        testRequested: "请求",
        testEffective: "上游回传",
        testNoEffective: "上游未回传实际字段",
        testPreviewLimited: "图片过大，未内联预览",
        testNeedLogin: "先登录 Codex",
        freePlanTitle: "当前套餐不含 Codex 生图",
        freePlanHint: "ChatGPT Free 不提供订阅生图；升级到 Plus 或更高套餐后可用。",
        testUnsupported: "当前模型不支持",
        advanced: "高级选项",
        hideAdvanced: "收起",
        carrier: "接口",
        signedIn: "已登录",
        signedOut: "未登录",
        checking: "检查中…",
        refresh: "刷新",
        loading: "加载中…",
        loadFailed: "读取失败",
        readFailed: "读取设置失败",
        writeFailed: "保存失败",
        emptySelection: "清单为空，工具不会注册。",
        rowPlaceholder: "模型 id",
        remove: "移除",
      },
      en: {
        title: "Image generation",
        subtitle: "Codex Images API; no row toggling needed.",
        tool: "Image tool",
        toolOn: "On",
        toolOff: "Off",
        toolMissing: "On · not registered",
        defaultModel: "Default",
        setDefault: "Set default",
        modelSettings: "Model defaults",
        modelSettingsHint: "★ sets the default; ⚙ edits that model's quality.",
        models: "Models",
        modelsHint: "One id per row; ★ selects the default model.",
        catalogShort: "Built-in candidates, not a live query.",
        quality: "Quality",
        qualityHint: "xhigh / max are 2.5 only",
        complexity: "Complexity",
        complexityHint: "2.6 planning effort",
        complexityDefault: "Model default",
        addModel: "Add",
        loadCatalog: "Catalog",
        loadLatest: "2.6 pair",
        deprecated: "retired",
        testTitle: "Test generation",
        testHint: "Minimal request; costs one subscription image.",
        testPromptPlaceholder: "Describe a test image…",
        testModel: "Model",
        testQuality: "Quality",
        testComplexity: "Complexity",
        testSize: "Size",
        testFormat: "Format",
        testRun: "Generate",
        testRunning: "Generating…",
        testOk: "Succeeded",
        testFailed: "Failed",
        testRequested: "Requested",
        testEffective: "Returned",
        testNoEffective: "Endpoint returned no effective fields",
        testPreviewLimited: "Image too large for an inline preview",
        testNeedLogin: "Sign in to Codex",
        freePlanTitle: "Codex images require a paid plan",
        freePlanHint: "ChatGPT Free does not include the Codex image lane. Upgrade to Plus or higher.",
        testUnsupported: "Unsupported by this model",
        advanced: "Advanced",
        hideAdvanced: "Hide",
        carrier: "API",
        signedIn: "Signed in",
        signedOut: "Signed out",
        checking: "Checking…",
        refresh: "Refresh",
        loading: "Loading…",
        loadFailed: "Load failed",
        readFailed: "Could not read settings",
        writeFailed: "Save failed",
        emptySelection: "Empty list: the tool will not be registered.",
        rowPlaceholder: "model id",
        remove: "Remove",
      },
    };

    async function jsonRequest(path, options) {
      const init = options instanceof AbortSignal ? { signal: options } : (options ?? {});
      const hasBody = init.body !== undefined;
      const response = await fetch(path, {
        method: init.method ?? "GET",
        headers: {
          accept: "application/json",
          ...(hasBody ? { "content-type": "application/json" } : {}),
        },
        ...(hasBody ? { body: JSON.stringify(init.body) } : {}),
        signal: init.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      return payload;
    }

    const inputStyle = {
      flex: 1,
      minWidth: 0,
      minHeight: 30,
      padding: "4px 8px",
      border: "1px solid var(--dsw-alias-border-l2)",
      borderRadius: 8,
      background: "var(--dsw-alias-bg-layer-1)",
      color: "var(--dsw-alias-label-primary)",
      font: "inherit",
      fontSize: 12,
    };
    const buttonStyle = {
      minHeight: 30,
      padding: "4px 10px",
      border: "1px solid var(--dsw-alias-border-l2)",
      borderRadius: 8,
      background: "var(--dsw-alias-bg-layer-1)",
      color: "var(--dsw-alias-label-primary)",
      font: "inherit",
      fontSize: 12,
      cursor: "pointer",
    };
    const selectStyle = {
      minHeight: 30,
      padding: "4px 8px",
      border: "1px solid var(--dsw-alias-border-l2)",
      borderRadius: 8,
      background: "var(--dsw-alias-bg-layer-1)",
      color: "var(--dsw-alias-label-primary)",
      font: "inherit",
      fontSize: 12,
    };

    function CodexImageSettings({ t, configScope }) {
      const subscribe = React.useCallback((listener) => configScope?.subscribe?.(listener) ?? (() => {}), [configScope]);
      const getSnapshot = React.useCallback(() => configScope?.getSnapshot?.()
        ?? { status: "unavailable", value: undefined, writable: false }, [configScope]);
      const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
      const config = snapshot?.value;
      const [capabilities, setCapabilities] = React.useState(undefined);
      const [loading, setLoading] = React.useState(true);
      const [error, setError] = React.useState(undefined);
      const [writeError, setWriteError] = React.useState(undefined);
      const [busy, setBusy] = React.useState(false);
      /** 正在编辑的清单（未提交）；null = 直接显示已保存的值。 */
      const [draft, setDraft] = React.useState(null);
      // 试生图状态：独立于保存中的配置，失败不丢输入。
      const [testPrompt, setTestPrompt] = React.useState("A simple red apple on a white background, product photo");
      const [testModel, setTestModel] = React.useState("");
      const [testQuality, setTestQuality] = React.useState("");
      const [testComplexity, setTestComplexity] = React.useState("");
      const [testSize, setTestSize] = React.useState("1024x1024");
      const [testFormat, setTestFormat] = React.useState("png");
      const [testing, setTesting] = React.useState(false);
      const [testResult, setTestResult] = React.useState(undefined);
      const [showAdvanced, setShowAdvanced] = React.useState(false);
      const [expandedModel, setExpandedModel] = React.useState(null);

      const loadCapabilities = React.useCallback(async (signal) => {
        setLoading(true);
        try {
          const data = await jsonRequest(CAPABILITIES_PATH, signal);
          setCapabilities(data);
          setError(undefined);
        } catch (cause) {
          if (cause?.name !== "AbortError") setError(cause instanceof Error ? cause.message : String(cause));
        } finally {
          if (!signal?.aborted) setLoading(false);
        }
      }, []);
      React.useEffect(() => {
        const controller = new AbortController();
        void loadCapabilities(controller.signal);
        return () => controller.abort();
      }, [loadCapabilities]);

      if (snapshot.status === "unavailable" || config === undefined) {
        return h("p", { style: { margin: 0, paddingTop: 12, color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("readFailed"));
      }

      const writable = snapshot.writable === true;
      const capability = capabilities?.capability;
      const enabled = config.enableImageGeneration === true;
      const toolRegistered = Array.isArray(capability?.registeredTools) && capability.registeredTools.length > 0;
      const planFree = String(capability?.planType ?? "").toLowerCase() === "free";
      const catalog = Array.isArray(capability?.catalog) ? capability.catalog : [];
      // 以配置为显示正源；字段缺失（旧宿主）时回落到 Host 解析出的清单。
      const saved = Array.isArray(config.imageModels)
        ? config.imageModels
        : (Array.isArray(capability?.models) ? capability.models : []);
      const list = draft ?? saved;
      const oauth = capabilities?.oauth;
      const carrier = capabilities?.codexCarrier || capability?.carrierModel || "—";
      const defaultModel = list.includes(config.defaultImageModel)
        ? config.defaultImageModel
        : (typeof capability?.defaultModel === "string" && list.includes(capability.defaultModel)
          ? capability.defaultModel
          : (list[0] ?? ""));
      const profileFor = (model) => {
        const fromHost = Array.isArray(capability?.modelProfiles)
          ? capability.modelProfiles.find((item) => item.id === model)
          : undefined;
        const caps = catalog.find((item) => item.id === model)?.capabilities ?? {};
        const all = ["auto", "low", "medium", "high", "xhigh", "max"];
        const ceiling = all.indexOf(caps.maxQuality ?? "high");
        const base = fromHost ?? {
          qualityOptions: all.filter((_, index) => index <= ceiling),
          complexityOptions: caps.complexity === true ? ["low", "medium", "high"] : [],
          capabilities: caps,
          defaults: { quality: "auto", complexity: "" },
        };
        // 配置是即时正源；host profile 只提供能力位与回落值。
        const local = config.imageModelDefaults !== null && typeof config.imageModelDefaults === "object"
          ? (config.imageModelDefaults[model] ?? {})
          : {};
        const qualityOptions = base.qualityOptions ?? ["auto"];
        const complexityOptions = base.complexityOptions ?? [];
        const quality = qualityOptions.includes(local.quality)
          ? local.quality
          : (qualityOptions.includes(base.defaults?.quality) ? base.defaults.quality : "auto");
        const complexity = complexityOptions.includes(local.complexity)
          ? local.complexity
          : (complexityOptions.includes(base.defaults?.complexity) ? base.defaults.complexity : "");
        return {
          ...base,
          qualityOptions,
          complexityOptions,
          defaults: { quality, complexity },
        };
      };

      // 试生图派生值全部跟随当前选择的模型，而不是全局缺省。
      const activeTestModel = list.includes(testModel) ? testModel : defaultModel;
      const testChoice = catalog.find((item) => item.id === activeTestModel);
      const testCaps = testChoice?.capabilities ?? {};
      const testProfile = profileFor(activeTestModel);
      const testQualityOptions = (testProfile.qualityOptions ?? ["auto"]).filter((value) => ["auto", "low", "medium", "high"].includes(value));
      const testQualityValue = testQualityOptions.includes(testQuality)
        ? testQuality
        : (testProfile.defaults?.quality ?? "auto");
      // Codex Images 端点不接受 complexity；不再展示会必然失败的控件。
      const testComplexityOptions = [];
      const testComplexityValue = "";
      const testFormats = ["png", ...(testCaps.gif === true ? ["gif"] : [])];
      const testFormatValue = testFormats.includes(testFormat) ? testFormat : "png";

      const runTest = async () => {
        if (testing) return;
        setTesting(true);
        setTestResult(undefined);
        try {
          const data = await jsonRequest(TEST_IMAGE_PATH, {
            method: "POST",
            body: {
              prompt: testPrompt,
              model: activeTestModel,
              quality: testQualityValue,
              ...(testComplexityValue ? { complexity: testComplexityValue } : {}),
              size: testSize,
              output_format: testFormatValue,
            },
          });
          setTestResult(data);
        } catch (cause) {
          setTestResult({ ok: false, error: cause instanceof Error ? cause.message : String(cause) });
        } finally {
          setTesting(false);
        }
      };

      const mutate = async (entries) => {
        if (!writable) return false;
        setBusy(true);
        setWriteError(undefined);
        try {
          if (typeof configScope.setMany === "function") await configScope.setMany(entries);
          else for (const [field, value] of entries) await configScope.set(field, value);
          return true;
        } catch (cause) {
          setWriteError(`${t("writeFailed")}: ${cause instanceof Error ? cause.message : String(cause)}`);
          return false;
        } finally {
          setBusy(false);
        }
      };

      /** 规范化并保存：去空白、去空行、去重（保序）。 */
      const commit = async (next) => {
        const cleaned = [...new Set(next.map((value) => String(value ?? "").trim()).filter(Boolean))];
        setDraft(null);
        const saved = await mutate([["imageModels", cleaned]]);
        if (saved) void loadCapabilities();
      };

      /** 写单个模型的缺省；整份 dict 一起写，避免依赖嵌套 path 的编辑器能力。 */
      const setModelDefault = async (model, field, value) => {
        const currentDefaults = config.imageModelDefaults !== null && typeof config.imageModelDefaults === "object"
          ? config.imageModelDefaults
          : {};
        const next = {
          ...currentDefaults,
          [model]: { ...(currentDefaults[model] ?? {}), [field]: value },
        };
        await mutate([["imageModelDefaults", next]]);
      };

      const label = { color: "var(--dsw-alias-label-secondary)", fontSize: 12 };
      const muted = { color: "var(--dsw-alias-label-tertiary)", fontSize: 11 };
      const iconButton = {
        ...buttonStyle,
        width: 26,
        height: 26,
        minHeight: 26,
        padding: 0,
        display: "grid",
        placeItems: "center",
        borderRadius: 7,
      };
      const rowShell = {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "7px 8px",
        border: "1px solid var(--dsw-alias-border-l2)",
        borderRadius: 9,
        background: "var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1))",
      };

      const rows = list.map((value, index) => {
        const choice = catalog.find((item) => item.id === value);
        const profile = profileFor(value);
        const isDefault = value === defaultModel;
        const tierLabel = choice === undefined
          ? ""
          : choice.tier === "fast" ? "快速" : choice.tier === "quality" ? "高质量" : "前代";
        const row = h("div", {
          key: `row-${index}`,
          style: { display: "flex", alignItems: "center", gap: 8 },
        },
          h("input", {
            type: "text",
            value,
            placeholder: t("rowPlaceholder"),
            disabled: busy || !writable,
            spellCheck: false,
            onChange: (event) => {
              const next = [...list];
              next[index] = event.target.value;
              setDraft(next);
            },
            onBlur: () => { if (draft !== null) void commit(draft); },
            style: inputStyle,
          }),
          choice === undefined ? null : h("span", {
            title: choice.note,
            style: {
              flex: "none",
              padding: "2px 6px",
              borderRadius: 6,
              border: "1px solid var(--dsw-alias-border-l2)",
              color: choice.deprecated ? "var(--dsw-alias-state-error-primary)" : "var(--dsw-alias-label-secondary)",
              fontSize: 11,
            },
          }, `${tierLabel}${choice.deprecated === true ? ` · ${t("deprecated")}` : ""}`),
          h("button", {
            type: "button",
            title: isDefault ? t("defaultModel") : t("setDefault"),
            "aria-label": isDefault ? t("defaultModel") : t("setDefault"),
            "aria-pressed": isDefault,
            disabled: busy || !writable || value.length === 0,
            onClick: () => void mutate([["defaultImageModel", value]]),
            style: {
              ...iconButton,
              color: isDefault ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-label-secondary)",
              cursor: busy || !writable || value.length === 0 ? "default" : "pointer",
            },
          }, isDefault ? "★" : "☆"),
          h("button", {
            type: "button",
            title: t("modelSettings"),
            "aria-label": t("modelSettings"),
            "aria-expanded": expandedModel === value,
            onClick: () => setExpandedModel(expandedModel === value ? null : value),
            style: { ...iconButton },
          }, "⚙"),
          h("button", {
            type: "button",
            title: t("remove"),
            "aria-label": t("remove"),
            disabled: busy || !writable,
            onClick: () => void commit(list.filter((_, position) => position !== index)),
            style: { ...iconButton, cursor: busy || !writable ? "default" : "pointer" },
          }, "✕"));
        if (expandedModel !== value) return h("div", { key: `row-${index}-wrap`, style: rowShell }, row);
        return h("div", { key: `row-${index}-wrap`, style: rowShell },
          row,
          h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "6px 8px", borderRadius: 7, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-1)" } },
            h("span", { style: label }, t("quality")),
            h("select", {
              value: profile.defaults?.quality ?? "auto",
              disabled: busy || !writable,
              onChange: (event) => void setModelDefault(value, "quality", event.target.value),
              style: selectStyle,
            }, ...(profile.qualityOptions ?? ["auto"]).map((option) => h("option", { key: option, value: option }, option))),
            (profile.complexityOptions ?? []).length === 0 ? null : h("span", { style: label }, t("complexity")),
            (profile.complexityOptions ?? []).length === 0 ? null : h("select", {
              value: profile.defaults?.complexity ?? "",
              disabled: busy || !writable,
              onChange: (event) => void setModelDefault(value, "complexity", event.target.value),
              style: selectStyle,
            },
              h("option", { value: "" }, t("complexityDefault")),
              ...profile.complexityOptions.map((option) => h("option", { key: option, value: option }, option)))),
        );
      });

      const card = {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        border: "1px solid var(--dsw-alias-border-l2)",
        borderRadius: 10,
        background: "var(--dsw-alias-bg-layer-1)",
      };

      return h("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
          h("span", { style: { color: "var(--dsw-alias-label-primary)", fontSize: 13, fontWeight: 600 } }, t("tool")),
          h("button", {
            type: "button",
            role: "switch",
            "aria-checked": enabled,
            "aria-label": t("tool"),
            disabled: busy || !writable,
            title: enabled ? t("toolOff") : t("toolOn"),
            onClick: async () => {
              const saved = await mutate([["enableImageGeneration", !enabled]]);
              if (saved) void loadCapabilities();
            },
            style: {
              width: 40, height: 22, padding: 0, position: "relative", borderRadius: 999,
              border: `1px solid ${enabled ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-border-l2)"}`,
              background: enabled ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-bg-layer-3)",
              cursor: busy || !writable ? "default" : "pointer",
            },
          }, h("span", {
            style: {
              position: "absolute", top: 2, left: enabled ? 20 : 2, width: 16, height: 16,
              borderRadius: 999, background: "#fff", transition: "left .15s",
            },
          })),
          h("span", {
            style: {
              ...label,
              color: enabled
                ? (toolRegistered ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-state-warning-primary, var(--dsw-alias-label-secondary))")
                : "var(--dsw-alias-label-secondary)",
            },
          }, enabled ? (toolRegistered ? t("toolOn") : t("toolMissing")) : t("toolOff")),
          h("button", {
            type: "button",
            disabled: loading,
            title: t("refresh"),
            "aria-label": t("refresh"),
            onClick: () => void loadCapabilities(),
            style: { ...buttonStyle, marginLeft: "auto", padding: "2px 8px", cursor: loading ? "default" : "pointer" },
          }, loading ? "…" : "↻"),
          writeError ? h("span", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)", fontSize: 12 } }, writeError) : null,
        ),
        h("div", { style: card },
          h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            h("span", { style: { color: "var(--dsw-alias-label-primary)", fontSize: 13, fontWeight: 600 } }, t("models")),
            h("span", { style: { color: oauth?.loggedIn ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-label-secondary)", fontSize: 11 } },
              loading ? t("checking") : oauth?.loggedIn ? t("signedIn") : t("signedOut")),
            h("span", { style: { ...muted, marginLeft: "auto" } }, t("carrier") + ": " + carrier)),
          h("p", { style: { margin: 0, ...muted } }, t("modelsHint")),
          rows.length > 0 ? h("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, ...rows) : null,
          h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            h("button", {
              type: "button",
              disabled: busy || !writable,
              onClick: () => setDraft([...list, ""]),
              style: { ...buttonStyle, cursor: busy || !writable ? "default" : "pointer" },
            }, `+ ${t("addModel")}`),
            h("button", {
              type: "button",
              disabled: busy || !writable || catalog.length === 0,
              title: t("loadCatalog"),
              onClick: () => void commit(catalog.map((item) => item.id)),
              style: { ...buttonStyle, cursor: busy || !writable || catalog.length === 0 ? "default" : "pointer" },
            }, t("loadCatalog")),
            h("button", {
              type: "button",
              disabled: busy || !writable,
              onClick: () => void commit(LATEST_IMAGE_MODELS),
              style: { ...buttonStyle, cursor: busy || !writable ? "default" : "pointer" },
            }, t("loadLatest")),
            h("span", { style: { ...muted, marginLeft: "auto" } }, t("catalogShort"))),
          h("p", { style: { margin: 0, ...muted } }, t("modelSettingsHint")),
          list.length === 0
            ? h("p", { role: "status", style: { margin: 0, color: "var(--dsw-alias-state-error-primary)", fontSize: 12 } }, t("emptySelection"))
            : null,
          error ? h("span", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)", fontSize: 12 } }, `${t("loadFailed")}: ${error}`) : null,
        ),
        h("div", { style: card },
          h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            h("span", { style: { color: "var(--dsw-alias-label-primary)", fontSize: 13, fontWeight: 600 } }, t("testTitle")),
            h("span", { style: muted }, t("testHint"))),
          planFree ? h("div", {
            role: "status",
            style: {
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              flexWrap: "wrap",
              padding: "8px 10px",
              borderRadius: 7,
              border: "1px solid color-mix(in srgb, var(--dsw-alias-state-warning-primary, #b7791f) 35%, var(--dsw-alias-border-l2))",
              background: "color-mix(in srgb, var(--dsw-alias-state-warning-primary, #b7791f) 8%, var(--dsw-alias-bg-layer-1))",
              color: "var(--dsw-alias-label-primary)",
              fontSize: 12,
            },
          },
            h("strong", { style: { fontSize: 12 } }, t("freePlanTitle")),
            h("span", { style: { ...muted, color: "var(--dsw-alias-label-secondary)" } }, t("freePlanHint"))) : null,
          h("textarea", {
            rows: 2,
            "aria-label": t("testPromptPlaceholder"),
            value: testPrompt,
            placeholder: t("testPromptPlaceholder"),
            onChange: (event) => setTestPrompt(event.target.value),
            style: { ...inputStyle, resize: "vertical", minHeight: 48 },
          }),
          h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            h("select", {
              value: activeTestModel,
              disabled: list.length === 0,
              "aria-label": t("testModel"),
              onChange: (event) => setTestModel(event.target.value),
              style: selectStyle,
            }, ...list.map((id) => h("option", { key: id, value: id }, id))),
            h("button", {
              type: "button",
              disabled: testing || planFree || !oauth?.loggedIn || list.length === 0 || testPrompt.trim().length === 0,
              onClick: () => void runTest(),
              style: {
                ...buttonStyle,
                background: "var(--dsw-alias-brand-primary)",
                borderColor: "var(--dsw-alias-brand-primary)",
                color: "var(--dsw-alias-label-inverse, #fff)",
                cursor: testing || planFree || !oauth?.loggedIn || list.length === 0 ? "default" : "pointer",
              },
            }, testing ? t("testRunning") : t("testRun")),
            h("button", {
              type: "button",
              "aria-expanded": showAdvanced,
              onClick: () => setShowAdvanced((value) => !value),
              style: { ...buttonStyle, padding: "2px 8px", border: 0, background: "transparent", color: "var(--dsw-alias-label-secondary)" },
            }, showAdvanced ? t("hideAdvanced") : t("advanced")),
            !oauth?.loggedIn ? h("span", { style: muted }, t("testNeedLogin")) : null),
          showAdvanced ? h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            h("span", { style: label }, t("testQuality")),
            h("select", {
              value: testQualityValue,
              onChange: (event) => setTestQuality(event.target.value),
              style: selectStyle,
            }, ...testQualityOptions.map((option) => h("option", { key: option, value: option }, option))),
            ...(testComplexityOptions.length === 0 ? [] : [
              h("span", { key: "complexity-label", style: label }, t("testComplexity")),
              h("select", {
                key: "complexity-select",
                value: testComplexityValue,
                onChange: (event) => setTestComplexity(event.target.value),
                style: selectStyle,
              },
                h("option", { value: "" }, t("complexityDefault")),
                ...testComplexityOptions.map((option) => h("option", { key: option, value: option }, option))),
            ]),
            h("span", { style: label }, t("testSize")),
            h("input", {
              type: "text",
              value: testSize,
              onChange: (event) => setTestSize(event.target.value),
              style: { ...inputStyle, flex: "0 0 104px" },
            }),
            h("span", { style: label }, t("testFormat")),
            h("select", {
              value: testFormatValue,
              onChange: (event) => setTestFormat(event.target.value),
              style: selectStyle,
            }, ...testFormats.map((option) => h("option", { key: option, value: option }, option)))) : null,
          testResult === undefined ? null : h("div", { style: { display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 8, background: "var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-layer-1))" } },
            h("div", {
              style: {
                fontSize: 12,
                fontWeight: 600,
                color: testResult.ok ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-state-error-primary)",
              },
            }, `${testResult.ok ? t("testOk") : t("testFailed")}${typeof testResult.ms === "number" ? ` · ${testResult.ms} ms` : ""}`),
            testResult.requested ? h("div", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 11, wordBreak: "break-word" } }, `${t("testRequested")}: ${JSON.stringify(testResult.requested)}`) : null,
            testResult.ok
              ? (testResult.effective
                ? h("div", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 11, wordBreak: "break-word" } }, `${t("testEffective")}: ${JSON.stringify(testResult.effective)}`)
                : h("div", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 11 } }, t("testNoEffective")))
              : null,
            testResult.error ? h("pre", {
              style: {
                margin: 0,
                maxHeight: 180,
                overflow: "auto",
                padding: "8px 10px",
                border: "1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, var(--dsw-alias-border-l2))",
                borderRadius: 7,
                background: "var(--dsw-alias-bg-layer-1)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "var(--dsw-alias-state-error-primary)",
                fontSize: 11,
                lineHeight: 1.5,
              },
            }, testResult.error) : null,
            ...(Array.isArray(testResult.images)
              ? testResult.images.map((image, index) => image.dataUrl
                ? h("img", {
                  key: `test-image-${index}`,
                  src: image.dataUrl,
                  alt: `test image ${index + 1}`,
                  style: {
                    maxWidth: "100%",
                    maxHeight: 240,
                    alignSelf: "flex-start",
                    borderRadius: 8,
                    border: "1px solid var(--dsw-alias-border-l2)",
                    objectFit: "contain",
                  },
                })
                : h("div", { key: `test-image-${index}`, style: { color: "var(--dsw-alias-label-secondary)", fontSize: 11 } },
                  `${image.mediaType} · ${image.bytes} bytes · ${t("testPreviewLimited")}`))
              : [])),
        ),
      );
    }

    function CodexImageSection({ t, configScope }) {
      return h("div", { style: { display: "flex", flexDirection: "column", gap: 10, marginTop: 4, paddingTop: 16, borderTop: "1px solid var(--dsw-alias-border-l2)" } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
          h("span", {
            "aria-hidden": "true",
            style: {
              width: 28,
              height: 28,
              flex: "none",
              display: "grid",
              placeItems: "center",
              borderRadius: 8,
              border: "1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, var(--dsw-alias-border-l2))",
              background: "color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, var(--dsw-alias-bg-layer-1))",
              color: "var(--dsw-alias-brand-primary)",
              fontSize: 15,
            },
          }, "✦"),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 } },
            h("h4", { style: { margin: 0, color: "var(--dsw-alias-label-primary)", fontSize: 15, fontWeight: 600 } }, t("title")),
            h("span", { style: { color: "var(--dsw-alias-label-tertiary)", fontSize: 11 } }, t("subtitle")))),
        h(CodexImageSettings, { t, configScope }),
      );
    }

    const inject = ["locale", "configForms"];

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, dictionaries), "Codex Supplement media dictionaries");
      const t = ctx.locale.bind(NS);
      const form = ctx.configForms.get(SETTINGS_ENTRY);
      const configScope = form === undefined ? undefined : {
        getSnapshot: () => form.getSnapshot(),
        subscribe: (listener) => form.subscribe(listener),
        set: (field, value) => form.mutate([{ op: "set", path: [field], value }]),
        setMany: (entries) => form.mutate(entries.map(([field, value]) => ({ op: "set", path: [field], value }))),
      };
      return { t, configScope, Section: CodexImageSection };
    }

    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
    };
    const oauth = createCodexOAuth(require);
    const media = createCodexMedia(require);
    return {
      inject: [...new Set([...(oauth.inject ?? []), ...(media.inject ?? [])])],
      apply(ctx) {
        const mediaSettings = media.apply(ctx);
        oauth.apply(ctx, mediaSettings);
      },
    };
  },
  cssIds: [],
  depIds: ["react", "react/jsx-runtime"],
  cssEntries: [],
});
