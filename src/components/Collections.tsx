import React, { useEffect, useState } from "react";
import {
  Box,
  // Table,
  // Thead,
  // Tbody,
  // Tfoot,
  // Tr,
  // Th,
  // Td,
  // TableCaption,
  // TableContainer,
  Heading,
  Flex,
} from "@chakra-ui/react";
import { useSelector } from "react-redux";
import { EmbeddingsData, State } from "../types";
import { invoke } from "@tauri-apps/api/core";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useResizable } from "react-resizable-layout";
import { cn } from "../utils/cn";
import "../styles/collection.css";
import { embeddingToString } from "../utils/embeddingToString";
import { MiddleTruncate } from "@re-dev/react-truncate";

const Collections: React.FC = () => {
  const currentCollection = useSelector<State, string>(
    (state: State) => state.currentCollection
  );
  const [embeddings, setEmbeddings] = React.useState<EmbeddingsData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const {
    isDragging: isTerminalDragging,
    position: terminalH,
    separatorProps: terminalDragBarProps,
  } = useResizable({
    axis: "y",
    initial: 10,
    min: 30,
    reverse: true,
  });

  const columnHelper = createColumnHelper<EmbeddingsData>();

  const columns = [
    columnHelper.accessor("id", {
      cell: (info) => info.getValue(),
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor("document", {
      cell: (info) => (
        <MiddleTruncate end={0}>{info.getValue()}</MiddleTruncate>
      ),
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor("embedding", {
      cell: (info) => (
        <MiddleTruncate end={0}>
          {embeddingToString(info.getValue())}
        </MiddleTruncate>
      ),
      footer: (info) => info.column.id,
    }),
  ];

  const table = useReactTable({
    data: embeddings,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    const fetchEmbeddings = async () => {
      console.log("fetching embeddings");
      // Fetch embeddings
      try {
        setLoading(true);

        const embeddings: EmbeddingsData[] = await invoke("fetch_embeddings", {
          collection: currentCollection,
        });

        console.log(embeddings);
        setEmbeddings(embeddings);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmbeddings();
  }, [currentCollection]);

  return (
    <Box minH="100vh" width={"100%"}>
      {loading ? (
        <Heading>Loading...</Heading>
      ) : embeddings.length === 0 ? (
        <Heading>It's empty.</Heading>
      ) : (
        <Box
          className={
            "flex flex-column h-screen bg-dark font-mono color-white overflow-hidden"
          }
        >
          <Box className={"flex grow"}>
            <Box width={'100%'}>
              <Flex>
                <Box>collection id</Box>
                <Box>dimensions: {embeddings[0].embedding.length}</Box>
              </Flex>
              <table width={'100%'}>
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {table.getFooterGroups().map((footerGroup) => (
                    <tr key={footerGroup.id}>
                      {footerGroup.headers.map((header) => (
                        <th key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.footer,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </tfoot>
              </table>
            </Box>
          </Box>
          <Splitter
            {...terminalDragBarProps}
            dir="horizontal"
            isDragging={isTerminalDragging}
          />
          <Box
            className={cn(
              "shrink-0 bg-darker contents",
              isTerminalDragging && "dragging"
            )}
            style={{ height: terminalH }}
          >
            Placeholder
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Collections;

const Splitter = ({ id = "drag-bar", dir, isDragging, ...props }: any) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Box
      id={id}
      data-testid={id}
      tabIndex={0}
      className={cn(
        "sample-drag-bar",
        dir === "horizontal" && "sample-drag-bar--horizontal",
        (isDragging || isFocused) && "sample-drag-bar--dragging"
      )}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      {...props}
    />
  );
};
