import React, { ReactNode, useEffect, useState } from 'react'
import { Collapse, Container, Divider } from '@chakra-ui/react'
import {
  IconButton,
  Box,
  CloseButton,
  Flex,
  Icon,
  useColorModeValue,
  Text,
  Drawer,
  DrawerContent,
  useDisclosure,
  BoxProps,
  FlexProps,
} from '@chakra-ui/react'
import {
  FiHome,
  FiSettings,
  FiMenu,
  FiList,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
} from 'react-icons/fi'
import { IconType } from 'react-icons'
import { ReactText } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CurrentMenuState, updateMenu } from '../slices/currentMenuSlice'
import { updateCollection } from '../slices/currentCollectionSlice'
import { State } from '../types'
import { invoke } from '@tauri-apps/api/core'

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
        <Box ml={{ base: 0, md: 60 }} pr={4} pl={4}>
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
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false) // state to toggle collapse
  const toggleCollections = () => setIsCollectionsOpen(!isCollectionsOpen)
  const [collections, setCollections] = useState<
    { id: number; name: string }[]
  >([])

  useEffect(() => {
    async function fetchCollections() {
      try {
        const collections: { id: number; name: string }[] =
          await invoke('fetch_collections')
        setCollections(collections)
      } catch (error) {
        console.error(error)
      }
    }

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
          <Box pl="8" mt="2" overflowY={'scroll'} maxHeight={'50vh'}>
            {collections.map((collection) => (
              <CollectionNavItem key={collection.id} name={collection.name}>
                {collection.name}
              </CollectionNavItem>
            ))}
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
}

const CollectionNavItem = ({
  children,
  name,
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
      onClick={() => {
        dispatch(updateCollection(name))
        dispatch(updateMenu('Collections'))
      }} // dispatch action
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
        {children}
        {currentCollection === name && (
          <Icon
            ml="4"
            fontSize="16"
            _groupHover={{
              color: 'white',
            }}
            color={'green.500'}
            as={FiCheck}
          />
        )}
      </Flex>
    </Box>
  )
}

export default Layout
