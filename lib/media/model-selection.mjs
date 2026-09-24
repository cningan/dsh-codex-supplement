const CODEX_PROVIDER_ID = 'openai-codex-oauth'

/** Stored selection sentinel; never sent upstream as an image or carrier model ID. */
export const CODEX_MANAGED_IMAGE_CHOICE = 'codex-managed-image'

export function isValidModelId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/:+-]{0,127}$/.test(value)
}

/** Resolve the one supported image engine, honoring an explicit empty selection. */
export function resolveSelectedModelIds({ providerId, selections, legacyEnabled }) {
  if (providerId !== CODEX_PROVIDER_ID) return []
  const current = selections && typeof selections === 'object' ? selections : {}
  if (Object.prototype.hasOwnProperty.call(current, providerId)) {
    return Array.isArray(current[providerId]?.models)
      && current[providerId].models.includes(CODEX_MANAGED_IMAGE_CHOICE)
      ? [CODEX_MANAGED_IMAGE_CHOICE]
      : []
  }
  return legacyEnabled === true ? [CODEX_MANAGED_IMAGE_CHOICE] : []
}

/** Resolve only the official Codex Responses carrier; the managed image choice is never the carrier. */
export function resolveImageModel({ adapter, savedSelection, documentedSelection, officialCodexDefaultModel }) {
  if (adapter?.id !== CODEX_PROVIDER_ID || adapter?.auth !== 'oauth') {
    throw new Error('Only the Codex subscription image adapter is supported')
  }
  const selected = Array.isArray(savedSelection?.models)
    ? savedSelection.models
    : documentedSelection?.models
  if (!Array.isArray(selected) || !selected.includes(CODEX_MANAGED_IMAGE_CHOICE)) {
    throw new Error('Select the Codex-managed image engine in Codex Supplement settings first')
  }
  return isValidModelId(officialCodexDefaultModel) ? officialCodexDefaultModel : undefined
}
