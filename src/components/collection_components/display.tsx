// @ts-expect-error react is not used in this file
import React from 'react'
import { Flex, Heading, Icon, Spinner, Text } from '@chakra-ui/react'
import { GoInbox } from 'react-icons/go'
import { WarningTwoIcon } from '@chakra-ui/icons'

export const NoDataDisplay = () => {
  return (
    <Flex
      direction="column"
      p={4}
      align="center"
      justify="center"
      bgColor="gray.100"
      height={'100vh'}
    >
      <Icon boxSize="150px" mb={3} color="gray.400">
        <GoInbox />
      </Icon>
      <Heading>Collection is empty</Heading>
      <Text fontSize={'2xl'} color={'gray.500'}>
        Upload more documents
      </Text>
    </Flex>
  )
}

export const LoadingDataDisplay = () => {
  return (
    <Flex
      direction="column"
      p={4}
      align="center"
      justify="center"
      bgColor="gray.100"
      height={'100%'}
    >
      <Spinner
        size="xl"
        boxSize="70px"
        // thickness="0.25rem"
        mb={3}
        color="gray.400"
      />
      <Text>Fetching Embeddings</Text>
    </Flex>
  )
}

export const ErrorDisplay = ({ message }: { message: string }) => {
  const DEFAULT_ERROR_MESSAGE = 'Error'

  return (
    <Flex
      direction="column"
      p={4}
      align="center"
      justify="center"
      bgColor="gray.100"
      height={'100%'}
    >
      <Icon boxSize="150px" mb={3} color="red.500">
        <WarningTwoIcon />
      </Icon>
      <Heading>{message ?? DEFAULT_ERROR_MESSAGE}</Heading>
    </Flex>
  )
}
