import React from 'react'
import {
  PopoverBody,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Box, Text } from '@chakra-ui/react'

interface GuidePopupProps {
  messages: string[]
  title?: string
}

const GuidePopup: React.FC<GuidePopupProps> = ({ messages, title }) => {
  return (
    <PopoverRoot lazyMount unmountOnExit>
      <PopoverTrigger asChild>
        <button
          title="Collection navigation guide"
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'serif',
            lineHeight: 1,
            flexShrink: 0,
            color: 'var(--chakra-colors-gray-400)',
          }}
        >
          ⓘ
        </button>
      </PopoverTrigger>
      <PopoverContent
        css={{ '--popover-bg': '#1c1c1e' }}
        color="white"
        borderColor="transparent"
        boxShadow="lg"
        borderRadius="10px"
        maxW="220px"
      >
        <PopoverBody>
          {title && (
            <Text
              fontSize="11px"
              fontWeight="600"
              color="gray.400"
              textTransform="uppercase"
              letterSpacing="wide"
              mb={2}
            >
              {title}
            </Text>
          )}
          <Box as="ul" display="flex" flexDirection="column" gap={2} listStyleType="none" m={0} p={0}>
            {messages.map((msg, i) => (
              <Box as="li" key={i} display="flex" gap={2} alignItems="flex-start">
                <Text color="brand.400" fontSize="12px" lineHeight="1.4" flexShrink={0}>·</Text>
                <Text fontSize="12px" color="gray.200" lineHeight="1.4">{msg}</Text>
              </Box>
            ))}
          </Box>
        </PopoverBody>
      </PopoverContent>
    </PopoverRoot>
  )
}

export default GuidePopup
