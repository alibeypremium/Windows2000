"""Dump RT_MENU / RT_STRING / RT_BITMAP resources of a PE file: dump(path) -> {menus, strings}."""
import struct, pefile

def _res(pe, tname):
    out = {}
    for t in pe.DIRECTORY_ENTRY_RESOURCE.entries:
        if pefile.RESOURCE_TYPE.get(t.id) != tname: continue
        for e in t.directory.entries:
            for l in e.directory.entries:
                d = l.data.struct
                out.setdefault(e.id if e.id else str(e.name), []).append(pe.get_data(d.OffsetToData, d.Size))
    return out

def _menu(b):
    ver, hs = struct.unpack_from('<HH', b, 0)
    o = 4 + hs
    if ver == 1:  # MENUEX
        o = 4 + hs
        def items(o):
            res = []
            while True:
                typ, st, ident, flg = struct.unpack_from('<IIIH', b, o)
                o += 14
                s = b[o:].decode('utf-16le', 'ignore').split('\0')[0]
                o += (len(s) + 1) * 2
                o = (o + 3) & ~3
                if flg & 1:
                    o += 4
                    sub, o = items(o)
                    res.append({'label': s, 'id': ident, 'sub': sub, 'type': typ})
                else:
                    res.append({'label': s, 'id': ident, 'state': st, 'type': typ})
                if flg & 0x80: break
            return res, o
        return items(o)[0]
    def items(o):
        res = []
        while True:
            flg, = struct.unpack_from('<H', b, o); o += 2
            if flg & 0x10:
                sub_id = None
                s = b[o:].decode('utf-16le', 'ignore').split('\0')[0]; o += (len(s) + 1) * 2
                sub, o = items(o)
                res.append({'label': s, 'sub': sub})
            else:
                ident, = struct.unpack_from('<H', b, o); o += 2
                s = b[o:].decode('utf-16le', 'ignore').split('\0')[0]; o += (len(s) + 1) * 2
                res.append({'label': s, 'id': ident, 'flags': flg})
            if flg & 0x80: break
        return res, o
    return items(o)[0]

def dump(path):
    pe = pefile.PE(path, fast_load=True)
    pe.parse_data_directories([pefile.DIRECTORY_ENTRY['IMAGE_DIRECTORY_ENTRY_RESOURCE']])
    menus = {k: _menu(v[0]) for k, v in _res(pe, 'RT_MENU').items()}
    strings = {}
    for bid, v in _res(pe, 'RT_STRING').items():
        b = v[0]; o = 0
        for i in range(16):
            n, = struct.unpack_from('<H', b, o); o += 2
            if n: strings[(bid - 1) * 16 + i] = b[o:o + n * 2].decode('utf-16le'); o += n * 2
    return {'menus': menus, 'strings': strings, 'pe': pe}
