window.__ModuleLoader__.load({
  id: "@local/dsh-codex-supplement",
  factory: (require) => {
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

      return h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
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
      return h("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--dsw-alias-border-l2)" } },
        h("h4", { style: { margin: 0, color: "var(--dsw-alias-label-primary)", fontSize: 16, fontWeight: 600 } }, t("title")),
        h("p", { style: { margin: 0, color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("intro")),
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
      };
      return { t, configScope, Section: CodexImageSection };
    }

    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
  cssIds: [],
  depIds: ["react", "react/jsx-runtime"],
  cssEntries: [],
});
