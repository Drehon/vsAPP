# VSAPP - Personal Learning Platform

This is a custom desktop application designed to host and manage interactive educational materials, primarily language lessons and exercises.

## Project Purpose

The goal is to create an autonomous, offline learning environment free from the limitations of standard web browsers. The application provides a unified interface to access various educational content, save progress, and interact with materials dynamically.

## Core Features

### 1. Dynamic Content Library (Home Screen)
- The application launches to a central "Home" screen that acts as a dynamic library.
- It automatically scans and displays the contents of the `/lessons` and `/exercises` directories.
- Users can easily navigate to any lesson or exercise by clicking on its name in the list.

### 2. Advanced Save/Load System
- **Non-Destructive Saves:** Each content page features a save system that does not overwrite previous progress. Clicking "Save" creates a new versioned "snapshot" of the user's work.
- **Local JSON Files:** Progress is saved to local `.json` files in the user's application data directory, ensuring data is persistent and not tied to browser `localStorage`.
- **Contextual Loading:** The "Load" function on each page intelligently displays only the save files relevant to that specific lesson or exercise.
- **Metadata:** Each save includes rich metadata, such as a timestamp and the number of questions answered, to help the user identify and manage their progress.

### 3. Full Interactivity
- The application supports a wide range of interactive exercises, including:
  - Multiple-choice questions.
  - True/false statements.
  - Written answers and sentence transformations.
- **Integrated Notepads:** Each question or section can have its own dedicated notepad (`<textarea>`) for users to jot down their thought processes. These notes are saved along with the answers.
- **Text Highlighting (Future):** The architecture supports future implementation of text highlighting that can be saved as part of the page state.

### 4. Offline-First and Self-Contained
- **No Internet Required:** The application is designed to be fully functional offline. All necessary assets, including styles and fonts, are bundled with the application.
- **Local CSS Compilation:** Tailwind CSS is used for styling, but it is compiled locally into a single `style.css` file, removing any dependency on external CDNs.

### 5. Automatic Updates
- **Seamless Updates:** The application uses `electron-updater` to automatically check for new versions from the project's GitHub Releases page.
- **User-Friendly Process:** When a new version is detected, it is downloaded in the background. The user is then prompted to restart the application to apply the update, ensuring a smooth and non-disruptive update process.

## How It Works: The Technical Stack

- **Framework:** **Electron** is used to create the cross-platform desktop application, providing access to the native file system and a consistent environment.
- **Frontend:** The user interface is built with standard **HTML5, CSS3, and JavaScript**.
- **Styling:** **Tailwind CSS** is used for utility-first styling.
- **Runtime:** The application runs on **Node.js**.
- **Bundling:** **Webpack** is used to bundle the application's code for production.
- **Installation & Updates:** **Electron Forge** is used for building installers, and **Electron Updater** manages the auto-update process.

## Project Status

Currently in active development. All core features for v1.0.0 have been implemented.
