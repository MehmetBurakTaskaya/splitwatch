# Code signing

Splitwatch uses no paid services, so its builds are not signed by a commercial certificate yet.

## Today

| System  | Signature                                              | What users see                                                                                                                                                 | How updates work                                            |
| ------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Windows | none                                                   | SmartScreen: "Windows protected your PC" → **More info** → **Run anyway**                                                                                      | electron-updater installs new versions from GitHub Releases |
| macOS   | ad-hoc (`mac.identity: "-"` in `electron-builder.yml`) | Gatekeeper refuses the first launch → **System Settings → Privacy & Security → Open Anyway**, or `xattr -dr com.apple.quarantine /Applications/Splitwatch.app` | The app checks GitHub Releases and opens the download page  |

Why macOS does not update itself: Squirrel.Mac, which Electron's updater uses on macOS, works only
with code-signed apps, and a Developer ID certificate needs the paid Apple Developer Program. Ad-hoc
signing is enough for Apple Silicon to run the app, but not for Gatekeeper or notarization.

## Windows: SignPath Foundation

[SignPath Foundation](https://signpath.org/) gives open-source projects a free code signing
certificate issued to the project, after checking that each binary was built from the public
repository. Its [conditions](https://signpath.org/terms) include, among others:

- an OSI-approved license (MIT qualifies) and no proprietary components;
- an actively maintained project that is already released;
- multi-factor authentication for every team member, and defined author, reviewer and approver roles;
- manual approval of every signing request;
- a "Code signing policy" section linked from the home and download pages (SignPath attribution,
  team roles, privacy statement);
- binaries built from source in a verifiable way, which the GitHub Actions release workflow does.

Steps when the project qualifies:

1. Apply at [signpath.org/apply](https://signpath.org/apply).
2. Add the code signing policy section to the README and the download page.
3. Add SignPath's GitHub Action to `.github/workflows/release.yml`: build the unsigned installer,
   submit it for signing, wait for the approval, then upload the signed file to the draft release.
4. Keep the product name and version attributes identical across builds (electron-builder sets them).

## macOS

Notarization needs the Apple Developer Program (paid), so it is not planned. If that changes,
electron-builder can sign with a Developer ID and notarize in CI, and the macOS build can switch to
the same automatic updates as Windows.
