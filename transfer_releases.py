import os
import sys
import argparse
import re
import requests
from github import Github

def get_repo_name_from_url(url):
    """
    Extracts the repository name (e.g., 'owner/repo') from a GitHub URL.
    """
    match = re.search(r"github\.com/([^/]+/[^/]+)", url)
    if match:
        return match.group(1).replace('.git', '')
    return url # Assume it's already in owner/repo format if no match

def transfer_releases(token, source_repo_name, target_repo_name):
    """
    Transfers all releases from a source repository to a target repository.
    """
    try:
        g = Github(token)
        source_repo = g.get_repo(source_repo_name)
        target_repo = g.get_repo(target_repo_name)

        releases = source_repo.get_releases()

        for release in releases:
            print(f"Processing release: {release.title}")

            # Create the release in the target repository
            target_release = target_repo.create_git_release(
                tag=release.tag_name,
                name=release.title,
                message=release.body,
                draft=release.draft,
                prerelease=release.prerelease
            )

            # Download and upload assets
            for asset in release.get_assets():
                print(f"  - Transferring asset: {asset.name}")
                
                # Download the asset
                response = requests.get(asset.browser_download_url, headers={'Authorization': f'token {token}'})
                response.raise_for_status()

                # Create a temporary file to download the asset
                with open(asset.name, "wb") as f:
                    f.write(response.content)
                
                # Upload the asset to the new release
                target_release.upload_asset(asset.name)
                
                # Remove the temporary file
                os.remove(asset.name)

            print(f"Successfully transferred release: {release.title}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transfer GitHub releases from a source to a target repository.")
    parser.add_argument("token", help="Your GitHub personal access token.")
    parser.add_argument("source_repo", help="Source repository (e.g., 'owner/repo' or a full GitHub URL).")
    parser.add_argument("target_repo", help="Target repository (e.g., 'owner/repo' or a full GitHub URL).")

    args = parser.parse_args()

    source_repo_name = get_repo_name_from_url(args.source_repo)
    target_repo_name = get_repo_name_from_url(args.target_repo)

    transfer_releases(args.token, source_repo_name, target_repo_name)
