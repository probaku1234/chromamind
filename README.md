# ChromaMind

<p align="center">
    <img src="public/chroma-seeklogo.svg" width=50% height=50%>
</p>

**ChromaMind** is a desktop application built with [Rust](https://www.rust-lang.org/) and [Tauri](https://tauri.app/). It serves as a management tool for ChromaDB, providing a user-friendly interface for interacting with embeddings and collections. 



## Features

- **Manage Collections:**
  - View collection info
  - Create new collections
  - Delete existing collections
- **View Embeddings:**
  - Browse and visualize embeddings within collections
- **Custom Theme:**
  - Personalize the application's appearance to suit your preferences



## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (minimum version: 20)
- [Rust](https://www.rust-lang.org/tools/install) (ensure you have the latest stable version installed)
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) based on your operating system

### Build from Source

1. Clone the repository:

   ```bash
   git clone https://github.com/probaku1234/chromamind.git
   cd ChromaMind
   ```

2. Install dependencies:

   ```bash
   npm i
   ```

3. Build and run:
   ```bash
   npm run tauri dev
   ```



## Usage

1. Launch the application.
2. Connect to your ChromaDB instance.
3. Start managing collections and exploring embeddings with an intuitive interface.



## Contribution

We welcome contributions! Follow these steps to get started:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add your message here"
   ```
4. Push to your branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

For larger features or ideas, consider opening an issue to discuss them first.



## License

This project is licensed under the [MIT License](./LICENSE).


## Acknowledgments

- [Rust](https://www.rust-lang.org/) for providing a robust systems programming language
- [Tauri](https://tauri.app/) for making cross-platform desktop apps seamless
- [React](https://reactjs.org/) and [Chakra UI](https://chakra-ui.com/) for a clean and accessible user interface
- [ChromaDB](https://docs.trychroma.com/) for their innovative vector database technology
