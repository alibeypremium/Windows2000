#pragma once
#include "gdrv.h"

enum class GameBindings;

class winmain
{
public:
	static constexpr const char* Version = "Windows2000 wasm";
	static bool single_step;
	static SDL_Window* MainWindow;
	static SDL_Renderer* Renderer;
	static bool LaunchBallEnabled;
	static bool HighScoresEnabled;
	static bool DemoActive;
	static int MainMenuHeight;
	static bool no_time_loss;

	static void end_pause();
	static void new_game();
	static void pause(bool toggle = true);
	static void HandleGameBinding(GameBindings binding, bool shortcut);
};
