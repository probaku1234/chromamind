import React from 'react'
import {
  PopoverBody,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Box, IconButton, Text } from '@chakra-ui/react'

interface GuidePopupProps {
  messages: string[]
  title?: string
}

const GuidePopup: React.FC<GuidePopupProps> = ({ messages, title }) => {
  return (
    <PopoverRoot lazyMount unmountOnExit>
      <PopoverTrigger asChild>
        <IconButton
          aria-label="Collection navigation guide"
          title="Collection navigation guide"
          variant="plain"
          minW="22px"
          width="22px"
          height="22px"
          borderRadius="full"
          fontSize="14px"
          fontWeight="600"
          fontFamily="serif"
          lineHeight="1"
          flexShrink={0}
          color="gray.400"
        >
          ⓘ
        </IconButton>
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
          <Box
            as="ul"
            display="flex"
            flexDirection="column"
            gap={2}
            listStyleType="none"
            m={0}
            p={0}
          >
            {messages.map((msg, i) => (
              <Box
                as="li"
                key={i}
                display="flex"
                gap={2}
                alignItems="flex-start"
              >
                <Text
                  color="brand.400"
                  fontSize="12px"
                  lineHeight="1.4"
                  flexShrink={0}
                >
                  ·
                </Text>
                <Text fontSize="12px" color="gray.200" lineHeight="1.4">
                  {msg}
                </Text>
              </Box>
            ))}
          </Box>
        </PopoverBody>
      </PopoverContent>
    </PopoverRoot>
  )
}

export default GuidePopup
