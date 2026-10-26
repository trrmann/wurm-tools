export const HELPER_TEST_RELEASE = Object.freeze({
  tag: 'helper-v1.5.2-fedora44-test.1',
  artifact: 'wurm-tools-helper-1.5.2-fedora44-x64-unsigned.run',
  sha256: '456309a75712b0e8924a1cbc7d409aa20ba204e85b60dda5914ea8e45b713c40',
  primaryFingerprint: '5F1FDEA0B282BB1EE348D27F2E2E4A1DF850EA0F',
  signingFingerprint: '6B7D26AEC837663A2FD3873190B01A7CCDBFD2AB',
});

export function releaseAssetNames() {
  return [
    HELPER_TEST_RELEASE.artifact,
    `${HELPER_TEST_RELEASE.artifact}.asc`,
    `${HELPER_TEST_RELEASE.artifact}.sha256`,
    'fedora-build.json',
    'fedora-build.json.asc',
    'publisher-public.asc',
  ];
}

export function releaseDownloadAssets(release) {
  if (release.draft || release.prerelease !== true || release.tag_name !== HELPER_TEST_RELEASE.tag)
    throw new Error('Expected a published, explicitly marked test prerelease.');
  return releaseAssetNames().map((name) => {
    const matches = release.assets?.filter((asset) => asset.name === name) || [];
    const asset = matches[0];
    const expected = `https://github.com/trrmann/wurm-tools/releases/download/${HELPER_TEST_RELEASE.tag}/${name}`;
    if (
      matches.length !== 1 ||
      asset.browser_download_url !== expected ||
      asset.state !== 'uploaded' ||
      !(asset.size > 0)
    )
      throw new Error(`Missing or invalid test release asset: ${name}`);
    if (
      name === HELPER_TEST_RELEASE.artifact &&
      asset.digest !== `sha256:${HELPER_TEST_RELEASE.sha256}`
    )
      throw new Error('Published installer hash differs from the pinned signed test build.');
    return asset;
  });
}
