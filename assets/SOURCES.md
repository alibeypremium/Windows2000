# Retro desktop asset sources

Historical reference assets bundled with this browser recreation. All PNGs are downloaded source images; no generated or hand-drawn artwork is included.

## Icon mapping

Files are in `icons/`. For every stem below, both `-16x16.png` and `-32x32.png` are present.

| UI item | Filename stem | Source |
| --- | --- | --- |
| My Computer | `my-computer` | 98.js |
| My Documents | `my-documents` | 98.js |
| My Documents folder | `my-documents-folder` | 98.js |
| Recycle Bin, empty | `recycle-bin` | 98.js |
| Recycle Bin, full | `recycle-bin-full` | 98.js |
| Network Places / Neighborhood | `network` | 98.js |
| Internet Explorer | `internet-explorer` | 98.js |
| Paint | `paint` | 98.js |
| Notepad | `notepad` | 98.js |
| Calculator | `calculator` | 98.js |
| Games (joystick) | `games` | React95 Joy102, 8-bit color variants |
| Minesweeper | `minesweeper` | 98.js |
| Solitaire | `solitaire` | 98.js |
| Control Panel | `control-panel` | Alex Meub Windows 98 icon archive |
| Settings | `settings` | 98.js |
| Start > Settings | `start-settings` | 98.js |
| Run | `run` | 98.js |
| Shut Down | `shutdown` | 98.js |
| Log Off | `logoff` | 98.js |
| Programs | `programs` | 98.js |
| Programs folder | `programs-folder` | 98.js |
| Folder, closed | `folder` | 98.js |
| Folder, open | `folder-open` | 98.js |
| Help | `help` | 98.js |
| Find | `find-file` | 98.js |
| Volume | `speaker` | 98.js |
| Generic document | `document` | 98.js |
| Hard disk | `hard-disk-drive` | 98.js |

Additional original Windows logos exist at 16, 22, and 32 pixels. Use their intrinsic sizes or integer scaling; render images with `image-rendering: pixelated` when scaled.

## Exact original URLs

The full per-file URLs, local paths, bytes, and image dimensions are in `sources.json`.

- 98.js root: https://github.com/1j01/98
- Most icons: `https://raw.githubusercontent.com/1j01/98/master/images/icons/{filename}`
- Games 16: https://raw.githubusercontent.com/React95/React95/master/packages/icons/png/Joy102_16x16_8.png
- Games 32: https://raw.githubusercontent.com/React95/React95/master/packages/icons/png/Joy102_32x32_8.png
- Control Panel 16: https://win98icons.alexmeub.com/icons/png/directory_control_panel-1.png
- Control Panel 32: https://win98icons.alexmeub.com/icons/png/directory_control_panel-2.png
- Windows 98 icon archive: https://win98icons.alexmeub.com/

## Icon reuse and provenance

98.js explicitly says its project is not yet licensed and is source available, not open source. The relevant README is saved as `licenses/98js-README.md`.

React95 is MIT for its own code, but its LICENSE explicitly excludes Windows and associated images and identifies them as Microsoft property. The complete notice is saved as `licenses/react95-LICENSE.txt`. Do not claim that the original Windows icons are MIT licensed.

The Alex Meub archive provides historical Windows icon downloads. No asset-specific reuse license was identified during this check.

These are public historical image sources, not a transfer of copyright or an assertion that the images have a permissive open-source license.

## Browser font

Recommended for the Windows 2000-like UI:

- `fonts/tahoma.ttf` — Wine Tahoma regular, 143,884 bytes.
- `fonts/tahomabd.ttf` — Wine Tahoma bold, 137,836 bytes.
- Original regular source: https://raw.githubusercontent.com/wine-mirror/wine/master/fonts/tahoma.ttf
- Original bold source: https://raw.githubusercontent.com/wine-mirror/wine/master/fonts/tahomabd.ttf

These are Wine's replacement fonts, not the proprietary Microsoft Tahoma font. Their embedded copyright names Larry Snyder (2004) and the Bitstream Vera Sans source (2003). Embedded name-table license metadata explicitly declares LGPL version 2.1 or later. The name-table embedding flag `fsType` is 0. Their notices were extracted unchanged to `licenses/tahoma.ttf-LICENSE.txt` and `licenses/tahomabd.ttf-LICENSE.txt`; the LGPL text is `licenses/wine-COPYING.LIB`. Original editable font sources are retained as `licenses/tahoma.sfd` and `licenses/tahomabd.sfd`.

They can be loaded directly by browsers using `@font-face` with `format('truetype')`, weight 400 for regular and 700 for bold. A useful family stack is `"Desktop Tahoma", Tahoma, Arial, sans-serif`. Native 11px text is a starting point for menu labels, with 12–13px for more readable app content.

The R95-fonts alternative offers converted Microsoft bitmap fonts but explicitly retains Microsoft's original bitmap-data copyright; only its conversion tooling is MIT. It was not selected as the primary reusable font. Source: https://github.com/React95/R95-fonts

## Windows 2000 system icons (user-supplied archive)

Added from the project owner's archive `windows_2000_ve_donem_arsivi.zip`, folder `01_Windows_2000_Sistem_Ikonlari`. Originally Microsoft Windows 2000 system icons (shell32, netshell, sysdm and other resources), stored in the archive as 8x/16x nearest-neighbour enlargements. They were converted back to native size (lossless) and padded to a 32x32 canvas. Where the archive has no true 16x16 version, the 16x16 file is a box-filter downscale of the 32x32 one; icons whose native size is 16x16 are doubled with nearest-neighbour for the 32x32 file. These replace the earlier 98.js stems `my-computer`, `my-documents`, `my-documents-folder`, `network`, `recycle-bin` and `recycle-bin-full`.

