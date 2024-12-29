import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  PopoverArrow,
  PopoverBody,
  PopoverCloseTrigger,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverRoot,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '../ui/button'
import { Box, Group, PopoverRootProps } from '@chakra-ui/react'

interface GuidePopupProps extends PopoverRootProps {
  children: ReactNode
  messages: string[]
  title: string
  key: string
}

const GuidePopup: React.FC<GuidePopupProps> = ({
  children,
  messages,
  title,
  key,
  ...rest
}) => {
  const [step, setStep] = useState(0)

  return (
    <PopoverRoot
      defaultOpen
      closeOnEscape={false}
      closeOnInteractOutside={false}
      lazyMount
      unmountOnExit
      onOpenChange={(openChangeDetail) => {
        console.log('openChangeDetail', openChangeDetail)
      }}
      {...rest}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        css={{ '--popover-bg': 'var(--chakra-colors-brand-500)' }}
      >
        <PopoverHeader>{title}</PopoverHeader>
        <PopoverArrow />
        <PopoverBody>{messages[step]}</PopoverBody>
        <PopoverFooter>
          {messages.length > 1 && (
            <>
              <Box fontSize="sm" flex="1">
                {step + 1} of {messages.length}
              </Box>
              <Group>
                <Button
                  size="sm"
                  onClick={() => {
                    if (step > 0) {
                      setStep(step - 1)
                    }
                  }}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (step < messages.length - 1) {
                      setStep(step + 1)
                    }
                  }}
                >
                  Next
                </Button>
              </Group>
            </>
          )}
        </PopoverFooter>
        <PopoverCloseTrigger />
      </PopoverContent>
    </PopoverRoot>
  )
}

export default GuidePopup
