// forge.config.js
module.exports = {
  packagerConfig: {
    name: "Gestione Negozio",
    executableName: "gestione-negozio",
    appBundleId: "com.drgreen.gestionenegozi",
    icon: "./icons/icon",
    overwrite: true,
    asar: true,
  },

  makers: [
    // macOS - DMG (installer bello)
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        name: "Gestione Negozio"
      }
    },
    // macOS - ZIP
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    // Windows - ZIP (funziona subito senza Wine)
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    }
  ],

  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    }
  ]
};