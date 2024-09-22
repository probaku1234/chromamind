import React, { useEffect } from "react";
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

const Collections: React.FC = () => {
  const currentCollection = useSelector<State, string>(
    (state: State) => state.currentCollection
  );
  const [embeddings, setEmbeddings] = React.useState<EmbeddingsData[]>([]);
  const [loading, setLoading] = React.useState(true);

  const columnHelper = createColumnHelper<EmbeddingsData>();

  const columns = [
    columnHelper.accessor("id", {
      cell: (info) => info.getValue(),
      footer: (info) => info.column.id,
    }),
    columnHelper.accessor("embedding", {
      cell: (info) => info.getValue(),
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
      {currentCollection}
      {loading ? (
        <Heading>Loading...</Heading>
      ) : embeddings.length === 0 ? (
        <Heading>It's empty.</Heading>
      ) : (
        <Box>
          <Flex>
            <Box>collection id</Box>
            <Box>dimensions: {embeddings[0].embedding.length}</Box>
          </Flex>
          <table>
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
      )}
    </Box>
  );
};

export default Collections;
