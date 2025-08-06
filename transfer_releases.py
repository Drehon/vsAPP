import os
import sys
import requests
from github import Github
from dotenv import load_dotenv
load_dotenv()

def transfer_latest_release(token, source_repo_name, target_repo_name):
    """
    Transfers the latest release from a source repository to a target repository.
    """
    try:
        g = Github(token)
        source_repo = g.get_repo(source_repo_name)
        target_repo = g.get_repo(target_repo_name)

        latest_release = source_repo.get_latest_release()
        print(f"Processing release: {latest_release.title}")

        # Create the release in the target repository
        target_release = target_repo.create_git_release(
            tag=latest_release.tag_name,
            name=latest_release.title,
            message=latest_release.body,
            draft=latest_release.draft,
            prerelease=latest_release.prerelease
        )

        # Download and upload assets
        for asset in latest_release.get_assets():
            if asset.name.startswith('Source code'):
                print(f"  - Skipping source code asset: {asset.name}")
                continue
            
            print(f"  - Transferring asset: {asset.name}")
            
            response = requests.get(asset.browser_download_url, headers={'Authorization': f'token {token}'})
            response.raise_for_status()

            # Create a temporary file to download the asset
            with open(asset.name, "wb") as f:
                f.write(response.content)
            
            # Upload the asset to the new release
            target_release.upload_asset(asset.name)
            
            # Remove the temporary file
            os.remove(asset.name)

        print(f"Successfully transferred release: {latest_release.title}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        print("Error: GITHUB_TOKEN environment variable not set.")
        sys.exit(1)

    if len(sys.argv) != 3:
        print("Usage: python transfer_releases.py <source_repo> <target_repo>")
        sys.exit(1)

    source_repo = sys.argv[1]
    target_repo = sys.argv[2]

    transfer_latest_release(token, source_repo, target_repo)
