import React from "react";
import { Box, Button, Heading, useColorMode } from "@chakra-ui/react";

const Settings: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Box>
      <Heading as="h1" my={4}>
        Settings
      </Heading>
      <Button onClick={toggleColorMode}>
        Toggle {colorMode === "light" ? "Dark" : "Light"}
      </Button>
    </Box>
  );
};

export default Settings;
