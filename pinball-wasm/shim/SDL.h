// Minimal stand-in for the SDL2 subset used by the Pinball sources, backed by a JS canvas.
#pragma once
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <cstdio>

typedef uint8_t Uint8; typedef uint16_t Uint16; typedef uint32_t Uint32; typedef int32_t Sint32; typedef int16_t Sint16;
struct SDL_Rect { int x, y, w, h; };
struct SDL_FRect { float x, y, w, h; };
struct SDL_Window; struct SDL_Renderer;
struct SDL_Texture { int w, h; Uint32* px; };
#define SDL_VERSION_ATLEAST(a, b, c) 1
#define SDL_PIXELFORMAT_BGRA32 1
#define SDL_PIXELFORMAT_ARGB8888 2
#define SDL_TEXTUREACCESS_STATIC 0
#define SDL_TEXTUREACCESS_STREAMING 1
#define SDL_BLENDMODE_NONE 0
#define SDL_HINT_RENDER_SCALE_QUALITY "SDL_RENDER_SCALE_QUALITY"
#define SDL_MESSAGEBOX_ERROR 16
#define SDL_MESSAGEBOX_WARNING 32
#define SDL_WINDOW_FULLSCREEN_DESKTOP 1
#define SDLK_F12 0x40000045
inline const char* SDL_GetHint(const char*) { return "nearest"; }
inline int SDL_SetHint(const char*, const char*) { return 1; }
inline SDL_Texture* SDL_CreateTexture(SDL_Renderer*, Uint32, int, int w, int h) { return new SDL_Texture{ w, h, new Uint32[w * h]() }; }
inline void SDL_DestroyTexture(SDL_Texture* t) { if (t) { delete[] t->px; delete t; } }
inline int SDL_SetTextureBlendMode(SDL_Texture*, int) { return 0; }
inline int SDL_UpdateTexture(SDL_Texture* t, const SDL_Rect*, const void* pixels, int pitch)
{
	for (int y = 0; y < t->h; y++) std::memcpy(t->px + y * t->w, static_cast<const char*>(pixels) + y * pitch, t->w * 4);
	return 0;
}
inline int SDL_LockTexture(SDL_Texture* t, const SDL_Rect*, void** pixels, int* pitch) { *pixels = t->px; *pitch = t->w * 4; return 0; }
inline void SDL_UnlockTexture(SDL_Texture*) {}
// Presentation surface, provided by platform.cpp
int SDL_RenderCopy(SDL_Renderer*, SDL_Texture*, const SDL_Rect* src, const SDL_Rect* dst);
int SDL_RenderCopyF(SDL_Renderer*, SDL_Texture*, const SDL_Rect* src, const SDL_FRect* dst);
int SDL_GetRendererOutputSize(SDL_Renderer*, int* w, int* h);
int SDL_SetWindowFullscreen(SDL_Window*, Uint32);
int SDL_ShowSimpleMessageBox(Uint32 flags, const char* title, const char* message, SDL_Window*);
#define SDLK_z 'z'
#define SDLK_x 'x'
#define SDLK_SLASH '/'
#define SDLK_PERIOD '.'
#define SDLK_SPACE ' '
#define SDLK_ESCAPE 27
#define SDLK_UP 0x40000052
#define SDLK_F2 0x4000003B
#define SDLK_F3 0x4000003C
#define SDLK_F4 0x4000003D
#define SDLK_F5 0x4000003E
#define SDLK_F6 0x4000003F
#define SDLK_F8 0x40000041
#define SDLK_F9 0x40000042
#define SDLK_F12 0x40000045
#define SDL_BUTTON_LEFT 1
#define SDL_BUTTON_MIDDLE 2
#define SDL_BUTTON_RIGHT 3
Uint32 SDL_GetTicks();
inline const char* SDL_GetError() { return ""; }
inline void SDL_ClearError() {}
