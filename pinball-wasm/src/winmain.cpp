#include "pch.h"
#include "winmain.h"

#include "fullscrn.h"
#include "midi.h"
#include "high_score.h"
#include "options.h"
#include "pb.h"
#include "render.h"
#include "Sound.h"
#include "translations.h"
#include "TPinballTable.h"
#include "TPlunger.h"
#include "TBall.h"

SDL_Window* winmain::MainWindow = nullptr;
SDL_Renderer* winmain::Renderer = nullptr;
bool winmain::single_step = false;
bool winmain::no_time_loss = false;
bool winmain::LaunchBallEnabled = true;
bool winmain::HighScoresEnabled = true;
bool winmain::DemoActive = false;
int winmain::MainMenuHeight = 0;

void winmain::end_pause()
{
	if (single_step)
	{
		pb::pause_continue();
		no_time_loss = true;
	}
}

void winmain::new_game()
{
	end_pause();
	pb::replay_level(false);
}

void winmain::pause(bool toggle)
{
	if (toggle || !single_step)
	{
		pb::pause_continue();
		no_time_loss = true;
	}
}

void winmain::HandleGameBinding(GameBindings binding, bool)
{
	switch (binding)
	{
	case GameBindings::TogglePause: pause(); break;
	case GameBindings::NewGame: new_game(); break;
	case GameBindings::ToggleSounds: options::toggle(Menu1::Sounds); break;
	case GameBindings::ToggleMusic: options::toggle(Menu1::Music); break;
	default: break;
	}
}

// ---- exported API driven by the JS host ----
#define EXPORT(n) __attribute__((export_name(n)))

extern "C" {
EXPORT("pb_start") int pb_start(int quick)
{
	pb::quickFlag = quick != 0;
	options::InitPrimary();
	pb::SelectDatFile({ "" });
	options::InitSecondary();
	Sound::Init(true, options::Options.SoundChannels, options::Options.Sounds, options::Options.SoundVolume);
	options::Options.Music = false;
	if (pb::init())
		return 1;
	fullscrn::init();
	pb::reset_table();
	pb::firsttime_setup();
	fullscrn::window_size_changed();
	pb::replay_level(false);
	return 0;
}

EXPORT("pb_frame") void pb_frame(float dtMs)
{
	if (!winmain::single_step && !winmain::no_time_loss)
		pb::frame(dtMs);
	winmain::no_time_loss = false;
	high_score::RenderHighScoreDialog();
	render::PresentVScreen();
	gdrv::grtext_draw_ttext_in_box();
}

EXPORT("pb_key") void pb_key(int down, int sym)
{
	if (down) pb::InputDown({ InputTypes::Keyboard, sym });
	else pb::InputUp({ InputTypes::Keyboard, sym });
}

EXPORT("pb_mouse") void pb_mouse(int down, int button)
{
	if (down) pb::InputDown({ InputTypes::Mouse, button });
	else pb::InputUp({ InputTypes::Mouse, button });
}

EXPORT("pb_command") void pb_command(int cmd, int arg)
{
	switch (cmd)
	{
	case 0: winmain::new_game(); break;
	case 1: winmain::pause(); break;
	case 2: options::toggle(Menu1::Sounds); break;
	case 3: options::toggle(Menu1::Music); break;
	case 4: options::toggle(static_cast<Menu1>(arg)); break;
	case 5: pb::loose_focus(); break;
	case 6: pb::launch_ball(); break;
	case 7: pb::toggle_demo(); break;
	default: break;
	}
}

EXPORT("pb_state") int pb_state(int what)
{
	switch (what)
	{
	case 0: return options::Options.Sounds;
	case 1: return options::Options.Players;
	case 2: return pb::MainTable ? pb::MainTable->Width : 0;
	case 3: return render::vscreen ? render::vscreen->Width : 0;
	case 4: return render::vscreen ? render::vscreen->Height : 0;
	case 5: return winmain::single_step;
	case 6: return (int)pb::game_mode;
	case 7: return pb::FullTiltMode ? 1 : 0;
	case 8: return pb::MainTable && pb::MainTable->Plunger ? (int)pb::MainTable->Plunger->PullbackStartedFlag : -1;
	case 9: return pb::MainTable && pb::MainTable->Plunger ? (int)(pb::MainTable->Plunger->Boost * 100) : -1;
	case 12: return pb::MainTable && !pb::MainTable->BallList.empty() ? (int)(pb::MainTable->BallList[0]->Position.X * 100) : -9;
	case 13: return pb::MainTable && !pb::MainTable->BallList.empty() ? (int)(pb::MainTable->BallList[0]->Position.Y * 100) : -9;
	case 14: return pb::MainTable && !pb::MainTable->BallList.empty() ? (int)(pb::MainTable->BallList[0]->Speed * 100) : -9;
	case 15: return pb::MainTable && !pb::MainTable->BallList.empty() ? (int)pb::MainTable->BallList[0]->ActiveFlag : -9;
	case 10: return pb::MainTable ? (int)pb::MainTable->BallList.size() : -1;

	default: return 0;
	}
}

EXPORT("pb_pixels") const void* pb_pixels() { return render::vscreen ? render::vscreen->BmpBufPtr1 : nullptr; }
EXPORT("pb_alloc") void* pb_alloc(int n) { return malloc(n); }
EXPORT("pb_free") void pb_free(void* p) { free(p); }
}
