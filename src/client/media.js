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

    const dictionaries = {
      zh: {
        title: "Codex 订阅生图",
        intro: "用 ChatGPT/Codex 订阅的 image_generation 生成与编辑图片。工具不绑定模型：勾选决定可选档位，也决定工具是否暴露。",
        enable: "启用图片生成工具",
        topHint: "总开关与勾选共同决定工具是否注册；一个都不勾就不暴露生图工具。",
        models: "可用图像模型",
        modelsHint: "勾选项决定工具 model 参数的合法取值。图像引擎仍由订阅服务端执行，这里只是声明想用哪一档。",
        defaultModel: "默认档位",
        defaultHint: "工具调用不传 model 时使用这一档。",
        fast: "快速档",
        quality: "高质量档",
        legacyTier: "前代",
        carrier: "Responses carrier",
        signedIn: "Codex 已登录",
        signedOut: "请先登录 Codex",
        checking: "检查登录状态…",
        refresh: "刷新状态",
        loading: "加载中…",
        loadFailed: "能力状态读取失败",
        readFailed: "读取设置失败",
        writeFailed: "保存失败",
        noCatalog: "未读到可选模型目录",
        emptySelection: "当前未勾选任何模型：生图工具不会出现在上下文里。",
      },
      en: {
        title: "Codex Subscription Image Generation",
        intro: "Generate and edit images through the ChatGPT/Codex subscription image_generation tool. The tool is not bound to a model: your selection decides the allowed levels and whether the tool is exposed at all.",
        enable: "Enable the image-generation tool",
        topHint: "The master switch and your selection together decide whether the tool is registered; an empty selection exposes nothing.",
        models: "Enabled image models",
        modelsHint: "The checked entries are the allowed values of the tool's model parameter. The subscription still runs the engine; this only declares which tier to ask for.",
        defaultModel: "Default tier",
        defaultHint: "Used when a tool call omits model.",
        fast: "fast",
        quality: "quality",
        legacyTier: "legacy",
        carrier: "Responses carrier",
        signedIn: "Codex signed in",
        signedOut: "Sign in to Codex first",
        checking: "Checking sign-in…",
        refresh: "Refresh status",
        loading: "Loading…",
        loadFailed: "Failed to load capability status",
        readFailed: "Failed to load settings",
        writeFailed: "Save failed",
        noCatalog: "No model catalog available",
        emptySelection: "Nothing is selected: the image tool will not appear in context.",
      },
    };

    async function jsonRequest(path, signal) {
      const response = await fetch(path, { headers: { accept: "application/json" }, signal });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      return payload;
    }

    function tierLabel(t, tier) {
      if (tier === "fast") return t("fast");
      if (tier === "quality") return t("quality");
      return t("legacyTier");
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
      const capability = capabilities?.capability;
      const catalog = Array.isArray(capability?.catalog) ? capability.catalog : [];
      // 以配置为显示正源；配置字段缺失（旧宿主）时回落到 Host 解析出的清单。
      const selected = Array.isArray(config.imageModels)
        ? config.imageModels
        : (Array.isArray(capability?.models) ? capability.models : []);
      const defaultModel = typeof config.defaultImageModel === "string" && config.defaultImageModel.length > 0
        ? config.defaultImageModel
        : (typeof capability?.defaultModel === "string" ? capability.defaultModel : "");
      const oauth = capabilities?.oauth;
      const carrier = capabilities?.codexCarrier || capability?.carrierModel || "—";

      const mutate = async (entries) => {
        if (!writable) return false;
        setBusy(true);
        setWriteError(undefined);
        try {
          if (typeof configScope.setMany === "function") await configScope.setMany(entries);
          else for (const [field, value] of entries) await configScope.set(field, value);
          return true;
        } catch (cause) {
          const detail = cause instanceof Error ? cause.message : String(cause);
          setWriteError(`${t("writeFailed")}: ${detail}`);
          return false;
        } finally {
          setBusy(false);
        }
      };

      const toggleModel = (id, checked) => {
        const next = checked
          ? [...new Set([...selected, id])]
          : selected.filter((item) => item !== id);
        const entries = [["imageModels", next]];
        // 取消勾选的正好是默认档时，把默认档顺移到剩下的第一个，避免留下悬空默认值。
        if (!checked && defaultModel === id) entries.push(["defaultImageModel", next[0] ?? ""]);
        void mutate(entries);
      };

      const listbox = catalog.length === 0
        ? h("p", { style: { margin: 0, color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("noCatalog"))
        : h("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
            ...catalog.map((item) => h("label", {
              key: item.id,
              style: { display: "flex", alignItems: "baseline", gap: 8, fontSize: 12, color: "var(--dsw-alias-label-primary)", cursor: busy || !writable ? "default" : "pointer" },
            },
              h("input", {
                type: "checkbox",
                checked: selected.includes(item.id),
                disabled: busy || !writable,
                onChange: (event) => toggleModel(item.id, event.target.checked),
                style: { accentColor: "var(--dsw-alias-brand-primary)" },
              }),
              h("span", null, `${item.label} · ${tierLabel(t, item.tier)}`),
              h("span", { style: { color: "var(--dsw-alias-label-secondary)" } }, item.id),
              item.note ? h("span", { style: { color: "var(--dsw-alias-label-secondary)" } }, item.note) : null,
            )));

      return h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
          h("label", { style: { display: "inline-flex", alignItems: "center", gap: 8, color: "var(--dsw-alias-label-primary)", fontSize: 13, cursor: busy || !writable ? "default" : "pointer" } },
            h("input", { type: "checkbox", checked: config.enableImageGeneration === true, disabled: busy || !writable,
              onChange: (event) => void mutate([["enableImageGeneration", event.target.checked]]),
              style: { accentColor: "var(--dsw-alias-brand-primary)" } }),
            t("enable")),
          writeError ? h("span", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)", fontSize: 12 } }, writeError) : null,
        ),
        h("p", { style: { margin: 0, color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("topHint")),
        h("div", { style: { display: "flex", flexDirection: "column", gap: 8, padding: 12, border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 10, background: "var(--dsw-alias-bg-layer-1)" } },
          h("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
            h("span", { style: { color: "var(--dsw-alias-label-primary)", fontSize: 13, fontWeight: 600 } }, t("models")),
            h("span", { style: { color: oauth?.loggedIn ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-label-secondary)", fontSize: 12 } },
              loading ? t("checking") : oauth?.loggedIn ? t("signedIn") : t("signedOut")),
            h("button", { type: "button", disabled: loading, onClick: () => void loadCapabilities(),
              style: { marginLeft: "auto", minHeight: 28, padding: "4px 10px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 8, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", font: "inherit", fontSize: 12, cursor: loading ? "default" : "pointer" } },
              loading ? t("loading") : t("refresh"))),
          h("p", { style: { margin: 0, color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("modelsHint")),
          listbox,
          selected.length === 0
            ? h("p", { role: "status", style: { margin: 0, color: "var(--dsw-alias-state-error-primary)", fontSize: 12 } }, t("emptySelection"))
            : null,
          h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 4 } },
            h("span", { style: { color: "var(--dsw-alias-label-primary)", fontSize: 12 } }, t("defaultModel")),
            h("select", {
              value: selected.includes(defaultModel) ? defaultModel : (selected[0] ?? ""),
              disabled: busy || !writable || selected.length === 0,
              onChange: (event) => void mutate([["defaultImageModel", event.target.value]]),
              style: { minHeight: 28, padding: "2px 8px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 8, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", font: "inherit", fontSize: 12 },
            },
              ...selected.map((id) => {
                const entry = catalog.find((item) => item.id === id);
                return h("option", { key: id, value: id }, entry ? `${entry.label} · ${tierLabel(t, entry.tier)}` : id);
              })),
            h("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("defaultHint"))),
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
        setMany: (entries) => form.mutate(entries.map(([field, value]) => ({ op: "set", path: [field], value }))),
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
