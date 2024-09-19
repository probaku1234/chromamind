import React from "react";
import { Box } from "@chakra-ui/react";
import { useSelector } from "react-redux";
import { State } from "../types";

const Collections: React.FC = () => {
  const currentCollection = useSelector<State, string>(
    (state: State) => state.currentCollection
  );

  return (
    <Box minH="100vh" width={"100%"}>
      {currentCollection}
    </Box>
  );
};

export default Collections;
