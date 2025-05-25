import React, { ReactNode, ReactText, useEffect, useState } from 'react'
import {
  Box,
  BoxProps,
  Container,
  Flex,
  FlexProps,
  Icon,
  IconButton,
  Text,
  useDisclosure,
  useRecipe,
} from '@chakra-ui/react'
import { FiHome, FiList, FiMenu, FiSettings } from 'react-icons/fi'
import { DrawerRoot, DrawerContent } from '@/components/ui/drawer'
import { IconType } from 'react-icons'
import { useDispatch, useSelector } from 'react-redux'
import { CurrentMenuState, updateMenu } from '../slices/currentMenuSlice'
import { State } from '../types'
import { match } from 'ts-pattern'
import {getVersion} from '@tauri-apps/api/app'
import '../styles/layout.css'

const NAV_WIDTH = 28

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
  { name: 'Collections', icon: FiList, path: '/collections' },
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
        <DrawerRoot open={open} placement="start">
          <DrawerContent width={'!100px'}>
            <SidebarContent onClose={onClose} width={'inherit'} />
          </DrawerContent>
        </DrawerRoot>
        {/* mobilenav */}
        <MobileNav display={{ base: 'flex', md: 'none' }} onOpen={onOpen} />
        <Box ml={{ base: 0, md: NAV_WIDTH }} bg="secondBg" height={'100%'}>
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

const SidebarContent = ({ ...rest }: SidebarProps) => {
  const [version, setVersion] = useState('');

  useEffect(() => {
    getVersion().then((v) => {
      setVersion(v);
    }).catch((error) => {
      console.error('Error fetching version:', error);
    })
  }, [])

  return (
    <Box
      flexDirection="column"
      justifyContent="space-between"
      borderRight="1px"
      w={{ base: 'full', md: NAV_WIDTH }}
      pos="fixed"
      h="full"
      style={{ display: 'flex' }}
      {...rest}
    >
      <Box>
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
      </Box>
      <Box>
        <NavItem
          key="settings"
          icon={FiSettings}
          path="/settings"
          name="Settings"
        >
          Settings
        </NavItem>
      </Box>
      <Box flexGrow={1}></Box>
      <Box
        as="footer"
        mt="auto"
        p={4}
        textAlign="center"
        color="gray.500"
        fontSize="sm"
      >
        v {version}
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
        mx="2"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        color={currentMenu === name ? 'buttonSelectedBg' : 'buttonBg'}
        css={layoutLavButtonStyles}
        direction={'column'}
        {...rest}
      >
        {icon && (
          <Icon fontSize="2xl">
            {match(icon)
              .with(FiHome, () => <FiHome />)
              .with(FiSettings, () => <FiSettings />)
              .with(FiList, () => <FiList />)
              .otherwise(() => (
                <></>
              ))}
          </Icon>
        )}
        <Text fontSize={'1xl'} fontWeight={'lighter'}>
          {children}
        </Text>
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
      ml={{ base: 0, md: 48 }}
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

export default Layout
