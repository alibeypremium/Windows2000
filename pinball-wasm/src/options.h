#pragma once

enum class Msg : int;

enum class Menu1:int
{
	New_Game = 101,
	About_Pinball = 102,
	High_Scores = 103,
	Exit = 105,
	Sounds = 201,
	Music = 202,
	SoundStereo = 203,
	Help_Topics = 301,
	Launch_Ball = 401,
	Pause_Resume_Game = 402,
	Full_Screen = 403,
	Demo = 404,
	Select_Table = 405,
	Player_Controls = 406,
	OnePlayer = 408,
	TwoPlayers = 409,
	ThreePlayers = 410,
	FourPlayers = 411,
	Show_Menu = 412,
	MaximumResolution = 500,
	R640x480 = 501,
	R800x600 = 502,
	R1024x768 = 503,
	WindowUniformScale = 600,
	WindowLinearFilter = 601,
	WindowIntegerScale = 602,
	Prefer3DPBGameData = 700,
};

enum class InputTypes
{
	None = 0,
	Keyboard,
	Mouse,
	GameController,
};

struct GameInput
{
	InputTypes Type;
	int Value;

	GameInput() : GameInput(InputTypes::None, -1)
	{
	}

	GameInput(InputTypes type, int value) : Type(type), Value(value)
	{
	}

	bool operator==(const GameInput& other) const
	{
		return Type == other.Type && Value == other.Value;
	}

	};

enum class GameBindings
{
	Min = 0,
	LeftFlipper = 0,
	RightFlipper,
	Plunger,
	LeftTableBump,
	RightTableBump,
	BottomTableBump,
	NewGame,
	TogglePause,
	ToggleFullScreen,
	ToggleSounds,
	ToggleMusic,
	ShowControlDialog,
	ToggleMenuDisplay,
	Exit,
	Max
};

inline GameBindings& operator++(GameBindings& value, int)
{
	return value = static_cast<GameBindings>(static_cast<int>(value) + 1);
}

constexpr int operator~(const GameBindings& value)
{
	return static_cast<int>(value);
}

class options
{
public:
	static constexpr int MaxUps = 360, MaxFps = MaxUps, MinUps = 60, MinFps = MinUps, DefUps = 120, DefFps = 60;
	static constexpr int MaxSoundChannels = 32, MinSoundChannels = 1, DefSoundChannels = 8;
	static constexpr int MaxVolume = MIX_MAX_VOLUME, MinVolume = 0, DefVolume = MaxVolume;
	static struct optionsStruct Options;

	static void InitPrimary();
	static void InitSecondary();
	static void uninit();
	static const std::string& GetSetting(const std::string& key, const std::string& defaultValue);
	static void SetSetting(const std::string& key, const std::string& value);
	static int get_int(LPCSTR lpValueName, int defaultValue);
	static void set_int(LPCSTR lpValueName, int data);
	static float get_float(LPCSTR lpValueName, float defaultValue);
	static void set_float(LPCSTR lpValueName, float data);
	static void toggle(Menu1 uIDCheckItem);
	static void InputDown(GameInput input);
	static bool WaitingForInput() { return false; }
	static std::vector<GameBindings> MapGameInput(GameInput key);
	static void ResetAllOptions();
private:
	static std::unordered_map<std::string, std::string> settings;
};

struct ControlOption
{
	GameInput Inputs[3];
};

struct optionsStruct
{
	ControlOption Key[~GameBindings::Max];
	bool Sounds = true;
	bool Music = false;
	bool FullScreen = false;
	int Players = 1;
	int Resolution = -1;
	float UIScale = 1.0f;
	bool UniformScaling = true;
	bool LinearFiltering = false;
	int FramesPerSecond = 60;
	int UpdatesPerSecond = 120;
	bool ShowMenu = false;
	bool UncappedUpdatesPerSecond = false;
	int SoundChannels = 8;
	bool HybridSleep = false;
	bool Prefer3DPBGameData = false;
	bool IntegerScaling = false;
	int SoundVolume = MIX_MAX_VOLUME;
	int MusicVolume = MIX_MAX_VOLUME;
	bool SoundStereo = true;
	bool DebugOverlay = false;
	bool HideCursor = false;
};
