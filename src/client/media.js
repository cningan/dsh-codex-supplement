window.__ModuleLoader__.load({
  id: "@cningan/dsh-codex-supplement",
  factory: (require) => {
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
        subtitle: "订阅 image_generation，无需切换插件行。",
        tool: "生图工具",
        toolOn: "已开启",
        toolOff: "已关闭",
        toolMissing: "已开启 · 未注册",
        defaultModel: "默认",
        setDefault: "设为默认",
        modelSettings: "模型缺省",
        modelSettingsHint: "★ 设为默认；⚙ 编辑该模型的 quality / complexity。",
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
        carrier: "carrier",
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
        subtitle: "Subscription image_generation; no row toggling needed.",
        tool: "Image tool",
        toolOn: "On",
        toolOff: "Off",
        toolMissing: "On · not registered",
        defaultModel: "Default",
        setDefault: "Set default",
        modelSettings: "Model defaults",
        modelSettingsHint: "★ sets the default; ⚙ edits that model's quality / complexity.",
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
        carrier: "carrier",
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
      const testQualityOptions = testProfile.qualityOptions ?? ["auto"];
      const testQualityValue = testQualityOptions.includes(testQuality)
        ? testQuality
        : (testProfile.defaults?.quality ?? "auto");
      const testComplexityOptions = testProfile.complexityOptions ?? [];
      const testComplexityValue = testComplexityOptions.includes(testComplexity)
        ? testComplexity
        : (testProfile.defaults?.complexity ?? "");
      const testFormats = [
        "png", "jpeg", "webp",
        ...(testCaps.gif === true ? ["gif"] : []),
        ...(testCaps.svg === true ? ["svg"] : []),
      ];
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
  },
  cssIds: [],
  depIds: ["react", "react/jsx-runtime"],
  cssEntries: [],
});
