//#region src/core/base/types.ts
var e = {
	None: 0,
	VoiceNone: 1,
	BalloonRoundRect: 2,
	BalloonSizeToText: 4,
	BalloonAutoHide: 8,
	BalloonAutoPace: 16,
	VoiceTTS: 32,
	SystemChar: 64
}, t = {
	Complete: 0,
	Failed: 1,
	Pending: 2,
	Interrupted: 3,
	InProgress: 4
}, n = {
	"0x0409": "en-US",
	"0x0009": "en-US",
	"0x0809": "en-GB",
	"0x040c": "fr-FR",
	"0x0407": "de-DE",
	"0x0410": "it-IT",
	"0x040a": "es-ES",
	"0x0c0a": "es-ES",
	"0x0411": "ja-JP",
	"0x0412": "ko-KR",
	"0x0404": "zh-TW",
	"0x0804": "zh-CN",
	"0x0416": "pt-BR",
	"0x0816": "pt-PT",
	"0x0419": "ru-RU",
	"0x0401": "ar-SA",
	"0x040d": "he-IL",
	"0x041e": "th-TH",
	"0x042d": "eu-ES",
	"0x041a": "hr-HR",
	"0x0405": "cs-CZ",
	"0x0406": "da-DK",
	"0x0413": "nl-NL",
	"0x040b": "fi-FI",
	"0x040e": "hu-HU",
	"0x0414": "nb-NO",
	"0x0415": "pl-PL",
	"0x0418": "ro-RO",
	"0x041b": "sk-SK",
	"0x0424": "sl-SI",
	"0x041d": "sv-SE",
	"0x041f": "tr-TR",
	"0x0408": "el-GR"
}, r = class t {
	currentAgent = {
		character: {
			infos: [],
			guid: "",
			width: 0,
			height: 0,
			transparency: 0,
			defaultFrameDuration: 0,
			style: 0,
			colorTable: ""
		},
		animations: {},
		states: {},
		balloon: {
			numLines: 0,
			charsPerLine: 0,
			fontName: "Arial",
			fontHeight: 12,
			foreColor: "000000",
			backColor: "ffffff",
			borderColor: "000000"
		}
	};
	currentCharacter = null;
	currentLanguageInfo = null;
	currentAnimation = null;
	currentFrame = null;
	currentState = null;
	static async load(e, n) {
		let r = await fetch(e, { signal: n });
		if (!r.ok) throw Error(`Failed to load .acd file: ${r.statusText}`);
		let i = await r.text();
		return new t().parse(i);
	}
	parse(e) {
		e.charCodeAt(0) === 65279 && (e = e.slice(1));
		let t = e.split(/\r\n|\r|\n/);
		for (let e = 0; e < t.length; e++) {
			let n = t[e].trim(), r = n.toLowerCase();
			if (!(!n || n.startsWith("//"))) {
				if (r.startsWith("definecharacter")) {
					e = this.parseCharacterSection(t, e);
					continue;
				}
				if (r.startsWith("defineballoon")) {
					e = this.parseBalloonSection(t, e);
					continue;
				}
				if (r.startsWith("defineanimation")) {
					e = this.parseAnimationSection(t, e);
					continue;
				}
				if (r.startsWith("definestate")) {
					e = this.parseStateSection(t, e);
					continue;
				}
			}
		}
		return this.currentAgent;
	}
	parseCharacterSection(e, t) {
		for (this.currentCharacter = this.currentAgent.character, t++; t < e.length && e[t].trim().toLowerCase() !== "endcharacter";) {
			let n = e[t].trim(), r = n.toLowerCase();
			r.startsWith("defineinfo") && (t = this.parseCharacterInfo(e, t)), r === "endinfo" && (this.currentLanguageInfo &&= (this.currentCharacter.infos.push(this.currentLanguageInfo), null));
			let i = n.split("=");
			if (i.length >= 2) {
				let e = i[0].trim().toUpperCase(), t = i.slice(1).join("=").trim().replace(/"/g, "");
				switch (e) {
					case "GUID":
						this.currentCharacter.guid = t.replace(/{|}/g, "");
						break;
					case "WIDTH":
						this.currentCharacter.width = parseInt(t, 10);
						break;
					case "HEIGHT":
						this.currentCharacter.height = parseInt(t, 10);
						break;
					case "TRANSPARENCY":
						this.currentCharacter.transparency = parseInt(t, 10);
						break;
					case "DEFAULTFRAMEDURATION":
						this.currentCharacter.defaultFrameDuration = parseInt(t, 10);
						break;
					case "STYLE":
						this.currentCharacter.style = this.parseStyle(t);
						break;
					case "COLORTABLE":
						this.currentCharacter.colorTable = t.replace(/\\/g, "/");
						break;
					case "ICON":
						this.currentCharacter.icon = t.replace(/\\/g, "/");
						break;
					case "TTSENGINEID":
						this.currentCharacter.ttsEngineID = t.replace(/{|}/g, "");
						break;
					case "TTSMODEID":
						this.currentCharacter.ttsModeID = t.replace(/{|}/g, "");
						break;
					case "TTSLANGID":
						this.currentCharacter.ttsLangID = t;
						break;
					case "TTSGENDER":
						this.currentCharacter.ttsGender = parseInt(t, 10);
						break;
					case "TTSAGE":
						this.currentCharacter.ttsAge = parseInt(t, 10);
						break;
					case "TTSSTYLE":
						this.currentCharacter.ttsStyle = t;
						break;
				}
			}
			t++;
		}
		return this.currentAgent.character = this.currentCharacter, t;
	}
	parseCharacterInfo(e, t) {
		let r = e[t].trim().match(/0x([0-9A-Fa-f]{4})/);
		if (!r) return t;
		let i = `0x${r[1].toLowerCase()}`, a = n[i] || "en-US";
		for (this.currentLanguageInfo = {
			languageCode: i,
			locale: new Intl.Locale(a),
			name: "",
			description: "",
			greetings: [],
			reminders: []
		}, t++; t < e.length && e[t].trim().toLowerCase() !== "endinfo";) {
			let n = e[t].trim().split("=");
			if (n.length >= 2) {
				let e = n[0].trim().toUpperCase(), t = n.slice(1).join("=").trim().replace(/"/g, "");
				switch (e) {
					case "NAME":
						this.currentLanguageInfo.name = t;
						break;
					case "DESCRIPTION":
						this.currentLanguageInfo.description = t;
						break;
					case "EXTRADATA":
						this.parseExtraData(t, this.currentLanguageInfo);
						break;
				}
			}
			t++;
		}
		return this.currentLanguageInfo && this.currentCharacter && (this.currentCharacter.infos.push(this.currentLanguageInfo), this.currentLanguageInfo = null), t;
	}
	parseExtraData(e, t) {
		let n = e.split("^^");
		t.greetings = n[0].split("~~").map((e) => e.trim()).filter((e) => e !== ""), n.length > 1 ? t.reminders = n[1].split("~~").map((e) => e.trim()).filter((e) => e !== "") : t.reminders = [];
	}
	parseStyle(t) {
		let n = e.None, r = t.split("|");
		for (let t of r) {
			let r = t.trim();
			r === "AXS_VOICE_NONE" ? n |= e.VoiceNone : r === "AXS_VOICE_TTS" ? n |= e.VoiceTTS : r === "AXS_BALLOON_ROUNDRECT" ? n |= e.BalloonRoundRect : r === "AXS_BALLOON_SIZE_TO_TEXT" || r === "AXS_BALLOON_SIZETOTEXT" ? n |= e.BalloonSizeToText : r === "AXS_BALLOON_AUTO_HIDE" ? n |= e.BalloonAutoHide : r === "AXS_BALLOON_AUTO_PACE" ? n |= e.BalloonAutoPace : r === "AXS_SYSTEM_CHAR" && (n |= e.SystemChar);
		}
		return n;
	}
	parseBalloonSection(e, t) {
		let n = this.currentAgent.balloon;
		for (t++; t < e.length && e[t].trim().toLowerCase() !== "endballoon";) {
			let r = e[t].trim().split("=");
			if (r.length >= 2) {
				let e = r[0].trim().toUpperCase(), t = r.slice(1).join("=").trim();
				switch (e) {
					case "NUMLINES":
						n.numLines = parseInt(t, 10);
						break;
					case "CHARSPERLINE":
						n.charsPerLine = parseInt(t, 10);
						break;
					case "FONTNAME":
						n.fontName = t.replace(/"/g, "");
						break;
					case "FONTHEIGHT":
						n.fontHeight = parseInt(t, 10);
						break;
					case "FORECOLOR":
						n.foreColor = t;
						break;
					case "BACKCOLOR":
						n.backColor = t;
						break;
					case "BORDERCOLOR":
						n.borderColor = t;
						break;
					case "FONTWEIGHT":
						n.fontWeight = parseInt(t, 10);
						break;
					case "ITALIC": {
						let e = t.toLowerCase();
						n.italic = e === "1" || e === "true" || e === "on";
						break;
					}
				}
			}
			t++;
		}
		return t;
	}
	parseAnimationSection(e, t) {
		let n = e[t].trim().match(/DefineAnimation\s+"([^"]+)"/i);
		if (!n) return t;
		for (this.currentAnimation = {
			name: n[1],
			transitionType: 0,
			frames: []
		}, t++; t < e.length && e[t].trim().toLowerCase() !== "endanimation";) {
			let n = e[t].trim(), r = n.toLowerCase();
			if (r.startsWith("transitiontype")) {
				let e = n.split("=")[1].trim();
				this.currentAnimation.transitionType = parseInt(e, 10);
			} else r.startsWith("defineframe") && (t = this.parseFrameSection(e, t));
			t++;
		}
		return this.currentAnimation && this.currentAgent.animations && (this.currentAgent.animations[this.currentAnimation.name] = this.currentAnimation), t;
	}
	parseFrameSection(e, t) {
		for (this.currentFrame = {
			duration: 0,
			images: []
		}, t++; t < e.length && e[t].trim().toLowerCase() !== "endframe";) {
			let n = e[t].trim(), r = n.toLowerCase();
			if (r.startsWith("duration")) {
				let e = n.split("=")[1].trim();
				this.currentFrame.duration = parseInt(e, 10);
			} else if (r.startsWith("exitbranch")) {
				let e = n.split("=")[1].trim();
				this.currentFrame.exitBranch = parseInt(e, 10);
			} else if (r.startsWith("soundeffect")) {
				let e = n.split("=")[1].trim().replace(/"/g, "");
				this.currentFrame.soundEffect = e.replace(/\\/g, "/");
			} else r.startsWith("defineimage") ? t = this.parseImageSection(e, t) : r.startsWith("definemouth") ? t = this.parseMouthSection(e, t) : r.startsWith("definebranching") && (t = this.parseBranchingSection(e, t));
			t++;
		}
		return this.currentFrame && this.currentAnimation && this.currentAnimation.frames.push(this.currentFrame), t;
	}
	parseMouthSection(e, t) {
		let n = {
			type: "",
			filename: "",
			offsetX: 0,
			offsetY: 0
		};
		for (t++; t < e.length && e[t].trim().toLowerCase() !== "endmouth";) {
			let r = e[t].trim().split("=");
			if (r.length >= 2) {
				let e = r[0].trim().toUpperCase(), t = r.slice(1).join("=").trim().replace(/"/g, "");
				switch (e) {
					case "TYPE":
						n.type = t;
						break;
					case "FILENAME":
						n.filename = t.replace(/\\/g, "/");
						break;
					case "OFFSETX":
						n.offsetX = parseInt(t, 10);
						break;
					case "OFFSETY":
						n.offsetY = parseInt(t, 10);
						break;
				}
			}
			t++;
		}
		return this.currentFrame && (this.currentFrame.mouths || (this.currentFrame.mouths = []), this.currentFrame.mouths.push(n)), t;
	}
	parseImageSection(e, t) {
		let n = {
			filename: "",
			offsetX: 0,
			offsetY: 0
		};
		for (t++; t < e.length && e[t].trim().toLowerCase() !== "endimage";) {
			let r = e[t].trim().split("=");
			if (r.length >= 2) {
				let e = r[0].trim().toUpperCase(), t = r.slice(1).join("=").trim().replace(/"/g, "");
				switch (e) {
					case "FILENAME":
						n.filename = t.replace(/\\/g, "/");
						break;
					case "OFFSETX":
						n.offsetX = parseInt(t, 10);
						break;
					case "OFFSETY":
						n.offsetY = parseInt(t, 10);
						break;
				}
			}
			t++;
		}
		return this.currentFrame && this.currentFrame.images.push(n), t;
	}
	parseBranchingSection(e, t) {
		let n = [], r = {};
		for (t++; t < e.length && e[t].trim().toLowerCase() !== "endbranching";) {
			let i = e[t].trim().split("=");
			if (i.length >= 2) {
				let e = i[0].trim().toUpperCase(), t = parseInt(i.slice(1).join("=").trim(), 10);
				switch (e) {
					case "BRANCHTO":
						r.branchTo = t;
						break;
					case "PROBABILITY":
						r.probability = t;
						break;
				}
			}
			r.branchTo !== void 0 && r.probability !== void 0 && (n.push(r), r = {}), t++;
		}
		return this.currentFrame && (this.currentFrame.branching = n), t;
	}
	parseStateSection(e, t) {
		let n = e[t].trim().match(/DefineState\s+"([^"]+)"/i);
		if (!n) return t;
		for (this.currentState = {
			name: n[1],
			animations: []
		}, t++; t < e.length && e[t].trim().toLowerCase() !== "endstate";) {
			let n = e[t].trim().split("=");
			n.length >= 2 && n[0].trim().toLowerCase() === "animation" && this.currentState.animations.push(n.slice(1).join("=").trim().replace(/"/g, "")), t++;
		}
		return this.currentState && this.currentAgent.states && (this.currentAgent.states[this.currentState.name] = this.currentState), t;
	}
};
//#endregion
//#region src/utils.ts
async function i(e, t = {}) {
	let { signal: n, onProgress: r } = t, i = await fetch(e, { signal: n });
	if (!i.ok || !r || !i.body) return i;
	let a = i.headers.get("content-length"), o = a ? parseInt(a, 10) : 0, s = e.split("/").pop() || e, c = i.body.getReader(), l = 0, u = new ReadableStream({
		async start(e) {
			try {
				for (;;) {
					let { done: t, value: n } = await c.read();
					if (t) break;
					l += n.byteLength, r({
						loaded: l,
						total: o,
						filename: s
					}), e.enqueue(n);
				}
				e.close();
			} catch (t) {
				e.error(t);
			}
		},
		cancel(e) {
			c.cancel(e);
		}
	});
	return new Response(u, {
		headers: i.headers,
		status: i.status,
		statusText: i.statusText
	});
}
function a(e) {
	if (e.startsWith("#")) return e;
	let t = e.replace(/^0x/, "");
	if (/^\d+$/.test(t) && (t = parseInt(t, 10).toString(16).padStart(6, "0")), t.length === 8) {
		let e = t.substring(2, 4), n = t.substring(4, 6);
		return `#${t.substring(6, 8)}${n}${e}`;
	}
	if (t.length === 6) {
		let e = t.substring(0, 2), n = t.substring(2, 4);
		return `#${t.substring(4, 6)}${n}${e}`;
	}
	return `#${t}`;
}
function o(e) {
	let t = e.trim();
	return t ? /[.!?:;,]$/.test(t) ? e : `${e}.` : "";
}
//#endregion
//#region src/core/resources/Cache.ts
var s = class {
	static definitions = /* @__PURE__ */ new Map();
	static sprites = /* @__PURE__ */ new Map();
	static audioBuffers = /* @__PURE__ */ new Map();
	static getDefinition(e) {
		return this.definitions.get(e);
	}
	static setDefinition(e, t) {
		this.definitions.set(e, t);
	}
	static getSprite(e) {
		return this.sprites.get(e);
	}
	static setSprite(e, t) {
		this.sprites.set(e, t);
	}
	static getAudioBuffer(e) {
		return this.audioBuffers.get(e);
	}
	static setAudioBuffer(e, t) {
		this.audioBuffers.set(e, t);
	}
	static clearMemory() {
		this.definitions.clear(), this.sprites.clear(), this.audioBuffers.clear();
	}
}, c = class {
	sprites = /* @__PURE__ */ new Map();
	transparencyColor = null;
	agentRoot;
	definition;
	spriteSheet = null;
	options;
	constructor(e, t, n = {}) {
		this.agentRoot = e, this.definition = t, this.options = {
			useCache: !0,
			...n
		};
	}
	async init() {
		this.definition.atlas ? await this.loadSpriteSheet() : await this.loadTransparencyColor();
	}
	async loadSpriteSheet() {
		for (let e of ["webp", "png"]) try {
			let t = `${this.agentRoot}/agent.${e}`;
			if (this.options.useCache) {
				let e = s.getSprite(t);
				if (e) {
					this.spriteSheet = e;
					return;
				}
			}
			let n;
			try {
				n = await i(t, {
					signal: this.options.signal,
					onProgress: this.options.onProgress
				});
			} catch {
				n = { ok: !1 };
			}
			if (!n.ok) continue;
			let r = await n.blob(), a = URL.createObjectURL(r);
			await new Promise((e, n) => {
				let r = new Image();
				r.onload = () => {
					this.spriteSheet = r, this.options.useCache && s.setSprite(t, r), URL.revokeObjectURL(a), e();
				}, r.onerror = () => {
					URL.revokeObjectURL(a), n();
				}, r.src = a;
			});
			return;
		} catch (e) {
			if (e instanceof Error && e.name === "AbortError") throw e;
		}
		throw Error("Failed to load sprite sheet (tried webp, png)");
	}
	async loadTransparencyColor() {
		let e = this.definition.character.colorTable, t = [];
		if (e.startsWith("http")) t.push(e);
		else {
			let n = e.replace(/\\/g, "/");
			t.push(`${this.agentRoot}/${n}`), t.push(`${this.agentRoot}/${n.toLowerCase()}`);
			let r = n.split("/").pop() || "ColorTable.bmp";
			t.push(`${this.agentRoot}/${r}`), t.push(`${this.agentRoot}/${r.toLowerCase()}`), t.push(`${this.agentRoot}/Images/${r}`), t.push(`${this.agentRoot}/images/${r.toLowerCase()}`);
		}
		let n = null;
		for (let e of t) try {
			let t = await fetch(e, { signal: this.options.signal });
			if (t.ok) {
				let e = t.headers.get("content-type");
				if (e && e.includes("text/html")) continue;
				n = t;
				break;
			}
		} catch {}
		if (!n || !n.ok) throw Error(`Failed to load color table. Tried: ${t.join(", ")}`);
		let r = await n.arrayBuffer();
		this.transparencyColor = this.getPaletteColor(r, this.definition.character.transparency);
	}
	getPaletteColor(e, t) {
		let n = new DataView(e), r = n.getUint16(0, !0);
		if (r !== 19778) throw Error(`Not a BMP file, magic: 0x${r.toString(16)}`);
		let i = 14 + n.getUint32(14, !0) + t * 4;
		if (i + 3 > e.byteLength) throw Error("Palette index out of range");
		return {
			b: n.getUint8(i),
			g: n.getUint8(i + 1),
			r: n.getUint8(i + 2)
		};
	}
	async loadFrameSprites(e) {
		let t = [];
		e.images.forEach((e) => t.push(this.loadSprite(e.filename))), e.mouths && e.mouths.forEach((e) => t.push(this.loadSprite(e.filename))), await Promise.all(t);
	}
	async loadSprite(e) {
		if (this.sprites.has(e) || this.spriteSheet) return;
		let t = [];
		if (e.startsWith("http")) t.push(e);
		else {
			let n = e.replace(/\\/g, "/"), r = n.split("/").pop() || "";
			t.push(`${this.agentRoot}/${n}`), t.push(`${this.agentRoot}/${n.toLowerCase()}`), t.push(`${this.agentRoot}/Images/${r}`), t.push(`${this.agentRoot}/images/${r.toLowerCase()}`), t.push(`${this.agentRoot}/${r}`), t.push(`${this.agentRoot}/${r.toLowerCase()}`);
		}
		let n = null;
		for (let r of t) try {
			if (this.options.useCache) {
				let t = s.getSprite(r);
				if (t) {
					this.sprites.set(e, t);
					return;
				}
			}
			let t = await fetch(r);
			if (t.ok) {
				let e = t.headers.get("content-type");
				if (e && e.includes("text/html")) continue;
				n = t;
				break;
			}
		} catch {}
		if (!n || !n.ok) throw Error(`Failed to load sprite ${e}. Tried: ${t.join(", ")}`);
		let r = await n.arrayBuffer(), i = this.bmpToCanvas(r);
		if (this.sprites.set(e, i), this.options.useCache) {
			let e = n.url;
			s.setSprite(e, i);
		}
	}
	bmpToCanvas(e) {
		let t = new DataView(e), n = t.getUint16(0, !0);
		if (n !== 19778) throw Error(`Not a BMP file, magic: 0x${n.toString(16)}`);
		let r = t.getInt32(18, !0), i = Math.abs(t.getInt32(22, !0)), a = t.getInt32(22, !0) > 0, o = t.getUint16(28, !0);
		if (o !== 8 && o !== 24 && o !== 32) throw Error(`Unsupported BMP bit count: ${o}-bit. Supported: 8, 24, 32.`);
		let s = t.getUint32(10, !0), c = t.getUint32(14, !0), l = document.createElement("canvas");
		l.width = r, l.height = i;
		let u = l.getContext("2d"), d = u.createImageData(r, i);
		if (o === 8) {
			let e = 14 + c, n = [];
			for (let r = 0; r < 256; r++) {
				let i = e + r * 4;
				n.push({
					b: t.getUint8(i),
					g: t.getUint8(i + 1),
					r: t.getUint8(i + 2)
				});
			}
			let o = Math.floor((8 * r + 31) / 32) * 4;
			for (let e = 0; e < i; e++) for (let c = 0; c < r; c++) {
				let l = s + (a ? i - 1 - e : e) * o + c, u = n[t.getUint8(l)], f = (e * r + c) * 4;
				this.setPixel(d, f, u.r, u.g, u.b);
			}
		} else if (o === 24) {
			let e = Math.floor((24 * r + 31) / 32) * 4;
			for (let n = 0; n < i; n++) for (let o = 0; o < r; o++) {
				let c = s + (a ? i - 1 - n : n) * e + o * 3, l = t.getUint8(c), u = t.getUint8(c + 1), f = t.getUint8(c + 2), p = (n * r + o) * 4;
				this.setPixel(d, p, f, u, l);
			}
		} else if (o === 32) for (let e = 0; e < i; e++) for (let n = 0; n < r; n++) {
			let o = s + ((a ? i - 1 - e : e) * r + n) * 4, c = t.getUint8(o), l = t.getUint8(o + 1), u = t.getUint8(o + 2), f = (e * r + n) * 4;
			this.setPixel(d, f, u, l, c);
		}
		return u.putImageData(d, 0, 0), l;
	}
	setPixel(e, t, n, r, i) {
		e.data[t] = n, e.data[t + 1] = r, e.data[t + 2] = i, this.transparencyColor && n === this.transparencyColor.r && r === this.transparencyColor.g && i === this.transparencyColor.b ? e.data[t + 3] = 0 : e.data[t + 3] = 255;
	}
	drawFrame(e, t, n, r, i = 1, a = null) {
		if (t.images) {
			for (let a = t.images.length - 1; a >= 0; a--) {
				let o = t.images[a];
				if (this.spriteSheet && this.definition.atlas) {
					let t = this.definition.atlas[o.filename];
					if (t) {
						let a = t.trimX || 0, s = t.trimY || 0;
						e.drawImage(this.spriteSheet, t.x, t.y, t.w, t.h, n + (o.offsetX + a) * i, r + (o.offsetY + s) * i, t.w * i, t.h * i);
						continue;
					}
				}
				let s = this.sprites.get(o.filename);
				s && e.drawImage(s, n + o.offsetX * i, r + o.offsetY * i, s.width * i, s.height * i);
			}
			a && t.mouths && this.drawMouth(e, t, a, n, r, i);
		}
	}
	drawMouth(e, t, n, r, i, a) {
		let o = t.mouths?.find((e) => e.type === n);
		if (!o) return;
		if (this.spriteSheet && this.definition.atlas) {
			let t = this.definition.atlas[o.filename];
			if (t) {
				let n = t.trimX || 0, s = t.trimY || 0;
				e.drawImage(this.spriteSheet, t.x, t.y, t.w, t.h, r + (o.offsetX + n) * a, i + (o.offsetY + s) * a, t.w * a, t.h * a);
				return;
			}
		}
		let s = this.sprites.get(o.filename);
		s && e.drawImage(s, r + o.offsetX * a, i + o.offsetY * a, s.width * a, s.height * a);
	}
	getSpriteWidth() {
		return this.definition.character.width;
	}
	getSpriteHeight() {
		return this.definition.character.height;
	}
}, l = class {
	listeners = /* @__PURE__ */ new Map();
	on(e, t) {
		this.listeners.has(e) || this.listeners.set(e, /* @__PURE__ */ new Set()), this.listeners.get(e).add(t);
	}
	off(e, t) {
		this.listeners.get(e)?.delete(t);
	}
	emit(e, ...t) {
		this.listeners.get(e)?.forEach((e) => e(...t));
	}
	clear() {
		this.listeners.clear();
	}
}, u = class {
	_currentState;
	_context;
	_config;
	_options;
	constructor(e, t = {}) {
		this._config = e, this._context = { ...e.context }, this._currentState = e.initial, this._options = t;
	}
	get state() {
		return this._currentState;
	}
	get context() {
		return this._context;
	}
	send(e) {
		let t = this._config.states[this._currentState];
		if (!t || !t.on) return !1;
		let n = t.on[e.type];
		if (!n) return !1;
		if (typeof n == "string") return this.transitionTo(n, e), !0;
		if (Array.isArray(n)) {
			for (let t of n) if (this.executeTransition(t, e)) return !0;
			return !1;
		}
		return this.executeTransition(n, e);
	}
	executeTransition(e, t) {
		if (e.cond) {
			let n = typeof e.cond == "string" ? this._options.guards?.[e.cond] : e.cond;
			if (!n || !n(this._context, t)) return !1;
		}
		return e.actions && e.actions.forEach((e) => {
			let n = this._options.actions?.[e];
			typeof n == "function" && n(this._context, t);
		}), e.target && this.transitionTo(e.target, t), !0;
	}
	transitionTo(e, t) {
		(this._config.states[this._currentState]?.exit)?.forEach((e) => {
			let n = this._options.actions?.[e];
			typeof n == "function" && n(this._context, t);
		}), this._currentState = e, (this._config.states[this._currentState]?.entry)?.forEach((e) => {
			let n = this._options.actions?.[e];
			typeof n == "function" && n(this._context, t);
		});
	}
}, d = class extends l {
	spriteManager;
	audioManager;
	animations;
	machine;
	activePromise = null;
	scale = 2;
	currentViseme = null;
	get currentAnimationName() {
		return this.machine.context.currentAnimation?.name || "";
	}
	get isExitingFlag() {
		return this.machine.state === "Exiting";
	}
	set isExitingFlag(e) {
		e && this.machine.state === "Playing" && this.machine.send({ type: "INTERRUPT" });
	}
	get currentFrameIndexValue() {
		return this.machine.context.currentFrameIndex;
	}
	get playbackState() {
		return this.machine.state;
	}
	constructor(e, t, n) {
		super(), this.spriteManager = e, this.audioManager = t, this.animations = n, this.machine = new u({
			initial: "Idle",
			context: {
				currentAnimation: null,
				currentFrameIndex: 0,
				lastFrameTime: 0,
				lastRenderedFrame: null,
				isLooping: !1,
				animationPromise: null,
				exitHistory: /* @__PURE__ */ new Set()
			},
			states: {
				Idle: { on: { PLAY: [{
					target: "Exiting",
					cond: "shouldStartExiting",
					actions: ["setupAnimation"]
				}, {
					target: "Playing",
					actions: ["setupAnimation"]
				}] } },
				Playing: { on: {
					TICK: { actions: ["processTick"] },
					INTERRUPT: "Exiting",
					STOP: "Idle",
					PLAY: [{
						target: "Exiting",
						cond: "shouldStartExiting",
						actions: ["setupAnimation"]
					}, {
						target: "Playing",
						actions: ["setupAnimation"]
					}]
				} },
				Exiting: { on: {
					TICK: { actions: ["processTick"] },
					STOP: "Idle",
					PLAY: [{
						target: "Exiting",
						cond: "shouldStartExiting",
						actions: ["setupAnimation"]
					}, {
						target: "Playing",
						actions: ["setupAnimation"]
					}]
				} }
			}
		}, {
			guards: { shouldStartExiting: (e, t) => t.type === "PLAY" && !!t.useExitBranch },
			actions: {
				setupAnimation: (e, t) => {
					if (t.type !== "PLAY") return;
					let n = e.currentAnimation?.name || "";
					e.currentAnimation = t.animation, e.currentFrameIndex = 0, e.lastFrameTime = performance.now(), e.isLooping = !!t.loop, e.exitHistory.clear(), n && n !== t.animation.name && this.emit("animationCompleted", n), this.emit("animationStarted", t.animation.name), this.checkAndPlaySound(e.currentAnimation.frames[0]);
				},
				processTick: (e, t) => {
					t.type === "TICK" && this.runTick(e, t.currentTime);
				}
			}
		});
	}
	supportsSpeech(e) {
		let t = e || this.currentAnimationName, n = this.animations[t];
		return n ? n.frames.some((e) => !!e.mouths && e.mouths.length > 0) : !1;
	}
	currentFrameHasMouths() {
		let e = this.currentFrame;
		return !!e?.mouths && e.mouths.length > 0;
	}
	runTick(e, t) {
		if (!e.currentAnimation || e.currentAnimation.frames.length === 0) return;
		let n = 0;
		for (; e.currentAnimation && n <= 100;) {
			let r = e.currentAnimation.frames[e.currentFrameIndex];
			if (r.duration === 0) {
				let { index: i, isBranch: a } = this.getNextFrameDetails(e, r);
				if (this.checkAnimationCompletion(e, r, i, a)) return;
				if (!a && this.machine.state !== "Exiting") break;
				if (e.currentFrameIndex = i, e.lastFrameTime = t, this.emit("frameChanged"), this.checkAndPlaySound(e.currentAnimation.frames[e.currentFrameIndex]), n++, n > 100) {
					console.warn(`MSAgentJS: Infinite loop detected in animation '${e.currentAnimation?.name}'. Safety break at frame ${e.currentFrameIndex}.`);
					break;
				}
				continue;
			}
			if (t - e.lastFrameTime >= r.duration * 10) {
				let { index: i, isBranch: a } = this.getNextFrameDetails(e, r);
				if (this.checkAnimationCompletion(e, r, i, a)) return;
				e.currentFrameIndex = i, e.lastFrameTime = t, this.emit("frameChanged"), this.checkAndPlaySound(e.currentAnimation.frames[e.currentFrameIndex]), n++;
				continue;
			}
			break;
		}
	}
	get currentFrame() {
		let e = this.machine.context;
		if (!e.currentAnimation || e.currentAnimation.frames.length === 0) return e.lastRenderedFrame;
		let t = e.currentAnimation.frames[e.currentFrameIndex];
		return t.duration === 0 ? e.lastRenderedFrame : t;
	}
	get isAnimating() {
		return this.machine.state !== "Idle";
	}
	setAnimation(e, t = !1, n = !1) {
		let r = this.animations[e];
		r ? (this.machine.send({
			type: "PLAY",
			animation: r,
			useExitBranch: t,
			loop: n
		}), this.update(this.machine.context.lastFrameTime)) : this.machine.send({ type: "STOP" });
	}
	async playAnimation(e, t = !1, n = !1) {
		return this.activePromise = new Promise((r, i) => {
			this.machine.context.animationPromise = {
				resolve: r,
				reject: i
			}, this.setAnimation(e, t, n);
		}), this.activePromise;
	}
	update(e = performance.now()) {
		this.machine.send({
			type: "TICK",
			currentTime: e
		});
	}
	setViseme(e) {
		this.currentViseme = e;
	}
	checkAnimationCompletion(e, t, n, r) {
		if (this.machine.state === "Exiting") {
			if (n === 0) return this.completeAnimation(e), !0;
		} else {
			if (t.duration === 0 && t.exitBranch !== void 0 && !r) return this.machine.send({ type: "INTERRUPT" }), !1;
			if (!r && n === 0 && e.animationPromise) return e.isLooping ? !1 : (this.completeAnimation(e), !0);
		}
		return !1;
	}
	getNextFrameDetails(e, t) {
		let n = (e.currentFrameIndex + 1) % e.currentAnimation.frames.length, r = this.machine.state === "Exiting";
		if (r) {
			if (e.exitHistory.has(e.currentFrameIndex)) return {
				index: n,
				isBranch: !1
			};
			if (e.exitHistory.add(e.currentFrameIndex), t.exitBranch !== void 0) return {
				index: t.exitBranch - 1,
				isBranch: !0
			};
			if (t.duration === 0 && e.lastRenderedFrame?.exitBranch !== void 0) return {
				index: e.lastRenderedFrame.exitBranch - 1,
				isBranch: !0
			};
		}
		let i = t.branching || [], a = r && i.some((t) => t.branchTo - 1 > e.currentFrameIndex || t.branchTo - 1 == 0);
		if (i.length > 0 && (!r || a)) {
			let t = Math.floor(Math.random() * 100), n = 0;
			for (let a of i) if (!(r && !(a.branchTo - 1 > e.currentFrameIndex || a.branchTo - 1 == 0 && e.currentFrameIndex > 0)) && (n += a.probability, t < n)) return {
				index: a.branchTo - 1,
				isBranch: !0
			};
		}
		return {
			index: n,
			isBranch: !1
		};
	}
	async interruptAndPlayAnimation(e, t = !1, n = !1) {
		return this.isAnimating ? (this.activePromise ||= new Promise((e, t) => {
			this.machine.context.animationPromise = {
				resolve: e,
				reject: t
			};
		}), this.isExitingFlag = !0, this.activePromise && await this.activePromise, this.playAnimation(e, t, n)) : this.playAnimation(e, t, n);
	}
	completeAnimation(e) {
		let t = e.currentAnimation?.name || "";
		e.animationPromise && (e.animationPromise.resolve(!0), e.animationPromise = null, this.activePromise = null), e.currentAnimation = null, this.machine.send({ type: "STOP" }), this.emit("animationCompleted", t);
	}
	checkAndPlaySound(e) {
		e && e.duration > 0 && (this.machine.context.lastRenderedFrame = e), e?.soundEffect && this.audioManager.playFrameSound(e.soundEffect);
	}
	draw(e, t, n, r = this.scale) {
		let i = this.currentFrame;
		i && this.spriteManager.drawFrame(e, i, t, n, r, this.currentViseme);
	}
	async preloadAnimation(e) {
		let t = this.animations[e];
		if (!t) return;
		let n = [];
		for (let e of t.frames) {
			for (let t of e.images) await this.spriteManager.loadSprite(t.filename);
			e.soundEffect && n.push(e.soundEffect);
		}
		n.length > 0 && await this.audioManager.loadSounds(n);
	}
}, f = class {
	static adaptationTable = [
		230,
		230,
		230,
		230,
		307,
		409,
		512,
		614,
		768,
		614,
		512,
		409,
		307,
		230,
		230,
		230
	];
	static coeff1Table = [
		256,
		512,
		0,
		192,
		240,
		460,
		392
	];
	static coeff2Table = [
		0,
		-256,
		0,
		64,
		0,
		-208,
		-232
	];
	static decode(e) {
		let t = new DataView(e);
		if (t.getUint32(0, !0) !== 1179011410) throw Error("Not a RIFF file");
		if (t.getUint32(8, !0) !== 1163280727) throw Error("Not a WAVE file");
		let n = 12, r = {}, i = 0, a = 0;
		for (; n < e.byteLength;) {
			let e = t.getUint32(n, !0), o = t.getUint32(n + 4, !0);
			n += 8, e === 544501094 ? (r.audioFormat = t.getUint16(n, !0), r.numChannels = t.getUint16(n + 2, !0), r.sampleRate = t.getUint32(n + 4, !0), r.byteRate = t.getUint32(n + 8, !0), r.blockAlign = t.getUint16(n + 12, !0), r.bitsPerSample = t.getUint16(n + 14, !0), o > 16 && (r.cbSize = t.getUint16(n + 16, !0), r.samplesPerBlock = t.getUint16(n + 18, !0))) : e === 1635017060 && (i = n, a = o), n += o, o % 2 != 0 && n++;
		}
		if (r.audioFormat !== 2) throw Error(`Unsupported audio format: ${r.audioFormat}. Only MS ADPCM (2) is supported.`);
		let o = Math.floor(a / r.blockAlign), s = r.samplesPerBlock, c = o * s, l = new Float32Array(c), u = 0;
		for (let e = 0; e < o; e++) {
			let n = i + e * r.blockAlign;
			this.decodeBlock(t, n, r, l, u), u += s;
		}
		return {
			samples: l,
			sampleRate: r.sampleRate,
			channels: r.numChannels
		};
	}
	static decodeBlock(e, t, n, r, i) {
		if (n.numChannels === 1) this.decodeMonoBlock(e, t, n, r, i);
		else throw Error("Stereo MS ADPCM not implemented");
	}
	static decodeMonoBlock(e, t, n, r, i) {
		let a = e.getUint8(t), o = e.getInt16(t + 1, !0), s = e.getInt16(t + 3, !0), c = e.getInt16(t + 5, !0), l = this.coeff1Table[a], u = this.coeff2Table[a];
		r[i++] = c / 32768, r[i++] = s / 32768;
		let d = t + 7, f = n.samplesPerBlock - 2;
		for (let t = 0; t < f; t++) {
			let n;
			n = t % 2 == 0 ? e.getUint8(d) >> 4 : e.getUint8(d++) & 15, n & 8 && (n -= 16);
			let a = Math.floor((s * l + c * u) / 256);
			a += n * o;
			let f = Math.max(-32768, Math.min(32767, a));
			r[i++] = f / 32768, c = s, s = f, o = Math.floor(this.adaptationTable[n + (n < 0 ? 16 : 0)] * o / 256), o < 16 && (o = 16);
		}
	}
}, p = class e {
	static sharedAudioContext = null;
	soundBuffers = /* @__PURE__ */ new Map();
	loadingPromises = /* @__PURE__ */ new Map();
	audioPath;
	baseUrl;
	enabled = !0;
	audioAtlas = null;
	spritesheetBuffer = null;
	spritesheetLoadingPromise = null;
	options;
	constructor(e, t = {}) {
		this.baseUrl = e.replace(/\/$/, ""), this.audioPath = `${this.baseUrl}/Audio`, this.options = {
			useCache: !0,
			...t
		};
	}
	setEnabled(e) {
		this.enabled = e;
	}
	setAudioAtlas(e) {
		this.audioAtlas = e;
	}
	getContext() {
		return e.sharedAudioContext ||= new (window.AudioContext || window.webkitAudioContext)(), e.sharedAudioContext;
	}
	async loadSounds(e) {
		if (this.audioAtlas) {
			await this.loadSpritesheet();
			return;
		}
		let t = e.map(async (e) => {
			let t = e.split(/[\\/]/).pop() || e;
			if (this.soundBuffers.has(t)) return;
			if (this.loadingPromises.has(t)) return this.loadingPromises.get(t);
			let n = this.loadInternal(t);
			this.loadingPromises.set(t, n);
			try {
				await n;
			} finally {
				this.loadingPromises.delete(t);
			}
		});
		await Promise.all(t);
	}
	async loadInternal(e) {
		let t = this.getContext(), n = e.toLowerCase().endsWith(".wav") ? e : `${e}.wav`, r = `${this.audioPath}/${n}`;
		if (this.options.useCache) {
			let t = s.getAudioBuffer(r);
			if (t) {
				this.soundBuffers.set(e, t);
				return;
			}
		}
		try {
			let n = await fetch(r, { signal: this.options.signal });
			if (!n.ok) {
				console.warn(`Failed to load sound ${e}: ${n.statusText}`);
				return;
			}
			let i = await n.arrayBuffer(), a;
			if (this.isMSADPCM(i)) try {
				let e = f.decode(i);
				a = t.createBuffer(e.channels, e.samples.length, e.sampleRate), a.getChannelData(0).set(e.samples);
			} catch (n) {
				console.error(`Failed to decode MS ADPCM for ${e}:`, n), a = await t.decodeAudioData(i.slice(0));
			}
			else a = await t.decodeAudioData(i.slice(0));
			this.soundBuffers.set(e, a), this.options.useCache && s.setAudioBuffer(r, a);
		} catch (t) {
			console.error(`Error loading sound ${e}:`, t);
		}
	}
	async loadSpritesheet() {
		if (!this.spritesheetBuffer) return this.spritesheetLoadingPromise ||= (async () => {
			let e = this.getContext(), t = `${this.baseUrl}/agent.webm`;
			if (this.options.useCache) {
				let e = s.getAudioBuffer(t);
				if (e) {
					this.spritesheetBuffer = e;
					return;
				}
			}
			try {
				let n = await i(t, {
					signal: this.options.signal,
					onProgress: this.options.onProgress
				});
				if (!n.ok) {
					console.warn(`Failed to load audio spritesheet: ${n.statusText}`);
					return;
				}
				let r = await n.arrayBuffer();
				this.spritesheetBuffer = await e.decodeAudioData(r), this.options.useCache && s.setAudioBuffer(t, this.spritesheetBuffer);
			} catch (e) {
				if (e instanceof Error && e.name === "AbortError") throw e;
				console.error("Error loading audio spritesheet:", e);
			}
		})(), this.spritesheetLoadingPromise;
	}
	isMSADPCM(e) {
		let t = new DataView(e);
		if (e.byteLength < 20 || t.getUint32(0, !0) !== 1179011410 || t.getUint32(8, !0) !== 1163280727) return !1;
		let n = 12;
		for (; n + 8 < e.byteLength;) {
			let e = t.getUint32(n, !0), r = t.getUint32(n + 4, !0);
			if (e === 544501094) return t.getUint16(n + 8, !0) === 2;
			n += 8 + r, r % 2 != 0 && n++;
		}
		return !1;
	}
	playFrameSound(e) {
		if (!this.enabled) return;
		let t = e.split(/[\\/]/).pop() || "", n = t.toLowerCase().endsWith(".wav") ? t.toLowerCase() : `${t.toLowerCase()}.wav`;
		if (this.audioAtlas && this.spritesheetBuffer) {
			let e = this.audioAtlas[n];
			e ? this.playFromSpritesheet(e.start, e.end) : console.warn(`Sound ${n} not found in audio atlas`);
			return;
		}
		let r = this.soundBuffers.get(t) || this.soundBuffers.get(`${t}.wav`);
		if (r) {
			let e = this.getContext();
			e.state === "suspended" && e.resume();
			let t = e.createBufferSource();
			t.buffer = r, t.connect(e.destination), t.start(0);
		} else {
			if (this.loadingPromises.has(t) || this.loadingPromises.has(`${t}.wav`)) return;
			this.loadSounds([t]).then(() => {
				(this.audioAtlas && this.spritesheetBuffer || this.soundBuffers.get(t) || this.soundBuffers.get(`${t}.wav`)) && this.playFrameSound(t);
			});
		}
	}
	playFromSpritesheet(e, t) {
		if (!this.spritesheetBuffer) return;
		let n = this.getContext();
		n.state === "suspended" && n.resume();
		let r = n.createBufferSource();
		r.buffer = this.spritesheetBuffer, r.connect(n.destination), r.start(0, e, t - e);
	}
}, m = class {
	id;
	status;
	promise;
	resolveFn = () => {};
	rejectFn = () => {};
	constructor(e) {
		this.id = e, this.status = t.Pending;
		let n, r;
		if (this.promise = new Promise((e, t) => {
			n = e, r = t;
		}), !n || !r) throw Error("Promise executor did not run synchronously");
		this.resolveFn = n, this.rejectFn = r;
	}
	then(e, t) {
		return this.promise.then(e, t);
	}
	resolve() {
		this.status = t.Complete, this.resolveFn();
	}
	reject(e) {
		this.status = t.Failed, this.rejectFn(e);
	}
	get isCancelled() {
		return this.status === t.Interrupted || this.status === t.Failed;
	}
	interrupt() {
		this.status = t.Interrupted, this.resolveFn();
	}
}, h = class {
	queue = [];
	currentEntry = null;
	nextId = 1;
	add(e) {
		let t = new m(this.nextId++), n = {
			request: t,
			task: e
		};
		return this.queue.push(n), this.processNext(), t;
	}
	async processNext() {
		if (this.currentEntry || this.queue.length === 0) return;
		this.currentEntry = this.queue.shift();
		let e = this.currentEntry.request;
		e.status = t.InProgress;
		try {
			await this.currentEntry.task(e), e.status === t.InProgress && e.resolve();
		} catch (e) {
			this.currentEntry.request.reject(e);
		} finally {
			this.currentEntry = null, this.processNext();
		}
	}
	stop(e) {
		if (e === void 0) this.currentEntry && this.currentEntry.request.interrupt(), this.queue.forEach((e) => e.request.interrupt()), this.queue = [];
		else if (this.currentEntry?.request.id === e) this.currentEntry.request.interrupt();
		else {
			let t = this.queue.findIndex((t) => t.request.id === e);
			if (t !== -1) {
				let [e] = this.queue.splice(t, 1);
				e.request.interrupt();
			}
		}
	}
	get isEmpty() {
		return this.queue.length === 0 && this.currentEntry === null;
	}
	get length() {
		return this.queue.length;
	}
	get activeRequestId() {
		return this.currentEntry?.request.id ?? null;
	}
}, g = class {
	states;
	animationManager;
	requestQueue;
	machine;
	idlePrefix = "IdlingLevel";
	lastAnimationId = 0;
	wasAnimating = !1;
	constructor(e, t, n) {
		this.states = e, this.animationManager = t, this.machine = new u({
			initial: "Hidden",
			context: {
				idleTickCount: 0,
				currentIdleLevel: 1,
				elapsedSinceLastTick: 0,
				idleIntervalMs: n?.idleIntervalMs ?? 1e4,
				ticksPerLevel: n?.ticksPerLevel ?? 12,
				maxIdleLevel: n?.maxIdleLevel ?? 3,
				currentState: "Hidden"
			},
			states: {
				Hidden: {
					entry: ["setHidden"],
					on: {
						SHOW: "Showing",
						HIDE: "Hiding",
						STATE_SET: {
							target: "Persistent",
							actions: ["setStateName", "resetIdle"]
						}
					}
				},
				Showing: {
					entry: ["setShowing", "playShowAnimation"],
					on: {
						TICK: {
							target: "Persistent",
							cond: "isEffectivelyIdle",
							actions: ["resetToIdleState", "resetIdle"]
						},
						ANIMATION_END: [{
							target: "Playing",
							cond: "hasRequests"
						}, {
							target: "Persistent",
							actions: ["resetToIdleState", "resetIdle"]
						}],
						HIDE: "Hiding",
						STATE_SET: {
							target: "Persistent",
							actions: ["setStateName", "resetIdle"]
						}
					}
				},
				Hiding: {
					entry: ["setHiding", "playHideAnimation"],
					on: {
						TICK: {
							target: "Hidden",
							cond: "isEffectivelyIdle",
							actions: ["setHidden"]
						},
						ANIMATION_END: "Hidden",
						SHOW: "Showing"
					}
				},
				Persistent: {
					entry: ["updateStateAnimation"],
					on: {
						TICK: { actions: ["processTick"] },
						ANIMATION_END: [
							{
								target: "Playing",
								cond: "hasRequests"
							},
							{
								target: "Persistent",
								cond: "shouldLoopPersistent"
							},
							{ actions: ["resetToIdleState", "resetIdle"] }
						],
						PLAY: {
							target: "Playing",
							actions: ["setStateName", "resetIdle"]
						},
						HIDE: "Hiding",
						STATE_SET: {
							target: "Persistent",
							actions: ["setStateName", "resetIdle"]
						}
					}
				},
				Playing: { on: {
					TICK: {
						target: "Persistent",
						cond: "isEffectivelyIdle",
						actions: ["resetToIdleState", "resetIdle"]
					},
					ANIMATION_END: [{
						target: "Playing",
						cond: "hasRequests"
					}, {
						target: "Persistent",
						actions: ["resetToIdleState", "resetIdle"]
					}],
					PLAY: {
						target: "Playing",
						actions: ["setStateName", "resetIdle"]
					},
					HIDE: "Hiding",
					STATE_SET: {
						target: "Persistent",
						actions: ["setStateName", "resetIdle"]
					}
				} }
			}
		}, {
			guards: {
				hasRequests: () => !!this.requestQueue && !this.requestQueue.isEmpty,
				isNotAnimating: () => !this.animationManager.isAnimating,
				isEffectivelyIdle: () => !this.animationManager.isAnimating && (!this.requestQueue || this.requestQueue.isEmpty),
				shouldLoopPersistent: (e) => this.animationManager.isAnimating || e.currentState === "Speaking" || e.currentState === "Moving" ? !1 : !this.isIdleState(e.currentState)
			},
			actions: {
				setHidden: (e) => {
					e.currentState = "Hidden";
				},
				setShowing: (e) => {
					e.currentState = "Showing";
				},
				setHiding: (e) => {
					e.currentState = "Hiding";
				},
				setStateName: (e, t) => {
					t.type === "STATE_SET" ? e.currentState = t.stateName : t.type === "PLAY" && (e.currentState = t.stateName || "Playing");
				},
				resetToIdleState: (e) => {
					e.currentState = `${this.idlePrefix}1`;
				},
				resetIdle: (e) => {
					e.currentIdleLevel = 1, e.idleTickCount = 0, e.elapsedSinceLastTick = 0;
				},
				processTick: (e, t) => {
					if (t.type === "TICK") {
						if (this.requestQueue && !this.requestQueue.isEmpty) {
							e.elapsedSinceLastTick = 0;
							return;
						}
						e.elapsedSinceLastTick += t.deltaTime, e.elapsedSinceLastTick >= e.idleIntervalMs && (e.elapsedSinceLastTick = 0, this.handleIdleTick(e));
					}
				},
				updateStateAnimation: () => {
					this.updateStateAnimation().catch(console.error);
				},
				playShowAnimation: (e, t) => {
					let n = t.type === "SHOW" ? t.animationName : void 0;
					this.pendingVisibilityTransition = this.handleVisibilityChangeInternal(!0, n);
				},
				playHideAnimation: (e, t) => {
					let n = t.type === "HIDE" ? t.animationName : void 0;
					this.pendingVisibilityTransition = this.handleVisibilityChangeInternal(!1, n);
				}
			}
		});
	}
	pendingVisibilityTransition;
	get currentStateName() {
		return this.machine.context.currentState;
	}
	get idleLevel() {
		return this.machine.context.currentIdleLevel;
	}
	get ticksToNextLevel() {
		return this.machine.context.ticksPerLevel - this.machine.context.idleTickCount;
	}
	get timeUntilNextTick() {
		return Math.max(0, this.machine.context.idleIntervalMs - this.machine.context.elapsedSinceLastTick);
	}
	setRequestQueue(e) {
		this.requestQueue = e;
	}
	async update(e) {
		let t = this.animationManager.isAnimating;
		this.wasAnimating && !t && this.machine.send({ type: "ANIMATION_END" }), this.wasAnimating = t, this.machine.send({
			type: "TICK",
			deltaTime: e
		});
	}
	handleIdleTick(e) {
		this.isIdleState(e.currentState) ? (e.idleTickCount++, e.idleTickCount >= e.ticksPerLevel && e.currentIdleLevel < e.maxIdleLevel ? (e.currentIdleLevel++, e.idleTickCount = 0, e.currentState = `${this.idlePrefix}${e.currentIdleLevel}`, this.updateStateAnimation(!0).catch(console.error)) : this.animationManager.isAnimating || this.updateStateAnimation().catch(console.error)) : this.animationManager.isAnimating || this.updateStateAnimation().catch(console.error);
	}
	isIdleState(e) {
		return e.toLowerCase().startsWith(this.idlePrefix.toLowerCase());
	}
	async setState(e) {
		if (!this.states[e] && e !== "Playing" && e !== "Speaking" && e !== "Moving") throw Error(`Invalid state name: ${e}`);
		this.machine.send({
			type: "STATE_SET",
			stateName: e
		});
	}
	async playAnimation(e, t = "", n = !1, r, i = !1) {
		t && this.machine.send({
			type: "PLAY",
			animationName: e,
			stateName: t,
			timeoutMs: r,
			loop: i
		});
		let a = ++this.lastAnimationId;
		if (await this.animationManager.preloadAnimation(e), this.lastAnimationId !== a) return !1;
		let o;
		r && (o = setTimeout(() => {
			this.animationManager.isExitingFlag = !0;
		}, r));
		try {
			return this.wasAnimating = !0, await this.animationManager.interruptAndPlayAnimation(e, n, i || !!r);
		} finally {
			o && clearTimeout(o);
		}
	}
	async playRandomAnimation(e = 5e3) {
		let t = Object.keys(this.animationManager.animations).filter((e) => !this.isIdleState(e));
		if (t.length > 0) {
			let n = t[Math.floor(Math.random() * t.length)];
			await this.playAnimation(n, "Playing", !1, e);
		}
	}
	async handleAnimationCompleted() {
		this.machine.send({ type: "ANIMATION_END" });
	}
	resetIdleProgression() {
		this.machine.send({
			type: "STATE_SET",
			stateName: `${this.idlePrefix}1`
		});
	}
	async updateStateAnimation(e = !1) {
		if (!e && this.animationManager.isAnimating) return;
		let t = this.states[this.machine.context.currentState];
		if (t && t.animations.length > 0) {
			let e = t.animations[Math.floor(Math.random() * t.animations.length)];
			this.playAnimation(e).catch(console.error);
		}
	}
	async handleVisibilityChange(e, t) {
		this.machine.send(e ? {
			type: "SHOW",
			animationName: t
		} : {
			type: "HIDE",
			animationName: t
		}), this.pendingVisibilityTransition &&= (await this.pendingVisibilityTransition, void 0);
	}
	async handleVisibilityChangeInternal(e, t) {
		let n = e ? "Showing" : "Hiding", r = "";
		t && this.animationManager.animations[t] ? r = t : this.states[n]?.animations.length > 0 && (r = this.states[n].animations[0]), r ? (await this.animationManager.preloadAnimation(r), this.wasAnimating = !0, await this.animationManager.playAnimation(r, !0), this.machine.send({ type: "ANIMATION_END" })) : (e || this.animationManager.setAnimation("", !1), this.machine.send({ type: "ANIMATION_END" }));
	}
}, _ = class e {
	static PHONEME_MAP = {
		ear: "OpenWide1",
		ee: "OpenWide1",
		ea: "OpenWide3",
		ur: "OpenWide3",
		ow: "OpenWide4",
		oy: "OpenMedium",
		oo: "OpenNarrow",
		ch: "OpenWide2",
		sh: "OpenWide2",
		th: "OpenWide2",
		m: "Closed",
		b: "Closed",
		f: "Closed",
		p: "Closed",
		v: "Closed",
		g: "OpenWide1",
		l: "OpenWide1",
		k: "OpenWide1",
		y: "OpenWide1",
		n: "OpenWide2",
		d: "OpenWide2",
		t: "OpenWide2",
		s: "OpenWide2",
		z: "OpenWide2",
		u: "OpenWide3",
		e: "OpenWide3",
		i: "OpenWide3",
		h: "OpenWide3",
		r: "OpenWide3",
		a: "OpenWide4",
		o: "OpenMedium",
		w: "OpenNarrow"
	};
	timeline = [];
	BASE_PHONEME_DURATION = 78;
	scheduleWord(e, t, n = 1) {
		let r = this.decomposeToPhonemes(e.toLowerCase()), i = this.BASE_PHONEME_DURATION / n, a = t;
		for (let e of r) this.timeline.push({
			type: e,
			start: a,
			end: a + i
		}), a += i;
		this.timeline.push({
			type: "Closed",
			start: a,
			end: a + i
		});
	}
	getVisemeAt(e) {
		for (; this.timeline.length > 0 && this.timeline[0].end < e;) this.timeline.shift();
		let t = this.timeline.find((t) => e >= t.start && e <= t.end);
		return t ? t.type : "Closed";
	}
	clear() {
		this.timeline = [];
	}
	decomposeToPhonemes(t) {
		let n = [], r = 0;
		for (; r < t.length;) {
			let i = !1;
			if (r + 3 <= t.length) {
				let a = t.substring(r, r + 3);
				e.PHONEME_MAP[a] && (n.push(e.PHONEME_MAP[a]), r += 3, i = !0);
			}
			if (!i && r + 2 <= t.length) {
				let a = t.substring(r, r + 2);
				e.PHONEME_MAP[a] && (n.push(e.PHONEME_MAP[a]), r += 2, i = !0);
			}
			if (!i) {
				let i = t[r];
				e.PHONEME_MAP[i] ? n.push(e.PHONEME_MAP[i]) : /[a-z]/.test(i) && n.push("OpenWide2"), r++;
			}
		}
		return n;
	}
}, v = class extends l {
	requestQueue;
	animationManager;
	stateManager;
	spriteManager;
	audioManager;
	visemeManager;
	definition;
	options;
	constructor(e, t) {
		super(), this.definition = e, this.options = t, this.spriteManager = new c(t.baseUrl, e, {
			signal: t.signal,
			onProgress: t.onProgress,
			useCache: t.useCache
		}), this.audioManager = new p(t.baseUrl, {
			signal: t.signal,
			onProgress: t.onProgress,
			useCache: t.useCache
		}), this.audioManager.setEnabled(t.useAudio), e.audioAtlas && this.audioManager.setAudioAtlas(e.audioAtlas), this.animationManager = new d(this.spriteManager, this.audioManager, e.animations), this.stateManager = new g(e.states, this.animationManager, {
			idleIntervalMs: t.idleIntervalMs,
			ticksPerLevel: 3
		}), this.requestQueue = new h(), this.stateManager.setRequestQueue(this.requestQueue), this.visemeManager = new _(), this.setupEvents();
	}
	isUpdating = !1;
	setupEvents() {
		this.animationManager.on("frameChanged", () => {
			this.emit("frameChanged");
		}), this.on("speak", (e) => {
			this.visemeManager.scheduleWord(e.word, performance.now(), e.rate * this.options.speed);
		});
	}
	async init() {
		let e = [this.spriteManager.init()];
		this.options.useAudio && this.definition.audioAtlas && e.push(this.audioManager.loadSounds([])), await Promise.all(e);
	}
	async waitForMouthFrames(e, t) {
		if (t ? this.animationManager.supportsSpeech(t) : this.animationManager.supportsSpeech()) return new Promise((n) => {
			let r = () => {
				if (e()) {
					i(), n();
					return;
				}
				t && this.animationManager.currentAnimationName !== t || this.animationManager.currentFrameHasMouths() && (i(), n());
			}, i = () => {
				this.animationManager.off("frameChanged", r), this.animationManager.off("animationStarted", r);
			};
			this.animationManager.on("frameChanged", r), this.animationManager.on("animationStarted", r), r();
		});
	}
	update(e, t) {
		let n = this.visemeManager.getVisemeAt(e);
		this.animationManager.setViseme(n), this.animationManager.update(e), this.isUpdating || (this.isUpdating = !0, this.stateManager.update(t).finally(() => {
			this.isUpdating = !1;
		}));
	}
}, y = class {
	static async getDefinition(e, t, n) {
		let a = n.useCache !== !1;
		if (a) {
			let e = s.getDefinition(t);
			if (e) return e;
		}
		let o;
		try {
			let e = await i(`${t}/agent.json`, {
				signal: n.signal,
				onProgress: n.onProgress
			});
			if (!e.ok) throw Error("No agent.json");
			o = await e.json();
		} catch (i) {
			if (i instanceof Error && i.name === "AbortError") throw i;
			let a = `${t}/${e.toUpperCase()}.acd`;
			try {
				o = await r.load(a, n.signal);
			} catch (i) {
				if (i instanceof Error && i.name === "AbortError") throw i;
				try {
					o = await r.load(`${t}/${e.toLowerCase()}.acd`, n.signal);
				} catch (n) {
					throw n instanceof Error && n.name === "AbortError" ? n : (console.error(`MSAgentJS: Failed to load agent assets for '${e}' at ${t}. Please ensure the 'agents/' directory is correctly served and 'baseUrl' is correct.`), i);
				}
			}
		}
		if (!o) throw Error(`MSAgentJS: Failed to load agent assets for '${e}' at ${t}.`);
		return this.normalizeDefinition(o), a && s.setDefinition(t, o), o;
	}
	static normalizeDefinition(e) {
		e.character && (e.character.colorTable && !e.character.colorTable.startsWith("http") && (e.character.colorTable = e.character.colorTable.replace(/\\/g, "/")), Object.values(e.animations).forEach((e) => {
			e.frames.forEach((e) => {
				e.images.forEach((e) => {
					e.filename = e.filename.replace(/\\/g, "/").toLowerCase();
				}), e.mouths && e.mouths.forEach((e) => {
					e.filename = e.filename.replace(/\\/g, "/").toLowerCase();
				}), e.soundEffect &&= e.soundEffect.toLowerCase();
			});
		}));
	}
}, b = class {
	core;
	setInstantPosition;
	constructor(e, t) {
		this.core = e, this.setInstantPosition = t;
	}
	gestureAt(e, t) {
		return this.enqueueRequest(async (n) => {
			let r = this.toAgentPerspective(this.getDirection(e, t, 4)), i = `Gesturing${r}`;
			if (this.core.definition.states[i]) await this.core.stateManager.setState(i);
			else {
				let e = `Gesture${r}`;
				this.core.definition.animations[e] && await this.core.stateManager.playAnimation(e, "Gesturing");
			}
		});
	}
	lookAt(e, t) {
		return this.enqueueRequest(async (n) => {
			let r = `Look${this.toAgentPerspective(this.getDirection(e, t, 8))}`;
			this.core.animationManager.currentAnimationName === r && this.core.animationManager.isAnimating || this.core.definition.animations[r] && (this.core.emit("animationStart", r), await this.core.stateManager.playAnimation(r, "Looking"), n.isCancelled || this.core.emit("animationEnd", r));
		});
	}
	moveTo(e, t, n = 400) {
		return this.enqueueRequest(async (r) => {
			let i = this.core.options.x, a = this.core.options.y, o = e - i, s = t - a, c = Math.sqrt(o * o + s * s);
			if (c < 1) {
				this.setInstantPosition(e, t);
				return;
			}
			let l = c / n * 1e3, u = performance.now(), d = this.toAgentPerspective(this.getDirection(e, t, 4)), f = this.toAgentPerspective(this.getDirection(e, t, 8)), p = "", m = this.core.definition.states[`Moving${d}`];
			return m && m.animations.length > 0 ? p = m.animations[0] : this.core.definition.animations[`Moving${d}`] ? p = `Moving${d}` : this.core.definition.animations[`Move${d}`] ? p = `Move${d}` : this.core.definition.animations[`Look${f}`] && (p = `Look${f}`), p && this.core.stateManager.playAnimation(p, "Moving", !1, void 0, !0).catch(console.error), new Promise((e) => {
				let t = (n) => {
					if (r.isCancelled) {
						p && (this.core.animationManager.isExitingFlag = !0, this.core.stateManager.handleAnimationCompleted()), e();
						return;
					}
					let c = n - u, d = Math.min(c / l, 1), f = i + o * d, m = a + s * d;
					this.setInstantPosition(f, m), d < 1 ? requestAnimationFrame(t) : (p && (this.core.animationManager.isExitingFlag = !0, this.core.stateManager.handleAnimationCompleted()), e());
				};
				requestAnimationFrame(t);
			});
		});
	}
	enqueueRequest(e) {
		return this.core.requestQueue.add(async (t) => {
			this.core.emit("requestStart", t), await e(t), this.core.emit("requestComplete", t);
		});
	}
	toAgentPerspective(e) {
		return e.replace("Left", "TEMP").replace("Right", "Left").replace("TEMP", "Right");
	}
	getDirection(e, t, n) {
		let r = this.core.options.x + this.core.definition.character.width * this.core.options.scale / 2, i = this.core.options.y + this.core.definition.character.height * this.core.options.scale / 2, a = e - r, o = t - i, s = 180 / Math.PI * Math.atan2(o, a);
		return s < 0 && (s += 360), n === 4 ? s >= 315 || s < 45 ? "Right" : s >= 45 && s < 135 ? "Down" : s >= 135 && s < 225 ? "Left" : "Up" : s >= 337.5 || s < 22.5 ? "Right" : s >= 22.5 && s < 67.5 ? "DownRight" : s >= 67.5 && s < 112.5 ? "Down" : s >= 112.5 && s < 157.5 ? "DownLeft" : s >= 157.5 && s < 202.5 ? "Left" : s >= 202.5 && s < 247.5 ? "UpLeft" : s >= 247.5 && s < 292.5 ? "Up" : "UpRight";
	}
}, x = {
	Top: 0,
	Right: 1,
	Bottom: 2,
	Left: 3
}, S = 17, C = 10, w = C / 2, T = 7.5, E = 11.5, D = 9, O = 12, k = 15, A = class {
	_targetEl;
	_balloonEl;
	_contentEl;
	_svgEl;
	_pathEl;
	_definition;
	_hidden = !0;
	_active = !1;
	_hold = !1;
	_hidingTimeout = null;
	_loopTimeout = null;
	_completeCallback = null;
	_addChar = null;
	_ttsEnabled = !!window.speechSynthesis;
	_ttsUserEnabled = this._ttsEnabled;
	_currentUtterance = null;
	_ttsOptions = {
		voice: null,
		rate: 1,
		pitch: 1,
		volume: 1
	};
	_ttsFallbackTimer = null;
	_mobileTTSTimer = null;
	onHide = null;
	get isVisible() {
		return !this._hidden && this._balloonEl.style.display !== "none";
	}
	onSpeak = null;
	CHAR_SPEAK_TIME = 50;
	CLOSE_BALLOON_DELAY = 2e3;
	_tipPosition = 0;
	_tipType = x.Top;
	constructor(e, t, n) {
		this._targetEl = e, this._definition = n, this._balloonEl = document.createElement("div"), this._balloonEl.className = "clippy-balloon", this._balloonEl.style.display = "none", this._balloonEl.style.position = "absolute", this._balloonEl.style.background = "none", this._balloonEl.style.border = "none", this._balloonEl.style.padding = "0", this._balloonEl.style.boxShadow = "none", this._svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg"), this._svgEl.style.position = "absolute", this._svgEl.style.top = "0", this._svgEl.style.left = "0", this._svgEl.style.width = "100%", this._svgEl.style.height = "100%", this._svgEl.style.overflow = "visible", this._svgEl.style.pointerEvents = "none", this._pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path"), this._pathEl.setAttribute("stroke", a(n.balloon.borderColor)), this._pathEl.setAttribute("fill", a(n.balloon.backColor)), this._pathEl.setAttribute("stroke-width", "1"), this._svgEl.appendChild(this._pathEl), this._balloonEl.appendChild(this._svgEl), this._contentEl = document.createElement("div"), this._contentEl.className = "clippy-content", this._contentEl.style.position = "relative", this._contentEl.style.zIndex = "1", this._contentEl.style.color = a(n.balloon.foreColor), this._contentEl.style.fontFamily = n.balloon.fontName || "Arial", this._contentEl.style.fontSize = `${n.balloon.fontHeight}px`, n.balloon.fontWeight && (this._contentEl.style.fontWeight = n.balloon.fontWeight.toString()), n.balloon.italic && (this._contentEl.style.fontStyle = "italic"), this._contentEl.style.boxSizing = "border-box", this._contentEl.style.display = "flex", this._contentEl.style.flexDirection = "column", this._contentEl.style.justifyContent = "space-between", this._balloonEl.appendChild(this._contentEl), t.appendChild(this._balloonEl);
	}
	reposition() {
		let t = this._targetEl.getBoundingClientRect(), n = t.width, r = t.height;
		if (n === 0 || r === 0) return;
		let i = this._hidden;
		this._balloonEl.style.visibility = "hidden", this._balloonEl.style.display = "block", this._balloonEl.style.opacity = "0";
		let a = !!(this._definition.character.style & e.BalloonSizeToText), o = this._definition.balloon.charsPerLine > 0 ? Math.max(100, this._definition.balloon.charsPerLine * 8) : 250, s = (this._definition.balloon.fontHeight || 12) * 1.4;
		this._contentEl.style.display = "flex", this._contentEl.style.flexDirection = "column", this._contentEl.style.width = "max-content", this._contentEl.style.maxWidth = `${o}px`, this._contentEl.style.height = "auto", this._contentEl.style.maxHeight = "none", this._contentEl.style.overflow = "visible", this._contentEl.style.minHeight = "0";
		let c = Math.ceil(this._contentEl.getBoundingClientRect().width) || 100, l = Math.ceil(this._contentEl.getBoundingClientRect().height) || 40;
		if (!a) {
			let e = (this._definition.balloon.numLines || 2) * s + O * 2;
			l = Math.max(l, e);
		}
		this._contentEl.style.width = "100%", this._contentEl.style.height = "100%", this._contentEl.style.maxWidth = "none", this._contentEl.style.maxHeight = "none";
		let u = t.top, d = window.innerHeight - t.bottom, f = t.left, p = window.innerWidth - t.right, m = x.Bottom;
		u < l + S + k && d > u && (m = x.Top), u < l + S + k && d < l + S + k && (m = f > p ? x.Right : x.Left), this._tipType = m;
		let h = c, g = l + S;
		this._balloonEl.style.width = `${h}px`, this._balloonEl.style.height = `${g}px`;
		let _ = n / 2, v = r / 2, y = 0, b = 0;
		m === x.Bottom ? (y = _ - c / 2, b = -l - k) : m === x.Top ? (y = _ - c / 2, b = r + k) : m === x.Left ? (y = n + k, b = v - l / 2) : m === x.Right && (y = -c - k, b = v - l / 2);
		let C = t.left + y, w = t.top + b;
		C < 10 && (y += 10 - C, C = 10), C + h > window.innerWidth - 10 && (y -= C + h - (window.innerWidth - 10), C = window.innerWidth - 10 - h), w < 10 && (b += 10 - w, w = 10), w + g > window.innerHeight - 10 && (b -= w + g - (window.innerHeight - 10), w = window.innerHeight - 10 - g), this._balloonEl.style.left = `${y}px`, this._balloonEl.style.top = `${b}px`, m === x.Top || m === x.Bottom ? this._tipPosition = _ - y : this._tipPosition = v - b, this._drawBalloon(c, l), this._balloonEl.style.display = i ? "none" : "block", this._balloonEl.style.visibility = "visible", this._balloonEl.style.opacity = "1";
	}
	_drawBalloon(e, t) {
		let n = this._tipType, r = this._tipPosition, i = T, a = E, o = n === x.Top || n === x.Bottom ? e : t, s = n === x.Top || n === x.Bottom ? D : O, c = r - (w + s);
		c = Math.max(c, 0), c = Math.min(c, o - s * 2 - C);
		let l = s + c, u = "", d = n === x.Left ? S : 0, f = n === x.Top ? S : 0, p = (i) => n === i ? i === x.Top ? `L ${l + d} ${f} L ${r + d} 0 L ${l + C + d} ${f}` : i === x.Right ? `L ${e + d} ${l + f} L ${e + S + d} ${r + f} L ${e + d} ${l + C + f}` : i === x.Bottom ? `L ${l + C + d} ${t + f} L ${r + d} ${t + S + f} L ${l + d} ${t + f}` : i === x.Left ? `L ${d} ${l + C + f} L 0 ${r + f} L ${d} ${l + f}` : "" : "";
		u = `M ${i + d} ${f}`, u += p(x.Top), u += `H ${e - i + d} A ${i} ${a} 0 0 1 ${e + d} ${a + f}`, u += p(x.Right), u += `V ${t - a + f} A ${i} ${a} 0 0 1 ${e - i + d} ${t + f}`, u += p(x.Bottom), u += `H ${i + d} A ${i} ${a} 0 0 1 ${d} ${t - a + f}`, u += p(x.Left), u += `V ${a + f} A ${i} ${a} 0 0 1 ${i + d} ${f} Z`, this._contentEl.style.marginLeft = "0", this._contentEl.style.marginTop = "0", this._svgEl.style.top = "0", this._svgEl.style.left = "0";
		let m = D, h = O;
		this._contentEl.style.padding = `${h}px ${m}px ${h + S}px ${m}px`, n === x.Top ? this._svgEl.style.top = `${-S}px` : n === x.Left && (this._svgEl.style.left = `${-S}px`), this._pathEl.setAttribute("d", u);
	}
	speak(e, t, n, r, i = !1, a = !1) {
		this.stop(), this._hidden = !1, a || (this._contentEl.style.width = "", this._contentEl.style.height = "", this._contentEl.style.maxWidth = "", this._contentEl.style.maxHeight = "", this._contentEl.style.padding = `${O}px ${D}px`, this._contentEl.textContent = t), this.show(), this._completeCallback = e, this._hold = n;
		let o = !this._ttsEnabled || !this._ttsUserEnabled;
		if (i || o) {
			this.reposition(), this._active = !1, r && !o ? this._speakTTS(t, null, () => {
				this._active = !1, this._hold ? this._callComplete() : this.hide();
			}) : this._hold ? this._callComplete() : this.hide();
			return;
		}
		this.reposition(), a || (this._contentEl.textContent = ""), r ? this._sayCharsWithTTS(t, n, a) : this._sayChars(t, n, a);
	}
	_sayChars(e, t, n = !1) {
		this._active = !0, this._hold = t;
		let r = 0;
		this._addChar = () => {
			if (this._active) if (r >= e.length) this._addChar = null, this._active = !1, this._hold ? this._callComplete() : this.hide();
			else {
				if (r === 0 || e[r - 1] === " ") {
					let t = this._getWordAt(e, r);
					this.onSpeak?.({
						word: t,
						charIndex: r,
						rate: 1
					});
				}
				r++, n || (this._contentEl.textContent = e.slice(0, r)), this._loopTimeout = setTimeout(() => this._addChar?.(), this.CHAR_SPEAK_TIME);
			}
		}, this._addChar();
	}
	_getWordAt(e, t) {
		let n = t;
		for (; n > 0 && e[n - 1] !== " ";) n--;
		let r = t;
		for (; r < e.length && e[r] !== " ";) r++;
		return e.substring(n, r).replace(/[.,!?;:]/g, "");
	}
	_sayCharsWithTTS(e, t, n = !1) {
		this._active = !0, this._hold = t;
		let r = 0;
		this._speakTTS(e, (t, i) => {
			let a = i ? t + i : t;
			for (; a < e.length && e[a] !== " ";) a++;
			a > r && (r = a, n || (this._contentEl.textContent = e.slice(0, r)));
		}, () => {
			this._active = !1, n || (this._contentEl.textContent = e), this._hold ? this._callComplete() : this.hide();
		});
	}
	_speakTTS(e, t, n) {
		this.stopTTS();
		let r = new SpeechSynthesisUtterance(e);
		r.rate = this._ttsOptions.rate, r.pitch = this._ttsOptions.pitch, r.volume = this._ttsOptions.volume, this._ttsOptions.voice && (r.voice = this._ttsOptions.voice);
		let i = !1;
		r.onboundary = (n) => {
			i = !0, this._mobileTTSTimer &&= (clearTimeout(this._mobileTTSTimer), null), t && t(n.charIndex, n.charLength);
			let r = this._getWordAt(e, n.charIndex);
			this.onSpeak?.({
				word: r,
				charIndex: n.charIndex,
				rate: this._ttsOptions.rate
			});
		};
		let a = () => {
			this._mobileTTSTimer &&= (clearTimeout(this._mobileTTSTimer), null), n();
		};
		r.onend = a, r.onerror = a, r.onstart = () => {
			t && (this._mobileTTSTimer && clearTimeout(this._mobileTTSTimer), this._mobileTTSTimer = setTimeout(() => {
				i || this._startTTSFallback(e, t);
			}, 200));
		}, this._currentUtterance = r, window.speechSynthesis.speak(r);
	}
	_startTTSFallback(e, t) {
		let n = [], r = /\S+/g, i;
		for (; (i = r.exec(e)) !== null;) n.push({
			word: i[0],
			index: i.index
		});
		let a = 0, o = 400 / this._ttsOptions.rate, s = () => {
			if (a >= n.length) return;
			let { word: e, index: r } = n[a];
			t(r, e.length), this.onSpeak?.({
				word: e,
				charIndex: r,
				rate: this._ttsOptions.rate
			}), a++, a < n.length && (this._mobileTTSTimer = setTimeout(s, o));
		};
		s();
	}
	showHtml(e, t) {
		this.stop(), this._hidden = !1, this._balloonEl.style.visibility = "hidden", this._balloonEl.style.display = "block", this._contentEl.style.height = "auto", this._contentEl.style.width = "auto", this._contentEl.innerHTML = e, requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				this.reposition(), this._balloonEl.style.visibility = "visible", this._active = !1, this._hold = t;
			});
		});
	}
	show() {
		this._hidden || (this._balloonEl.style.display = "block", this._balloonEl.style.visibility = "visible", this._balloonEl.style.opacity = "1", this.reposition());
	}
	hide(e = !1) {
		if (this.stop(), e) {
			this._balloonEl.style.display = "none", this._hidden = !0, this.onHide?.(), this._callComplete();
			return;
		}
		this._hidingTimeout = setTimeout(() => this._finishHideBalloon(), this.CLOSE_BALLOON_DELAY);
	}
	_finishHideBalloon() {
		this._active || (this._balloonEl.style.display = "none", this._hidden = !0, this._hidingTimeout = null, this.onHide?.(), this._callComplete());
	}
	_callComplete() {
		if (this._completeCallback) {
			let e = this._completeCallback;
			this._completeCallback = null, e();
		}
	}
	stopTTS() {
		this._currentUtterance && window.speechSynthesis.speaking && (window.speechSynthesis.cancel(), this._currentUtterance = null);
	}
	isTTSEnabled() {
		return this._ttsUserEnabled;
	}
	setTTSEnabled(e) {
		this._ttsUserEnabled = this._ttsEnabled && e;
	}
	setTTSOptions(e) {
		this._ttsOptions = {
			...this._ttsOptions,
			...e
		};
	}
	getTTSVoices() {
		return window.speechSynthesis.getVoices();
	}
	close() {
		this.stop(), this.hide(!0), this._callComplete();
	}
	stop() {
		this._active = !1, this._addChar = null, this._loopTimeout &&= (clearTimeout(this._loopTimeout), null), this._hidingTimeout &&= (clearTimeout(this._hidingTimeout), null), this._ttsFallbackTimer &&= (clearTimeout(this._ttsFallbackTimer), null), this._mobileTTSTimer &&= (clearTimeout(this._mobileTTSTimer), null), this.stopTTS();
	}
	pause() {
		this._loopTimeout && clearTimeout(this._loopTimeout), this._hidingTimeout && clearTimeout(this._hidingTimeout), this._ttsFallbackTimer && clearTimeout(this._ttsFallbackTimer), this._mobileTTSTimer && clearTimeout(this._mobileTTSTimer);
	}
	resume() {
		this._addChar && this._addChar(), this._hidingTimeout = setTimeout(() => this._finishHideBalloon(), this.CLOSE_BALLOON_DELAY);
	}
	get balloonEl() {
		return this._balloonEl;
	}
}, j = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAKCAYAAACjd+4vAAAACXBIWXMAAAPoAAAD6AG1e1JrAAABJ0lEQVR4nI2T0ZHDMAhE6YmeaMEduAfacB0Uk/98kAEtFnKUm2NGk9ja7NOCQoS6rsuP4/DzPHPFM20q3pfmL52Z5V5f9MuMRZ3ZnFicWL/EXRf7hM+nrqBq7urubO6kvurKLExYDWYD3E1vqAIY+tLK1BVUzF0alNWdrMETykhaSViW5FF1OMrDWZqM7+M3cYioMA4YF9THYsMaMqeY60wow2xJLhOc++pkNloYBk17gxVQHMAanAqc0QHIlGpo0UxThneLw8nH/PKZH7pqLaBRCUfqBxizU6QxQ7ubIVoaOon9SNDG0xP3tHVI7uC6OB0+5z3M+kVcDomLtdUBIoAKWt91WfkCLa8b/SVadPMvtdPF7c6W16x30G7aaysq3fv1P90Pvw9ngYe+Mzz0LwAAAABJRU5ErkJggg==", M = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACEAAAAPCAYAAABqQqYpAAAACXBIWXMAAAPoAAAD6AG1e1JrAAABF0lEQVR4nM2TwQ3DIAxF2SmzZAVWyCzccugEmYM7A2SCTED1oQbHGJpGOdTSV6T0YV4xMYaVjybK8N/vssdxRJlu0yiCd05pnlkv4lQWG2rsvu+xI2BZdBFdIDfGOs7qApUtIq2AU0VCCOlZG/GqjRGwZwHJVh6skHCiYU9CK6yZUs4SWtEemb15ElrlpsT+LOEv3IkqQaclBWxHYjQOJuFOIu3XYT2XIBGeLJ7/EB+HHVxMCH8kUCGEIsJDAtu2lRsPlmbPQ3zL0oh5poZNhRck4piAdVPz7YNVhTusFFYFpEjavCMg2SL8hcXRX2HNur7SjPCc5zkuy9KFwWDuT7OGLhSegJERiwL/JGv+4iRoAaCh7cPsG2DiVwOHvNTDAAAAAElFTkSuQmCC", N = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAICAYAAAC/K3xHAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAA3ElEQVR4nMWT3Q3DIAyE2ck7eY48ZQfv5PeMc5XhIE0CzU+lFskCWXy2z5g0zzOe2LIsiPUvvq4UKxxJtFiaeLZiyr3609SSZ7jxtmXcYQAk7pmvccT6vAHJaeQcPDsgVva4t+ePIsLUIJE4LCcu/i78LiIKDTayA1nEGuNY/EgE8SKCvhAx4tcg9RWqgNa5cfF7XihC3UvX9DovfIEqIL9iFO8nxR9EtDH63Pk+T66K13HnRyKUxSu7f5XvjtMteC/iKe+c+bvFb4J0PuxdEd/wcjbzV4I8hn/EvwCVNEem470HIgAAAABJRU5ErkJggg==", P = class {
	canvas;
	ctx;
	shadowRoot;
	balloon;
	core;
	constructor(e, t) {
		this.core = e, this.shadowRoot = t.attachShadow({ mode: "open" });
		let n = document.createElement("style");
		n.textContent = this.getStyles(), this.shadowRoot.appendChild(n), this.canvas = document.createElement("canvas"), this.shadowRoot.appendChild(this.canvas), this.ctx = this.canvas.getContext("2d"), this.balloon = new A(this.canvas, this.shadowRoot, e.definition), this.setupCanvas();
	}
	setupCanvas() {
		let e = this.core.spriteManager.getSpriteWidth(), t = this.core.spriteManager.getSpriteHeight();
		this.canvas.width = e * this.core.options.scale, this.canvas.height = t * this.core.options.scale;
	}
	updateCanvasSize() {
		this.setupCanvas();
	}
	draw() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height), this.core.animationManager.draw(this.ctx, 0, 0, this.core.options.scale);
	}
	getStyles() {
		let { options: e } = this.core;
		return `
      :host {
        display: block;
        position: ${e.fixed ? "fixed" : "absolute"};
        left: ${e.x}px;
        top: ${e.y}px;
        z-index: 9999;
        pointer-events: none;
      }
      canvas {
        display: block;
        image-rendering: pixelated;
        pointer-events: auto;
        cursor: pointer;
        touch-action: none;
      }
      .clippy-balloon {
        position: absolute;
        z-index: 1000;
        pointer-events: auto;
      }
      .clippy-content {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        max-width: 250px;
        min-width: 100px;
        user-select: none;
      }
      .clippy-input {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        padding: 5px;
        height: 100%;
        box-sizing: border-box;
      }
      .clippy-input b {
        align-self: flex-start;
        margin-bottom: 5px;
      }
      .clippy-input textarea {
        width: 100%;
        margin-bottom: 10px;
        background-color: white;
        border: 1px solid grey;
        box-shadow: none;
        resize: none;
        font-family: inherit;
        font-size: inherit;
        box-sizing: border-box;
      }
      .clippy-input-buttons {
        display: flex;
        justify-content: space-between;
        width: 100%;
        border-top: 1px solid grey;
        padding-top: 5px;
      }
      .clippy-input-buttons.single-button {
        justify-content: center;
      }
      .clippy-input-buttons button {
        display: flex;
        align-items: center;
        background-color: ${a(this.core.definition.balloon.backColor)};
        border: 1px solid lightgrey;
        border-radius: 4px;
        padding: 2px 8px;
        cursor: pointer;
        font-family: inherit;
        font-size: inherit;
        color: inherit;

        position: relative;
        top: 1px;
        left: 1px;
      }

      /* Hover = raised */
      .clippy-input-buttons button:hover {
        top: 0;
        left: 0;
        border-bottom-color: darkgrey;
        border-right-color: darkgrey;
        box-shadow: inset 1px 1px white, 1px 1px lightgrey;
      }

      /* Pressed = pushed in */
      .clippy-input-buttons button:active {
        top: 1px;
        left: 1px;

        /* invert the bevel */
        border-top-color: grey;
        border-left-color: grey;
        border-bottom-color: lightgrey;
        border-right-color: lightgrey;

        box-shadow: inset 1px 1px darkgrey, inset -1px -1px white;
      }
      .clippy-input-buttons button .button-label {
        border: 1px dashed transparent;
        padding: 1px 2px;
      }
      .clippy-input-buttons button:focus {
        outline: none;
      }
      .clippy-input-buttons button:focus .button-label {
        border: 1px dashed grey;
      }
      .clippy-input-buttons button .button-bullet {
        display: inline-block;
        margin-right: 5px;
        background-repeat: no-repeat;
      }
      .clippy-input-buttons button.style-bullet .button-bullet {
        width: 10px;
        height: 10px;
        background-image: url('${j}');
        background-position: 0 0;
      }
      .clippy-input-buttons button:hover.style-bullet .button-bullet {
        background-position: -10px 0;
      }
      .clippy-input-buttons button:active.style-bullet .button-bullet {
        background-position: -20px 0;
      }
      .clippy-input-buttons button.style-bulb .button-bullet {
        width: 11px;
        height: 15px;
        background-image: url('${M}');
        background-position: 0 0;
      }
      .clippy-input-buttons button:hover.style-bulb .button-bullet {
        background-position: -11px 0;
      }
      .clippy-input-buttons button:active.style-bulb .button-bullet {
        background-position: -22px 0;
      }
      .clippy-choices {
        width: 100%;
        margin: 5px 0 0 0;
        padding: 0;
        list-style: none;
      }
      .clippy-choices li {
        display: flex;
        align-items: center;
        padding: 2px 4px;
        cursor: pointer;
      }
      .clippy-choices li span {
        border: 1px dashed transparent;
        padding: 1px 2px;
      }
      .clippy-choices li:hover span {
        border: 1px dashed grey;
      }
      .clippy-choices li::before {
        content: "";
        display: inline-block;
        margin-right: 8px;
        background-repeat: no-repeat;
      }
      .clippy-choices.style-bullet li::before {
        width: 10px;
        height: 10px;
        background-image: url('${j}');
        background-position: 0 0;
      }
      .clippy-choices.style-bullet li:hover::before {
        background-position: -10px 0;
      }
      .clippy-choices.style-bullet li:active::before {
        background-position: -20px 0;
      }
      .clippy-choices.style-bulb li::before {
        width: 11px;
        height: 15px;
        background-image: url('${M}');
        background-position: 0 0;
      }
      .clippy-choices.style-bulb li:hover::before {
        background-position: -11px 0;
      }
      .clippy-choices.style-bulb li:active::before {
        background-position: -22px 0;
      }

      .clippy-choices li.clippy-pagination-link::before {
        width: 16px;
        height: 8px;
        background-image: url('${N}');
        background-position: 0 0;
      }
      .clippy-choices li.clippy-pagination-link.prev::before {
        transform: rotate(180deg);
      }
      .clippy-choices li.clippy-pagination-link:hover::before {
        background-position: -16px 0;
      }
      .clippy-choices li.clippy-pagination-link:active::before {
        background-position: -32px 0;
      }

      .clippy-checkbox {
        align-self: flex-start;
        margin: 5px 0;
        display: flex;
        align-items: center;
      }
      .clippy-checkbox input[type="checkbox"] {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        background: 0;
        border: none;
        margin: 0;
        opacity: 0;
        position: absolute;
      }
      .clippy-checkbox label {
        margin-left: 19px;
        position: relative;
        line-height: 13px;
        display: inline-flex;
        align-items: center;
        cursor: pointer;
      }
      .clippy-checkbox label:before {
        background: #fff;
        box-shadow: inset -1px -1px #fff, inset 1px 1px grey, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a;
        content: "";
        display: inline-block;
        height: 13px;
        left: -19px;
        margin-right: 6px;
        position: absolute;
        width: 13px;
      }
      .clippy-checkbox input[type="checkbox"]:active + label:before {
        background: silver;
      }
      .clippy-checkbox input[type="checkbox"]:checked + label:after {
        background: url("data:image/svg+xml;charset=utf-8,%3Csvg width='7' height='7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7 0H6v1H5v1H4v1H3v1H2V3H1V2H0v3h1v1h1v1h1V6h1V5h1V4h1V3h1V0z' fill='%23000'/%3E%3C/svg%3E");
        content: "";
        display: block;
        height: 7px;
        left: -16px;
        position: absolute;
        top: 3px;
        width: 7px;
      }
      .clippy-checkbox input[type="checkbox"][disabled] + label {
        color: grey;
        text-shadow: 1px 1px 0 #fff;
        cursor: default;
      }
      .clippy-checkbox input[type="checkbox"][disabled] + label:before {
        background: silver;
      }
      .clippy-checkbox input[type="checkbox"][disabled]:checked + label:after {
        background: url("data:image/svg+xml;charset=utf-8,%3Csvg width='7' height='7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7 0H6v1H5v1H4v1H3v1H2V3H1V2H0v3h1v1h1v1h1V6h1V5h1V4h1V3h1V0z' fill='gray'/%3E%3C/svg%3E");
      }
    `;
	}
}, F = class {
	core;
	renderer;
	emit;
	setInstantPosition;
	isDragging = !1;
	wasDragging = !1;
	dragStartX = 0;
	dragStartY = 0;
	initialAgentX = 0;
	initialAgentY = 0;
	constructor(e, t, n, r) {
		this.core = e, this.renderer = t, this.emit = n, this.setInstantPosition = r, this.setupDragging(), this.renderer.canvas.addEventListener("click", () => {
			this.wasDragging || this.emit("click");
		}), this.core.options.keepInViewport && window.addEventListener("resize", this.handleResize);
	}
	destroy() {
		window.removeEventListener("resize", this.handleResize);
	}
	handleResize = () => {
		let e = this.renderer.canvas, t = window.innerWidth - e.width, n = window.innerHeight - e.height, r = this.core.options.x, i = this.core.options.y, a = !1;
		r > t && (r = Math.max(0, t), a = !0), i > n && (i = Math.max(0, n), a = !0), a && (this.setInstantPosition(r, i), this.emit("reposition", {
			x: r,
			y: i
		}));
	};
	setupDragging() {
		let e = null, t = this.renderer.canvas, n = (t) => {
			t.button === 0 && (this.isDragging = !0, this.wasDragging = !1, this.dragStartX = t.clientX, this.dragStartY = t.clientY, this.initialAgentX = this.core.options.x, this.initialAgentY = this.core.options.y, window.addEventListener("pointermove", r), window.addEventListener("pointerup", a), window.addEventListener("pointercancel", a), this.emit("dragstart"), e = window.setTimeout(() => {
				this.emit("contextmenu", {
					x: t.clientX,
					y: t.clientY,
					originalEvent: t
				}), this.isDragging = !1, this.wasDragging = !1, i();
			}, 500));
		}, r = (n) => {
			if (!this.isDragging) return;
			let r = n.clientX - this.dragStartX, i = n.clientY - this.dragStartY;
			(Math.abs(r) > 3 || Math.abs(i) > 3) && (this.wasDragging = !0, e &&= (clearTimeout(e), null));
			let a = this.initialAgentX + r, o = this.initialAgentY + i, s = window.innerWidth - t.width, c = window.innerHeight - t.height;
			a = Math.max(0, Math.min(a, s)), o = Math.max(0, Math.min(o, c)), this.setInstantPosition(a, o), this.emit("drag", {
				x: a,
				y: o
			});
		}, i = () => {
			e &&= (clearTimeout(e), null), window.removeEventListener("pointermove", r), window.removeEventListener("pointerup", a), window.removeEventListener("pointercancel", a);
		}, a = () => {
			if (!this.isDragging) {
				i();
				return;
			}
			this.isDragging = !1, i(), this.emit("dragend");
		};
		t.addEventListener("pointerdown", n), t.addEventListener("contextmenu", (e) => {
			e.preventDefault(), this.emit("contextmenu", {
				x: e.clientX,
				y: e.clientY,
				originalEvent: e
			});
		});
	}
}, I = class {
	core;
	renderer;
	startTalkingAnimation;
	constructor(e, t, n) {
		this.core = e, this.renderer = t, this.startTalkingAnimation = n;
	}
	ask(e = {}) {
		let t = e.title || "", n = e.content || [], r = e.buttons || [], i = e.timeout === void 0 ? 6e4 : e.timeout, a, s = new Promise((e) => {
			a = e;
		}), c = this;
		return this.core.requestQueue.add(async (s) => {
			if (s.isCancelled) {
				a(null);
				return;
			}
			this.core.emit("requestStart", s);
			let l = null, u = !1, d = 0;
			return new Promise((f) => {
				function p(e) {
					u || (u = !0, c.renderer.balloon.onHide = null, c.core.stateManager.currentStateName === "Speaking" && (c.core.animationManager.isExitingFlag = !0, c.core.stateManager.handleAnimationCompleted()), m(), l &&= (clearTimeout(l), null), a(e), c.core.emit("requestComplete", s), f());
				}
				function m() {
					let e = c.renderer.balloon.balloonEl, t = e.querySelector("textarea"), n = Array.from(e.querySelectorAll(".clippy-choices")), r = Array.from(e.querySelectorAll(".custom-button"));
					t?.removeEventListener("keypress", h), t?.removeEventListener("focus", v), t?.removeEventListener("blur", y), n.forEach((e) => e.removeEventListener("click", g)), r.forEach((e) => e.removeEventListener("click", _));
				}
				function h(e) {
					if (b(), e.key === "Enter") {
						e.preventDefault();
						let t = c.renderer.balloon.balloonEl, n = Array.from(t.querySelectorAll(".custom-button"));
						n.length > 0 && n[0].click();
					}
				}
				function g(e) {
					b();
					let t = e.target.closest("li");
					if (!t) return;
					let n = t.getAttribute("data-action");
					if (n === "next") {
						d++, S();
						return;
					}
					if (n === "prev") {
						d--, S();
						return;
					}
					if (t.hasAttribute("data-index")) {
						let e = parseInt(t.getAttribute("data-index") || "0"), n = c.renderer.balloon.balloonEl, r = n.querySelector("textarea"), i = n.querySelector(".ask-checkbox");
						p({
							value: e,
							text: r && r.value || null,
							checked: i ? !!i.checked : null
						}), c.renderer.balloon.close();
					}
				}
				function _(e) {
					let t = e.currentTarget, n = r[parseInt(t.getAttribute("data-index") || "0")], i = typeof n == "string" ? n : n.value, a = c.renderer.balloon.balloonEl, o = a.querySelector("textarea"), s = a.querySelector(".ask-checkbox"), l = o && o.value || null, u = s ? !!s.checked : null;
					p(i === null ? null : {
						value: i,
						text: l,
						checked: u
					}), c.renderer.balloon.close();
				}
				function v() {
					c.startTalkingAnimation("Writing");
				}
				function y() {
					c.startTalkingAnimation(e.animation), c.renderer.balloon.reposition();
				}
				function b() {
					l &&= (clearTimeout(l), null), i > 0 && (l = window.setTimeout(() => {
						p(null), c.renderer.balloon.close();
					}, i));
				}
				function x() {
					let e = c.renderer.balloon.balloonEl, t = e.querySelector("textarea"), n = Array.from(e.querySelectorAll(".clippy-choices")), r = Array.from(e.querySelectorAll(".custom-button"));
					t?.addEventListener("keypress", h), t?.addEventListener("focus", v), t?.addEventListener("blur", y), n.forEach((e) => e.addEventListener("click", g)), r.forEach((e) => e.addEventListener("click", _)), t ? t.focus() : r.length > 0 && r[0].focus();
				}
				function S() {
					m();
					let e = c.renderer.balloon.balloonEl, t = e.querySelector("textarea"), n = e.querySelector(".ask-checkbox"), r = t ? t.value : "", i = n ? n.checked : !1;
					c.renderer.balloon.showHtml(C(), !0);
					let a = e.querySelector("textarea"), o = e.querySelector(".ask-checkbox");
					a && (a.value = r), o && (o.checked = i), x();
				}
				function C() {
					let e = "<div class=\"clippy-input\">";
					if (t && (e += `<b>${t}</b>`), n.forEach((t) => {
						if (typeof t == "string") e += `<div>${t}</div>`;
						else if (t.type === "choices") {
							let n = t.style || "bullet", r = Math.ceil(t.items.length / 3), i = "";
							d > 0 && (i += "<li class=\"clippy-pagination-link prev\" data-action=\"prev\"><span>See previous...</span></li>");
							let a = d * 3, o = Math.min(a + 3, t.items.length);
							for (let e = a; e < o; e++) i += `<li data-index="${e}"><span>${t.items[e]}</span></li>`;
							d < r - 1 && (i += "<li class=\"clippy-pagination-link next\" data-action=\"next\"><span>See more...</span></li>"), e += `<ul class="clippy-choices style-${n}">${i}</ul>`;
						} else if (t.type === "input") {
							let n = t.placeholder || "", r = t.rows || 2;
							e += `<textarea rows="${r}" placeholder="${n}"></textarea>`;
						} else if (t.type === "checkbox") {
							let n = t.checked ? "checked" : "", r = `clippy-checkbox-${Math.random().toString(36).substring(2, 11)}`;
							e += `<div class="clippy-checkbox"><input type="checkbox" id="${r}" class="ask-checkbox" ${n}><label for="${r}">${t.label}</label></div>`;
						}
					}), r.length > 0) {
						let t = r.length === 1;
						e += `<div class="clippy-input-buttons${t ? " single-button" : ""}">`, r.forEach((t, n) => {
							let r = typeof t == "string" ? t : t.label, i = typeof t == "string" ? null : t.bullet, a = i ? `style-${i}` : "";
							e += `<button class="custom-button ${a}" data-index="${n}">${i ? "<span class=\"button-bullet\"></span>" : ""}<span class="button-label">${r}</span></button>`;
						}), e += "</div>";
					}
					return e += "</div>", e;
				}
				c.renderer.balloon.onHide = () => {
					p(null);
				}, c.startTalkingAnimation(e.animation), c.core.waitForMouthFrames(() => s.isCancelled, e.animation).then(() => {
					if (s.isCancelled) return;
					if (c.renderer.balloon.showHtml(C(), !0), !c.renderer.balloon.isVisible) {
						p(null);
						return;
					}
					let e = t ? o(t) : "";
					n.forEach((t) => {
						typeof t == "string" && (e += (e ? " " : "") + o(t));
					}), e && c.renderer.balloon.speak(() => {
						c.core.stateManager.currentStateName === "Speaking" && (c.core.animationManager.isExitingFlag = !0, c.core.stateManager.handleAnimationCompleted());
					}, e, !0, !0, !1, !0), x(), b(), setTimeout(() => c.renderer.balloon.reposition(), 0);
				});
			});
		}), s;
	}
}, L = class e {
	core;
	renderer;
	container;
	actionManager;
	inputManager;
	dialogManager;
	isDestroyed = !1;
	lastTime = 0;
	rafId = 0;
	get definition() {
		return this.core.definition;
	}
	get spriteManager() {
		return this.core.spriteManager;
	}
	get audioManager() {
		return this.core.audioManager;
	}
	get animationManager() {
		return this.core.animationManager;
	}
	get stateManager() {
		return this.core.stateManager;
	}
	get balloon() {
		return this.renderer.balloon;
	}
	get requestQueue() {
		return this.core.requestQueue;
	}
	get options() {
		return this.core.options;
	}
	constructor(e, t, n) {
		this.core = e, this.renderer = t, this.container = n, this.actionManager = new b(e, this.setInstantPosition.bind(this)), this.inputManager = new F(e, t, this.emit.bind(this), this.setInstantPosition.bind(this)), this.dialogManager = new I(e, t, this.startTalkingAnimation.bind(this));
	}
	static async load(t, n = {}) {
		let r = `https://unpkg.com/ms-agent-js@latest/dist/agents/${t}`, i = (n.baseUrl || r).replace(/\/$/, ""), a = await y.getDefinition(t, i, n), o = {
			container: n.container || null,
			baseUrl: i,
			scale: n.scale ?? 1,
			speed: n.speed ?? 1,
			idleIntervalMs: n.idleIntervalMs ?? 5e3,
			useAudio: n.useAudio ?? !0,
			fixed: n.fixed ?? !0,
			keepInViewport: n.keepInViewport ?? !0,
			initialAnimation: n.initialAnimation || "",
			onProgress: n.onProgress || (() => {}),
			signal: n.signal || new AbortController().signal,
			useCache: n.useCache !== !1,
			x: n.x ?? window.innerWidth - a.character.width * (n.scale ?? 1) - 50,
			y: n.y ?? window.innerHeight - a.character.height * (n.scale ?? 1) - 50
		}, s = o.container || document.createElement("div");
		o.container || document.body.appendChild(s);
		let c = new v(a, o);
		await c.init();
		let l = new P(c, s);
		l.balloon.onSpeak = (e) => {
			c.emit("speak", e);
		};
		let u = new e(c, l, s);
		return u.startLoop(), u.options.initialAnimation && u.hasAnimation(u.options.initialAnimation) ? u.show(u.options.initialAnimation) : u.definition.states.Showing ? u.show() : c.stateManager.setState("IdlingLevel1"), u;
	}
	startLoop() {
		this.lastTime = performance.now();
		let e = (t) => {
			if (this.isDestroyed) return;
			let n = (t - this.lastTime) * this.core.options.speed;
			this.lastTime = t, this.core.update(t, n), this.renderer.draw(), this.rafId = requestAnimationFrame(e);
		};
		this.rafId = requestAnimationFrame(e);
	}
	setInstantPosition(e, t) {
		this.core.options.x = e, this.core.options.y = t, this.container.style.left = `${e}px`, this.container.style.top = `${t}px`, this.renderer.balloon.reposition();
	}
	setScale(e) {
		let t = this.core.options.scale;
		if (t === e) return;
		let n = this.core.spriteManager.getSpriteWidth(), r = this.core.spriteManager.getSpriteHeight(), i = n * t, a = r * t, o = n * e, s = r * e, c = this.core.options.x + i / 2, l = this.core.options.y + a / 2, u = c - o / 2, d = l - s / 2;
		u = Math.max(0, Math.min(u, window.innerWidth - o)), d = Math.max(0, Math.min(d, window.innerHeight - s)), this.core.options.scale = e, this.renderer.updateCanvasSize(), this.setInstantPosition(u, d);
	}
	play(e, t, n, r = !1) {
		return this.enqueueRequest(async (i) => {
			if (!this.hasAnimation(e)) {
				console.warn(`MSAgentJS: Animation '${e}' not found.`);
				return;
			}
			this.emit("animationStart", e);
			let a = n ?? (!t && !r);
			await this.core.stateManager.playAnimation(e, "Playing", a, t, r), i.isCancelled || this.emit("animationEnd", e);
		});
	}
	animate() {
		let e = this.animations().filter((e) => !e.startsWith("Idle")), t = e[Math.floor(Math.random() * e.length)];
		return this.play(t);
	}
	animations() {
		return Object.keys(this.core.definition.animations);
	}
	hasAnimation(e) {
		return !!this.core.definition.animations[e];
	}
	gestureAt(e, t) {
		return this.actionManager.gestureAt(e, t);
	}
	lookAt(e, t) {
		return this.actionManager.lookAt(e, t);
	}
	async setState(e) {
		let t = this.core.stateManager.currentStateName;
		await this.core.stateManager.setState(e), this.emit("stateChange", e, t);
	}
	moveTo(e, t, n = 400) {
		return this.actionManager.moveTo(e, t, n);
	}
	talkingAnimationName = null;
	startTalkingAnimation(e = "Explain") {
		this.talkingAnimationName !== e && (this.core.definition.animations[e] || (e = "Explain"), this.core.definition.animations[e] ? (this.talkingAnimationName = e, this.core.stateManager.playAnimation(e, "Speaking", !1, void 0, !0).catch(console.error)) : (this.talkingAnimationName = e, this.core.stateManager.setState("Speaking").catch(console.error)), this.renderer.balloon.onHide = () => {
			this.renderer.balloon.onHide = null, this.talkingAnimationName = null, this.core.stateManager.currentStateName === "Speaking" && (this.core.animationManager.isExitingFlag = !0, this.core.stateManager.handleAnimationCompleted());
		});
	}
	speak(e, t = {}) {
		let { hold: n = !1, useTTS: r = !0, skipTyping: i = !1, animation: a } = t;
		return this.enqueueRequest(async (t) => {
			if (!t.isCancelled && (this.startTalkingAnimation(a), await this.core.waitForMouthFrames(() => t.isCancelled, a || this.talkingAnimationName || void 0), !t.isCancelled)) return new Promise((t) => {
				this.renderer.balloon.speak(t, e, n, r, i);
			});
		});
	}
	showHtml(e, t = !1) {
		this.renderer.balloon.showHtml(e, t);
	}
	ask(e = {}) {
		return this.dialogManager.ask(e);
	}
	setTTSOptions(e) {
		this.renderer.balloon.setTTSOptions(e);
	}
	getTTSVoices() {
		return this.renderer.balloon.getTTSVoices();
	}
	stopTTS() {
		this.renderer.balloon.stopTTS();
	}
	show(e) {
		return this.enqueueRequest(async (t) => {
			this.container.style.display = "block", await this.core.stateManager.handleVisibilityChange(!0, e), t.isCancelled || this.emit("show");
		});
	}
	hide(e) {
		return this.enqueueRequest(async (t) => {
			await this.core.stateManager.handleVisibilityChange(!1, e), t.isCancelled || (this.container.style.display = "none", this.emit("hide"));
		});
	}
	on(e, t) {
		this.core.on(e, t);
	}
	off(e, t) {
		this.core.off(e, t);
	}
	enqueueRequest(e) {
		return this.core.requestQueue.add(async (t) => {
			this.emit("requestStart", t), await e(t), this.emit("requestComplete", t);
		});
	}
	wait(e) {
		return this.enqueueRequest(() => e.promise);
	}
	delay(e) {
		return this.enqueueRequest(() => new Promise((t) => setTimeout(t, e)));
	}
	stop(e) {
		let t = this.core.requestQueue.activeRequestId;
		this.core.requestQueue.stop(e?.id), (!e || t !== null && e.id === t) && (this.core.animationManager.isAnimating && (this.core.animationManager.isExitingFlag = !0), this.renderer.balloon.close());
	}
	stopCurrent() {
		let e = this.core.requestQueue.activeRequestId;
		e !== null && this.stop({ id: e });
	}
	interrupt(e) {
		return this.stop(), this.play(e);
	}
	emit(e, ...t) {
		this.core.emit(e, ...t);
	}
	destroy() {
		this.isDestroyed = !0, cancelAnimationFrame(this.rafId), this.inputManager.destroy(), this.container.parentNode && this.container.parentNode.removeChild(this.container), this.core.clear();
	}
};
//#endregion
export { b as ActionManager, L as Agent, v as AgentCore, y as AgentLoader, P as AgentRenderer, d as AnimationManager, p as AudioManager, A as Balloon, r as CharacterParser, e as CharacterStyle, I as DialogManager, F as InputManager, h as RequestQueue, t as RequestStatus, c as SpriteManager, g as StateManager };
