import * as options from '../settings-options';

describe('settings-options', () => {
  it('exports all option arrays', () => {
    expect(options.THEME_OPTIONS).toBeDefined();
    expect(options.GRID_OPTIONS).toBeDefined();
    expect(options.GRID_GAP_OPTIONS).toBeDefined();
    expect(options.CANVAS_COLOR_OPTIONS).toBeDefined();
    expect(options.LINK_THICKNESS_OPTIONS).toBeDefined();
    expect(options.LINK_STYLE_OPTIONS).toBeDefined();
    expect(options.CONTROLS_OPTIONS).toBeDefined();
    expect(options.TOOLS_HOTKEYS_OPTIONS).toBeDefined();
    expect(options.LANGUAGE_OPTIONS).toBeDefined();
  });

  it('contains expected values (snapshot)', () => {
    expect(options.THEME_OPTIONS).toMatchSnapshot();
    expect(options.GRID_OPTIONS).toMatchSnapshot();
    expect(options.GRID_GAP_OPTIONS).toMatchSnapshot();
    expect(options.CANVAS_COLOR_OPTIONS).toMatchSnapshot();
    expect(options.LINK_THICKNESS_OPTIONS).toMatchSnapshot();
    expect(options.LINK_STYLE_OPTIONS).toMatchSnapshot();
    expect(options.CONTROLS_OPTIONS).toMatchSnapshot();
    expect(options.TOOLS_HOTKEYS_OPTIONS).toMatchSnapshot();
    expect(options.LANGUAGE_OPTIONS).toMatchSnapshot();
  });
});
