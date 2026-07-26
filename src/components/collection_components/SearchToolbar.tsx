import React, { useState } from 'react'
import { Badge, Box, Flex } from '@chakra-ui/react'
import { FiTag } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { CloseButton } from '@/components/ui/close-button'
import {
  PopoverBody,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ActiveSearch, MetadataCondition } from '../../types'
import {
  buildWhereFromConditions,
  parseConditionsFromWhere,
} from '../../utils/metadataFilter'
import MetadataFilterBuilder, { emptyCondition } from './MetadataFilterBuilder'

interface SearchToolbarProps {
  activeSearch: ActiveSearch | null
  onSearch: (search: ActiveSearch | null) => void
}

// Text and ID modes are hidden for now (Text is not yet backed by the API;
// ID is deprioritized) — only Metadata filtering is exposed in the toolbar.
const SearchToolbar: React.FC<SearchToolbarProps> = ({
  activeSearch,
  onSearch,
}) => {
  const [conditions, setConditions] = useState<MetadataCondition[]>([
    emptyCondition(),
  ])
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Reflects the applied filter (activeSearch), not the in-progress edit in
  // the popover — the badge should only change when Apply is clicked.
  const appliedConditionCount = parseConditionsFromWhere(
    activeSearch?.whereFilter ?? null,
  ).length

  const applyMetadata = () => {
    const where = buildWhereFromConditions(conditions)
    onSearch(where ? { whereFilter: where } : null)
    setPopoverOpen(false)
  }

  const clearAll = () => {
    setConditions([emptyCondition()])
    onSearch(null)
    setPopoverOpen(false)
  }

  return (
    <Flex align="center" gap={2} flexWrap="wrap">
      <PopoverRoot
        open={popoverOpen}
        onOpenChange={(e) => {
          // Repopulate from the applied filter whenever the popover opens, so
          // it never shows stale/blank rows for an already-active filter.
          if (e.open) {
            const parsed = parseConditionsFromWhere(
              activeSearch?.whereFilter ?? null,
            )
            setConditions(parsed.length > 0 ? parsed : [emptyCondition()])
          }
          setPopoverOpen(e.open)
        }}
        positioning={{ placement: 'bottom-start' }}
      >
        <Box position="relative">
          <PopoverTrigger asChild>
            <Button
              size="xs"
              variant="outline"
              pr={activeSearch ? 7 : undefined}
            >
              <FiTag />
              Metadata
              {appliedConditionCount > 0 && (
                <Badge colorPalette="brand" borderRadius="full" ml={1}>
                  {appliedConditionCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          {activeSearch && (
            <CloseButton
              size="2xs"
              position="absolute"
              top="50%"
              right={1}
              transform="translateY(-50%)"
              onClick={(e) => {
                e.stopPropagation()
                clearAll()
              }}
            />
          )}
        </Box>
        <PopoverContent w="640px" maxW="90vw">
          <PopoverBody>
            <MetadataFilterBuilder
              conditions={conditions}
              onChange={setConditions}
              onApply={applyMetadata}
              onClear={clearAll}
            />
          </PopoverBody>
        </PopoverContent>
      </PopoverRoot>
    </Flex>
  )
}

export default SearchToolbar