| Stem | Archive file | Native size | Notes |
| --- | --- | --- | --- |
| `my-computer` | Windows 2000 My Computer | 32×32 | 32px native, 16 = box downscale ; 16 = true 16px |
| `my-documents` | Windows 2000 My Documents | 32×30 | 32px native, 16 = box downscale |
| `my-documents-folder` | Windows 2000 My Documents | 32×30 | 32px native, 16 = box downscale |
| `network` | Windows 2000 My Network Places | 32×32 | 32px native, 16 = box downscale |
| `recycle-bin` | Windows 2000- Recycle Bin empty | 27×32 | 32px native, 16 = box downscale |
| `recycle-bin-full` | Windows 2000 Recycle Bin full | 27×32 | 32px native, 16 = box downscale ; 16 = true 16px |
| `task-manager` | Windows 2000- Task Manager | 32×32 | 32px native, 16 = box downscale |
| `my-pictures` | Windows 2000- My Pictures | 32×27 | 32px native, 16 = box downscale |
| `admin-tools` | Windows 2000- Administrative Tools | 32×27 | 32px native, 16 = box downscale |
| `network-connections` | Windows 2000- Network Connections | 32×27 | 32px native, 16 = box downscale |
| `network-connection` | Windows 2000- Network connection | 32×30 | 32px native, 16 = box downscale |
| `make-new-connection` | Windows 2000 Make New Connection | 28×32 | 32px native, 16 = box downscale |
| `network-disconnected` | Windows 2000 - netshell.dll icon 113 | 31×32 | 32px native, 16 = box downscale |
| `dialup-connection` | Windows 2000 - netshell.dll icon 194 | 32×32 | 32px native, 16 = box downscale |
| `dialup-document` | Windows 2000 - netshell.dll icon 1 | 29×31 | 32px native, 16 = box downscale |
| `event-viewer` | Windows 2000 Event Viewer | 26×29 | 32px native, 16 = box downscale |
| `hibernate` | Windows 2000- Hibernate | 32×32 | 32px native, 16 = box downscale |
| `narrator` | Windows 2000- Narrator | 32×32 | 32px native, 16 = box downscale |
| `voice-commands` | Windows 2000- Voice Commands | 30×30 | 32px native, 16 = box downscale |
| `disk-quota` | Windows 2000- Disk Quota | 25×32 | 32px native, 16 = box downscale |
| `power-options` | Windows 2000 batt.dll | 31×31 | 32px native, 16 = box downscale |
| `group-policy` | Windows 2000- Group Policy Editor | 32×32 | 32px native, 16 = box downscale |
| `group-policy-alt` | Windows 2000 - Group Policy Editor | 32×32 | 32px native, 16 = box downscale |
| `mmc-extension` | Windows 2000 - MMC Shell Extension DLL | 23×31 | 32px native, 16 = box downscale |
| `certificate` | Windows 2000 - certmgr.dll icon 276 | 26×32 | 32px native, 16 = box downscale |
| `certificate-user` | Windows 2000- netplwiz.dll icon 111 | 32×24 | 32px native, 16 = box downscale |
| `users-key` | Windows 2000- netplwiz.dll icon 102 | 32×29 | 32px native, 16 = box downscale |
| `color-management` | Windows 2000 - icm32.dll | 32×32 | 32px native, 16 = box downscale |
| `icc-profile` | Windows 2000 ICC Profile | 26×32 | 32px native, 16 = box downscale |
| `font-opentype` | Windows 2000 - OpenType Font | 26×32 | 32px native, 16 = box downscale |
| `rating-file` | Windows 2000 - Rating System File | 21×27 | 32px native, 16 = box downscale |
| `registry-binary` | Windows 2000 - Registry Editor - Binary | 16×16 | 16px native, 32 = 2x nearest |
| `pinball` | Windows 2000 - Pinball 16x16 | 16×16 | 16px native, 32 = 2x nearest |
| `fax-checklist` | Windows 2000 - faxui.dll icon 1001 | 32×32 | 32px native, 16 = box downscale |
| `fax-person` | Windows 2000 - faxui.dll icon 301 | 29×32 | 32px native, 16 = box downscale |
| `fax-machine` | Windows 2000 - faxui.dll icon 304 | 32×28 | 32px native, 16 = box downscale |
| `mouse-ok` | Windows 2000 main.cpl  108 | 32×29 | 32px native, 16 = box downscale |
| `system-display` | Windows 2000 sysdm.dll  9 | 29×32 | 32px native, 16 = box downscale |
| `system-x86` | Windows 2000- sysdm.dll icon 10 | 31×32 | 32px native, 16 = box downscale |
| `system-wizard` | Windows 2000- sysdm.dll icon 2 | 32×32 | 32px native, 16 = box downscale |
| `system-properties` | Windows 2000- sysdm.dll icon 7 | 32×32 | 32px native, 16 = box downscale |
| `system-gear` | Windows 2000- sysdm.dll icon 8 | 32×32 | 32px native, 16 = box downscale |
| `configure-server` | Windows 2000- Configure Your Server | 25×30 | 32px native, 16 = box downscale |
| `iis` | Windows 2000- Internet Information Server | 29×31 | 32px native, 16 = box downscale |
| `media-server` | Windows 2000- Windows Media Server | 32×32 | 32px native, 16 = box downscale |
| `thunking-server` | Windows 2000- Thunking Server | 32×32 | 32px native, 16 = box downscale |
| `server-manager` | Windows 2000- srvmgr.exe icon 150 | 29×22 | 32px native, 16 = box downscale |
| `explorer-view` | Windows 2000- explorer.exe icon 107 | 32×32 | 32px native, 16 = box downscale |
| `infrared` | Windows 2000- irprops.cpl icon 129 | 32×32 | 32px native, 16 = box downscale |
| `sounds-music` | Windows 2000- mmsys.cpl icon 4390 | 32×31 | 32px native, 16 = box downscale |
| `odbc` | Windows 2000- odbccp32.cpl icon 1439 | 32×32 | 32px native, 16 = box downscale |
| `folder-options` | Windows 2000- shell32.dll icon 49 | 32×32 | 32px native, 16 = box downscale |
| `scanner` | Windows 2000- sticpl.cpl icon 101 | 32×31 | 32px native, 16 = box downscale |
| `camera` | Windows 2000- sticpl.cpl icon 104 | 32×23 | 32px native, 16 = box downscale |
| `scanner-video` | Windows 2000- sticpl.cpl icon 110 | 30×32 | 32px native, 16 = box downscale |
| `scanner-camera` | Windows 2000- sticpl.cpl icon 111 | 32×32 | 32px native, 16 = box downscale |
| `telephony` | Windows 2000- tapiui.dll icon 202 | 32×32 | 32px native, 16 = box downscale |

## Windows 2000 ICO set (user-supplied archive `win2000.rar`)

190 icons from the owner's `win2000.rar` (275 `.ico` files) were converted frame-by-frame to `assets/icons/w2k/<name>-16x16.png` and `-32x32.png`. A true 16x16 or 32x32 frame was used whenever the `.ico` contained one (`native`); missing sizes are box-downscaled (`downscaled`), nearest-neighbour doubled (`upscaled`) or resampled. The 85 `unknown_*` and Windows Media Player `wmp_*` icons are not imported yet. `packages/ui/index.js` maps the UI's icon names (folder, drive, CD, Start menu entries, Control Panel, printers, ...) to these files.

