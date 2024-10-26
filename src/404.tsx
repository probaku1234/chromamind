import React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Heading, Text, Link } from '@chakra-ui/react'
import Layout from './components/Layout'

const NotFoundPage: React.FC = () => {
  return (
    <Layout>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        textAlign="center"
      >
        <Heading as="h1" size="2xl" color="gray.700">
          404 - Page Not Found
        </Heading>
        <Text fontSize="xl" color="gray.500" mt="4">
          Sorry, the page you are looking for does not exist.
        </Text>
        <Link asChild fontSize="lg" color="blue.500" mt="6">
          <RouterLink to="/home" />
        </Link>
      </Box>
    </Layout>
  )
}

export default NotFoundPage
