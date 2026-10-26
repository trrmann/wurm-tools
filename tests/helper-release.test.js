import { describe, expect, it } from 'vitest';
import {
  HELPER_TEST_RELEASE as release,
  releaseAssetNames,
  releaseDownloadAssets,
} from '../src/js/modules/helper-release.js';
import {
  HEROES_PAGES,
  heroesAccessPages,
  heroesAccessRedirect,
} from '../src/js/modules/pages/heroes-navigation.js';

function published() {
  return {
    draft: false,
    prerelease: true,
    tag_name: release.tag,
    assets: releaseAssetNames().map((name) => ({
      name,
      state: 'uploaded',
      size: 100,
      digest: `sha256:${release.sha256}`,
      browser_download_url: `https://github.com/trrmann/wurm-tools/releases/download/${release.tag}/${name}`,
    })),
  };
}
describe('signed test download selection', () => {
  it('requires all exact release assets, a prerelease and the pinned installer digest', () => {
    expect(releaseDownloadAssets(published())).toHaveLength(6);
    for (const values of [
      { draft: true },
      { prerelease: false },
      { tag_name: 'other' },
      { assets: [] },
    ])
      expect(() => releaseDownloadAssets({ ...published(), ...values })).toThrow();
    for (const values of [
      { digest: 'sha256:wrong' },
      { state: 'new' },
      { size: 0 },
      { browser_download_url: 'https://example.org/fake.run' },
    ]) {
      const value = published();
      Object.assign(value.assets[0], values);
      expect(() => releaseDownloadAssets(value)).toThrow();
    }
    const duplicate = published();
    duplicate.assets.push(duplicate.assets[0]);
    expect(() => releaseDownloadAssets(duplicate)).toThrow();
  });
  it('exposes every page destination in browsing mode without granting authenticated routes', () => {
    const access = { stage: 'browse' };
    expect(heroesAccessPages(access)).toEqual(HEROES_PAGES);
    for (const page of HEROES_PAGES) expect(heroesAccessRedirect(page, access)).toBeNull();
    const anonymous = { stage: 'anonymous' };
    expect(heroesAccessRedirect(HEROES_PAGES[0], anonymous)).toBe('/site/heroes/login/');
  });
});