| Stem | Archive file | Sizes |
| --- | --- | --- |
| `w2k/computer` | w2k-computer.ico | 16:native, 32:native |
| `w2k/control-panel` | w2k-control_panel.ico | 16:native, 32:native |
| `w2k/default-document` | w2k-default_document.ico | 16:native, 32:native |
| `w2k/desktop` | w2k-desktop.ico | 16:native, 32:native |
| `w2k/documents` | w2k-documents.ico | 16:native, 32:native |
| `w2k/fonts` | w2k-fonts.ico | 16:native, 32:native |
| `w2k/help` | w2k-help.ico | 16:native, 32:native |
| `w2k/my-computer` | w2k-my_computer.ico | 16:native, 32:native |
| `w2k/network-drive-connected` | w2k-network_drive_connected.ico | 16:native, 32:native |
| `w2k/printers` | w2k-printers.ico | 16:native, 32:native |
| `w2k/programs` | w2k-programs.ico | 16:native, 32:native |
| `w2k/settings` | w2k-settings.ico | 16:native, 32:native |
| `w2k/1` | w2k_1.ico | 16:native, 32:native |
| `w2k/2` | w2k_2.ico | 16:native, 32:native |
| `w2k/3` | w2k_3.ico | 16:native, 32:native |
| `w2k/4` | w2k_4.ico | 16:native, 32:native |
| `w2k/5` | w2k_5.ico | 16:native, 32:native |
| `w2k/6` | w2k_6.ico | 16:native, 32:native |
| `w2k/7` | w2k_7.ico | 16:downscaled, 32:native |
| `w2k/administrative-tools` | w2k_administrative_tools.ico | 16:native, 32:native |
| `w2k/audio-cd` | w2k_audio_cd.ico | 16:native, 32:native |
| `w2k/bitmap-image` | w2k_bitmap_image.ico | 16:native, 32:native |
| `w2k/cd-rom-drive` | w2k_cd-rom_drive.ico | 16:native, 32:native |
| `w2k/cd-audio` | w2k_cd_audio.ico | 16:native, 32:native |
| `w2k/cd-player` | w2k_cd_player.ico | 16:native, 32:native |
| `w2k/closed-folder` | w2k_closed_folder.ico | 16:native, 32:native |
| `w2k/computer-b` | w2k_computer.ico | 16:native, 32:native |
| `w2k/computers` | w2k_computers.ico | 16:native, 32:native |
| `w2k/configuration-settings` | w2k_configuration_settings.ico | 16:native, 32:native |
| `w2k/control-panel-b` | w2k_control_panel.ico | 16:native, 32:native |
| `w2k/default-application` | w2k_default_application.ico | 16:native, 32:native |
| `w2k/default-document-b` | w2k_default_document.ico | 16:native, 32:native |
| `w2k/default-icon` | w2k_default_icon.ico | 16:native, 32:native |
| `w2k/default-printer` | w2k_default_printer.ico | 16:native, 32:native |
| `w2k/default-printer-floppy` | w2k_default_printer_floppy.ico | 16:native, 32:native |
| `w2k/default-printer-network` | w2k_default_printer_network.ico | 16:native, 32:native |
| `w2k/defragment` | w2k_defragment.ico | 16:native, 32:native |
| `w2k/desktop-b` | w2k_desktop.ico | 16:native, 32:native |
| `w2k/desktop2` | w2k_desktop2.ico | 16:native, 32:native |
| `w2k/dial-up-networking` | w2k_dial-up_networking.ico | 16:native, 32:native |
| `w2k/dial-up` | w2k_dial_up.ico | 16:native, 32:native |
| `w2k/documents-b` | w2k_documents.ico | 16:native, 32:native |
| `w2k/dustbin` | w2k_dustbin.ico | 16:native, 32:native |
| `w2k/dustbin2` | w2k_dustbin2.ico | 16:native, 32:native |
| `w2k/dustbin-full` | w2k_dustbin_full.ico | 16:native, 32:native |
| `w2k/eject` | w2k_eject.ico | 16:native, 32:native |
| `w2k/entire-network` | w2k_entire_network.ico | 16:native, 32:native |
| `w2k/favorites` | w2k_favorites.ico | 16:native, 32:native |
| `w2k/favorites-folder` | w2k_favorites_folder.ico | 16:native, 32:native |
| `w2k/find` | w2k_find.ico | 16:native, 32:native |
| `w2k/floppy` | w2k_floppy.ico | 16:native, 32:native |
| `w2k/floppy-2` | w2k_floppy_2.ico | 16:native, 32:native |
| `w2k/floppy-drive-3half` | w2k_floppy_drive_3½.ico | 16:native, 32:native |
| `w2k/floppy-drive-5` | w2k_floppy_drive_5.ico | 16:native, 32:native |
| `w2k/folder-closed` | w2k_folder_closed.ico | 16:native, 32:native |
| `w2k/folder-open` | w2k_folder_open.ico | 16:native, 32:native |
| `w2k/font` | w2k_font.ico | 16:native, 32:native |
| `w2k/font-2` | w2k_font_2.ico | 16:native, 32:native |
| `w2k/font-3` | w2k_font_3.ico | 16:native, 32:native |
| `w2k/fonts-b` | w2k_fonts.ico | 16:native, 32:native |
| `w2k/forbidden` | w2k_forbidden.ico | 16:native, 32:native |
| `w2k/gif-image` | w2k_gif_image.ico | 16:native, 32:native |
| `w2k/globe` | w2k_globe.ico | 16:native, 32:native |
| `w2k/hard-drive` | w2k_hard_drive.ico | 16:native, 32:native |
| `w2k/harddrive` | w2k_harddrive.ico | 16:native, 32:native |
| `w2k/help-b` | w2k_help.ico | 16:native, 32:native |
| `w2k/hibernate` | w2k_hibernate.ico | 16:native, 32:native |
| `w2k/hourglass` | w2k_hourglass.ico | 16:native, 32:native |
| `w2k/hourglass-2` | w2k_hourglass_2.ico | 16:native, 32:native |
| `w2k/info` | w2k_info.ico | 16:native, 32:native |
| `w2k/ini-and-inf` | w2k_ini_&_inf.ico | 16:native, 32:native |
| `w2k/internet-document` | w2k_internet_document.ico | 16:native, 32:native |
| `w2k/internet-explorer` | w2k_internet_explorer.ico | 16:native, 32:native |
| `w2k/jpeg-image` | w2k_jpeg_image.ico | 16:native, 32:native |
| `w2k/key` | w2k_key.ico | 16:native, 32:native |
| `w2k/key-2` | w2k_key_2.ico | 16:downscaled, 32:native |
| `w2k/lock` | w2k_lock.ico | 16:native, 32:native |
| `w2k/log-off` | w2k_log_off.ico | 16:native, 32:native |
| `w2k/media-clip` | w2k_media_clip.ico | 16:native, 32:native |
| `w2k/midi-sequence` | w2k_midi_sequence.ico | 16:native, 32:native |
| `w2k/move` | w2k_move.ico | 16:downscaled, 32:native |
| `w2k/movie-clip` | w2k_movie_clip.ico | 16:native, 32:native |
| `w2k/movie-maker` | w2k_movie_maker.ico | 16:native, 32:native |
| `w2k/mplayer32-1` | w2k_mplayer32_1.ico | 16:native, 32:native |
| `w2k/mplayer32-2` | w2k_mplayer32_2.ico | 16:native, 32:native |
| `w2k/mplayer32-3` | w2k_mplayer32_3.ico | 16:native, 32:native |
| `w2k/mplayer32-4` | w2k_mplayer32_4.ico | 16:native, 32:native |
| `w2k/mplayer32-5` | w2k_mplayer32_5.ico | 16:native, 32:native |
| `w2k/mplayer32-6` | w2k_mplayer32_6.ico | 16:native, 32:native |
| `w2k/mplayer32-7` | w2k_mplayer32_7.ico | 16:downscaled, 32:native |
| `w2k/ms-dos-application` | w2k_ms-dos_application.ico | 16:native, 32:native |
| `w2k/ms-dos-batch-file` | w2k_ms-dos_batch_file.ico | 16:native, 32:native |
| `w2k/multiple-files` | w2k_multiple_files.ico | 16:native, 32:native |
| `w2k/my-computer-b` | w2k_my_computer.ico | 16:native, 32:native |
| `w2k/my-documents` | w2k_my_documents.ico | 16:native, 32:native |
| `w2k/network` | w2k_network.ico | 16:native, 32:native |
| `w2k/network-2` | w2k_network_2.ico | 16:native, 32:native |
| `w2k/network-3` | w2k_network_3.ico | 16:native, 32:native |
| `w2k/network-computer` | w2k_network_computer.ico | 16:native, 32:native |
| `w2k/network-drive-connected-b` | w2k_network_drive_connected.ico | 16:native, 32:native |
| `w2k/network-drive-disconnected` | w2k_network_drive_disconnected.ico | 16:native, 32:native |
| `w2k/network-drive-offline` | w2k_network_drive_offline.ico | 16:native, 32:native |
| `w2k/network-folder` | w2k_network_folder.ico | 16:native, 32:native |
| `w2k/network-folders` | w2k_network_folders.ico | 16:native, 32:native |
| `w2k/network-neighborhood` | w2k_network_neighborhood.ico | 16:native, 32:native |
| `w2k/network-printer` | w2k_network_printer.ico | 16:native, 32:native |
| `w2k/new-printer` | w2k_new_printer.ico | 16:native, 32:native |
| `w2k/notepad-1` | w2k_notepad_1.ico | 16:native, 32:native |
| `w2k/notepad-2` | w2k_notepad_2.ico | 16:native, 32:native |
| `w2k/old-dustbin` | w2k_old_dustbin.ico | 16:native, 32:native |
| `w2k/old-dustbin-2` | w2k_old_dustbin_2.ico | 16:native, 32:native |
| `w2k/open-folder` | w2k_open_folder.ico | 16:native, 32:native |
| `w2k/paint` | w2k_paint.ico | 16:native, 32:native |
| `w2k/paint-2` | w2k_paint_2.ico | 16:native, 32:native |
| `w2k/paint-3` | w2k_paint_3.ico | 16:downscaled, 32:native |
| `w2k/paint-4` | w2k_paint_4.ico | 16:downscaled, 32:native |
| `w2k/paint-5` | w2k_paint_5.ico | 16:downscaled, 32:native |
| `w2k/paint-6` | w2k_paint_6.ico | 16:downscaled, 32:native |
| `w2k/portable-drive` | w2k_portable_drive.ico | 16:native, 32:native |
| `w2k/printer` | w2k_printer.ico | 16:native, 32:native |
| `w2k/printer-floppy` | w2k_printer_floppy.ico | 16:native, 32:native |
| `w2k/printer-unknown` | w2k_printer_unknown.ico | 16:native, 32:native |
| `w2k/printers-b` | w2k_printers.ico | 16:native, 32:native |
| `w2k/printers-2` | w2k_printers_2.ico | 16:native, 32:native |
| `w2k/program-group` | w2k_program_group.ico | 16:native, 32:native |
| `w2k/programs-b` | w2k_programs.ico | 16:native, 32:native |
| `w2k/programs-2` | w2k_programs_2.ico | 16:native, 32:native |
| `w2k/ram-drive` | w2k_ram_drive.ico | 16:native, 32:native |
| `w2k/ramdrive` | w2k_ramdrive.ico | 16:native, 32:native |
| `w2k/recycle-bin-empty` | w2k_recycle_bin_empty.ico | 16:native, 32:native |
| `w2k/recycle-bin-full` | w2k_recycle_bin_full.ico | 16:native, 32:native |
| `w2k/removable-drive` | w2k_removable_drive.ico | 16:native, 32:native |
| `w2k/rich-text-format` | w2k_rich_text_format.ico | 16:native, 32:native |
| `w2k/run` | w2k_run.ico | 16:native, 32:native |
| `w2k/scheduled-tasks` | w2k_scheduled_tasks.ico | 16:native, 32:native |
| `w2k/search` | w2k_search.ico | 16:native, 32:native |
| `w2k/search2` | w2k_search2.ico | 16:native, 32:native |
| `w2k/search-2` | w2k_search_2.ico | 16:native, 32:native |
| `w2k/search-3` | w2k_search_3.ico | 16:native, 32:native |
| `w2k/search-4` | w2k_search_4.ico | 16:resampled, 32:resampled |
| `w2k/search-5` | w2k_search_5.ico | 16:resampled, 32:resampled |
| `w2k/search-6` | w2k_search_6.ico | 16:resampled, 32:resampled |
| `w2k/search-7` | w2k_search_7.ico | 16:resampled, 32:resampled |
| `w2k/search-8` | w2k_search_8.ico | 16:native, 32:native |
| `w2k/server` | w2k_server.ico | 16:native, 32:native |
| `w2k/setting-printers` | w2k_setting_printers.ico | 16:native, 32:native |
| `w2k/settings-b` | w2k_settings.ico | 16:native, 32:native |
| `w2k/settings-control-panel` | w2k_settings_-_control_panel.ico | 16:native, 32:native |
| `w2k/settings-printers` | w2k_settings_-_printers.ico | 16:native, 32:native |
| `w2k/sharing` | w2k_sharing.ico | 16:native, 32:native |
| `w2k/sharing-overlay` | w2k_sharing_overlay.ico | 16:native, 32:native |
| `w2k/shortcut` | w2k_shortcut.ico | 16:native, 32:native |
| `w2k/shortcut-overlay` | w2k_shortcut_overlay.ico | 16:native, 32:native |
| `w2k/shut-down` | w2k_shut_down.ico | 16:native, 32:native |
| `w2k/shutdown` | w2k_shutdown.ico | 16:native, 32:native |
| `w2k/shutdown-2` | w2k_shutdown_2.ico | 16:native, 32:native |
| `w2k/sndrec-1` | w2k_sndrec_1.ico | 16:native, 32:native |
| `w2k/sndrec-2` | w2k_sndrec_2.ico | 16:native, 32:native |
| `w2k/sndrec-3` | w2k_sndrec_3.ico | 16:native, 32:native |
| `w2k/sndvol-1` | w2k_sndvol_1.ico | 16:native, 32:native |
| `w2k/sndvol-2` | w2k_sndvol_2.ico | 16:downscaled, 32:native |
| `w2k/sndvol-3` | w2k_sndvol_3.ico | 16:downscaled, 32:native |
| `w2k/sndvol-4` | w2k_sndvol_4.ico | 16:native, 32:native |
| `w2k/sndvol-5` | w2k_sndvol_5.ico | 16:native, 32:native |
| `w2k/start` | w2k_start.ico | 16:native, 32:native |
| `w2k/stop` | w2k_stop.ico | 16:native, 32:native |
| `w2k/suspend` | w2k_suspend.ico | 16:native, 32:native |
| `w2k/system` | w2k_system.ico | 16:native, 32:native |
| `w2k/system-2` | w2k_system_2.ico | 16:native, 32:native |
| `w2k/system-file` | w2k_system_file.ico | 16:native, 32:native |
| `w2k/taskbar` | w2k_taskbar.ico | 16:downscaled, 32:native |
| `w2k/temporary` | w2k_temporary.ico | 16:native, 32:native |
| `w2k/text-document` | w2k_text_document.ico | 16:native, 32:native |
| `w2k/text-file` | w2k_text_file.ico | 16:native, 32:native |
| `w2k/the-internet` | w2k_the_internet.ico | 16:native, 32:native |
| `w2k/tree` | w2k_tree.ico | 16:native, 32:native |
| `w2k/uninstall` | w2k_uninstall.ico | 16:downscaled, 32:native |
| `w2k/uninstall-2` | w2k_uninstall_2.ico | 16:downscaled, 32:native |
| `w2k/uninstall-3` | w2k_uninstall_3.ico | 16:downscaled, 32:native |
| `w2k/unknown` | w2k_unknown.ico | 16:downscaled, 32:native |
| `w2k/video-clip` | w2k_video_clip.ico | 16:native, 32:native |
| `w2k/warning` | w2k_warning.ico | 16:native, 32:native |
| `w2k/wave-sound` | w2k_wave_sound.ico | 16:native, 32:native |
| `w2k/windows-update` | w2k_windows_update.ico | 16:native, 32:native |
| `w2k/workgroup` | w2k_workgroup.ico | 16:native, 32:native |
| `w2k/write` | w2k_write.ico | 16:native, 32:native |
| `w2k/write-document` | w2k_write_document.ico | 16:native, 32:native |
| `w2k/wupdate-1` | w2k_wupdate_1.ico | 16:native, 32:native |
| `w2k/wupdate-2` | w2k_wupdate_2.ico | 16:native, 32:native |
| `w2k/zip-file` | w2k_zip_file.ico | 16:native, 32:native |

