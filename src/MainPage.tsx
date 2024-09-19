import React from "react";
import { useSelector } from "react-redux";
import Layout from "./components/Layout";
import Home from "./components/Home";
import Settings from "./components/Settings";
import Collections from "./components/Collections";
import { CurrentMenuState } from "./slices/currentMenuSlice";
import { State } from "./types";

const MainPage: React.FC = () => {
  const currentMenu = useSelector<State, CurrentMenuState>(
    (state) => state.currentMenu
  );

  return (
    <Layout>
      {currentMenu === "Home" && <Home />}
      {currentMenu === "Collections" && <Collections />}
      {currentMenu === "Settings" && <Settings />}
    </Layout>
  );
};

export default MainPage;
