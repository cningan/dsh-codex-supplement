/**
 * Codex account store — a small, single-account-compatible store for legacy OAuth state.
 *
 * Scoped scope decision (discipline 0): dockyard used an AccountPool persisted
 * through a state store and selected accounts by policy. This plugin does NOT
 * drag in ModuleRuntime/DshInjectionBridge, so it keeps a deliberately small
 * in-memory map + a single JSON file. It records the semantic account facts Codex
 * auth needs at sign-in time (`accountId`, `auth.credentialRef`, `email`,
 * `subscription.plan`, `refresh`), never the OAuth token itself — tokens live
 * in the plugin's WindowsSecretFileStore behind the credentialRef.
 * @module dsh-codex-supplement/account-store
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const DEFAULT_FILE = process.env.DSH_HOME
  ? join(process.env.DSH_HOME, "oauth-login", "codex-accounts.json")
  : join(process.env.HOME ?? process.env.USERPROFILE ?? ".", ".dsh", "oauth-login", "codex-accounts.json");

function stringOrNull(value) {
  return value === undefined || value === null || value === "" ? null : String(value);
}

/** Normalize Codex account metadata into the persisted record shape. */
export function normalizeAccount(input = {}) {
  const auth = input.auth ?? {};
  const credentialRef = stringOrNull(auth.credentialRef ?? input.credentialRef);
  if (!credentialRef) throw new Error(`Codex account missing credentialRef: ${input.accountId ?? "(unknown)"}`);
  return {
    providerId: stringOrNull(input.providerId) ?? "openai-codex",
    accountId: String(input.accountId),
    displayName: stringOrNull(input.displayName),
    email: stringOrNull(input.email),
    auth: {
      kind: stringOrNull(auth.kind) ?? "oauth",
      credentialRef,
      scopes: Array.isArray(auth.scopes) ? [...auth.scopes] : [],
    },
    subscription: {
      plan: stringOrNull(input.subscription?.plan),
      status: stringOrNull(input.subscription?.status),
      expiresAt: null,
    },
    refresh: {
      accessTokenExpiresAt: stringOrNull(input.refresh?.accessTokenExpiresAt),
      nextRefreshAt: stringOrNull(input.refresh?.nextRefreshAt),
      lastRefreshedAt: stringOrNull(input.refresh?.lastRefreshedAt),
      refreshable: input.refresh?.refreshable === undefined ? null : Boolean(input.refresh.refreshable),
    },
    resources: input.resources && typeof input.resources === "object" ? { ...input.resources } : {},
    updatedAt: new Date().toISOString(),
  };
}

export class OAuthAccountStore {
  constructor({ file = DEFAULT_FILE } = {}) {
    this.file = file;
    this.accounts = new Map();
    this.defaultAccountId = null;
  }

  async load() {
    try {
      const raw = JSON.parse(readFileSync(this.file, "utf8"));
      this.accounts = new Map((Array.isArray(raw.accounts) ? raw.accounts : []).map((account) => {
        const normalized = normalizeAccount(account);
        return [normalized.accountId, normalized];
      }));
      if (raw.defaultAccountId && this.accounts.has(raw.defaultAccountId)) {
        this.defaultAccountId = raw.defaultAccountId;
      }
    } catch {
      // Missing/invalid state file => empty store, never fatal.
      this.accounts = new Map();
      this.defaultAccountId = null;
    }
    return this;
  }

  async persist() {
    const dir = dirname(this.file);
    mkdirSync(dir, { recursive: true });
    const payload = {
      defaultAccountId: this.defaultAccountId,
      accounts: [...this.accounts.values()],
    };
    writeFileSync(this.file, JSON.stringify(payload, null, 2), { encoding: "utf8", mode: 0o600 });
    return this;
  }

  upsert(account) {
    const normalized = normalizeAccount(account);
    const existing = this.accounts.get(normalized.accountId);
    // Keep the stored default stable across refresh upserts.
    if (existing && this.defaultAccountId === existing.accountId) {
      this.defaultAccountId = normalized.accountId;
    }
    this.accounts.set(normalized.accountId, { ...existing, ...normalized });
    if (!this.defaultAccountId) this.defaultAccountId = normalized.accountId;
    return this.accounts.get(normalized.accountId);
  }

  get(accountId) {
    return this.accounts.get(accountId) ?? null;
  }

  list() {
    return [...this.accounts.values()];
  }

  setDefault(accountId) {
    if (this.accounts.has(accountId)) this.defaultAccountId = accountId;
    return this;
  }

  getDefaultAccountId() {
    return this.defaultAccountId;
  }

  remove(accountId) {
    const removed = this.accounts.delete(accountId);
    if (this.defaultAccountId === accountId) {
      this.defaultAccountId = this.accounts.keys().next().value ?? null;
    }
    return removed;
  }

  /**
   * Select the account used for a stream/invoke. Prefers an explicit
   * `accountId`, else the configured default, else the most recently-used
   * (last in insertion order), else null.
   */
  select({ accountId = null } = {}) {
    if (accountId) return this.accounts.get(accountId) ?? null;
    if (this.defaultAccountId) return this.accounts.get(this.defaultAccountId) ?? null;
    return this.list().at(-1) ?? null;
  }
}

/** Load-on-construct convenience for the host plugin. */
export async function createAccountStore(options = {}) {
  const store = new OAuthAccountStore(options);
  return store.load();
}