## Assets cropped from reference screenshots (user-supplied)

Pixel-exact crops of a Windows 2000 desktop, taken from two screenshots supplied by the project owner: the Start menu banner (`assets/ui/start-banner.png`), the Start logo and a few 16x16/32x32 icons for which no `.ico` was available (`assets/icons/w2k/ref-*.png`), and the Explorer toolbar buttons, throbber, Go/drop-down glyphs and the My Computer header art (`assets/ui/explorer/*.png`). Mirrored copies are used for the Back (enabled) and Forward (disabled) arrows. Positions in `packages/explorer/index.js` were measured against the same screenshots.

## Explorer web-view assets cropped from a second set of reference screenshots (user-supplied)

Six further screenshots supplied by the project owner (Control Panel, Program Files, Local Disk (C:), Recycle Bin, My Network Places, My Documents) provided: the per-folder header art (`assets/ui/explorer/header-{control,folder,disk,recycle,network,documents}.png`), the disk-usage pie chart (`disk-pie.png`), the system-folder background (`bg-systemfolder.png`) and the Control Panel / network / My Documents icons that no `.ico` covered (`assets/icons/w2k/ref-cp-*.png`, `ref-net-add`, `ref-md-v86`; 16x16 versions are downscaled from the 32x32 crops). They are Microsoft's imagery, included for this non-commercial fan project only.

