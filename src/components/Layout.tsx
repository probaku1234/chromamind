import React, { ReactNode, ReactText, useEffect, useState } from 'react'
import {
  Box,
  BoxProps,
  CloseButton,
  Collapse,
  Container,
  Divider,
  Drawer,
  DrawerContent,
  Flex,
  FlexProps,
  Icon,
  IconButton,
  Input,
  Stack,
  Text,
  useColorModeValue,
  useDisclosure,
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
import { RepeatIcon } from '@chakra-ui/icons'
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
  const url = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}_url`) || ""
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false) // state to toggle collapse
  const toggleCollections = () => setIsCollectionsOpen(!isCollectionsOpen)
  const [collections, setCollections] = useState<
    { id: number; name: string; isFavorite: boolean }[]
  >([])
  const [collectionFilter, setCollectionFilter] = useState('')
  const [favoriteCollections, setFavoriteCollections] = useLocalStorage<
    string[]
  >(`${FAVORITE_COLLECTIONS_KEY}:${url}`, [])

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
              />
              <Icon
                as={RepeatIcon}
                boxSize={5}
                cursor={'pointer'}
                className="clickable-icon"
                onClick={fetchCollections}
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
  console.log(isFavorite)

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

export default Layout
