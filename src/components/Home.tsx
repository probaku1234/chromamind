import React, { useEffect, useState } from 'react'
import { Box, Button, Flex, Icon, Skeleton, Text } from '@chakra-ui/react'
import { invokeWrapper } from '../utils/invokeTauri.ts'
import { LOCAL_STORAGE_KEY_PREFIX, TauriCommand } from '../types.ts'
import { match } from 'ts-pattern'
import '../styles/home.css'
import { FiCheckCircle, FiXCircle } from 'react-icons/fi'

const Home: React.FC = () => {
  const [chromaVersion, setChromaVersion] = useState<string | null>(null)
  const [collectionsCount, setCollectionsCount] = useState<number | null>(null)
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null)

  useEffect(() => {
    async function fetchChromaVersion() {
      const result = await invokeWrapper<string>(
        TauriCommand.GET_CHROMA_VERSION,
      )
      match(result)
        .with({ type: 'error' }, ({ error }) => {
          console.error(error)
          return
        })
        .with({ type: 'success' }, ({ result }) => {
          setChromaVersion(result)
        })
        .exhaustive()
    }

    async function fetchCollections() {
      const result = await invokeWrapper<{ id: string; name: string }[]>(
        TauriCommand.FETCH_COLLECTIONS,
      )

      match(result)
        .with({ type: 'error' }, ({ error }) => {
          console.error(error)
        })
        .with({ type: 'success' }, ({ result }) => {
          setCollectionsCount(result.length)
        })
        .exhaustive()
    }

    Promise.all([fetchChromaVersion(), fetchCollections()])
  }, [])

  const testConnection = async () => {
    const result = await invokeWrapper<boolean>(TauriCommand.HEALTH_CHECK)
    match(result)
      .with({ type: 'error' }, ({ error }) => {
        console.error(error)
        setIsSuccess(false)
      })
      .with({ type: 'success' }, ({ result }) => {
        console.log(result)
        setIsSuccess(true)
      })
      .exhaustive()
  }

  return (
    <Box>
      <Box className="info_box">
        <Text fontSize={'larger'} mt={2} mb={2} ml={2}>
          {localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`) || ''}
        </Text>
        <Text textColor={'gray.500'} ml={2}>
          {localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_tenant`) || ''}
        </Text>
        <Text textColor={'gray.500'} mb={2} ml={2}>
          {localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_database`) || ''}
        </Text>
      </Box>
      <Box className="info_box">
        <Box ml={2}>
          <Text fontSize={'larger'} mt={2} mb={2}>
            Version
          </Text>
          <Text textColor={'gray.500'} mt={2} mb={2}>
            {chromaVersion ? chromaVersion : <Skeleton />}
          </Text>
          <Flex mt={2} mb={2} alignContent={'center'}>
            <Button onClick={testConnection}>Test Connection</Button>
            {match(isSuccess)
              .with(true, () => (
                <Icon
                  as={FiCheckCircle}
                  alignSelf={'center'}
                  width={'1.5em'}
                  height={'1.5em'}
                  ml={1}
                  color={'green.400'}
                  title="success"
                >
                  Success
                </Icon>
              ))
              .with(false, () => (
                <Icon
                  as={FiXCircle}
                  alignSelf={'center'}
                  width={'1em'}
                  height={'1em'}
                  ml={1}
                  color={'red.400'}
                  title="fail"
                >
                  fail
                </Icon>
              ))
              .otherwise(() => (
                <></>
              ))}
          </Flex>
        </Box>
      </Box>
      <Box className="info_box">
        <Box ml={2}>
          <Text fontSize={'larger'} mt={2} mb={2}>
            Overview
          </Text>
          <Box>
            <Text mt={2} mb={2}>
              {collectionsCount}
            </Text>
            <Text mt={2} mb={2} textColor={'gray'}>
              Collections
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default Home