## Dialog and Internet Explorer assets cropped from a third set of reference screenshots (user-supplied)

Fifteen further screenshots supplied by the project owner (Control Panel items, Add/Remove Programs, wizards, Accessibility Options, Taskbar and Start Menu Properties, BDE Administrator, Automatic Updates and Internet Explorer) provided: dialog artwork in `assets/ui/dialogs/` (Accessibility feature icons, taskbar preview, Add/Remove Programs sidebar and page icons `arp-*`, wizard banners `wiz-*`, the Windows Update logo `au-logo`, BDE toolbar/tree icons `bde-*`), the Add/Remove Programs row and Windows Components list icons in `assets/icons/arp/`, the BDE title icon (`assets/icons/w2k/ref-bde-app-*.png`) and the Internet Explorer 5 toolbar, address, status-bar and throbber images in `assets/ui/ie/`. Layouts in `packages/control-panel/dialogs.js`, `refkit.js` and `packages/internet/browser.js` were measured against the same screenshots. They are Microsoft/Borland imagery, included for this non-commercial fan project only.

## Fourth reference set (Internet Properties, Gaming Options, Fonts, Folder Options, Display Properties, Date/Time)

Assets under `assets/ui/inet/`, `assets/ui/folderopts/`, `assets/ui/display/`, `assets/ui/explorer/fonts-views.png`, `assets/ui/dialogs/gaming-pad.png`, and the `ref-font-*` / `cpGaming` icons were cropped from the user-supplied Windows 2000 screenshots (m1–m20) and background-keyed to alpha where needed. The Display Properties monitor frame, appearance preview, energy-star logo, colour bar, slider, wallpaper-list icons, desktop-icon crops and the Date/Time world map come from the same screenshots.

## Fifth reference set (Users and Passwords, Power Options, Mouse, Keyboard, Location Information, LAN status, Java Plug-in, Internet Properties Programs/Advanced, Printers)

Assets under `assets/ui/users/`, `assets/ui/power/`, `assets/ui/mouse/`, `assets/ui/keyboard/`, `assets/ui/net/` and the new `assets/ui/inet/` icons were cropped from the user-supplied Windows 2000 screenshots (p1–p20) and background-keyed to alpha where needed.

## Sixth reference set (q1–q19)

Icons and banners for System Properties, Regional Options, Sounds and Multimedia, Scanners and Cameras, Shut Down Windows and the Scheduled Tasks folder were cropped from user-supplied Windows 2000 reference screenshots (`assets/ui/system`, `assets/ui/sounds`, `assets/ui/shutdown`, `assets/ui/explorer/header-tasks.png`, `assets/icons/w2k/ref-add-task-*`).

Items to Synchronize (`assets/ui/sync/`): header, folder and page icons cropped from the user-supplied Windows 2000 reference screenshot r7.

Address Book (`assets/ui/ab/`), WordPad (`assets/ui/wp/`), Imaging (`assets/ui/img/`), Paint tool icons (`assets/ui/paint/`) and Getting Started with Windows 2000 (`assets/ui/gs/`): cropped from the user-supplied Windows 2000 reference screenshots r1, r4, r6, r8 and r9–r14.

Fonts (`assets/fonts/`): `tahoma.ttf` and `tahomabd.ttf` are the original Windows 2000 SP4 files from the user's own ISO. `ms-sans-serif*.ttf` are pixel-outline conversions of the original `sserife.fon` 8 pt bitmap font made with `scripts/fon2ttf.py`.

Sounds (`assets/sounds/`) and wallpapers (`assets/wallpapers/`): original Windows 2000 SP4 media files from the user's own ISO (`start.wav` was transcoded from MS ADPCM to PCM; wallpaper BMPs converted to PNG).

