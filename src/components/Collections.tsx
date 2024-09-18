import React, { useState, useEffect } from "react";
import {
  Box,
  useDisclosure,
  Drawer,
  DrawerContent,
} from "@chakra-ui/react";

const Collections: React.FC = () => {
  const [collections, setCollections] = useState<any[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    async function fetchCollections() {
      //   const response = await fetch("https://api.example.com/collections");
      //   const data = await response.json();
      //   setCollections(data);
      setCollections([
        { id: 1, name: "Collection 1" },
        { id: 2, name: "Collection 2" },
        { id: 3, name: "Collection 3" },
      ]);
    }
    fetchCollections();
  }, []);

  return (
    <Box minH="100vh" width={"100%"}>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        placement="left"
        onOverlayClick={onClose}
        size={"full"}
        returnFocusOnClose={false}
      >
        <DrawerContent>
          sex
          <Box>
            {collections.map((collection) => (
              <Box key={collection.id}>{collection.name}</Box>
            ))}
            asdfasdfasdfasdfasdfasdfasdf
          </Box>
        </DrawerContent>
      </Drawer>
      asefasdf
    </Box>
  );
};

export default Collections;
