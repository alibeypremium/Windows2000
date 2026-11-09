#pragma once
#include "SDL.h"
#define MIX_MAX_VOLUME 128
struct Mix_Chunk { Uint8* data; Uint32 len; int id; };
struct Mix_Music { int id; };
struct SDL_RWops { const void* mem; int size; };
inline SDL_RWops* SDL_RWFromMem(void* m, int n) { return new SDL_RWops{ m, n }; }
inline SDL_RWops* SDL_RWFromFile(const char*, const char*) { return nullptr; }
Mix_Chunk* Mix_LoadWAV(const char* file);
void Mix_FreeChunk(Mix_Chunk*);
int Mix_PlayChannel(int channel, Mix_Chunk*, int loops);
void Mix_HaltChannel(int);
void Mix_Pause(int);
void Mix_Resume(int);
int Mix_Playing(int);
int Mix_Volume(int, int);
int Mix_AllocateChannels(int);
int Mix_SetPosition(int channel, Sint16 angle, Uint8 distance);
Mix_Music* Mix_LoadMUS_RW(SDL_RWops*, int);
int Mix_PlayMusic(Mix_Music*, int);
int Mix_HaltMusic();
void Mix_FreeMusic(Mix_Music*);
int Mix_VolumeMusic(int);
