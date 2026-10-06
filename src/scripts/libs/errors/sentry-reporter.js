export let version = '';
export const setVersion = (newVersion) => {
  version = newVersion;
};

export let crashOptions = null;
export const setCrashOptions = (newCrashOptions) => {
  crashOptions = newCrashOptions;
};

export const parseSettingsToSentry = () => {};

export default class SentryReporter {
  static overflowProtection = 0;

  static captureException(ex) {
    if (!ex) return;

    if (
      typeof ex?.message === 'string' &&
      ex.message.includes("can't access dead object")
    ) {
      return;
    }

    if (this.overflowProtection > 5) return;
    this.overflowProtection++;

    console.error('Bilibili Ambilight:', ex);

    setTimeout(() => {
      this.overflowProtection = Math.max(0, this.overflowProtection - 1);
    }, 3000);
  }
}
