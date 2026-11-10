/**
 * 裸包名入口：**base 组件行**。
 *
 * 这一行承载 OAuth 登录、用量、Fast Mode 与合并后的设置页，并提供
 * `openaiCodexAuth` 给 image / search 两个子组件行。`dsh-client-modules`
 * 只对裸包名 row 发现 Client 模块，所以 base 必须是裸包名。
 *
 * 行 id 在 0.7.0 的包名迁移中保持不变（`codex-supplement`），所以按行 id
 * 保存的配置仍命中本行；旧媒体字段由 base 的 config schema 接住，image 行
 * 启动时作为一次性迁移默认值读取。
 */

import { Config, apply, inject } from './entries/base.js'

export const name = 'dsh-codex-supplement'
export { Config, apply, inject }
