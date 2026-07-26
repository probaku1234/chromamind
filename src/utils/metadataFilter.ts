import {
  MetadataCondition,
  MetadataOperator,
  MetadataValueType,
  OPERATOR_LABELS,
} from '../types'

/**
 * Coerce a raw string input into the JSON value expected for a given metadata type.
 * Returns `undefined` when the input cannot be represented as that type (e.g. a
 * non-numeric string for a `number` field), so callers can treat the row as invalid.
 */
export function coerceValue(
  value: string,
  type: MetadataValueType,
): string | number | boolean | undefined {
  switch (type) {
    case 'number': {
      if (value.trim() === '') return undefined
      const n = Number(value)
      return Number.isNaN(n) ? undefined : n
    }
    case 'boolean': {
      const v = value.trim()
      if (v === 'true') return true
      if (v === 'false') return false
      return undefined
    }
    case 'string':
      return value
    default:
      return undefined
  }
}

/** A condition is applicable only when it has a field and a representable value. */
export function isConditionComplete(condition: MetadataCondition): boolean {
  return (
    condition.field.trim() !== '' &&
    coerceValue(condition.value, condition.type) !== undefined
  )
}

/**
 * Build a ChromaDB Mongo-style `where` object from a flat list of AND conditions.
 * Incomplete rows are ignored. Returns `null` when nothing usable is present.
 *
 * - one condition  -> `{ field: { $op: value } }`
 * - many conditions -> `{ $and: [ ...each ] }`
 */
export function buildWhereFromConditions(
  conditions: MetadataCondition[],
): Record<string, unknown> | null {
  const clauses = conditions.filter(isConditionComplete).map((c) => ({
    [c.field.trim()]: { [c.operator]: coerceValue(c.value, c.type) },
  }))

  if (clauses.length === 0) return null
  if (clauses.length === 1) return clauses[0]
  return { $and: clauses }
}

const valueType = (value: unknown): MetadataValueType => {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  return 'string'
}

const ALLOWED_OPERATORS = new Set<string>(Object.keys(OPERATOR_LABELS))

/**
 * Turn a single `{ field: { $op: value } }` clause into a `MetadataCondition`.
 * Returns `null` for any shape that isn't exactly one field mapping to exactly
 * one recognised operator, so unparseable input can be dropped by the caller.
 */
function parseClause(
  clause: Record<string, unknown>,
): MetadataCondition | null {
  const keys = Object.keys(clause)
  if (keys.length !== 1) return null
  const field = keys[0]
  if (!field || field === '$and') return null

  const opValue = clause[field]
  if (typeof opValue !== 'object' || opValue === null || Array.isArray(opValue)) {
    return null
  }

  const opKeys = Object.keys(opValue as Record<string, unknown>)
  if (opKeys.length !== 1) return null
  const operator = opKeys[0]
  if (!ALLOWED_OPERATORS.has(operator)) return null

  const value = (opValue as Record<string, unknown>)[operator]
  return {
    field,
    operator: operator as MetadataOperator,
    value: String(value),
    type: valueType(value),
  }
}

/**
 * Inverse of `buildWhereFromConditions`: turns a stored Mongo-style `where` object
 * back into editable `MetadataCondition` rows, so the filter builder can be
 * repopulated with the currently-applied filter. Returns `[]` when `where` is
 * `null`/unparseable.
 */
export function parseConditionsFromWhere(
  where: Record<string, unknown> | null | undefined,
): MetadataCondition[] {
  if (!where) return []

  const rawClauses = Array.isArray(where.$and)
    ? (where.$and as Record<string, unknown>[])
    : [where]

  const conditions = rawClauses
    .map(parseClause)
    .filter((c): c is MetadataCondition => c !== null)

  return conditions
}
