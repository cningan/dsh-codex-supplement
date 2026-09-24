window.__ModuleLoader__.load({
  id: "@local/dsh-codex-supplement",
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
        oauthTitle: "Codex 订阅登录",
        oauthIntro: "登录 ChatGPT/Codex 订阅，在 DSH 使用官方 Codex 模型、额度、搜索与 Fast Mode。",
        signedIn: "已登录",
        signedOut: "未登录",
        checking: "检查中…",
        login: "登录",
        logout: "退出",
        working: "处理中…",
        loginPending: "授权中…",
        models: "可用模型",
        modelsCustomized: "已自定义",
        modelsInherited: "随默认",
        resetModels: "重置模型",
        fetchModels: "获取模型",
        fetching: "获取中…",
        modelsEmpty: "未列出模型（空清单=不显示任何模型；可用「添加模型」填写）",
        modelId: "模型 ID",
        modelName: "名称",
        modelAdvanced: "高级选项",
        removeModel: "移除模型",
        modelContextWindow: "上下文窗口",
        modelMaxTokens: "最大输出",
        addModel: "添加模型",
        fetchTitle: "获取模型",
        fetchDescription: "选择要加入清单的模型：",
        fetchAdopt: "采纳所选",
        fetchDeselectAll: "全不选",
        fetchSelectAll: "全选",
        fetchEmpty: "该供应商未返回任何模型",
        applyModels: "应用",
        cancel: "取消",
        weeklyLimit: "每周额度",
        fiveHourLimit: "5 小时额度",
        usageWindow: "额度窗口",
        modelsSourceRemote: "远程目录（登录后 GET /models）",
        modelsSourceOfficial: "官方目录（dsh 内置 pi-ai，随升级更新）",
        modelsSourceStatic: "静态清单（订阅模型兜底）",
        modelsSourceBuiltin: "默认目录（未登录或获取失败回退）",
        modelsEmpty: "未发现模型",
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
        codexSearchHint: "开启：把 dsh 网页搜索切换到 ChatGPT（写入 web 配置，一般即刻生效、重启保险）；关闭：保持官方 DeepSeek 搜索。",
        codexSearchOn: "已开启",
        codexSearchOff: "已关闭",
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
        oauthTitle: "Codex subscription sign-in",
        oauthIntro: "Sign in with your ChatGPT/Codex subscription to use the official Codex models, usage, search, and Fast Mode in DSH.",
        signedIn: "Signed in",
        signedOut: "Not signed in",
        checking: "Checking…",
        login: "Sign in",
        logout: "Sign out",
        working: "Working…",
        loginPending: "Authorizing…",
        models: "Models",
        modelsCustomized: "Customized",
        modelsInherited: "Inherited",
        resetModels: "Reset models",
        fetchModels: "Fetch models",
        fetching: "Fetching…",
        modelsEmpty: "No models listed (an empty list hides every model; use Add to fill rows)",
        modelId: "Model ID",
        modelName: "Name",
        modelAdvanced: "Advanced",
        removeModel: "Remove",
        modelContextWindow: "Context window",
        modelMaxTokens: "Max output",
        addModel: "Add model",
        fetchTitle: "Fetch models",
        fetchDescription: "Pick models to add to the list:",
        fetchAdopt: "Adopt selected",
        fetchDeselectAll: "Clear all",
        fetchSelectAll: "Select all",
        fetchEmpty: "The provider returned no models",
        applyModels: "Apply",
        cancel: "Cancel",
        weeklyLimit: "Weekly quota",
        fiveHourLimit: "5-hour quota",
        usageWindow: "Usage window",
        modelsSourceRemote: "Remote catalog (GET /models after sign-in)",
        modelsSourceOfficial: "Official catalog (dsh-built-in pi-ai, updated with upgrades)",
        modelsSourceStatic: "Static catalog (subscription fallback)",
        modelsSourceBuiltin: "Default catalog (not signed in or fetch failed)",
        modelsEmpty: "No models found",
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
        codexSearchHint: "On: switches DSH web search to ChatGPT (writes the web config; usually immediate, restart to be sure). Off keeps the official DeepSeek search.",
        codexSearchOn: "On",
        codexSearchOff: "Off",
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

    function CodexExtras({ status, refresh, t }) {
      const [busy, setBusy] = React.useState(false);
      const usage = status.usage;
      const searchState = status.search || { enabled: false };
      const fastEnabled = new Set(Array.isArray(status.fastModeModels) ? status.fastModeModels : []);
      const models = Array.isArray(status.models) ? status.models : [];
      const base = { minHeight: 30, padding: "4px 12px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 14, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", font: "inherit", fontSize: 12, cursor: "pointer" };

      const toggle = async (path, body) => {
        setBusy(true);
        try {
          await jsonRequest(path, "POST", body);
          await refresh();
        } catch (cause) {
          window.alert(cause instanceof Error ? cause.message : String(cause));
        } finally { setBusy(false); }
      };

      const windows = usage
        ? [usage.primary, usage.secondary].filter(Boolean)
        : [];
      const remaining = windows.length > 0 ? remainingPercent(windows[0]) : null;

      return h("div", { style: { display: "flex", flexDirection: "column", gap: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-2)" } },
        h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
          h("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, t("codexSearch")),
          h("button", { type: "button", disabled: busy, onClick: () => void toggle("/plugins/dsh-codex-supplement/codex/search", { enabled: !searchState.enabled }), style: base },
            searchState.enabled ? `${t("codexSearchOn")}` : `${t("codexSearchOff")}`),
        ),
        h("p", { style: { margin: 0, fontSize: 11, color: "var(--dsw-alias-label-tertiary)" } }, t("codexSearchHint")),
        h("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, t("codexUsageTitle")),
        usage && windows.length > 0
          ? h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
              usage.planType
                ? h("span", { style: { alignSelf: "flex-start", padding: "2px 9px", borderRadius: 999, background: "var(--dsw-alias-bg-layer-3)", color: "var(--dsw-alias-label-secondary)", fontSize: 11 } },
                    `${t("codexPlan")}: ${planLabel(usage.planType)}`)
                : null,
              h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 } },
                windows.map((w) => h("div", { key: `${String(w.windowSeconds)}-${String(w.planType)}`, style: { display: "flex", flexDirection: "column", gap: 4, padding: 8, borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-1)" } },
                  h("span", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary)" } }, windowLabel(w, t)),
                  h("div", { style: { height: 6, borderRadius: 999, overflow: "hidden", background: "var(--dsw-alias-bg-layer-3)" } },
                    h("div", { style: { height: "100%", width: `${Math.max(0, Math.min(100, remainingPercent(w)))}%`, background: "var(--dsw-alias-brand-primary)" } }),
                  ),
                  h("span", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary)" } },
                    `${Math.round(remainingPercent(w))}% · ${t("codexUsageReset")}: ${formatResetAt(w) || "—"}`),
                )),
              ),
            )
          : h("p", { style: { margin: 0, fontSize: 11, color: "var(--dsw-alias-label-tertiary)" } },
              status.usageError ? `${t("codexUsageError")}${status.usageError}` : t("codexUsageUnavailable")),
      );
    }

    // ── 模型清单编辑器：照官方 dsh-client-ui-settings-models/lib/client.js ModelListEditor 忠实移植 ──
    // （语义：行 = id/名称 + chevron 折叠区（上下文窗口/最大输出，placeholder 透显 256K/32K 提示）；
    //  容量输入支持 K/M 词汇（256K→256000）；「获取模型」勾选加入（只加未知、保留已有行原样）；
    //  「添加模型」加空行；删除行即重排；上层 draft = 整表，「应用」提交、overridden=true 才显示「重置模型」。）
    // #region lib/types/client/ModelListEditor.js（照官方移植）
    function textOf(model, key) {
      const value = model && model[key];
      return typeof value === "string" ? value : "";
    }
    function numberOf(model, key) {
      const value = model && model[key];
      return typeof value === "number" ? value : void 0;
    }
    /** Accepted capacity spellings: a decimal count with an optional K/M suffix. */
    const CAPACITY_PATTERN = /^(\d+(?:\.\d+)?)([km])?$/i;
    const CAPACITY_SCALE = { k: 1e3, m: 1e6 };
    function parseCapacity(text) {
      const trimmed = text.trim();
      if (trimmed.length === 0) return void 0;
      const match = CAPACITY_PATTERN.exec(trimmed);
      if (match === null) return NaN;
      const suffix = match[2] && match[2].toLowerCase();
      const scale = suffix === "k" || suffix === "m" ? CAPACITY_SCALE[suffix] : 1;
      const scaled = Number(match[1]) * scale;
      const rounded = Math.round(scaled);
      return Math.abs(scaled - rounded) < 1e-6 ? rounded : scaled;
    }
    function formatCapacity(value) {
      if (!Number.isInteger(value) || value <= 0) return String(value);
      if (value % CAPACITY_SCALE.m === 0) return `${String(value / CAPACITY_SCALE.m)}M`;
      if (value % CAPACITY_SCALE.k === 0) return `${String(value / CAPACITY_SCALE.k)}K`;
      return String(value);
    }
    /** What an empty capacity field is worth, shown as its placeholder. */
    const CAPACITY_HINT = { contextWindow: "256K", maxTokens: "32K" };
    function capacitySpelling(value) {
      return value === void 0 ? "" : formatCapacity(value);
    }
    /** Adopt a candidate, keeping whatever capacities the provider disclosed. */
    function adopt(candidate) {
      return {
        id: candidate.id,
        ...(candidate.name === void 0 ? {} : { name: candidate.name }),
        ...(candidate.contextWindow === void 0 ? {} : { contextWindow: candidate.contextWindow }),
        ...(candidate.maxTokens === void 0 ? {} : { maxTokens: candidate.maxTokens }),
      };
    }
    function IconChevron({ open }) {
      return h("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", "aria-hidden": true,
        style: { transform: open ? "rotate(90deg)" : void 0, transition: "transform 120ms ease" } },
        h("path", { d: "M6 3.5L10.5 8L6 12.5", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }));
    }
    function IconTrash() {
      return h("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
        h("path", { d: "M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9a1 1 0 001 .9h4.6a1 1 0 001-.9L12 4M6.5 6.8v4.4M9.5 6.8v4.4", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round", strokeLinejoin: "round" }));
    }
    function ModelListEditor({ models, overridden, busy, onFetchCandidates, onSave, t }) {
      const [draft, setDraft] = React.useState(void 0);
      const [failure, setFailure] = React.useState(void 0);
      const [candidates, setCandidates] = React.useState(void 0);
      const [picked, setPicked] = React.useState(new Set());
      const [expanded, setExpanded] = React.useState(new Set());
      const [editing, setEditing] = React.useState(new Map());
      const [busy2, setBusy2] = React.useState(false);
      const rows = draft ?? (Array.isArray(models) ? models : []);
      const bufferKey = (index, field) => `${String(index)}:${field}`;
      const patch = (index, next) => {
        setDraft((current) => (current ?? rows).map((model, at) => {
          if (at !== index) return model;
          const cleared = new Set(Object.entries(next).filter(([, value]) => value === void 0 || value === "").map(([key]) => key));
          return Object.fromEntries(Object.entries({ ...model, ...next }).filter(([key]) => !cleared.has(key)));
        }));
      };
      const editCapacity = (index, field, text) => {
        setEditing((current) => new Map(current).set(bufferKey(index, field), text));
        patch(index, { [field]: parseCapacity(text) });
      };
      const capacityText = (model, index, field) => editing.get(bufferKey(index, field)) ?? capacitySpelling(numberOf(model, field));
      const reindexOnRemove = (current, index) => {
        const next = new Map();
        for (const [key, value] of current) {
          const at = Number(key.slice(0, key.indexOf(":")));
          if (at === index) continue;
          next.set(at > index ? key.replace(/^\d+/, String(at - 1)) : key, value);
        }
        return next;
      };
      const toggleExpanded = (index) => {
        setExpanded((current) => {
          const next = new Set(current);
          if (!next.delete(index)) next.add(index);
          return next;
        });
      };
      const fetchModels = async () => {
        setBusy2(true);
        setFailure(void 0);
        try {
          const found = await onFetchCandidates();
          if (found.length === 0) { setFailure(t("fetchEmpty")); return; }
          const known = new Set(rows.map((model) => textOf(model, "id")));
          setCandidates(found);
          setPicked(new Set(found.filter((model) => !known.has(model.id)).map((model) => model.id)));
        } catch (error) {
          setFailure(error instanceof Error ? error.message : String(error));
        } finally {
          setBusy2(false);
        }
      };
      const closePicker = () => { setCandidates(void 0); setPicked(new Set()); };
      const adoptPicked = () => {
        if (candidates === void 0) return;
        const byId = new Map(rows.map((model) => [textOf(model, "id"), model]));
        for (const candidate of candidates) {
          if (!picked.has(candidate.id)) continue;
          byId.set(candidate.id, byId.get(candidate.id) ?? adopt(candidate));
        }
        setDraft([...byId.values()]);
        closePicker();
      };
      const toggle = (id) => {
        setPicked((current) => {
          const next = new Set(current);
          if (!next.delete(id)) next.add(id);
          return next;
        });
      };
      const activeCandidates = candidates ?? [];
      const allCandidatesPicked = activeCandidates.length > 0 && activeCandidates.every((candidate) => picked.has(candidate.id));
      const toggleAllCandidates = () => {
        setPicked((current) => activeCandidates.every((candidate) => current.has(candidate.id))
          ? new Set()
          : new Set(activeCandidates.map((candidate) => candidate.id)));
      };
      const modelFailure = rows.map((model, index) => {
        const trimmed = textOf(model, "id").trim();
        if (trimmed.length === 0) return { index, key: "modelId" };
        for (const field of ["contextWindow", "maxTokens"]) {
          const value = numberOf(model, field);
          if (value !== void 0 && (!Number.isFinite(value) || value <= 0)) return { index, key: field };
        }
        return void 0;
      }).find(Boolean);
      const apply = async () => {
        setBusy2(true);
        setFailure(void 0);
        try {
          await onSave(rows);
          setDraft(void 0);
        } catch (error) {
          setFailure(error instanceof Error ? error.message : String(error));
        } finally {
          setBusy2(false);
        }
      };
      const inputBase = { padding: "4px 8px", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", font: "inherit", fontSize: 12, minWidth: 0 };
      const linkButton = { minHeight: 24, padding: "2px 10px", border: "none", borderRadius: 12, background: "transparent", color: "var(--dsw-alias-brand-primary)", font: "inherit", fontSize: 12, cursor: "pointer" };
      const iconButton = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, flex: "none", border: "none", borderRadius: 6, background: "transparent", color: "var(--dsw-alias-label-secondary)", cursor: "pointer" };
      const disabled = busy || busy2;

      return h("section", { "aria-label": t("models"), style: { display: "flex", flexDirection: "column", gap: 8 } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
          h("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)", fontWeight: 600 } }, t("models")),
          h("span", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary)" } }, overridden ? t("modelsCustomized") : t("modelsInherited")),
          h("button", { type: "button", style: linkButton, disabled, onClick: () => void fetchModels() }, busy2 ? t("fetching") : t("fetchModels")),
        ),
        rows.length === 0
          ? h("p", { role: "status", style: { margin: 0, fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, t("modelsEmpty"))
          : null,
        rows.map((model, index) => h("div", { key: String(index), style: { display: "flex", flexDirection: "column", gap: 6, padding: 8, borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-1)" } },
          h("div", { style: { display: "flex", gap: 6, alignItems: "center" } },
            h("input", { type: "text", style: { ...inputBase, flex: 2 }, value: textOf(model, "id"), placeholder: t("modelId"), "aria-label": `${t("modelId")} ${index + 1}`, disabled, onChange: (e) => patch(index, { id: e.target.value }) }),
            h("input", { type: "text", style: { ...inputBase, flex: 2 }, value: textOf(model, "name"), placeholder: t("modelName"), "aria-label": `${t("modelName")} ${index + 1}`, disabled, onChange: (e) => patch(index, { name: e.target.value === "" ? void 0 : e.target.value }) }),
            h("button", { type: "button", style: iconButton, "aria-label": `${t("modelAdvanced")} ${index + 1}`, "aria-expanded": expanded.has(index), title: t("modelAdvanced"), disabled, onClick: () => toggleExpanded(index) }, h(IconChevron, { open: expanded.has(index) })),
            h("button", { type: "button", style: { ...iconButton, color: "var(--dsw-alias-state-error-primary)" }, "aria-label": `${t("removeModel")} ${index + 1}`, title: t("removeModel"), disabled, onClick: () => {
              setDraft((current) => (current ?? rows).filter((_model, at) => at !== index));
              setExpanded((current) => {
                const next = new Set();
                for (const at of current) { if (at < index) next.add(at); else if (at > index) next.add(at - 1); }
                return next;
              });
              setEditing((current) => reindexOnRemove(current, index));
            } }, h(IconTrash, {})),
          ),
          expanded.has(index)
            ? h("div", { style: { display: "flex", flexDirection: "column", gap: 6, padding: "0 6px" } },
                h("label", { style: { display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "var(--dsw-alias-label-secondary)" } },
                  h("span", {}, t("modelContextWindow")),
                  h("input", { type: "text", inputMode: "numeric", style: inputBase, value: capacityText(model, index, "contextWindow"), placeholder: CAPACITY_HINT.contextWindow, "aria-label": `${t("modelContextWindow")} ${index + 1}`, disabled, onChange: (e) => editCapacity(index, "contextWindow", e.target.value) }),
                ),
                h("label", { style: { display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "var(--dsw-alias-label-secondary)" } },
                  h("span", {}, t("modelMaxTokens")),
                  h("input", { type: "text", inputMode: "numeric", style: inputBase, value: capacityText(model, index, "maxTokens"), placeholder: CAPACITY_HINT.maxTokens, "aria-label": `${t("modelMaxTokens")} ${index + 1}`, disabled, onChange: (e) => editCapacity(index, "maxTokens", e.target.value) }),
                ),
              )
            : null,
        )),
        h("button", { type: "button", style: { ...linkButton, alignSelf: "flex-start" }, disabled, onClick: () => setDraft((current) => [...(current ?? rows), { id: "" }]) }, t("addModel")),
        draft !== void 0 || modelFailure !== void 0
          ? h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
              draft !== void 0
                ? h("button", { type: "button", style: { ...linkButton, border: "1px solid var(--dsw-alias-brand-primary)" }, disabled: disabled || modelFailure !== void 0, onClick: () => void apply() }, busy2 ? t("working") : t("applyModels"))
                : null,
              modelFailure !== void 0
                ? h("span", { role: "status", style: { fontSize: 11, color: "var(--dsw-alias-state-error-primary)" } }, `${t("models")} ${String(modelFailure.index + 1)}: ${t(modelFailure.key)}`)
                : null,
            )
          : null,
        failure !== void 0
          ? h("p", { role: "status", style: { margin: 0, fontSize: 11, color: "var(--dsw-alias-state-error-primary)", overflowWrap: "anywhere" } }, failure)
          : null,
        candidates !== void 0
          ? h("div", { role: "dialog", "aria-label": t("fetchTitle"), style: { display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2)", background: "var(--dsw-alias-bg-layer-2)" } },
              h("p", { style: { margin: 0, fontSize: 12, color: "var(--dsw-alias-label-secondary)" } }, t("fetchDescription")),
              h("button", { type: "button", style: linkButton, onClick: toggleAllCandidates }, t(allCandidatesPicked ? "fetchDeselectAll" : "fetchSelectAll")),
              h("div", { style: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflow: "auto" } },
                activeCandidates.map((candidate) => h("label", { key: String(candidate.id), style: { fontSize: 12, cursor: "pointer", color: "var(--dsw-alias-label-primary)", overflowWrap: "anywhere" } },
                  h("input", { type: "checkbox", checked: picked.has(candidate.id), onChange: () => toggle(candidate.id) }),
                  " " + candidate.id))),
              h("div", { style: { display: "flex", gap: 8 } },
                h("button", { type: "button", style: linkButton, onClick: closePicker }, t("cancel")),
                h("button", { type: "button", style: { ...linkButton, border: "1px solid var(--dsw-alias-brand-primary)" }, onClick: adoptPicked }, t("fetchAdopt")),
              ),
            )
          : null,
      );
    }
    // #endregion

    function ProviderCard({ provider, t }) {
      const [status, setStatus] = React.useState({ loggedIn: false, loginPending: false, accounts: [], models: [], diagnostics: [] });
      const [loading, setLoading] = React.useState(true);
      const [busy, setBusy] = React.useState(false);
      const [open, setOpen] = React.useState(false);
      const [manual, setManual] = React.useState(false);
      const [code, setCode] = React.useState("");

      const refresh = React.useCallback(async () => {
        try {
          const next = await jsonRequest(`/plugins/dsh-codex-supplement/${provider.id}/status`);
          setStatus(next);
          return next;
        } catch (cause) {
          setStatus({ loggedIn: false, accounts: [], models: [], diagnostics: [cause instanceof Error ? cause.message : String(cause)] });
          return null;
        } finally {
          setLoading(false);
        }
      }, [provider.id]);

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
          if (result?.error) setStatus((v) => ({ ...v, diagnostics: [result.error] }));
          setTimeout(() => void refresh(), 600);
        } catch (cause) {
          setStatus((v) => ({ ...v, diagnostics: [cause instanceof Error ? cause.message : String(cause)] }));
        } finally { setBusy(false); }
      };
      const submitCode = async () => {
        if (!code.trim()) return;
        setBusy(true);
        try {
          await jsonRequest(`/plugins/dsh-codex-supplement/${provider.id}/submit-code`, "POST", { code: code.trim() });
          setCode(""); setManual(false); await refresh();
        } catch (cause) {
          setStatus((v) => ({ ...v, diagnostics: [cause instanceof Error ? cause.message : String(cause)] }));
        } finally { setBusy(false); }
      };
      const logout = async () => {
        setBusy(true);
        try { await jsonRequest(`/plugins/dsh-codex-supplement/${provider.id}/logout`, "POST"); await refresh(); }
        catch { /* 占位 */ }
        finally { setBusy(false); }
      };

      const accounts = Array.isArray(status.accounts) ? status.accounts : [];
      const models = Array.isArray(status.models) ? status.models : [];
      const deviceSession = status?.loginSession && status.loginSession.userCode ? status.loginSession : null;
      const diag = [status.loginError].filter(Boolean).join("；");
      const stateText = loading ? t("checking") : status.loggedIn ? t("signedIn") : status.loginPending ? t("loginPending") : t("signedOut");
      // 模型清单来源标注（remote=远程目录 / official=官方目录（dsh 内置 pi-ai，随升级更新）/ static=订阅静态兜底 / builtin=默认目录回退；未登录/获取失败可见）
      const sourceLabel = status.catalogSource === "remote" ? t("modelsSourceRemote")
        : status.catalogSource === "official" ? t("modelsSourceOfficial")
          : status.catalogSource === "static" ? t("modelsSourceStatic")
            : status.catalogSource === "builtin" ? t("modelsSourceBuiltin")
              : "";
      // 诊断（获取失败/回退原因）单独展示（不混入登录诊断）
      const sourceDiag = Array.isArray(status.diagnostics) ? status.diagnostics : [];
      const fetchCandidates = async () => {
        setBusy(true);
        try {
          const payload = await jsonRequest(`/plugins/dsh-codex-supplement/${provider.id}/models?force=1`);
          return Array.isArray(payload.models) ? payload.models : [];
        } catch (cause) {
          setStatus((v) => ({ ...v, diagnostics: [...(Array.isArray(v.diagnostics) ? v.diagnostics : []), cause instanceof Error ? cause.message : String(cause)] }));
          return [];
        } finally { setBusy(false); }
      };
      const saveModelList = async (modelRows) => {
        await jsonRequest(`/plugins/dsh-codex-supplement/${provider.id}/models-list`, "POST", { models: modelRows });
        await refresh();
      };

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
          h("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
            h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
              h("h4", { style: { margin: 0, fontSize: 13, fontWeight: 600, color: "var(--dsw-alias-label-primary)" } }, t("models")),
              sourceLabel
                ? h("span", { style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary)" } }, sourceLabel)
                : null,
            ),
            sourceDiag.map((d) => h("p", { key: d, style: { margin: 0, fontSize: 11, color: "var(--dsw-alias-label-tertiary)", overflowWrap: "anywhere" } }, d)),
            // 始终渲染编辑器：空清单（用户全删）同样保留「获取模型/添加模型」能力
            // （2026-09-03 修：原 models.length>0 门槛导致清空后管理能力整个消失。
            //  无「重置模型」——清单来源=云端/记忆/手填，不恢复内置清单）。
            h(ModelListEditor, { models, overridden: status.modelsCustomized === true, busy, onFetchCandidates: fetchCandidates, onSave: saveModelList, t }),
          ),
          provider.id === "codex" ? h(CodexExtras, { status, refresh, t }) : null,
        ) : null,
      );
    }

    function OAuthSection({ t }) {
      return h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
        h("p", { style: { margin: 0, fontSize: 13, color: "var(--dsw-alias-label-secondary)" } }, t("oauthIntro")),
        PROVIDERS.map((provider) => h(ProviderCard, { key: provider.id, provider, t })),
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

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register("dsh-codex-supplement-auth", dictionaries), "dsh-codex-supplement-auth: dictionaries");
      const t = ctx.locale.bind("dsh-codex-supplement-auth");
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "@local/dsh-codex-supplement-auth",
        order: 12,
        label: () => t("oauthTitle"),
        inject: () => ({ t }),
      }, OAuthSection));
      // 对话输入框右侧 Fast mode 按钮：照旧插件经 modelDirectories 拿当前会话的模型选择
      // （provider/model 在 directory store 的 current 上；服务由 dsh-client-ui-model-selection
      // 提供，缺失时整段不激活——Fast mode 是增强，不让它阻塞设置区）。只在 codex 对话渲染
      // (FastModeButton performs the same Codex-model eligibility check).
      ctx.inject(["slots", "modelDirectories"], (scope) => {
        scope.slots.inject("conversation.input.right", () => scope.slots.register({
          name: "conversation.input.right",
          id: "@local/dsh-codex-supplement-fast-mode",
          order: 10,
          locale: "dsh-codex-supplement-auth",
          inject: (sessionId) => ({
            directory: scope.modelDirectories.directoryFor(sessionId).store,
          }),
        }, FastModeButton));
        // 对话输入框额度入口（照旧插件 QuotaButton：与 Fast 闪电并排，仅 codex 登录时显示有效额度）
        scope.slots.inject("conversation.input.right", () => scope.slots.register({
          name: "conversation.input.right",
          id: "@local/dsh-codex-supplement-quota",
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
    const SETTINGS_ENTRY = "codex-supplement";
    const CAPABILITIES_PATH = "/plugins/dsh-codex-supplement/capabilities";
    const CODEX_PROVIDER_ID = "openai-codex-oauth";
    const MANAGED_IMAGE_CHOICE = "codex-managed-image";

    const dictionaries = {
      zh: {
        title: "Codex 订阅生图",
        intro: "使用 ChatGPT/Codex 订阅管理的 image_generation 能力生成图片。",
        enable: "启用图片生成工具",
        engine: "Codex 订阅管理的图像引擎",
        engineHint: "订阅服务选择图像引擎；不会把 GPT Image ID 当作 Responses carrier。",
        carrier: "Responses carrier",
        signedIn: "Codex 已登录",
        signedOut: "请先登录 Codex",
        checking: "检查登录状态…",
        refresh: "刷新状态",
        loading: "加载中…",
        loadFailed: "能力状态读取失败",
        readFailed: "读取设置失败",
        writeFailed: "保存失败",
        topHint: "总开关与图像引擎选择共同决定工具是否注册。",
      },
      en: {
        title: "Codex Subscription Image Generation",
        intro: "Generate images through the ChatGPT/Codex subscription-managed image_generation capability.",
        enable: "Enable image-generation tools",
        engine: "Codex subscription-managed image engine",
        engineHint: "The subscription selects the image engine; GPT Image IDs are never used as the Responses carrier.",
        carrier: "Responses carrier",
        signedIn: "Codex signed in",
        signedOut: "Sign in to Codex first",
        checking: "Checking sign-in…",
        refresh: "Refresh status",
        loading: "Loading…",
        loadFailed: "Failed to load capability status",
        readFailed: "Failed to load settings",
        writeFailed: "Save failed",
        topHint: "The master switch and engine selection together control whether the image tools are registered.",
      },
    };

    async function jsonRequest(path, signal) {
      const response = await fetch(path, { headers: { accept: "application/json" }, signal });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      return payload;
    }

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
      const stored = config.providerModelSelections && typeof config.providerModelSelections === "object"
        ? config.providerModelSelections[CODEX_PROVIDER_ID] : undefined;
      const legacyEnabled = Array.isArray(config.enableProviders) && config.enableProviders.includes(CODEX_PROVIDER_ID);
      const selected = Array.isArray(stored?.models)
        ? stored.models.includes(MANAGED_IMAGE_CHOICE)
        : legacyEnabled;
      const oauth = capabilities?.oauth;
      const carrier = capabilities?.codexCarrier
        || capabilities?.protocols?.find((item) => item.id === CODEX_PROVIDER_ID)?.defaultModel
        || "—";

      const applyField = async (field, value) => {
        if (!writable) return false;
        setBusy(true);
        setWriteError(undefined);
        try {
          await configScope.set(field, value);
          return true;
        } catch (cause) {
          const detail = cause instanceof Error ? cause.message : String(cause);
          setWriteError(`${t("writeFailed")} (${field}): ${detail}`);
          return false;
        } finally {
          setBusy(false);
        }
      };
      const saveEngine = async (enabled) => {
        const selections = config.providerModelSelections && typeof config.providerModelSelections === "object"
          ? config.providerModelSelections : {};
        const saved = await applyField("providerModelSelections", {
          ...selections,
          [CODEX_PROVIDER_ID]: { models: enabled ? [MANAGED_IMAGE_CHOICE] : [], defaultModel: "" },
        });
        if (!saved) return;
      };

      return h("div", { style: { display: "flex", flexDirection: "column", gap: 12, paddingTop: 14, borderTop: "1px solid var(--dsw-alias-border-l2)" } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
          h("label", { style: { display: "inline-flex", alignItems: "center", gap: 8, color: "var(--dsw-alias-label-primary)", fontSize: 13, cursor: busy || !writable ? "default" : "pointer" } },
            h("input", { type: "checkbox", checked: config.enableImageGeneration === true, disabled: busy || !writable,
              onChange: (event) => void applyField("enableImageGeneration", event.target.checked),
              style: { accentColor: "var(--dsw-alias-brand-primary)" } }),
            t("enable")),
          writeError ? h("span", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)", fontSize: 12 } }, writeError) : null,
        ),
        h("p", { style: { margin: 0, color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("topHint")),
        h("div", { style: { display: "flex", flexDirection: "column", gap: 8, padding: 12, border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 10, background: "var(--dsw-alias-bg-layer-1)" } },
          h("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
            h("label", { style: { display: "inline-flex", alignItems: "center", gap: 8, color: "var(--dsw-alias-label-primary)", fontSize: 13, cursor: busy || !writable ? "default" : "pointer" } },
              h("input", { type: "checkbox", checked: selected, disabled: busy || !writable,
                onChange: (event) => void saveEngine(event.target.checked),
                style: { accentColor: "var(--dsw-alias-brand-primary)" } }),
              t("engine")),
            h("span", { style: { color: oauth?.loggedIn ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-label-secondary)", fontSize: 12 } },
              loading ? t("checking") : oauth?.loggedIn ? t("signedIn") : t("signedOut")),
            h("button", { type: "button", disabled: loading, onClick: () => void loadCapabilities(),
              style: { marginLeft: "auto", minHeight: 28, padding: "4px 10px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 8, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", font: "inherit", fontSize: 12, cursor: loading ? "default" : "pointer" } },
              loading ? t("loading") : t("refresh"))),
          h("p", { style: { margin: 0, color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("engineHint")),
          h("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, `${t("carrier")}: ${carrier}`),
          error ? h("span", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)", fontSize: 12 } }, `${t("loadFailed")}: ${error}`) : null,
        ),
      );
    }

    function CodexImageSection({ t, configScope }) {
      return h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
        h("h4", { style: { margin: 0, color: "var(--dsw-alias-label-primary)", fontSize: 16, fontWeight: 600 } }, t("title")),
        h("p", { style: { margin: 0, color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("intro")),
        h(CodexImageSettings, { t, configScope }),
      );
    }

    const inject = ["slots", "locale", "configForms"];

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, dictionaries), "Codex Supplement media dictionaries");
      const t = ctx.locale.bind(NS);
      const form = ctx.configForms.get(SETTINGS_ENTRY);
      const configScope = form === undefined ? undefined : {
        getSnapshot: () => form.getSnapshot(),
        subscribe: (listener) => form.subscribe(listener),
        set: (field, value) => form.mutate([{ op: "set", path: [field], value }]),
      };
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "@local/dsh-codex-supplement-media",
        order: 13,
        label: () => t("title"),
        inject: () => ({ t, configScope }),
      }, CodexImageSection));
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
        oauth.apply(ctx);
        media.apply(ctx);
      },
    };
  },
  cssIds: [],
  depIds: ["react", "react/jsx-runtime"],
  cssEntries: [],
});
