/**
 * Codex Supplement 的裸包名入口：**图像生成组件**（media）。
 *
 * 为什么裸包名 row 必须是 media（2026-11-09 对 DSH 0.2.2-rc.1 的接口取证）：
 * `@deepseek-ai/dsh-client-modules` 的 `exactPackageSpecifier()` 只接受**裸包名**
 * （`@scope/name`），对 `@scope/name/subpath` 返回 undefined，随后直接跳过该 row 的
 * Client 模块发现。设置页的 Client 模块只能由裸包名 row 带出来。
 *
 * 因此 bundle patch 的行布局是：
 * - `codex-supplement`（裸包名）→ 本入口（media，含设置页与试生图路由）；
 * - `codex-supplement-auth`（`/auth` 子路径）→ OAuth 登录/用量/搜索/Fast Mode。
 *
 * 这样旧 profile patch 里的 `- id: codex-supplement name: '@cningan/dsh-codex-supplement'`
 * 仍然命中同一行，旧媒体配置（imageModels / imageQuality / imageOutputDir）**原地保留**，
 * 无需迁移；auth 由新行补齐。
 *
 * 若只想用单一入口跑全部 Host 能力，可显式再挂 `/auth` 行；本入口不再暗含 auth，
 * 避免与独立 auth 行重复注册服务与路由。
 */

import { Config, apply, inject } from './media/index.js'

/** 与包名相同的 row 标识（也是设置页 configForms 的 entry id）。 */
export const name = 'dsh-codex-supplement'
export { Config, apply, inject }
