import Home from "./Home";
import { describe, expect, test, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { mockIPC } from "@tauri-apps/api/mocks";

beforeAll(() => {});

describe("Home", () => {
  test("should render the Home component", () => {
    mockIPC((cmd, args) => {
      // simulated rust command called "add" that just adds two numbers
      if (cmd === "get_chroma_version") {
        return "0.1.0";
      }
    });

    render(<Home />);

    screen.debug();
  });
});