Mouse cursors (`assets/cursors/`): extracted from `user32.dll` of the user's own Windows 2000 SP4 ISO (`text` and `crosshair` re-rendered from the inverting XOR mask to opaque black/white pixels).

Appearance schemes (`packages/control-panel/schemes.js`): colors parsed from `HIVEDEF.INF` of the user's own Windows 2000 SP4 ISO.

## Help (assets/help)
HTML Help topics, images and stylesheets from the original Windows 2000 Professional SP4 CHM files (34 books: getstart, howto, concepts, tshoot, glossary, per-application help, Control Panel topics, Internet Explorer, Outlook Express). Generated by `scripts/build-help.py` from 7z-extracted CHMs; `help.json` holds the contents trees, keyword index, full-text word index and related-topic (HAID) map used by `packages/shell/help.js`.

## Services / consoles
Service list, descriptions and start-up types follow the default Windows 2000 Professional set (packages/system/services.js). Local Security Policy, Component Services, ODBC, Telnet Server Admin and Add Network Place are layout approximations built from the ISO dialog structure; no reference screenshots exist yet for them.

## Games
Minesweeper: tiles, LED digits, faces, sounds and dialog templates are the original resources of winmine.exe (Windows 2000 SP4). Window layout constants follow the original client geometry; no reference screenshot was available.

## Pinball (3D Pinball for Windows - Space Cadet)
- `assets/games/pinball/pinball.dat`, `sound*.wav`, `pinball.mid`: from the Windows 2000 CD (I386).
- `assets/games/pinball/pinball.wasm`: table logic from the MIT-licensed SpaceCadetPinball reimplementation (`pinball-wasm/`, LICENSE-SpaceCadetPinball), compiled with wasi-sdk (`pinball-wasm/build.sh`). SDL/ImGui are replaced by a small browser layer (`pinball-wasm/src/platform.cpp`, `winmain.cpp`); the JS host is `packages/games/pinball.js`.

## Menus and dialogs from the ISO (second pass)
- `scripts/dump-menus.py` reads RT_MENU/RT_STRING from any PE file. Outlook Express menus: msoeres.dll (`assets/oe/menus.json`).
- Notepad/WordPad Find, Replace, Go To, Page Setup: notepad.exe + comdlg32.dll templates (`packages/accessories/notepad-data.js`).
- Paint Flip/Rotate, Stretch/Skew, Custom Zoom: mspaint.exe (`paint-data.js`). Menus of Notepad, WordPad, Paint, Calculator, Imaging (kodakimg.exe), Address Book (wab32res.dll) follow the real resources. IE 5.01 menus follow the real browser menu order (they are not stored as RT_MENU in the ISO).

- Task Manager, Registry Editor, System Information, Magnifier (dialogs), Event Viewer, Device Manager, Disk Management and Disk Defragmenter: menus and dialogs follow the Windows 2000 SP4 ISO resources (taskmgr, regedit, msinfo32, magnify, mmc).
- Windows Media Player UI bitmaps (button strips, Windows Media logo, volume) and menus extracted from msdxm.ocx (assets/wmp).
- WMP dialogs (Open, About, Statistics, Properties, Options sheet) rebuilt from msdxm.ocx RT_DIALOG templates (packages/accessories/wmp-data.js).
- CD Player: bitmaps, menus and Player Options/Playlist Editor dialogs extracted from cdplayer.exe (assets/cdplayer, packages/accessories/cd-data.js).
- Outlook Express: read-message window menu (msoeres.dll menu 121), Options/Find/Layout/Rules/New Folder/About dialogs from msoeres.dll templates (packages/internet/oe-data.js).
- Volume Control: strips, Properties and Advanced Controls dialogs rebuilt from sndvol32.exe templates (packages/accessories/volume.js, volume-data.js).
- Sound Recorder: window, buttons (bitmap 501), menus and Details dialog from sndrec32.exe; editing functions implemented on PCM buffers (packages/accessories/recorder.js).
- Internet Explorer: Internet Options (6 tabs, no Privacy tab: IE 5.01), Open dialog built from inetcplc.dll/shdoclc.dll templates (packages/internet/ie-data.js, scripts/dump-icons.py); Media toolbar button removed (IE 6 only).

