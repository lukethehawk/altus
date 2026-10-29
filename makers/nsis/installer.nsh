; Custom NSIS script for the Altus + installer (makers/MakerNSIS.ts,
; nsis.include). electron-builder takes a single include, so this pulls in
; each feature.

; Notice shown while an in-app update installs silently.
!include "${__FILEDIR__}\updateBanner.nsh"
; First install next to, or in place of, the original Altus.
!include "${__FILEDIR__}\replaceAltus.nsh"
