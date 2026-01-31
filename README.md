# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    # Rage Roguelike

    Browser-based roguelike built with React + TypeScript + Vite + Bun.

    ## Quick start

    Install dependencies:

    ```bash
    bun install
    ```

    Run dev server:

    ```bash
    bun run dev
    ```

    Build production:

    ```bash
    bun run build
    ```

    ## Repo layout

    - `src/game` - core game logic and systems
    - `src/rendering` - canvas renderer
    - `src/ui` - React UI components
    - `src/data` - JSON definitions for abilities, enemies, passives, talent tree

    ## Contributing

    - Follow TypeScript strictness and keep systems pure where possible.
    - Add new abilities/enemies via `src/data/*.json` and implement behavior in `src/game/systems`.

    ## CI

    This repo includes a basic GitHub Actions workflow that runs a TypeScript build and Vite build on push and pull requests.

    ## License

    MIT
      parserOptions: {