## Internet Explorer: sağ tık menüleri
- Page/Link/Image/Control bağlam menüleri shdoclc.dll menü 24641 yapısından (öğe sırası ISO'dan; bazı öğeler pasif). File>Edit kaynak görüntüler.

## Internet Explorer: Organize Favorites ve kalan boşluklar
- Organize Favorites: shdoclc.dll `ORGFAV.DLG` (HTML, 41.2em x 31em) metin ve yerleşimi; Create Folder/Rename/Move/Delete butonları, özellik paneli ("times visited / last visited").
- Create New Folder: shdoclc 4480; Rename: browseLC.dll 258; Browse For Folder: shell32.dll 1087 (Move to Folder).
- Tahmin: Work Offline "sayfa çevrimdışı yok" metni; Find (on This Page) basit prompt; ziyaret sayıları/tarihleri tutulmuyor.
- Tüm dlg.js diyaloglarında Enter=OK, Esc=Cancel.

## Disk Defragmenter (dfrg.msc)
- DfrgRes.dll: diyalog 102/104/105/106 (Analysis/Defragmentation Complete & Report), tüm metinler (string 114–725), renk bitmap'leri 102,141–146, ikonlar 106/127 (`scripts/dump-bitmaps.py`, `dump-icons.py`). DfrgUI.dll ikonları.
- Tahmin: MMC çerçevesi (sol ağaç + başlık bandı), harita yerleşimi/renk dağılımı, rapor sayıları sanal dosya sisteminden türetilmiş.

## Disk Management (diskmgmt.msc)
- dmdskres.dll: diyalog 172 (Format), 353–359 (Create Partition Wizard), 361/363 (drive letter/path), 348 (Disk properties), 345 (Rescanning), 347/139 (Appearance/Scaling), tüm menü/durum/hata metinleri, ikon ve bitmap'ler (`assets/diskmgmt/`).
- Tahmin: MMC çerçevesi, graphical view yerleşimi/renkleri, wizard sol görseli (ISO'da bulunamadı), Volume Properties sayfası.
- Bölüm modeli `settings.diskMgmt`; yeni sürücüler Explorer'da My Computer/Folders'ta görünür.

## Desktop icons, context menus, network tray icon
- Desktop icon context menus follow shell32.dll menu 210 (Cut/Copy/Paste/Create Shortcut/Delete/Rename/Properties) and 227 (Empty Recycle Bin); dragging is pointer-based with grid snapping. Explore/Manage/Search/Map Network Drive actions and shortcut (.lnk) creation are simulated.
- Tray network icon: `assets/tray/lan190–195.png` are the 16px icons from netshell.dll; blink timing and traffic counters are simulated. "Local Area Connection Status" uses netshell.dll dialog 1801 (`packages/shell/lan-data.js`); tray menu follows netshell menu 15101.
- Startup no longer opens My Computer automatically.
- Desktop background menu: structure from shell32.dll menus 216/217/218 (Active Desktop, Arrange Icons by Name/Type/Size/Date + Auto Arrange, Line Up Icons, Refresh, Paste, Paste Shortcut, Undo, New, Properties). Sorting, Line Up, Show Desktop Icons, Lock Desktop Items are implemented; Undo and web-content items are inert.

## Screen savers and Display Properties backgrounds
- Screen saver names come from the string tables of the ISO's .scr files (ss3dfo, ssflwbox, ssmaze, sspipes, sstext3d, ssbezier, ssmarque, ssmyst, ssstars; scrnsave = Blank Screen). Their "Setup" dialogs (template 2003) are dumped to `packages/control-panel/saver-data.js` and built with `dialogFromTemplate`. The saver animations themselves (`packages/rendering/savers.js`) are 2D-canvas re-creations written for this project (the OpenGL ones are rough software approximations), not extracted code. Settings persist in `saverOptions`.
- Wallpapers: the ISO contains only 11 wallpaper bitmaps (already in `assets/wallpapers/`). The Background list shows only these 11 (Boiling Point, Chateau, Fall Memories, Straw Mat and Winter were removed because they are not on the ISO). Picture Display (Center/Tile/Stretch) and the monitor preview are new; default is Tile.

## Message boxes and delete confirmations
- `assets/msgbox/{warning,question,error,info}.png`: user32.dll icons 101–104 (32px). The generic message box (`DialogService.message`) now uses MessageBox-style metrics (icon left, wrapped text, centred 75x23 buttons, no title-bar icon); the box size is computed from the text, not copied from user32.
- `assets/shconfirm/142–148.png`: shell32.dll icons (file/folder/multiple delete, replace, rename, move). `packages/ui/shconfirm.js` builds Confirm File Delete / Confirm Folder Delete / Confirm Multiple File Delete from shell32.dll dialog templates 1011/1012/1013 (texts from the same templates and shell32 strings 66/68). Used by the desktop, Explorer Delete and both Empty Recycle Bin paths. Confirm File Replace / Confirm Folder Replace (templates 1014/1015) are built by `confirmReplace` and are asked by `Clipboard.transfer` (paste, drag & drop) when the destination already has an item of that name; folders are merged. Confirm File/Folder Move and Rename (1016–1019) are for read-only/system items; the virtual file system has no per-file read-only attribute, so they are not wired.

## Getting Started with Windows 2000 (welcome.exe)
- Behaviour and texts follow welcome.exe's string table: the right pane cycles slides 1300–1305 on "Getting Started"; hovering Register Now / Discover Windows / Connect to the Internet shows that item's title (1010–1012), text (1030–1032) and watermark bitmap (bitmaps 3/4/5 -> `assets/ui/gs/hover-*.png`). The slide pictures are bitmaps 20/22/23/24/25 with their 1-bit masks 30/32/33/34/35 (`assets/ui/gs/iso-*.png`). Hover highlight colour, bitmap placement and the slide order are guesses. The mouse slide still uses a crop from the user's screenshots (the original is the AVI resource). Clicking the items does not run regwiz/discover/icwconn1 (not emulated): Register shows a notice, Discover opens Help, Connect opens Internet Explorer.

## System Properties names, LAN status sheet, icon selection
- Network Identification: Properties opens netid.dll dialog 103 (Identification Changes); Network ID reuses the layout of netid.dll dialog 105 (Domain Username And Password) as a user-name prompt (that prompt and its text are not in the original). The user name feeds "Registered to:" on the General tab; until the computer is renamed its full name is `<user name>-windows2000`.
- Local Area Connection Status: netshell.dll dialog 1801 on a one-tab sheet with Close (&Close = string 23020); "Bytes:" is shown as "Packets:" (string 23051) and the dial-up Errors row is dropped; activity pictures are netshell LAN icons 121–128 (`assets/tray/lan32-*.png`). Blink timing and counters are simulated.
- Selected desktop/Explorer icons are blended 50% with the highlight colour (`#w2k-sel` SVG filter) instead of the earlier sepia tint.

- Quick launch: sol simge On-Screen Keyboard, sağ simge Show Desktop; Explorer Arrange Icons (Name/Type/Size/Date) View menüsü + boş alan sağ tık; Save As 'Desktop' kısayol düğmesi; Explorer öğeleri draggable="true" (tahmin: düğme glifi ISO dışı).

## Application icons, System Information
- `assets/icons/iso/{cdplayer,mplayer2,msinfo32,sndrec32,sndvol32}-{16x16,32x32}.png`: first RT_GROUP_ICON of cdplayer.exe (101), mplayer2.exe (110), msinfo32.exe (128), sndrec32.exe (10), sndvol32.exe (300). They replace the earlier generic icons in the Start menu (Entertainment), window title bars and the app registry. The round Media Player 7 icon is not on the ISO (Windows 2000 ships Media Player 6.4).
- System Information (`packages/system/sysinfo.js`): the category tree (System Summary, Hardware Resources, Components, Software Environment), the column titles, "No ... information" texts, Find/Tools/Basic/Advanced menu texts are from msinfo32.dll strings. Values are simulated from the browser/virtual system; the MMC menu layout (Action/View/Tools/Help) is a guess. Open/Save .NFO and Advanced view are disabled.
- CD Player: window already follows cdplayer.exe resources; the original Deluxe skin draws its own caption strip (bitmaps 154/301/401), which is not reproduced (standard title bar used).

## Toolbar hot/cold buttons
- Internet Explorer toolbar: browseui.dll bitmaps 267 (cold, 256 colours) and 268 (hot), 16x16 cells (back, forward, stop, refresh, home, search, favorites, history, mail, print) -> `assets/ui/ie/iso/<name>-{cold,hot}.png`. The hot picture shows while the pointer is over an enabled button (raised border on hover, sunken border + 1px shift when pressed). Back/Forward are now dimmed from the real history state. The Media button picture is still the screenshot crop (IE 6 only, no ISO bitmap).
- Help viewer (hh.exe) toolbar: hhctrl.ocx bitmaps 512 (cold) / 513 (hot), 20x20 cells (hide=13, back=0, forward=1, options=10, web help=18) -> `assets/ui/help/hot/`. Hover/press borders follow the common toolbar style (guess).

## Toolbar hot/cold buttons (Explorer, Outlook Express, Address Book)
- Explorer (My Computer, My Documents, Control Panel, all folders): up, folders, delete, undo, views are pixel-identical to browseui.dll bitmap 278 (cold) / 279 (hot) cells 28, 43, 10, 8, 22; Back/Forward use cells 0/1, Move To/Copy To cells 44/45 (nearest cells, not pixel-identical to the old screenshot crops); Search and History use browseui bitmaps 267/268 cells 5 and 12 -> `assets/ui/explorer/iso/`.
- Outlook Express: msoeres.dll bitmaps 38 (cold) / 39 (hot), 20px cells (Create Mail 24, Reply 35, Reply All 36, Forward 10, Print 31, Addresses 0, Find 7; Delete = cell 6 and Send/Recv = cell 40 were picked by eye); Previous/Next from bitmaps 27/28 cells 56/55 -> `assets/ui/oe/iso/`. Reply/Print/New etc. were pixel-identical to the hot sheet, so the old screenshot icons were the hot state.
- Address Book: wab32res.dll bitmaps 4136 (cold), 4137 (hot), 4138 (disabled), 26px cells (new, properties, delete, find, print, action) -> `assets/ui/ab/iso/`. The old icons were hot (New/Find/Action) or disabled (Properties/Delete/Print) pictures, so enabled Properties/Delete/Print now show the cold picture.
- Raised border on hover and sunken border + 1px shift on press follow the standard flat-toolbar look (not read from the ISO).

- WordPad toolbar: the button pictures (screenshot crops with a baked raised bevel) now get a sunken bevel while pressed, and Bold/Italic/Underline stay pressed (dithered, as the alignment buttons) while the caret text has that style. Bevel colours are the standard 3D palette (not read from the ISO).

- Imaging toolbar: the picture is a screenshot crop with invisible hit areas; hover (raised) and press (sunken) borders are now drawn over the buttons (standard 3D palette, not from the ISO).
- Volume Control: the dialog templates from sndvol32.exe contain their own trackbar controls (ids 1001/1002) and level meter (1005); they were drawn underneath the interactive sliders, giving a doubled thumb/ticks. They are now hidden. The 16x16 window icon is sndvol32.exe icon 300 as stored on the ISO (the 32x32 version of that icon is the mixer with speaker; the speaker-only icons 301-304 are tray icons).

## Games: keyboard and automatic moves
- Keyboard shortcuts of FreeCell, Solitaire, Minesweeper and Pinball (F2, Space/plunger, flippers, ...) now work whenever the game window is the active window; before, they only worked after clicking inside the window, so Pinball's plunger and F2 seemed dead right after opening the game.
- FreeCell: "At the end of each move, FreeCell transfers unneeded cards to home cells" (freecell.chm, Strategies and tips) is implemented (a card is unneeded when the opposite-colour cards of lower rank are already home; aces and twos always go); right-clicking a card brings a partly hidden card to the front while the button is held (same help topic). The "title bar flashes when only one legal move remains" behaviour is not implemented. Auto-moves are undone together with the player's move by Undo.
- Solitaire already had double-click to suit stack and right-click/Ctrl+A for all playable cards (sol.chm, Play Solitaire).
- Pinball: `pinball.wasm` rebuilt with a few extra read-only debug exports (`pb_state` 6-15); the table logic is unchanged.

## Pinball – Launch Ball / çökme düzeltmesi
- Enter (Launch Ball) top oyundayken tekrar basılınca `TPlunger` yeniden tetikleniyor ve WASM `memory access out of bounds` ile oyun donuyordu (top ekranda "kayboluyordu"). Artık Launch Ball yalnızca top plunger kanalındayken çalışır (orijinal oyundaki gibi).
- `TTextBox` mesaj zincirinde boşa çıkmış `PreviousMessage` işaretçisi sıfırlanıyor; `gdrv::copy_bitmap` sınır kırpması eklendi.
- Top sprite'ı ISO'daki ball0 bitmap'idir (10×10 px, 600×416 çözünürlük) — küçük olması orijinaldeki gibidir.

## Winamp 2.x (Webamp)
- Oynatıcı motoru ve klasik Winamp 2.91 varsayılan skin'i **Webamp 2.3.1** (MIT, `assets/vendor/webamp/webamp.bundle.min.mjs`, npm `webamp`) paketinden gelir. Winamp, Windows 2000 ISO'sunda olmadığı için ISO'dan çıkarılmadı; kullanıcının verdiği `winamp3.exe` (eski NSIS paketi) açılamadı.
- Çalma listesi: Windows2000 demo melodisi ve ISO'dan gelen sistem sesleri. Eject (⏏) ile bilgisayardan mp3/ogg/wav eklenir.
- Tahmin/uydurma: Winamp ikonu (`assets/icons/winamp-*.png`) bu proje için çizildi, orijinal değil. `app/desktop.css` içindeki `.selected`/`.window` kuralları `#webamp` içinde devre dışı bırakıldı.
- Düzeltme: Webamp bundle'ı `import.meta.url` ile yükleniyor (Pages'te göreli yol hatası giderildi); masaüstüne Winamp kısayolu eklendi. Winamp3 kurulum paketinin içindeki tek ikon genel NSIS kurulum ikonu çıktı (Winamp ikonu değil), bu yüzden kullanılmadı; Winamp ikonu hâlâ bu projede çizilmiş bir ikondur.
- Winamp ikonu: proje sahibinin verdiği dönem arşivinden (`Winamp 2.95- icon 164.png`, 32×32 olarak küçültüldü; 16×16 bundan türetildi). Önceki çizim ikonun yerini aldı.

## WinRAR 3.20 (look-alike)
- Arayüz düzeni (menüler File/Commands/Tools/Favorites/Options/Help, büyük düğmeli araç çubuğu, adres çubuğu, sütunlar, durum çubuğu metinleri) WinRAR 3.x'ten **hatırlanan düzene göre** yazıldı; orijinal exe/kaynak yok. Ayrıntılar tahmindir.
- ZIP: fflate (MIT) — okuma/yazma. RAR: node-unrar-js 2.0.2 (MIT; unrar lisansı) WASM — yalnızca okuma/çıkarma. RAR **oluşturulamaz**, RAR içine ekleme/silme yok. Kütüphaneler `assets/vendor/winrar/` (lisans dosyalarıyla).
- Araç çubuğu ve program ikonları (`assets/ui/winrar/*.png`, `assets/icons/winrar-*.png`) bu proje için çizildi, orijinal değil. Sahibi orijinal ikonları sağlayınca değiştirilecek.
- Çalışmayanlar (mesajla bildirilir): SFX, kurtarma kaydı, virüs tarama, yorum, rapor, benchmark, Settings, Favorites yönetimi.
- `core` `fs.writeFile` artık `encoding` seçeneğini kaydediyor (ikili dosyalar için `data-url`).

## Adobe Acrobat Reader 5.0 (look-alike)
- PDF çizimi/metin katmanı **pdf.js 6.5.438** (Apache-2.0, `assets/vendor/pdfjs/`). Arayüz (menüler File/Edit/Document/View/Tools/Window/Help, araç çubuğu, sol Bookmarks/Thumbnails paneli, alt durum çubuğu, Find, Go To Page, Document Info, Hand/Text Select) Acrobat Reader 5.x'ten **hatırlanan düzene göre** yazıldı; orijinal exe/kaynak yok, ayrıntılar tahmindir.
- Araç çubuğu düğme görselleri ve program ikonu (`assets/icons/acrobat-*.png`) bu proje için çizildi, orijinal değil.
- Çalışmayanlar: yorum/imza panelleri, form doldurma, Reader'ın çevrimiçi özellikleri, Preferences. Print tarayıcının yazdırma penceresini kullanır.
