import { beforeEach, describe, expect, it, vi } from 'vitest';

const { add, watch, config } = vi.hoisted(() => ({
  add: vi.fn(),
  watch: vi.fn(),
  config: {}
}));

vi.mock('@fortawesome/fontawesome-svg-core', () => ({
  config,
  dom: { watch },
  library: { add }
}));

vi.mock('@fortawesome/fontawesome-svg-core/styles.css', () => ({}));

vi.mock('@fortawesome/free-solid-svg-icons', () => ({
  faMoon: { iconName: 'moon' },
  faPlay: { iconName: 'play' },
  faStop: { iconName: 'stop' },
  faSun: { iconName: 'sun' },
  faFloppyDisk: { iconName: 'floppy-disk' },
  faUpload: { iconName: 'upload' },
  faMaximize: { iconName: 'maximize' },
  faDownLeftAndUpRightToCenter: { iconName: 'down-left-and-up-right-to-center' },
  faNoteSticky: { iconName: 'note-sticky' },
  faImage: { iconName: 'image' },
}));

describe('Font Awesome subset bootstrap', () => {
  beforeEach(() => {
    add.mockClear();
    watch.mockClear();
    delete config.autoAddCss;
    vi.resetModules();
  });

  it('registers only the used icons and watches the DOM once', async () => {
    const { FONT_AWESOME_ICONS, initializeFontAwesome } = await import('../src/scripts/services/fontawesome.js');

    expect(FONT_AWESOME_ICONS).toHaveLength(10);

    initializeFontAwesome();
    initializeFontAwesome();

    expect(config.autoAddCss).toBe(false);
    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(...FONT_AWESOME_ICONS);
    expect(watch).toHaveBeenCalledTimes(1);
  });
});