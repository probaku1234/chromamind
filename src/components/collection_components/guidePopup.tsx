import React, { ReactNode, useState } from 'react'
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
import { GUIDE_POPUP_KEY_PREFIX } from '../../types'

interface GuidePopupProps extends PopoverRootProps {
  children: ReactNode
  messages: string[]
  title: string
  identifier: string
}

const GuidePopup: React.FC<GuidePopupProps> = ({
  children,
  messages,
  title,
  identifier,
  ...rest
}) => {
  const [step, setStep] = useState(0)
  const isOpen =
    localStorage.getItem(`${GUIDE_POPUP_KEY_PREFIX}-${identifier}`) !== 'true'

  return (
    <PopoverRoot
      defaultOpen={isOpen}
      closeOnEscape={false}
      closeOnInteractOutside={false}
      lazyMount
      unmountOnExit
      onOpenChange={(openChangeDetail) => {
        console.log('openChangeDetail', openChangeDetail)
        if (!openChangeDetail.open) {
          localStorage.setItem(
            `${GUIDE_POPUP_KEY_PREFIX}-${identifier}`,
            'true',
          )
        }
      }}
      {...rest}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        css={{
          '--popover-bg': 'var(--chakra-colors-brand-500)',
          color: 'white',
        }}
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
