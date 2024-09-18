import Home from "./Home";
import { describe, test, beforeAll, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";
import { InvokeArgs } from "@tauri-apps/api/core";

beforeAll(() => {});

afterEach(() => {
  clearMocks();
});

describe("Home", () => {
  test("should render the Home component", () => {
    const mockCommandHandler = <T,>(
      cmd: string,
      _: InvokeArgs | undefined
    ): Promise<T> => {
      if (cmd === "get_chroma_version") {
        return Promise.resolve("0.1.0" as unknown as T); // casting string to T
      } else {
        return Promise.resolve("unknown command" as unknown as T); // casting string to T
      }
    };

    mockIPC(mockCommandHandler);

    render(<Home />);

    screen.debug();
  });
});
