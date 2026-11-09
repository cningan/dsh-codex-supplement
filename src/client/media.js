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
    const TEST_IMAGE_PATH = "/plugins/dsh-codex-supplement/codex/test-image";
    /** 设置页“载入 2.6 两档”的固定清单（与 Host 出厂默认一致）。 */
    const LATEST_IMAGE_MODELS = ["gpt-image-2.6-flare", "gpt-image-2.6-sunburst"];

    const dictionaries = {
      zh: {
        title: "Codex 订阅生图",
        intro: "用 ChatGPT/Codex 订阅的 image_generation 生成与编辑图片。工具不绑定模型：清单决定 model 参数能取哪些值。",
        enable: "启用图片生成工具",
        topHint: "总开关与清单共同决定工具是否注册；清单为空就不暴露生图工具。",
        models: "模型清单",
        modelsHint: "每行一个模型 id，可增可删、可自填代号。清单即工具 model 参数的合法取值；顺序即优先级，第一个是缺省档。",
        quality: "缺省质量档",
        qualityHint: "工具调用不传 quality 时用它，单次调用仍可覆盖。auto = 服务端按提示词自决。xhigh / max 仅 GPT Image 2.5（flare / sunburst）支持；2.6 请配合 complexity 使用。",
        complexity: "缺省复杂度",
        complexityHint: "2.6 起把“场景规划”与“像素渲染”拆开；low 适合快速改图，medium/high 适合元素多或约束多的场景。",
        complexityDefault: "模型默认",
        addModel: "添加模型",
        loadCatalog: "载入内置目录",
        loadLatest: "载入 2.6 两档",
        catalogNote: "内置目录是插件自带的候选（含 2.6 / 2.5 / 前代），不是查询结果——订阅端点没有图像模型枚举接口；“可用性”只能靠下方的试生图实测。",
        deprecated: "已下线",
        testTitle: "试生图",
        testIntro: "用当前勾选与设置发一次最小请求，只验证端点是否返图；不写工作区、不注册工具。OAuth lane 可能忽略 model / size / complexity，也可能拒绝 gif / svg。",
        testPrompt: "测试提示词",
        testPromptPlaceholder: "例如：A simple red apple on a white background, product photo",
        testModel: "模型",
        testQuality: "质量",
        testComplexity: "复杂度",
        testSize: "尺寸",
        testFormat: "格式",
        testRun: "生成测试图",
        testRunning: "生成中…",
        testOk: "成功",
        testFailed: "失败",
        testElapsed: "耗时",
        testRequested: "请求",
        testEffective: "上游回传",
        testNoEffective: "上游未回传实际模型/尺寸（可能被忽略）",
        testPreviewLimited: "图片过大，未内联预览；但上游确实返回了图片。",
        testConsumes: "每次点击会真实生成一张图并消耗订阅额度。",
        testNeedLogin: "先登录 Codex 才能试生图。",
        testUnsupported: "当前勾选的模型不支持该能力。",
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
        qualityHint: "Used when a call omits quality; a call can still override it. auto lets the service decide from the prompt. xhigh / max are GPT Image 2.5 (flare/sunburst) only; use quality together with complexity for 2.6.",
        complexity: "Default complexity",
        complexityHint: "GPT Image 2.6 splits planning from rendering: low for quick edits, medium/high for scenes with many elements or constraints.",
        complexityDefault: "Model default",
        addModel: "Add model",
        loadCatalog: "Load built-in catalog",
        loadLatest: "Load the two 2.6 models",
        catalogNote: "The built-in catalog contains 2.6 / 2.5 / earlier candidates; it is not a query result — the subscription endpoint has no image-model enumeration. Only the test button below can tell what the lane actually accepts.",
        deprecated: "retired",
        testTitle: "Test generation",
        testIntro: "Sends one minimal request with the current selection and settings to check whether the endpoint returns an image. It does not write the workspace or register a tool. The OAuth lane may ignore model / size / complexity and may reject gif / svg.",
        testPrompt: "Test prompt",
        testPromptPlaceholder: "e.g. A simple red apple on a white background, product photo",
        testModel: "Model",
        testQuality: "Quality",
        testComplexity: "Complexity",
        testSize: "Size",
        testFormat: "Format",
        testRun: "Generate test image",
        testRunning: "Generating…",
        testOk: "Succeeded",
        testFailed: "Failed",
        testElapsed: "elapsed",
        testRequested: "Requested",
        testEffective: "Returned by endpoint",
        testNoEffective: "The endpoint returned no effective model/size metadata (fields may be ignored).",
        testPreviewLimited: "The image is too large for an inline preview, but the endpoint did return an image.",
        testConsumes: "Each click really generates one image and consumes subscription quota.",
        testNeedLogin: "Sign in to Codex before testing.",
        testUnsupported: "The selected model does not support this capability.",
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
      const defaultComplexity = typeof config.imageComplexity === "string" ? config.imageComplexity : "";

      // 试生图派生值：清单变化后自动回落到首个启用模型。
      const activeTestModel = list.includes(testModel) ? testModel : (list[0] ?? "");
      const testChoice = catalog.find((item) => item.id === activeTestModel);
      const testCaps = testChoice?.capabilities ?? {};
      const testQualityValue = qualityOptions.includes(testQuality) ? testQuality : defaultQuality;
      const testComplexityValue = ["low", "medium", "high"].includes(testComplexity) ? testComplexity : "";
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
        await mutate([["imageModels", cleaned]]);
      };

      const rows = list.map((value, index) => {
        const choice = catalog.find((item) => item.id === value);
        const tierLabel = choice === undefined
          ? ""
          : choice.tier === "fast" ? "快速" : choice.tier === "quality" ? "高质量" : "前代";
        return h("div", {
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
            title: t("remove"),
            "aria-label": t("remove"),
            disabled: busy || !writable,
            onClick: () => void commit(list.filter((_, position) => position !== index)),
            style: { ...buttonStyle, cursor: busy || !writable ? "default" : "pointer" },
          }, "✕"));
      });

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
            }, t("loadCatalog")),
            h("button", {
              type: "button",
              disabled: busy || !writable,
              onClick: () => void commit(LATEST_IMAGE_MODELS),
              style: { ...buttonStyle, cursor: busy || !writable ? "default" : "pointer" },
            }, t("loadLatest"))),
          h("p", { style: { margin: 0, color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("catalogNote")),
          h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 4 } },
            h("span", { style: { color: "var(--dsw-alias-label-primary)", fontSize: 12 } }, t("quality")),
            h("select", {
              value: defaultQuality,
              disabled: busy || !writable,
              onChange: (event) => void mutate([["imageQuality", event.target.value]]),
              style: selectStyle,
            }, ...qualityOptions.map((option) => h("option", { key: option, value: option }, option))),
            h("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("qualityHint"))),
          h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            h("span", { style: { color: "var(--dsw-alias-label-primary)", fontSize: 12 } }, t("complexity")),
            h("select", {
              value: ["low", "medium", "high"].includes(defaultComplexity) ? defaultComplexity : "",
              disabled: busy || !writable,
              onChange: (event) => void mutate([["imageComplexity", event.target.value]]),
              style: selectStyle,
            },
              h("option", { value: "" }, t("complexityDefault")),
              ...["low", "medium", "high"].map((option) => h("option", { key: option, value: option }, option))),
            h("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("complexityHint"))),
          list.length === 0
            ? h("p", { role: "status", style: { margin: 0, color: "var(--dsw-alias-state-error-primary)", fontSize: 12 } }, t("emptySelection"))
            : null,
          h("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, `${t("carrier")}: ${carrier}`),
          error ? h("span", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)", fontSize: 12 } }, `${t("loadFailed")}: ${error}`) : null,
        ),
        h("div", { style: { display: "flex", flexDirection: "column", gap: 10, padding: 12, border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 10, background: "var(--dsw-alias-bg-layer-1)" } },
          h("div", { style: { display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" } },
            h("span", { style: { color: "var(--dsw-alias-label-primary)", fontSize: 13, fontWeight: 600 } }, t("testTitle")),
            h("span", { style: { color: "var(--dsw-alias-state-warning-primary, var(--dsw-alias-label-secondary))", fontSize: 11 } }, t("testConsumes"))),
          h("p", { style: { margin: 0, color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("testIntro")),
          h("label", { style: { display: "flex", flexDirection: "column", gap: 4 } },
            h("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("testPrompt")),
            h("textarea", {
              rows: 2,
              value: testPrompt,
              placeholder: t("testPromptPlaceholder"),
              onChange: (event) => setTestPrompt(event.target.value),
              style: { ...inputStyle, resize: "vertical", minHeight: 52 },
            })),
          h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            h("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("testModel")),
            h("select", {
              value: activeTestModel,
              disabled: list.length === 0,
              onChange: (event) => setTestModel(event.target.value),
              style: selectStyle,
            }, ...list.map((id) => h("option", { key: id, value: id }, id))),
            h("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("testQuality")),
            h("select", {
              value: testQualityValue,
              onChange: (event) => setTestQuality(event.target.value),
              style: selectStyle,
            }, ...qualityOptions.map((option) => h("option", { key: option, value: option }, option))),
            h("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("testComplexity")),
            h("select", {
              value: testComplexityValue,
              disabled: testCaps.complexity !== true,
              title: testCaps.complexity === true ? "" : t("testUnsupported"),
              onChange: (event) => setTestComplexity(event.target.value),
              style: selectStyle,
            },
              h("option", { value: "" }, t("complexityDefault")),
              ...["low", "medium", "high"].map((option) => h("option", { key: option, value: option }, option))),
            h("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("testSize")),
            h("input", {
              type: "text",
              value: testSize,
              onChange: (event) => setTestSize(event.target.value),
              style: { ...inputStyle, flex: "0 0 110px" },
            }),
            h("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("testFormat")),
            h("select", {
              value: testFormatValue,
              onChange: (event) => setTestFormat(event.target.value),
              style: selectStyle,
            }, ...testFormats.map((option) => h("option", { key: option, value: option }, option)))),
          h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
            h("button", {
              type: "button",
              disabled: testing || !oauth?.loggedIn || list.length === 0 || testPrompt.trim().length === 0,
              onClick: () => void runTest(),
              style: {
                ...buttonStyle,
                background: "var(--dsw-alias-brand-primary)",
                borderColor: "var(--dsw-alias-brand-primary)",
                color: "var(--dsw-alias-label-inverse, #fff)",
                cursor: testing || !oauth?.loggedIn || list.length === 0 ? "default" : "pointer",
              },
            }, testing ? t("testRunning") : t("testRun")),
            !oauth?.loggedIn ? h("span", { style: { color: "var(--dsw-alias-label-secondary)", fontSize: 12 } }, t("testNeedLogin")) : null),
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
            testResult.error ? h("pre", { style: { margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--dsw-alias-state-error-primary)", fontSize: 11 } }, testResult.error) : null,
            ...(Array.isArray(testResult.images)
              ? testResult.images.map((image, index) => image.dataUrl
                ? h("img", {
                  key: `test-image-${index}`,
                  src: image.dataUrl,
                  alt: `test image ${index + 1}`,
                  style: {
                    maxWidth: "100%",
                    maxHeight: 260,
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
