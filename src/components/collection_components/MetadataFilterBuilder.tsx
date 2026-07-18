import React from 'react'
import {
  Box,
  Flex,
  IconButton,
  Input,
  NativeSelect,
  Text,
} from '@chakra-ui/react'
import { FiPlus, FiX } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import {
  MetadataCondition,
  MetadataOperator,
  MetadataValueType,
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
} from '../../types'

export const emptyCondition = (): MetadataCondition => ({
  field: '',
  operator: '$eq',
  value: '',
  type: 'string',
})

interface MetadataFilterBuilderProps {
  conditions: MetadataCondition[]
  onChange: (conditions: MetadataCondition[]) => void
  onApply: () => void
  onClear: () => void
}

const TYPE_OPTIONS: MetadataValueType[] = ['string', 'number', 'boolean']

const MetadataFilterBuilder: React.FC<MetadataFilterBuilderProps> = ({
  conditions,
  onChange,
  onApply,
  onClear,
}) => {
  const updateRow = (index: number, patch: Partial<MetadataCondition>) => {
    onChange(
      conditions.map((c, i) => {
        if (i !== index) return c
        const next = { ...c, ...patch }
        // When the value type changes, keep the operator valid for the new type.
        if (
          patch.type &&
          !OPERATORS_BY_TYPE[next.type].includes(next.operator)
        ) {
          next.operator = OPERATORS_BY_TYPE[next.type][0]
        }
        return next
      }),
    )
  }

  const removeRow = (index: number) => {
    const next = conditions.filter((_, i) => i !== index)
    onChange(next.length === 0 ? [emptyCondition()] : next)
  }

  return (
    <Box>
      <Text fontSize="13px" color="gray.500" mb={3}>
        Filter records on metadata. Results match all of the following{' '}
        <Text as="span" fontWeight="600">
          and
        </Text>{' '}
        conditions:
      </Text>

      <Flex direction="column" gap={2}>
        {conditions.map((condition, index) => (
          <Box key={index}>
            {index > 0 && (
              <Text fontSize="12px" color="gray.400" mb={1}>
                and
              </Text>
            )}
            <Flex align="center" gap={2}>
              <Input
                size="sm"
                flex="1 1 0"
                minW="90px"
                placeholder="Field"
                value={condition.field}
                onChange={(e) => updateRow(index, { field: e.target.value })}
              />

              <NativeSelect.Root size="sm" w="120px" flexShrink={0}>
                <NativeSelect.Field
                  aria-label="Operator"
                  value={condition.operator}
                  onChange={(e) =>
                    updateRow(index, {
                      operator: e.target.value as MetadataOperator,
                    })
                  }
                >
                  {OPERATORS_BY_TYPE[condition.type].map((op) => (
                    <option key={op} value={op}>
                      {OPERATOR_LABELS[op]}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>

              {condition.type === 'boolean' ? (
                <NativeSelect.Root size="sm" flex="1 1 0" minW="90px">
                  <NativeSelect.Field
                    aria-label="Value"
                    value={condition.value || 'true'}
                    onChange={(e) =>
                      updateRow(index, { value: e.target.value })
                    }
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              ) : (
                <Input
                  size="sm"
                  flex="1 1 0"
                  minW="90px"
                  type={condition.type === 'number' ? 'number' : 'text'}
                  placeholder="Value"
                  value={condition.value}
                  onChange={(e) => updateRow(index, { value: e.target.value })}
                />
              )}

              <NativeSelect.Root size="sm" w="100px" flexShrink={0}>
                <NativeSelect.Field
                  aria-label="Type"
                  value={condition.type}
                  onChange={(e) =>
                    updateRow(index, {
                      type: e.target.value as MetadataValueType,
                    })
                  }
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>

              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Remove condition"
                onClick={() => removeRow(index)}
              >
                <FiX />
              </IconButton>
            </Flex>
          </Box>
        ))}
      </Flex>

      <Flex align="center" justify="space-between" mt={3}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChange([...conditions, emptyCondition()])}
        >
          <FiPlus /> Add condition
        </Button>
        <Flex gap={2}>
          <Button size="sm" variant="ghost" onClick={onClear}>
            Clear
          </Button>
          <Button size="sm" onClick={onApply}>
            Apply
          </Button>
        </Flex>
      </Flex>
    </Box>
  )
}

export default MetadataFilterBuilder
