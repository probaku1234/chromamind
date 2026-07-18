import { describe, test, expect } from 'vitest'
import {
  buildWhereFromConditions,
  coerceValue,
  isConditionComplete,
  parseConditionsFromWhere,
} from './metadataFilter'
import { MetadataCondition } from '../types'

const cond = (over: Partial<MetadataCondition>): MetadataCondition => ({
  field: 'page',
  operator: '$eq',
  value: '1',
  type: 'number',
  ...over,
})

describe('coerceValue', () => {
  test('coerces numbers and rejects non-numeric / empty', () => {
    expect(coerceValue('42', 'number')).toBe(42)
    expect(coerceValue('3.5', 'number')).toBe(3.5)
    expect(coerceValue('abc', 'number')).toBeUndefined()
    expect(coerceValue('', 'number')).toBeUndefined()
  })

  test('coerces booleans', () => {
    expect(coerceValue('true', 'boolean')).toBe(true)
    expect(coerceValue('false', 'boolean')).toBe(false)
  })

  test('passes strings through', () => {
    expect(coerceValue('hello', 'string')).toBe('hello')
  })
})

describe('isConditionComplete', () => {
  test('requires a field and a representable value', () => {
    expect(isConditionComplete(cond({}))).toBe(true)
    expect(isConditionComplete(cond({ field: '  ' }))).toBe(false)
    expect(isConditionComplete(cond({ value: 'abc', type: 'number' }))).toBe(
      false,
    )
  })
})

describe('buildWhereFromConditions', () => {
  test('returns null when there are no complete conditions', () => {
    expect(buildWhereFromConditions([])).toBeNull()
    expect(buildWhereFromConditions([cond({ field: '' })])).toBeNull()
  })

  test('builds a single clause without $and', () => {
    expect(
      buildWhereFromConditions([
        cond({ field: 'page', operator: '$gt', value: '5' }),
      ]),
    ).toEqual({
      page: { $gt: 5 },
    })
  })

  test('wraps multiple clauses in $and and ignores incomplete rows', () => {
    const where = buildWhereFromConditions([
      cond({ field: 'page', operator: '$gte', value: '5' }),
      cond({ field: 'category', operator: '$eq', value: 'a', type: 'string' }),
      cond({ field: '', value: '' }),
    ])
    expect(where).toEqual({
      $and: [{ page: { $gte: 5 } }, { category: { $eq: 'a' } }],
    })
  })

  test('coerces boolean values', () => {
    expect(
      buildWhereFromConditions([
        cond({
          field: 'active',
          operator: '$eq',
          value: 'false',
          type: 'boolean',
        }),
      ]),
    ).toEqual({ active: { $eq: false } })
  })
})

describe('parseConditionsFromWhere', () => {
  test('returns an empty array for null/undefined', () => {
    expect(parseConditionsFromWhere(null)).toEqual([])
    expect(parseConditionsFromWhere(undefined)).toEqual([])
  })

  test('parses a single clause', () => {
    expect(parseConditionsFromWhere({ page: { $gt: 5 } })).toEqual([
      { field: 'page', operator: '$gt', value: '5', type: 'number' },
    ])
  })

  test('parses an $and-wrapped list of clauses', () => {
    expect(
      parseConditionsFromWhere({
        $and: [{ page: { $gte: 5 } }, { category: { $eq: 'a' } }],
      }),
    ).toEqual([
      { field: 'page', operator: '$gte', value: '5', type: 'number' },
      { field: 'category', operator: '$eq', value: 'a', type: 'string' },
    ])
  })

  test('round-trips through buildWhereFromConditions', () => {
    const conditions: MetadataCondition[] = [
      cond({ field: 'page', operator: '$gt', value: '5' }),
      cond({
        field: 'active',
        operator: '$eq',
        value: 'true',
        type: 'boolean',
      }),
    ]
    const where = buildWhereFromConditions(conditions)
    expect(parseConditionsFromWhere(where)).toEqual(conditions)
  })
})
