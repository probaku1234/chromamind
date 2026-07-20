# Contributing

Thanks for taking the time to contribute! Here's the basic workflow:

1. **Branch from `main`**

   ```bash
   git checkout -b feat/cool-new-feature
   ```

2. **Write your code, then commit**

   ```bash
   git commit -m "Add cool new feature"
   ```

3. **Format and lint before pushing**

   ```bash
   npm run format              # Prettier
   npm run lint                # ESLint
   cd src-tauri && cargo clippy  # Rust
   ```

4. **Open a pull request**
