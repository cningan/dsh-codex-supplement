window.__ModuleLoader__.load({
  id: "dsh-codex-supplement",
  factory: (require) => {
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
        freePlanAccountHint: "当前套餐不含订阅生图，需 Plus 或更高",
        requestFailed: "请求失败",
        diagnostic: "诊断：",
        submit: "提交",
        manualCodeHint: "打开官方授权页完成授权后，粘贴回调地址或授权码：",
        manualCodePlaceholder: "粘贴授权码 / 回调地址",
        manualToggle: "没收到回调？手动粘贴",
        callbackMissHint: "官方页面已显示授权成功、但这里一直停在“授权中”，说明回调没有到达本机。把浏览器地址栏里的完整回调地址（含 code 与 state）粘贴到下面即可完成登录。",
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
        freePlanAccountHint: "This plan excludes subscription image generation; Plus or higher is required.",
        requestFailed: "Request failed",
        diagnostic: "Diagnostic: ",
        submit: "Submit",
        manualCodeHint: "After authorizing in the official page, paste the callback URL or authorization code here:",
        manualCodePlaceholder: "Paste authorization code / callback URL",
        manualToggle: "No callback? Paste it manually",
        callbackMissHint: "If the official page says authorization succeeded but this card stays on Authorizing, the callback never reached this machine. Paste the full callback URL from the browser address bar (including code and state) below.",
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
          status.loginPending && !manual && !status.loggedIn
            ? h("button", {
                type: "button",
                onClick: () => setManual(true),
                style: { alignSelf: "flex-start", padding: 0, border: 0, background: "transparent", color: "var(--dsw-alias-state-business-primary)", font: "inherit", fontSize: 12, cursor: "pointer" },
              }, t("manualToggle"))
            : null,
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
            status.loginPending ? h("p", { style: { margin: 0, fontSize: 12, color: "var(--dsw-alias-label-secondary)", overflowWrap: "anywhere" } }, t("callbackMissHint")) : null,
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
                accounts.map((account) => {
                  const plan = planLabel(account.plan || status.usage?.planType);
                  const free = String(account.plan || status.usage?.planType || "").toLowerCase() === "free";
                  return h("div", { key: account.accountId, style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
                    h("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, account.email || account.displayName || account.accountId),
                    plan ? h("span", {
                      style: {
                        padding: "1px 8px", borderRadius: 999, fontSize: 11,
                        border: `1px solid ${free ? "var(--dsw-alias-state-warning-primary, var(--dsw-alias-label-tertiary))" : "var(--dsw-alias-border-l2)"}`,
                        color: free ? "var(--dsw-alias-state-warning-primary, var(--dsw-alias-label-secondary))" : "var(--dsw-alias-label-tertiary)",
                      },
                    }, plan) : null,
                    free ? h("span", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary)" } }, t("freePlanAccountHint")) : null,
                  );
                }),
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
        id: "dsh-codex-supplement-settings",
        order: 12,
        label: () => t("oauthTitle"),
        inject: () => ({ t, media }),
      }, OAuthSection));
      ctx.slots.inject("settings.section.icon", () => ctx.slots.register({
        name: "settings.section.icon",
        id: "dsh-codex-supplement-settings",
        order: 12,
      }, CodexSettingsIcon));
      // 对话输入框右侧 Fast mode 按钮：照旧插件经 modelDirectories 拿当前会话的模型选择
      // （provider/model 在 directory store 的 current 上；服务由 dsh-client-ui-model-selection
      // 提供，缺失时整段不激活——Fast mode 是增强，不让它阻塞设置区）。只在 codex 对话渲染
      // (FastModeButton performs the same Codex-model eligibility check).
      ctx.inject(["slots", "modelDirectories"], (scope) => {
        scope.slots.inject("conversation.input.right", () => scope.slots.register({
          name: "conversation.input.right",
          id: "dsh-codex-supplement-fast-mode",
          order: 10,
          locale: "dsh-codex-supplement-auth",
          inject: (sessionId) => ({
            directory: scope.modelDirectories.directoryFor(sessionId).store,
          }),
        }, FastModeButton));
        // 对话输入框额度入口（照旧插件 QuotaButton：与 Fast 闪电并排，仅 codex 登录时显示有效额度）
        scope.slots.inject("conversation.input.right", () => scope.slots.register({
          name: "conversation.input.right",
          id: "dsh-codex-supplement-quota",
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
  },
  cssIds: [],
  depIds: ["react", "react/jsx-runtime"],
  cssEntries: [],
});
