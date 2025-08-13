# AGENTS.md: Instructions for AI Agents

Welcome, agent! This document provides guidance for working within this repository. Please review it before making changes.

## Project Overview

This project is an Electron-based desktop application named "vsAPP". 
It appears to be an educational tool, likely for language learning, with content structured into lessons and exercises.

## Code Organization

Below is an overview of the main directories and their purposes.

-   `/src`: Contains the core source code for the Electron application.
    -   `main.js`: The main process entry point.
    -   `renderer.js`: Logic for the renderer process.
    -   `preload.js`: The preload script for bridging the main and renderer processes.
    -   `index.html`, `style.css`: The main UI files.
    -   `/lib`: Contains third-party libraries.
    -   `/sub-functions`: Contains helper modules and handlers for application logic.

-   `/documentation`: Contains project documentation, analysis, and guides. This is a good place to look for deeper context on architecture and features.

-   `/lessons`, `/lessonsAN`, `/exercises`: These directories contain the core content for the application, likely HTML files representing different lessons and exercises.

-   `/scripts`: Contains helper scripts for the build and release process.

-   `/work`: A workspace for files related to ongoing development tasks. The contents of this folder are temporary and related to the current work in progress.

-   `/others`, `/references`: These directories seem to contain supplementary materials and reference content for the application.

-   **Root Directory Files:** The root directory contains various configuration files (e.g., `forge.config.js`, `webpack.config.js`, `package.json`) and may also contain `.txt` files related to ongoing work.

## Setup and Dependencies

To set up the development environment, install the Node.js dependencies from the root directory:

```bash
npm install
```

## How to Run the Application

To run the application in development mode, use the following command from the root directory:

```bash
npm start
```

This will launch the Electron application.

## How to Build the Application

You can build the application using the following commands:

-   To package the application for the current platform:
    ```bash
    npm run package
    ```
-   To create a distributable installer/package:
    ```bash
    npm run make
    ```

## Testing and Verification

-   **Testing:** This project uses Jest for testing. You can run the test suite using the following command:
    ```bash
    npm test
    ```
    Please add tests for new features and ensure all tests pass before submitting changes.

-   **Linting:** This project uses ESLint to enforce code style. You can check for linting errors with:
    ```bash
    npm run lint
    ```
    To automatically fix many common issues, you can run:
    ```bash
    npm run lint:fix
    ```
    Please ensure your code adheres to the linting rules before submitting. The configuration can be found in `.eslintrc.js`.

## Programmatic Checks

Before submitting, please ensure the following:

1.  **Application Runs:** The application must start and run without errors using `npm start`.
2.  **Linter Passes:** The code must pass all ESLint checks. Run `npm run lint` to verify.
3.  **Tests Pass:** All tests must pass. Run `npm test` to verify.
4.  **Functionality Works:** Manually verify that your changes work as expected within the running application.

Thank you for your cooperation!
