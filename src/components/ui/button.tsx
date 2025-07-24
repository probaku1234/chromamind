import type { ButtonProps as ChakraButtonProps } from '@chakra-ui/react'
import {
  AbsoluteCenter,
  Button as ChakraButton,
  Span,
  Spinner,
  useRecipe,
} from '@chakra-ui/react'
import { forwardRef } from 'react'

interface ButtonLoadingProps {
  loading?: boolean
  loadingText?: React.ReactNode
}

export interface ButtonProps extends ChakraButtonProps, ButtonLoadingProps {
  buttonType?: 'general' | 'critical'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const { loading, disabled, loadingText, children, buttonType, ...rest } =
      props

    const recipe = useRecipe({ key: 'buttons' })
    const styles =
      buttonType === 'critical' ? recipe({ visual: 'critical' }) : recipe()
    // const styles = recipe({'visual': 'critical'})

    return (
      <ChakraButton
        disabled={loading || disabled}
        ref={ref}
        {...rest}
        css={styles}
      >
        {loading && !loadingText ? (
          <>
            <AbsoluteCenter display="inline-flex">
              <Spinner size="inherit" color="inherit" />
            </AbsoluteCenter>
            <Span opacity={0}>{children}</Span>
          </>
        ) : loading && loadingText ? (
          <>
            <Spinner size="inherit" color="inherit" />
            {loadingText}
          </>
        ) : (
          children
        )}
      </ChakraButton>
    )
  },
)
