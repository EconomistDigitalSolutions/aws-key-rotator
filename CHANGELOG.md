# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## [1.1.1] - 2019-02-18
### Changed
- Changed self-healing step to only occur on key creation errors.
- Cleaned up some code.

### Removed
- Removed some unused imports.

## [1.1.0] - 2019-01-07
### Added
- Improvements to self-healing removing the requirement for the KeyRotator to be re-run.
- Added change log.

### Changed
- General clean-up of promise returns.

## [1.0.3] - 2019-01-03
### Fixed
- Re-built lib from src with changes from 1.0.2 included.

## [1.0.2] - 2018-12-21
### Changed
- Removed any sensitive data from log output.
- Logging of errors directed to stderr.

### Fixed
- Fixed import paths in README.

## [1.0.1] - 2018-12-20
### Fixed
- Install command in README.

### Removed
- Removed some unused dependencies.
  
## 1.0.0 - 2018-12-20
### Added
- Core code for KeyRotator.

[1.1.1]: https://github.com/EconomistDigitalSolutions/aws-key-rotator/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/EconomistDigitalSolutions/aws-key-rotator/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/EconomistDigitalSolutions/aws-key-rotator/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/EconomistDigitalSolutions/aws-key-rotator/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/EconomistDigitalSolutions/aws-key-rotator/compare/v1.0.0...v1.0.1
