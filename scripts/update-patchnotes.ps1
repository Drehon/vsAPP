# 1. Get all release tags and store them in a variable.
$tags = gh release list --json tagName | ConvertFrom-Json
# 2. Create an empty array to hold the full release data.
$releases = @()
# 3. Loop through each tag, get its complete details including the body, and add it to our array.
foreach ($tagInfo in $tags) {
$releaseData = gh release view $tagInfo.tagName --json name,tagName,publishedAt,body | ConvertFrom-Json
$releases += $releaseData
}
# 4. Convert the final array to JSON and save it to the file.
$releases | ConvertTo-Json -Depth 5 | Out-File -FilePath "patchnotes.json" -Encoding utf8
