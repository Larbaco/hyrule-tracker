; Windows Firewall rule for the Second Screen (phones and tablets on the local network).
; The installer is per-user, so adding the rule needs one UAC prompt. It is skipped when the rule already
; exists and on silent installs (auto-updates), so updates never ask. Private and domain networks only:
; the tracker is never opened to public networks.

!define LAN_RULE "Hyrule Tracker (Second Screen)"

!macro customInstall
  IfSilent lanRuleDone
  nsExec::ExecToStack '"$SYSDIR\netsh.exe" advfirewall firewall show rule name="${LAN_RULE}"'
  Pop $0
  Pop $1
  StrCmp $0 "0" lanRuleDone
  MessageBox MB_YESNO|MB_ICONQUESTION "Allow Hyrule Tracker through Windows Firewall on private networks?$\r$\n$\r$\nThis lets your phone or tablet open the Second Screen. Windows will ask for permission." /SD IDNO IDNO lanRuleDone
  ExecShellWait "runas" "$SYSDIR\netsh.exe" 'advfirewall firewall add rule name="${LAN_RULE}" dir=in action=allow program="$INSTDIR\${APP_EXECUTABLE_FILENAME}" protocol=TCP profile=private,domain enable=yes' SW_HIDE
  lanRuleDone:
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    nsExec::ExecToStack '"$SYSDIR\netsh.exe" advfirewall firewall show rule name="${LAN_RULE}"'
    Pop $0
    Pop $1
    ${if} $0 == "0"
      ExecShellWait "runas" "$SYSDIR\netsh.exe" 'advfirewall firewall delete rule name="${LAN_RULE}"' SW_HIDE
    ${endIf}
  ${endIf}
!macroend
