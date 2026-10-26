import '../styles/core.css';
import { HELPER_TEST_RELEASE, releaseDownloadAssets } from './modules/helper-release.js';

const release = HELPER_TEST_RELEASE;
document.getElementById('verify-commands').textContent =
  `cd "$HOME/Downloads"\ngpg --show-keys --with-fingerprint publisher-public.asc\ngpg --import publisher-public.asc\ngpg --verify "${release.artifact}.asc" "${release.artifact}"`;
document.getElementById('install-command').textContent = `bash "${release.artifact}" --yes`;
document.getElementById('publisher-fingerprint').textContent =
  `Publisher primary fingerprint: ${release.primaryFingerprint}. Expected signing subkey: ${release.signingFingerprint}.`;
const status = document.getElementById('download-status');
async function loadDownloads() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/trrmann/wurm-tools/releases/tags/${release.tag}`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!response.ok) throw new Error(`GitHub download lookup returned ${response.status}`);
    const assets = releaseDownloadAssets(await response.json());
    for (const asset of assets) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = asset.browser_download_url;
      link.textContent = asset.name;
      item.append(link);
      document.getElementById('download-assets').append(item);
    }
    status.textContent =
      'Signed test download available. Read the warning and verify before installing.';
  } catch (error) {
    status.textContent = `Download unavailable: ${error.message}. The publisher must finish uploading the complete signed test release. Do not substitute an unverified source ZIP.`;
  }
}
loadDownloads();
