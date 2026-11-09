#include "pch.h"
#include "options.h"

#include "fullscrn.h"
#include "midi.h"
#include "pb.h"
#include "render.h"
#include "Sound.h"
#include "winmain.h"
#include "translations.h"

extern "C" {
__attribute__((import_module("env"), import_name("js_setting_get"))) int js_setting_get(const char* key, char* out, int cap);
__attribute__((import_module("env"), import_name("js_setting_set"))) void js_setting_set(const char* key, const char* value);
}

std::unordered_map<std::string, std::string> options::settings{};

optionsStruct options::Options{};

static void SetDefaultKeys()
{
	auto& k = options::Options.Key;
	auto key = [&](GameBindings b, int sym, InputTypes t2 = InputTypes::None, int v2 = -1) {
		k[~b].Inputs[0] = GameInput(InputTypes::Keyboard, sym);
		k[~b].Inputs[1] = GameInput(t2, v2);
		k[~b].Inputs[2] = GameInput();
	};
	auto arrow = [&](GameBindings b, int sym) { k[~b].Inputs[2] = GameInput(InputTypes::Keyboard, sym); };
	key(GameBindings::LeftFlipper, SDLK_z, InputTypes::Mouse, SDL_BUTTON_LEFT);
	key(GameBindings::RightFlipper, SDLK_SLASH, InputTypes::Mouse, SDL_BUTTON_RIGHT);
	key(GameBindings::Plunger, SDLK_SPACE, InputTypes::Mouse, SDL_BUTTON_MIDDLE);
	arrow(GameBindings::LeftFlipper, 0x40000050);
	arrow(GameBindings::RightFlipper, 0x4000004F);
	arrow(GameBindings::Plunger, 0x40000051);
	key(GameBindings::LeftTableBump, SDLK_x);
	key(GameBindings::RightTableBump, SDLK_PERIOD);
	key(GameBindings::BottomTableBump, SDLK_UP);
	key(GameBindings::NewGame, SDLK_F2);
	key(GameBindings::TogglePause, SDLK_F3);
	key(GameBindings::ToggleFullScreen, SDLK_F4);
	key(GameBindings::ToggleSounds, SDLK_F5);
	key(GameBindings::ToggleMusic, SDLK_F6);
	key(GameBindings::ShowControlDialog, SDLK_F8);
	key(GameBindings::ToggleMenuDisplay, SDLK_F9);
	key(GameBindings::Exit, SDLK_ESCAPE);
}

void options::InitPrimary()
{
	SetDefaultKeys();
	Options.Sounds = get_int("Sounds", 1) != 0;
	Options.Music = false;
	Options.Players = get_int("Players", 1);
	Options.Resolution = get_int("Screen Resolution", -1);
}

void options::InitSecondary()
{
	fullscrn::SetResolution(Options.Resolution);
}

void options::uninit()
{
	set_int("Sounds", Options.Sounds);
	set_int("Players", Options.Players);
	set_int("Screen Resolution", Options.Resolution);
}

const std::string& options::GetSetting(const std::string& key, const std::string& defaultValue)
{
	auto it = settings.find(key);
	if (it != settings.end()) return it->second;
	char buf[256];
	if (js_setting_get(key.c_str(), buf, sizeof buf) > 0)
		return settings[key] = buf;
	return defaultValue;
}

void options::SetSetting(const std::string& key, const std::string& value)
{
	settings[key] = value;
	js_setting_set(key.c_str(), value.c_str());
}

int options::get_int(LPCSTR lpValueName, int defaultValue)
{
	auto& v = GetSetting(lpValueName, "");
	return v.empty() ? defaultValue : std::atoi(v.c_str());
}

void options::set_int(LPCSTR lpValueName, int data)
{
	SetSetting(lpValueName, std::to_string(data));
}

float options::get_float(LPCSTR lpValueName, float defaultValue)
{
	auto& v = GetSetting(lpValueName, "");
	return v.empty() ? defaultValue : static_cast<float>(std::atof(v.c_str()));
}

void options::set_float(LPCSTR lpValueName, float data)
{
	SetSetting(lpValueName, std::to_string(data));
}

void options::toggle(Menu1 uIDCheckItem)
{
	switch (uIDCheckItem)
	{
	case Menu1::Sounds:
		Options.Sounds ^= true;
		Sound::Enable(Options.Sounds);
		break;
	case Menu1::Music:
		Options.Music ^= true;
		if (!Options.Music) midi::music_stop(); else midi::music_play();
		break;
	case Menu1::OnePlayer: Options.Players = 1; break;
	case Menu1::TwoPlayers: Options.Players = 2; break;
	case Menu1::ThreePlayers: Options.Players = 3; break;
	case Menu1::FourPlayers: Options.Players = 4; break;
	case Menu1::MaximumResolution:
		Options.Resolution = -1;
		fullscrn::SetResolution(-1);
		break;
	case Menu1::R640x480:
	case Menu1::R800x600:
	case Menu1::R1024x768:
		Options.Resolution = static_cast<int>(uIDCheckItem) - static_cast<int>(Menu1::R640x480);
		fullscrn::SetResolution(Options.Resolution);
		break;
	default: break;
	}
}

void options::InputDown(GameInput) {}

std::vector<GameBindings> options::MapGameInput(GameInput key)
{
	std::vector<GameBindings> result;
	for (auto inputId = GameBindings::Min; inputId < GameBindings::Max; inputId++)
		for (auto& v : Options.Key[~inputId].Inputs)
			if (key == v)
			{
				result.push_back(inputId);
				break;
			}
	return result;
}

void options::ResetAllOptions() { SetDefaultKeys(); }
