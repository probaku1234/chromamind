import React, { ReactNode, useEffect, useState } from 'react'
import { getVersion } from '@tauri-apps/api/app'
import { Box, Flex, Image, Text, useRecipe } from '@chakra-ui/react'
import { useDispatch, useSelector } from 'react-redux'
import { CurrentMenuState, updateMenu } from '../slices/currentMenuSlice'
import { State } from '../types'

// Inline SVG icons — no external dep, matches design spec
const HomeIcon = () => (
  <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const ListIcon = () => (
  <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)

const SettingsIcon = () => (
  <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

interface NavItemDef {
  name: CurrentMenuState
  label: string
  Icon: React.FC
}

const NAV_ITEMS: NavItemDef[] = [
  { name: 'Home', label: 'Home', Icon: HomeIcon },
  { name: 'Collections', label: 'Collections', Icon: ListIcon },
]

interface NavItemProps {
  item: NavItemDef
  active: boolean
  onClick: () => void
}

const NavItem: React.FC<NavItemProps> = ({ item, active, onClick }) => {
  const recipe = useRecipe({ key: 'layoutNavs' })
  const styles = recipe({ navActive: active ? 'true' : undefined })

  return (
    <Box as="div" onClick={onClick} css={styles} margin="0 auto">
      <item.Icon />
      <Text fontSize="10px" fontWeight="300">{item.label}</Text>
    </Box>
  )
}

interface SidebarNavProps {
  active: CurrentMenuState
  onNav: (name: CurrentMenuState) => void
  version: string
}

const SidebarNav: React.FC<SidebarNavProps> = ({ active, onNav, version }) => {
  const settingsRecipe = useRecipe({ key: 'layoutNavs' })
  const settingsStyles = settingsRecipe({ navActive: active === 'Settings' ? 'true' : undefined })

  return (
    <Flex
      direction="column"
      align="center"
      bg="sidebar"
      width="64px"
      flexShrink={0}
      height="100vh"
      py="12px"
    >
      {/* Logo */}
      <Box mb={4}>
        <Image
          src="/chromamind_app_icon.svg"
          width="32px"
          height="32px"
          alt="ChromaMind"
        />
      </Box>

      {/* Main nav items */}
      <Flex direction="column" gap="4px" width="100%" px="6px">
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.name}
            item={item}
            active={active === item.name}
            onClick={() => onNav(item.name)}
          />
        ))}
      </Flex>

      <Box flex={1} />

      {/* Settings — pinned to bottom */}
      <Box
        as="div"
        onClick={() => onNav('Settings')}
        css={settingsStyles}
        margin="0 6px"
      >
        <SettingsIcon />
        <Text fontSize="10px" fontWeight="300">Settings</Text>
      </Box>

      {/* Version */}
      <Text fontSize="9px" color="gray.700" mt={2} pb={1}>
        {version ? `v ${version}` : ''}
      </Text>
    </Flex>
  )
}

interface LayoutProps {
  children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const dispatch = useDispatch()
  const currentMenu = useSelector<State, CurrentMenuState>((state) => state.currentMenu)
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion(''))
  }, [])

  return (
    <Flex height="100vh" overflow="hidden" bg="firstBg">
      <SidebarNav
        active={currentMenu}
        onNav={(name) => dispatch(updateMenu(name))}
        version={version}
      />
      <Flex flex={1} direction="column" overflow="hidden">
        {children}
      </Flex>
    </Flex>
  )
}

export default Layout
