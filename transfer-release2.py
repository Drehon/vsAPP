import os
import sys
import requests
from github import Github
from dotenv import load_dotenv

def transfer_release(token, target_repo, release_to_transfer):
    """
    Transfers a given release to the target repository.
    """
    try:
        print(f"Processing release: {release_to_transfer.title}")

        # Create the release in the target repository
        target_release = target_repo.create_git_release(
            tag=release_to_transfer.tag_name,
            name=release_to_transfer.title,
            message=release_to_transfer.body,
            draft=release_to_transfer.draft,
            prerelease=release_to_transfer.prerelease
        )

        # Download and upload assets
        for asset in release_to_transfer.get_assets():
            # Exclude source code archives
            if asset.name.endswith('.zip') or asset.name.endswith('.tar.gz'):
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

        print(f"Successfully transferred release: {release_to_transfer.title}")

    except Exception as e:
        print(f"An error occurred during transfer of release {release_to_transfer.title}: {e}")

if __name__ == "__main__":
    load_dotenv()
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        print("Error: GITHUB_TOKEN environment variable not set.")
        sys.exit(1)

    if len(sys.argv) < 4:
        print("Usage: python transfer-release2.py <source_repo> <target_repo> <tag1> [tag2] ...")
        sys.exit(1)

    source_repo_name = sys.argv[1]
    target_repo_name = sys.argv[2]
    tags = sys.argv[3:]

    try:
        g = Github(token)
        source_repo = g.get_repo(source_repo_name)
        target_repo = g.get_repo(target_repo_name)

        for tag in tags:
            try:
                release = source_repo.get_release(tag)
                transfer_release(token, target_repo, release)
            except Exception as e:
                print(f"Failed to find or transfer release with tag '{tag}': {e}")

    except Exception as e:
        print(f"An error occurred: {e}")
