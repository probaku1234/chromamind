import { useState } from "react";
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Image,
  Input,
  Link,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { invoke } from "@tauri-apps/api/core";
import reactLogo from "./assets/react.svg";
import { CheckCircleIcon } from "@chakra-ui/icons";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function greet() {
    setLoading(true);
    setSuccess(false);
    await invoke("create_client", { url: name });
    setGreetMsg(await invoke("health_check"));
    setLoading(false);
    setSuccess(true);

    setTimeout(() => {
      // navigate("/new-page", { replace: true });
      invoke("create_window");
      const currentWindow = getCurrentWindow();
      currentWindow.close();
    }, 2000); // Delay to show the check icon before navigating
  }

  return (
    <Container maxW="container.md" centerContent height={"100vh"}>
      <Heading as="h1" my={4}>
        Welcome to Tauri!
      </Heading>

      <Stack direction="row" spacing={4} my={4}>
        <Link href="https://vitejs.dev" isExternal>
          <Image
            src="/chroma-seeklogo.png"
            className="logo vite"
            alt="Vite logo"
            boxSize="50px"
          />
        </Link>
        <Link href="https://tauri.app" isExternal>
          <Image
            src="/tauri.svg"
            className="logo tauri"
            alt="Tauri logo"
            boxSize="50px"
          />
        </Link>
        <Link href="https://reactjs.org" isExternal>
          <Image
            src={reactLogo}
            className="logo react"
            alt="React logo"
            boxSize="50px"
          />
        </Link>
      </Stack>

      <Text my={4}>
        Click on the Tauri, Vite, and React logos to learn more.
      </Text>

      <Box
        as="form"
        onSubmit={(e: { preventDefault: () => void; }) => {
          e.preventDefault();
          greet();
        }}
        my={4}
      >
        <FormControl id="name" mb={4}>
          <FormLabel>URL</FormLabel>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormControl>
        <Button type="submit" colorScheme="teal" disabled={loading}>
          Connect
        </Button>
      </Box>

      {loading && <Spinner size="xl" mt={4} />}

      {success && (
        <Icon as={CheckCircleIcon} w={16} h={16} color="green.500" mt={4} />
      )}

      {greetMsg && <Text mt={4}>{greetMsg}</Text>}
    </Container>
  );
}

export default App;
