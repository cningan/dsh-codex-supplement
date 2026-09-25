window.__ModuleLoader__.load({
  id: "@cningan/dsh-codex-supplement",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const h = React.createElement;

    const NS = "dsh-codex-supplement-media";
    const SETTINGS_ENTRY = "codex-supplement";
    const CAPABILITIES_PATH = "/plugins/dsh-codex-supplement/capabilities";

    const dictionaries = {
      zh: {
        title: "Codex 订阅生图",
        intro: "用 ChatGPT/Codex 订阅的 image_generation 生成与编辑图片。工具不绑定模型：清单决定 model 参数能取哪些值。",
        enable: "启用图片生成工具",
        topHint: "总开关与清单共同决定工具是否注册；清单为空就不暴露生图工具。",
        models: "模型清单",
        modelsHint: "每行一个模型 id，可增可删、可自填代号。清单即工具 model 参数的合法取值；顺序即优先级，第一个是缺省档。",
        quality: "缺省质量档",
        qualityHint: "工具调用不传 quality 时用它，单次调用仍可覆盖。auto = 服务端按提示词自决。xhigh / max 仅 GPT Image 2.5（flare / sunburst）支持，gpt-image-1 / 1.5 / 2 最高到 high。",
        addModel: "添加模型",
        loadCatalog: "载入内置目录",
        catalogNote: "内置目录是插件自带的候选，不是查询结果——订阅端点没有图像模型枚举接口，「获取可用模型」在这个能力上没有数据源。",
        carrier: "Responses carrier",
        signedIn: "Codex 已登录",
        signedOut: "请先登录 Codex",
        checking: "检查登录状态…",
        refresh: "刷新状态",
        loading: "加载中…",
        loadFailed: "能力状态读取失败",
        readFailed: "读取设置失败",
        writeFailed: "保存失败",
        emptySelection: "清单为空：生图工具不会出现在上下文里。",
        rowPlaceholder: "模型 id，例如 gpt-image-2.5-flare",
        remove: "移除",
      },
      en: {
        title: "Codex Subscription Image Generation",
        intro: "Generate and edit images through the ChatGPT/Codex subscription image_generation tool. The tool is not bound to a model: this list defines the allowed values of its model argument.",
        enable: "Enable the image-generation tool",
        topHint: "The master switch and this list together decide whether the tool is registered; an empty list exposes nothing.",
        models: "Model list",
        modelsHint: "One model id per row. Add, remove, or type an id yourself. The list is the tool's allowed model values; order is priority and the first entry is the default.",
        quality: "Default quality",
        qualityHint: "Used when a call omits quality; a call can still override it. auto lets the service decide from the prompt. xhigh / max are GPT Image 2.5 (flare/sunburst) only; gpt-image-1 / 1.5 / 2 cap at high.",
        addModel: "Add model",
        loadCatalog: "Load built-in catalog",
        catalogNote: "The built-in catalog is a bundled candidate list, not a query result — the subscription endpoint has no image-model enumeration, so there is no data source for a \"fetch available models\" action here.",
        carrier: "Responses carrier",
        signedIn: "Codex signed in",
        signedOut: "Sign in to Codex first",
        checking: "Checking sign-in…",
        refresh: "Refresh status",
        loading: "Loading…",
        loadFailed: "Failed to load capability status",
        readFailed: "Failed to load settings",
        writeFailed: "Save failed",
        emptySelection: "The list is empty: the image tool will not appear in context.",
        rowPlaceholder: "model id, e.g. gpt-image-2.5-flare",
        remove: "Remove",
      },
    };

    async function jsonRequest(path, signal) {
      const response = await fetch(path, { headers: { accept: "application/json" }, signal });
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
      // 以配置为显示正源；字段缺失（旧宿主）时回落到 Host 解析出的清单。
      const saved = Array.isArray(config.imageModels)
        ? config.imageModels
        : (Array.isArray(capability?.models) ? capability.models : []);
      const list = draft ?? saved;
      const oauth = capabilities?.oauth;
      const carrier = capabilities?.codexCarrier || capability?.carrierModel || "—";
      const qualityOptions = Array.isArray(capability?.qualities) && capability.qualities.length > 0
        ? capability.qualities
        : ["auto", "low", "medium", "high", "xhigh", "max"];
      const defaultQuality = typeof config.imageQuality === "string" && config.imageQuality.length > 0
        ? config.imageQuality
        : (typeof capability?.defaultQuality === "string" ? capability.defaultQuality : "auto");

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
        await mutate([["imageModels", cleaned]]);
      };

      const rows = list.map((value, index) => h("div", {
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
        h("button", {
          type: "button",
          title: t("remove"),
          "aria-label": t("remove"),
          disabled: busy || !writable,
          onClick: () => void commit(list.filter((_, position) => position !== index)),
          style: { ...buttonStyle, cursor: busy || !writable ? "default" : "pointer" },
        }, "✕")));

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
              style: { ...buttonStyle, marginLeft: "auto", cursor: loading ? "default" : "pointer" } },
              loading ? t("loading") : t("refresh"))),
          h("p", { style: { margin: 0, color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("modelsHint")),
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
              onClick: () => void commit(catalog.map((item) => item.id)),
              style: { ...buttonStyle, cursor: busy || !writable || catalog.length === 0 ? "default" : "pointer" },
            }, t("loadCatalog"))),
          h("p", { style: { margin: 0, color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("catalogNote")),
          h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 4 } },
            h("span", { style: { color: "var(--dsw-alias-label-primary)", fontSize: 12 } }, t("quality")),
            h("select", {
              value: defaultQuality,
              disabled: busy || !writable,
              onChange: (event) => void mutate([["imageQuality", event.target.value]]),
              style: { minHeight: 30, padding: "4px 8px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 8, background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", font: "inherit", fontSize: 12 },
            }, ...qualityOptions.map((option) => h("option", { key: option, value: option }, option))),
            h("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("qualityHint"))),
          list.length === 0
            ? h("p", { role: "status", style: { margin: 0, color: "var(--dsw-alias-state-error-primary)", fontSize: 12 } }, t("emptySelection"))
            : null,
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
