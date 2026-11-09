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
