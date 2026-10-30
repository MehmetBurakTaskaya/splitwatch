# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-30

The first version: the app's foundation and its release pipeline, without stream watching yet.

### Added

- Desktop app for Windows (NSIS installer) and macOS (universal `.dmg` and `.zip`).
- Automatic updates on Windows; an update notice with a download link on macOS.
- Interface language system with English, ready for right-to-left languages.
- Light and dark appearance that follows the system.
- Security baseline: sandboxed, isolated renderer without Node.js, strict Content Security Policy,
  hardened Electron fuses.

[Unreleased]: https://github.com/MehmetBurakTaskaya/splitwatch/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/MehmetBurakTaskaya/splitwatch/releases/tag/v0.1.0
