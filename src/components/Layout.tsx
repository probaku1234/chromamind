import React, { ReactNode, ReactText, useEffect, useRef, useState } from 'react'
import {
  Box,
  BoxProps,
  Collapsible,
  Container,
  Separator,
  Flex,
  FlexProps,
  Icon,
  IconButton,
  Input,
  Stack,
  Text,
  useDisclosure,
  useRecipe,
  Fieldset,
  Textarea,
  FieldHelperText,
  Spinner,
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
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { DrawerRoot, DrawerContent } from '@/components/ui/drawer'
import { CloseButton } from '@/components/ui/close-button'
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
import { Button } from './ui/button.tsx'

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
  const { open, onOpen, onClose } = useDisclosure()

  return (
    <Container maxW="100vw" centerContent height="100vh" margin={0} padding={0}>
      <Box minH="100vh" width={'100%'} bg="firstBg">
        <SidebarContent
          onClose={() => onClose}
          display={{ base: 'none', md: 'block' }}
        />
        <DrawerRoot open={open} placement="start" size="full">
          <DrawerContent>
            <SidebarContent onClose={onClose} />
          </DrawerContent>
        </DrawerRoot>
        {/* mobilenav */}
        <MobileNav display={{ base: 'flex', md: 'none' }} onOpen={onOpen} />
        <Box ml={{ base: 0, md: 60 }} bg="secondBg" height={'100%'}>
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
  const { open, onOpen, onClose: onDialogClose } = useDisclosure()

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
      flexDirection="column"
      justifyContent="space-between"
      borderRight="1px"
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
        <Collapsible.Root>
          <Collapsible.Trigger asChild>
            <Flex
              align="center"
              p="4"
              mx="4"
              borderRadius="lg"
              role="group"
              cursor="pointer"
              onClick={toggleCollections}
              _hover={{
                bg: 'gray.200',
                // color: 'white',
              }}
            >
              <Icon
                mr="4"
                fontSize="16"
                _groupHover={{
                  color: 'white',
                }}
              >
                <FiList />
              </Icon>
              <Text flex="1">Collections</Text>
              <Icon>
                {isCollectionsOpen ? <FiChevronUp /> : <FiChevronDown />}
              </Icon>
            </Flex>
          </Collapsible.Trigger>
          <Collapsible.Content>
            {' '}
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
                <CreateCollectionDialog open={open} onClose={onDialogClose} />
                <Icon
                  boxSize={5}
                  cursor={'pointer'}
                  className="clickable-icon"
                  onClick={onOpen}
                  // FIXME: use something else
                  // @ts-expect-error title no longer exist in prop, but it requires for testing
                  title={'Create Collection'}
                >
                  <FiPlusCircle />
                </Icon>
                <Icon
                  boxSize={5}
                  cursor={'pointer'}
                  className="clickable-icon"
                  onClick={fetchCollections}
                >
                  <RepeatIcon />
                </Icon>
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
          </Collapsible.Content>
        </Collapsible.Root>
      </Box>
      <Box>
        <Separator />
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
  const currentMenu = useSelector<State, string>(
    (state: State) => state.currentMenu,
  )
  const recipe = useRecipe({ key: 'layoutNavs' })
  const layoutLavButtonStyles = recipe()

  return (
    <Box
      as="a"
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
        color={currentMenu === name ? 'buttonSelectedBg' : 'buttonBg'}
        css={layoutLavButtonStyles}
        {...rest}
      >
        {icon && (
          <Icon mr="4" fontSize="16">
            <Box as={icon}></Box>
            {/* <FiHome /> */}
          </Icon>
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
      borderBottomWidth="1px"
      justifyContent="flex-start"
      {...rest}
    >
      <IconButton variant="outline" onClick={onOpen} aria-label="open menu">
        <FiMenu />
      </IconButton>

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
  const recipe = useRecipe({ key: 'layoutCollectionNavs' })
  const layoutCollectionNavsStyles = recipe()

  return (
    <Box
      as="a"
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
        color="buttonBg"
        css={layoutCollectionNavsStyles}
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
          fill={isFavorite ? 'currentcolor' : 'none'}
          onClick={() => onFavorite(name)}
          // FIXME: use something else
          // @ts-expect-error title no longer exist in prop, but it requires for testing
          title={isFavorite ? `${name}-favorite` : `${name}-not-favorite`}
        >
          <FiStar />
        </Icon>
        {children}
        {currentCollection === name && (
          <Icon ml="4" fontSize="16" color={'green.500'}>
            <FiCheck />
          </Icon>
        )}
      </Flex>
    </Box>
  )
}

const CreateCollectionDialog = ({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
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
        // fetchCollections()
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

  const isNameValid = nameValid != null && nameValid.every((value) => value)

  return (
    <>
      <DialogRoot
        open={open}
        modal
        closeOnEscape
        unmountOnExit
        scrollBehavior={'inside'}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <>
              {match(status)
                .with({ type: 'idle' }, () => (
                  <>
                    <Fieldset.Root invalid={!isNameValid}>
                      <Stack>
                        <Fieldset.Legend>collection details</Fieldset.Legend>
                        <Fieldset.HelperText>
                          Provide new collection&apos;s details below.
                        </Fieldset.HelperText>
                      </Stack>

                      <Fieldset.Content>
                        <Field label="Name" required>
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
                              <FieldHelperText
                                color={nameValid[0] ? 'green' : 'red'}
                                title={nameValid[0] ? '0-valid' : '0-invalid'}
                              >
                                • contains 3-63 characters
                              </FieldHelperText>
                              <FieldHelperText
                                color={nameValid[1] ? 'green' : 'red'}
                                title={nameValid[1] ? '1-valid' : '1-invalid'}
                              >
                                • starts and ends with an alphanumeric
                                character, otherwise contains only alphanumeric
                                characters, underscores or hyphens
                              </FieldHelperText>
                              <FieldHelperText
                                color={nameValid[2] ? 'green' : 'red'}
                                title={nameValid[2] ? '2-valid' : '2-invalid'}
                              >
                                • contains no two consecutive periods
                              </FieldHelperText>
                              <FieldHelperText
                                color={nameValid[3] ? 'green' : 'red'}
                                title={nameValid[3] ? '3-valid' : '3-invalid'}
                              >
                                • not a valid IPv4 address
                              </FieldHelperText>
                            </>
                          )}
                        </Field>

                        <Field label="Metadata">
                          <Textarea placeholder="metadata" ref={metadataRef} />
                        </Field>
                      </Fieldset.Content>
                    </Fieldset.Root>
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
                    <Icon w={16} h={16} color="green.500" mt={4}>
                      <CheckCircleIcon />
                    </Icon>
                  </Box>
                ))
                .with({ type: 'error' }, ({ message }) => (
                  <Box mt={4} textAlign={'center'}>
                    <Icon w={16} h={16} color="red.500">
                      <CloseIcon />
                    </Icon>
                    <Text color={'red.500'} mt={2}>
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
          </DialogBody>
          <DialogFooter display={status.type === 'idle' ? '' : 'none'}>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              loading={status.type === 'loading'}
              disabled={!isNameValid}
              onClick={createCollection}
            >
              create
            </Button>
          </DialogFooter>
          <DialogCloseTrigger onClick={onClose} border={0} />
        </DialogContent>
      </DialogRoot>
    </>
  )
}

export default Layout
