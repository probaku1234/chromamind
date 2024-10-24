import React, { ReactNode, ReactText, useEffect, useRef, useState } from 'react'
import {
  Box,
  BoxProps,
  Button,
  CloseButton,
  Collapse,
  Container,
  Divider,
  Drawer,
  DrawerContent,
  Flex,
  FlexProps,
  FormControl,
  FormLabel,
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Textarea,
  useColorModeValue,
  useDisclosure,
  Spinner,
  FormHelperText,
} from '@chakra-ui/react'
import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiHome,
  FiList,
  FiMenu,
  FiPlusCircle,
  FiSettings,
  FiStar,
} from 'react-icons/fi'
import { IconType } from 'react-icons'
import { useDispatch, useSelector } from 'react-redux'
import { CurrentMenuState, updateMenu } from '../slices/currentMenuSlice'
import { updateCollection } from '../slices/currentCollectionSlice'
import { LOCAL_STORAGE_KEY_PREFIX, State } from '../types'
import { invokeWrapper } from '../utils/invokeTauri.ts'
import { TauriCommand } from '../types.ts'
import { match } from 'ts-pattern'
import { CheckCircleIcon, CloseIcon, RepeatIcon } from '@chakra-ui/icons'
import '../styles/layout.css'
import { useLocalStorage } from '@uidotdev/usehooks'

const FAVORITE_COLLECTIONS_KEY = `${LOCAL_STORAGE_KEY_PREFIX}-favorite-collections`

interface LinkItemProps {
  name: CurrentMenuState
  icon: IconType
  path: string
}

const LinkItems: Array<LinkItemProps> = [
  { name: 'Home', icon: FiHome, path: '/home' },
  // { name: "Trending", icon: FiTrendingUp, path: "/trending" },
  // { name: "Explore", icon: FiCompass, path: "/explore" },
  // { name: "Favorites", icon: FiStar, path: "/favorites" },
  // { name: "Collections", icon: FiList, path: "/collections" },
  // { name: "Settings", icon: FiSettings, path: "/settings" },
]

interface LayoutProps {
  children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }: LayoutProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <Container maxW="100vw" centerContent height="100vh" margin={0} padding={0}>
      <Box
        minH="100vh"
        bg={useColorModeValue('gray.100', 'gray.900')}
        width={'100%'}
      >
        <SidebarContent
          onClose={() => onClose}
          display={{ base: 'none', md: 'block' }}
        />
        <Drawer
          isOpen={isOpen}
          placement="left"
          onClose={onClose}
          returnFocusOnClose={false}
          onOverlayClick={onClose}
          size="full"
        >
          <DrawerContent>
            <SidebarContent onClose={onClose} />
          </DrawerContent>
        </Drawer>
        {/* mobilenav */}
        <MobileNav display={{ base: 'flex', md: 'none' }} onOpen={onOpen} />
        <Box ml={{ base: 0, md: 60 }}>
          {/* Content */}
          {children}
        </Box>
      </Box>
    </Container>
  )
}

interface SidebarProps extends BoxProps {
  onClose: () => void
}

