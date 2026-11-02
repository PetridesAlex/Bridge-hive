/**
 * Expo SDK 54 only writes SplashScreenBackground RGB into the storyboard when a
 * splash `image` is present. Without an image the template keeps white (#FFFFFF).
 *
 * Must be listed in app.json *before* expo-splash-screen so this mod registers
 * before the splashScreenStoryboard provider (provider must be last).
 */
const {
  withIosSplashScreenStoryboard,
} = require('@expo/prebuild-config/build/plugins/unversioned/expo-splash-screen/withIosSplashScreenStoryboard');
const {
  parseColor,
} = require('@expo/prebuild-config/build/plugins/unversioned/expo-splash-screen/InterfaceBuilder');

const NAVY = '#071A2F';

function withNavyOnlySplash(config) {
  return withIosSplashScreenStoryboard(config, (cfg) => {
    const xml = cfg.modResults;
    const color = parseColor(NAVY);
    const resources = xml.document.resources[0];
    resources.namedColor = resources.namedColor ?? [];

    const navyNamedColor = {
      $: { name: 'SplashScreenBackground' },
      color: [
        {
          $: {
            alpha: '1.000',
            blue: color.rgb.blue,
            green: color.rgb.green,
            red: color.rgb.red,
            customColorSpace: 'sRGB',
            colorSpace: 'custom',
          },
        },
      ],
    };

    const namedColors = resources.namedColor;
    const existing = namedColors.findIndex((entry) => entry.$?.name === 'SplashScreenBackground');
    if (existing >= 0) {
      namedColors[existing] = navyNamedColor;
    } else {
      namedColors.push(navyNamedColor);
    }

    // Expo's removeImage helper can leave an unused SplashScreenLogo resource entry.
    if (Array.isArray(resources.image)) {
      resources.image = resources.image.filter((entry) => entry.$?.name !== 'SplashScreenLogo');
    }

    const mainView = xml.document.scenes[0].scene[0].objects[0].viewController[0].view[0];
    mainView.color = [
      {
        $: {
          key: 'backgroundColor',
          name: 'SplashScreenBackground',
        },
      },
    ];
    // Ensure no logo image view remains on the launch screen.
    if (mainView.subviews?.[0]?.imageView) {
      mainView.subviews[0].imageView = [];
    }
    if (mainView.constraints?.[0]?.constraint) {
      mainView.constraints[0].constraint = [];
    }

    cfg.modResults = xml;
    return cfg;
  });
}

module.exports = withNavyOnlySplash;
