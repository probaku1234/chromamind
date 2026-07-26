import { describe, test, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Provider } from '@/components/ui/provider'
import MetadataFilterBuilder, { emptyCondition } from './MetadataFilterBuilder'
import { MetadataCondition } from '../../types'

const renderBuilder = (
  conditions: MetadataCondition[] = [emptyCondition()],
) => {
  const onChange = vi.fn()
  const onApply = vi.fn()
  const onClear = vi.fn()
  render(
    <Provider>
      <MetadataFilterBuilder
        conditions={conditions}
        onChange={onChange}
        onApply={onApply}
        onClear={onClear}
      />
    </Provider>,
  )
  return { onChange, onApply, onClear }
}

describe('MetadataFilterBuilder', () => {
  test('offers only equality operators for string type', () => {
    renderBuilder([emptyCondition()])
    const operator = screen.getByLabelText('Operator') as HTMLSelectElement
    const values = Array.from(operator.options).map((o) => o.value)
    expect(values).toEqual(['$eq', '$ne'])
  })

  test('exposes ordering operators when type becomes number', () => {
    const { onChange } = renderBuilder([emptyCondition()])
    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'number' },
    })
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'number' }),
    ])
  })

  test('shows a boolean value dropdown for boolean type', () => {
    renderBuilder([
      { field: 'active', operator: '$eq', value: 'true', type: 'boolean' },
    ])
    const value = screen.getByLabelText('Value') as HTMLSelectElement
    const options = Array.from(value.options).map((o) => o.value)
    expect(options).toEqual(['true', 'false'])
  })

  test('normalizes an empty value to "true" when switching a row to boolean', () => {
    const { onChange } = renderBuilder([emptyCondition()])
    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'boolean' },
    })
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'boolean', value: 'true' }),
    ])
  })

  test('preserves an existing value when switching a row to boolean', () => {
    const { onChange } = renderBuilder([
      { field: 'active', operator: '$eq', value: 'false', type: 'string' },
    ])
    fireEvent.change(screen.getByLabelText('Type'), {
      target: { value: 'boolean' },
    })
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'boolean', value: 'false' }),
    ])
  })

  test('edits a field and reports the change', () => {
    const { onChange } = renderBuilder([emptyCondition()])
    fireEvent.change(screen.getByPlaceholderText('Field'), {
      target: { value: 'page' },
    })
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ field: 'page' }),
    ])
  })

  test('Apply invokes the apply callback', () => {
    const { onApply } = renderBuilder()
    fireEvent.click(screen.getByText('Apply'))
    expect(onApply).toHaveBeenCalled()
  })
})