const SidebarContent = ({ onClose, ...rest }: SidebarProps) => {
  const url = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`) || ''
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false) // state to toggle collapse
  const toggleCollections = () => setIsCollectionsOpen(!isCollectionsOpen)
  const [collections, setCollections] = useState<
    { id: number; name: string; isFavorite: boolean }[]
  >([])
  const [collectionFilter, setCollectionFilter] = useState('')
  const [favoriteCollections, setFavoriteCollections] = useLocalStorage<
    string[]
  >(`${FAVORITE_COLLECTIONS_KEY}:${url}`, [])
  const { onOpen, isOpen, onClose: onModalClose } = useDisclosure()

  async function fetchCollections() {
    const result = await invokeWrapper<{ id: number; name: string }[]>(
      TauriCommand.FETCH_COLLECTIONS,
    )
    match(result)
      .with({ type: 'error' }, ({ error }) => {
        console.error(error)
        return
      })
      .with({ type: 'success' }, async ({ result }) => {
        setCollections(
          result.map((collection) => ({ ...collection, isFavorite: false })),
        )
      })
      .exhaustive()
  }

  const onFavoriteCollection = (name: string) => {
    if (favoriteCollections.includes(name)) {
      setFavoriteCollections(
        favoriteCollections.filter((collection) => collection !== name),
      )
    } else {
      setFavoriteCollections([...favoriteCollections, name])
    }
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  return (
    <Box
      bg={useColorModeValue('white', 'gray.900')}
      flexDirection="column"
      justifyContent="space-between"
      borderRight="1px"
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w={{ base: 'full', md: 60 }}
      pos="fixed"
      h="full"
      style={{ display: 'flex !important' }}
      {...rest}
    >
      <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
        <Text fontSize="2xl" fontFamily="monospace" fontWeight="bold">
          ChromaMind
        </Text>
        <CloseButton display={{ base: 'flex', md: 'none' }} onClick={onClose} />
      </Flex>
      <Box flexGrow={1}>
        {LinkItems.map((link) => (
          <NavItem
            key={link.name}
            icon={link.icon}
            path={link.path}
            name={link.name}
          >
            {link.name}
          </NavItem>
        ))}
        {/* Collections */}
        <Flex
          align="center"
          p="4"
          mx="4"
          borderRadius="lg"
          role="group"
          cursor="pointer"
          onClick={toggleCollections}
          _hover={{
            bg: 'cyan.400',
            color: 'white',
          }}
        >
          <Icon
            mr="4"
            fontSize="16"
            _groupHover={{
              color: 'white',
            }}
            as={FiList}
          />
          <Text flex="1">Collections</Text>
          <Icon as={isCollectionsOpen ? FiChevronUp : FiChevronDown} />
        </Flex>
        <Collapse in={isCollectionsOpen} animateOpacity>
          <Box pl="4" mt="2">
            <Stack
              direction={'row'}
              justifyContent={'center'}
              alignItems={'center'}
              mt={1}
              mr={4}
            >
              <Input
                type="text"
                size={'sm'}
                borderRadius={'15px'}
                placeholder="collection name"
                onChange={(e) => setCollectionFilter(e.target.value)}
              />
              <Icon
                as={FiPlusCircle}
                boxSize={5}
                cursor={'pointer'}
                className="clickable-icon"
                onClick={onOpen}
                title={'Create Collection'}
              />
              <Icon
                as={RepeatIcon}
                boxSize={5}
                cursor={'pointer'}
                className="clickable-icon"
                onClick={fetchCollections}
              />
              <CollectionModal
                isOpen={isOpen}
                onClose={onModalClose}
                onOpen={onOpen}
                fetchCollections={fetchCollections}
              />
            </Stack>

            <Box overflowY={'scroll'} maxHeight={'50vh'} mt={2}>
              {collections
                .map((collection) => {
                  return {
                    ...collection,
                    isFavorite: favoriteCollections.includes(collection.name),
                  }
                }) // add isFavorite property
                .filter((value) => value.name.includes(collectionFilter)) // filter by collection name
                .sort((a, b) => {
                  if (a.isFavorite && !b.isFavorite) {
                    return -1
                  }
                  if (!a.isFavorite && b.isFavorite) {
                    return 1
                  }
                  return 0
                }) // sort by favorite
                .map((collection) => (
                  <CollectionNavItem
                    key={collection.id}
                    name={collection.name}
                    isFavorite={collection.isFavorite}
                    onFavorite={onFavoriteCollection}
                  >
                    {collection.name}
                  </CollectionNavItem>
                ))}
            </Box>
          </Box>
        </Collapse>
      </Box>
      <Box>
        <Divider />
        <NavItem
          key="settings"
          icon={FiSettings}
          path="/settings"
          name="Settings"
        >
          Settings
        </NavItem>
      </Box>
    </Box>
  )
}

interface NavItemProps extends FlexProps {
  icon: IconType
  children: ReactText
  path: string
  name: CurrentMenuState
}

const NavItem = ({ icon, children, name, ...rest }: NavItemProps) => {
  const dispatch = useDispatch()

  return (
    <Box
      as="a"
      href="#"
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}
      onClick={
        () => dispatch(updateMenu(name)) /* dispatch(updateMenu(name)) */
      } // dispatch action
    >
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        _hover={{
          bg: 'cyan.400',
          color: 'white',
        }}
        {...rest}
      >
        {icon && (
          <Icon
            mr="4"
            fontSize="16"
            _groupHover={{
              color: 'white',
            }}
            as={icon}
          />
        )}
        {children}
      </Flex>
    </Box>
  )
}

interface MobileProps extends FlexProps {
  onOpen: () => void
}

const MobileNav = ({ onOpen, ...rest }: MobileProps) => {
  return (
    <Flex
      ml={{ base: 0, md: 60 }}
      px={{ base: 4, md: 24 }}
      height="20"
      alignItems="center"
      bg={useColorModeValue('white', 'gray.900')}
      borderBottomWidth="1px"
      borderBottomColor={useColorModeValue('gray.200', 'gray.700')}
      justifyContent="flex-start"
      {...rest}
    >
      <IconButton
        variant="outline"
        onClick={onOpen}
        aria-label="open menu"
        icon={<FiMenu />}
      />

      <Text fontSize="2xl" ml="8" fontFamily="monospace" fontWeight="bold">
        Logo
      </Text>
    </Flex>
  )
}

interface CollectionNavItemProps extends FlexProps {
  children: ReactNode
  name: string
  isFavorite: boolean
  onFavorite: (name: string) => void
}

const CollectionNavItem = ({
  children,
  name,
  isFavorite,
  onFavorite,
  ...rest
}: CollectionNavItemProps) => {
  const dispatch = useDispatch()
  const currentCollection = useSelector<State, string>(
    (state: State) => state.currentCollection,
  )

  return (
    <Box
      as="a"
      href="#"
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}
      onDoubleClick={() => {
        dispatch(updateCollection(name))
        dispatch(updateMenu('Collections'))
      }}
    >
      <Flex
        align="center"
        pt={'4'}
        pb={'4'}
        mr={'4'}
        borderRadius="lg"
        role="group"
        cursor="pointer"
        _hover={{
          // bg: 'cyan.400',
          // color: 'white',
          borderWidth: '2px',
          borderColor: 'gray.400',
          transition: 'all 0.1s ease-in-out',
        }}
        {...rest}
      >
        <Icon
          mr="2"
          fontSize="16"
          _groupHover={
            {
              // color: 'white',
            }
          }
          color={'yellow.500'}
          as={FiStar}
          fill={isFavorite ? 'currentcolor' : 'none'}
          onClick={() => onFavorite(name)}
          title={isFavorite ? `${name}-favorite` : `${name}-not-favorite`}
        />
        {children}
        {currentCollection === name && (
          <Icon
            ml="4"
            fontSize="16"
            _groupHover={
              {
                // color: 'white',
              }
            }
            color={'green.500'}
            as={FiCheck}
          />
        )}
      </Flex>
    </Box>
  )
}

const CollectionModal = ({
  isOpen,
  onClose,
  fetchCollections,
}: {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  fetchCollections: () => Promise<void>
}) => {
  const [status, setStatus] = useState<{
    type: 'idle' | 'loading' | 'finished' | 'error'
    message?: string
  }>({
    type: 'idle',
  })
  const [nameValid, setNameValid] = useState<boolean[] | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const metadataRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isOpen) {
      setStatus({ type: 'idle' })
      setNameValid(null)
      if (nameRef.current) nameRef.current.value = ''
      if (metadataRef.current) metadataRef.current.value = ''
    }
  }, [isOpen])

  const createCollection = async () => {
    const collectionName = nameRef.current?.value || ''
    const metadataString = metadataRef.current?.value
    let metadata = undefined

    if (metadataString) {
      try {
        metadata = JSON.parse(metadataString)
      } catch (e) {
        console.error(e)
      }
    }

    const result = await invokeWrapper<boolean>(
      TauriCommand.CREATE_COLLECTION,
      {
        collectionName,
        metadata,
      },
    )

    match(result)
      .with({ type: 'error' }, ({ error }) => {
        console.error(error)
        setStatus({ type: 'error', message: error })
      })
      .with({ type: 'success' }, ({ result }) => {
        setStatus({ type: 'finished' })
        fetchCollections()
        console.log(result)
      })
  }

  const validateName = () => {
    const validList = []

    const value = nameRef.current?.value || ''

    // 3-63 characters
    validList.push(value.length >= 3 && value.length <= 63)

    // starts and ends with an alphanumeric character, otherwise contains only alphanumeric characters, underscores or hyphens
    validList.push(/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/.test(value))

    // contains no two consecutive periods
    validList.push(!/\.\./.test(value))

    // not a valid IPv4 address
    validList.push(!/\d+\.\d+\.\d+\.\d+/.test(value))

    setNameValid(validList)
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Collection</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <>
              {match(status)
                .with({ type: 'idle' }, () => (
                  <>
                    <FormControl
                      isRequired
                      isInvalid={
                        nameValid != null &&
                        nameValid.some((value) => value == false)
                      }
                    >
                      <FormLabel>Collection Name</FormLabel>
                      <Input
                        type="text"
                        placeholder="collection name"
                        ref={nameRef}
                        onChange={() => {
                          validateName()
                        }}
                      />
                      {nameValid != null && (
                        <>
                          <FormHelperText
                            textColor={nameValid[0] ? 'green' : 'red'}
                            title={nameValid[0] ? '0-valid' : '0-invalid'}
                          >
                            • contains 3-63 characters
                          </FormHelperText>
                          <FormHelperText
                            textColor={nameValid[1] ? 'green' : 'red'}
                            title={nameValid[1] ? '1-valid' : '1-invalid'}
                          >
                            • starts and ends with an alphanumeric character,
                            otherwise contains only alphanumeric characters,
                            underscores or hyphens
                          </FormHelperText>
                          <FormHelperText
                            textColor={nameValid[2] ? 'green' : 'red'}
                            title={nameValid[2] ? '2-valid' : '2-invalid'}
                          >
                            • contains no two consecutive periods
                          </FormHelperText>
                          <FormHelperText
                            textColor={nameValid[3] ? 'green' : 'red'}
                            title={nameValid[3] ? '3-valid' : '3-invalid'}
                          >
                            • not a valid IPv4 address
                          </FormHelperText>
                        </>
                      )}
                    </FormControl>
                    <FormControl mt={4}>
                      <FormLabel>Metadata</FormLabel>
                      <Textarea placeholder="metadata" ref={metadataRef} />
                    </FormControl>
                  </>
                ))
                .with({ type: 'loading' }, () => (
                  <Box textAlign={'center'}>
                    <Spinner size={'xl'} />
                    <Text>Loading...</Text>
                  </Box>
                ))
                .with({ type: 'finished' }, () => (
                  <Box textAlign={'center'} title="finished">
                    <Icon
                      as={CheckCircleIcon}
                      w={16}
                      h={16}
                      color="green.500"
                      mt={4}
                    />
                  </Box>
                ))
                .with({ type: 'error' }, ({ message }) => (
                  <Box mt={4} textAlign={'center'}>
                    <Icon as={CloseIcon} w={16} h={16} color="red.500" />
                    <Text textColor={'red.500'} mt={2}>
                      {message}
                    </Text>
                    <Button
                      onClick={() =>
                        setStatus({
                          type: 'idle',
                        })
                      }
                    >
                      Retry
                    </Button>
                  </Box>
                ))
                .exhaustive()}
            </>
          </ModalBody>

          <ModalFooter display={status.type === 'idle' ? '' : 'none'}>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={onClose}
              isLoading={status.type === 'loading'}
            >
              Close
            </Button>
            <Button
              type="submit"
              variant="ghost"
              onClick={createCollection}
              isLoading={status.type === 'loading'}
              isDisabled={
                nameValid != null && nameValid.some((value) => value == false)
              }
            >
              create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export default Layout
