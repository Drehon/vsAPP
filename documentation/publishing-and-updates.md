# Publishing and Updates Guide

This document outlines the process for creating new releases and managing application updates. It is crucial to follow these steps to ensure that releases are published correctly and that users can update the application smoothly.

## 1. The Two Repositories

The project uses two GitHub repositories:

*   **`vsAPP` (Private):** This is the main development repository. All new versions are published here first. This serves as a staging area for internal testing.
*   **`vsAPP-public` (Public):** This repository is for public releases. Users' applications will check this repository for updates.

## 2. Publishing a New Version

The publishing process is divided into two main steps: publishing to the private repository and then promoting the release to the public repository.

### Step 2.1: Publish to the Private Repository (`vsAPP`)

1.  **Ensure `forge.config.js` is correct:** The `publishers` section in `forge.config.js` must be configured to point to the `vsAPP` repository.

    ```javascript
    // forge.config.js
    publishers: [
      {
        name: '@electron-forge/publisher-github',
        config: {
          repository: {
            owner: 'Drehon',
            name: 'vsAPP' // This MUST be vsAPP
          },
          // ...
        }
      }
    ],
    ```

2.  **Increment the version:** Before publishing, make sure the `version` in `package.json` has been incremented.

3.  **Run the publish command:**
    ```bash
    npm run publish
    ```
    This command will build the application and publish a new **draft release** to the `vsAPP` repository on GitHub.

### Step 2.2: Promote the Release to the Public Repository (`vsAPP-public`)

Once the draft release on `vsAPP` has been verified and is ready for the public, you can promote it to the public repository.

1.  **Run the public-publish command:**
    ```bash
    npm run publish-public
    ```
    This command executes the `transfer_releases.py` script. The script finds the latest draft release in the `vsAPP` repository, copies its assets and release notes, and creates a new, identical **published release** in the `vsAPP-public` repository.

2.  **Verify the public release:** Go to the `vsAPP-public` GitHub repository and ensure that the new release is present and published (not a draft).

## 3. Application Update Mechanism

The application uses the `electron-updater` library to handle automatic updates.

*   **Configuration:** The update behavior is controlled by the `app-update.yml` file. This file is packaged with the application.

    ```yaml
    # app-update.yml
    provider: github
    owner: Drehon
    repo: vsAPP-public # This MUST be vsAPP-public
    ```

*   **Update Check:** When the application starts, it reads `app-update.yml` and checks the `vsAPP-public` repository for any new releases. If a new version is found, it prompts the user to download and install the update.

By following this two-step publishing process, we can ensure that only stable, tested releases are made available to users, while maintaining a separate channel for development and internal testing.
