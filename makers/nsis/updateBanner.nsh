; Included by the NSIS installer (makers/MakerNSIS.ts, nsis.include).
;
; In-app updates run this installer silently (/S --updated) after Altus + has
; quit, so nothing is on screen for the minute it takes. Show a small notice
; for that time so the app is not reopened halfway through; it closes when the
; installer exits. Manual installs are unchanged.
;
; ALTUS_UPDATE_LANGUAGE comes from the app (src/updater.ts) and follows its
; language setting; --force-run means the app reopens on its own.
; Saved as UTF-8 with BOM so NSIS reads the accented text correctly.

!macro customInit
  ${if} ${Silent}
    Push $R0
    Push $R1
    Push $R2
    ${GetParameters} $R0
    ClearErrors
    ${GetOptions} $R0 "--updated" $R1
    ${ifNot} ${Errors}
      ClearErrors
      ${GetOptions} $R0 "--force-run" $R1
      ${if} ${Errors}
        StrCpy $R2 "wait"
      ${else}
        StrCpy $R2 "reopen"
      ${endif}
      ReadEnvStr $R1 ALTUS_UPDATE_LANGUAGE
      ; Control 76 is the banner's first line ("Please wait while Setup is
      ; loading..."); the second line only fits about 35 characters.
      ${if} $R1 == "it"
        ${if} $R2 == "reopen"
          Banner::show /set 76 "Aggiornamento di Altus + in corso" "Si riaprirà da solo, attendi..."
        ${else}
          Banner::show /set 76 "Aggiornamento di Altus + in corso" "Attendi prima di riaprirlo..."
        ${endif}
      ${else}
        ${if} $R2 == "reopen"
          Banner::show /set 76 "Updating Altus +" "It will reopen by itself..."
        ${else}
          Banner::show /set 76 "Updating Altus +" "Please wait before reopening it..."
        ${endif}
      ${endif}
    ${endif}
    ClearErrors
    Pop $R2
    Pop $R1
    Pop $R0
  ${endif}
!macroend
