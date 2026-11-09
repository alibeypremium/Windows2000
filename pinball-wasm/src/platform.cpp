// Browser platform layer: replaces SDL video/audio with imports provided by the JS host.
#include "pch.h"
#include "SDL.h"
#include "SDL_mixer.h"

extern "C" {
__attribute__((import_module("env"), import_name("js_audio_load"))) int js_audio_load(const char* path);
__attribute__((import_module("env"), import_name("js_audio_play"))) void js_audio_play(int id, int channel);
__attribute__((import_module("env"), import_name("js_audio_halt"))) void js_audio_halt(int channel);
__attribute__((import_module("env"), import_name("js_ticks"))) double js_ticks();
__attribute__((import_module("env"), import_name("js_message"))) void js_message(const char* title, const char* msg);
}

Uint32 SDL_GetTicks() { return static_cast<Uint32>(js_ticks()); }
int SDL_RenderCopy(SDL_Renderer*, SDL_Texture*, const SDL_Rect*, const SDL_Rect*) { return 0; }
int SDL_RenderCopyF(SDL_Renderer*, SDL_Texture*, const SDL_Rect*, const SDL_FRect*) { return 0; }
int SDL_GetRendererOutputSize(SDL_Renderer*, int* w, int* h) { *w = 600; *h = 416; return 0; }
int SDL_SetWindowFullscreen(SDL_Window*, Uint32) { return 0; }
int SDL_ShowSimpleMessageBox(Uint32, const char* title, const char* message, SDL_Window*)
{
	js_message(title, message);
	return 0;
}

static int nextChannel = 0;
Mix_Chunk* Mix_LoadWAV(const char* file)
{
	int id = js_audio_load(file);
	if (id < 0) return nullptr;
	return new Mix_Chunk{ nullptr, 0, id };
}
void Mix_FreeChunk(Mix_Chunk* c) { delete c; }
int Mix_PlayChannel(int channel, Mix_Chunk* c, int)
{
	if (channel < 0) channel = nextChannel++ % 16;
	js_audio_play(c->id, channel);
	return channel;
}
void Mix_HaltChannel(int c) { js_audio_halt(c); }
void Mix_Pause(int) {}
void Mix_Resume(int) {}
int Mix_Playing(int) { return 0; }
int Mix_Volume(int, int) { return 0; }
int Mix_AllocateChannels(int n) { return n; }
int Mix_SetPosition(int, Sint16, Uint8) { return 1; }
Mix_Music* Mix_LoadMUS_RW(SDL_RWops*, int) { return nullptr; }
int Mix_PlayMusic(Mix_Music*, int) { return -1; }
int Mix_HaltMusic() { return 0; }
void Mix_FreeMusic(Mix_Music*) {}
int Mix_VolumeMusic(int) { return 0; }
