use std::collections::HashMap;

use crate::game_trait::Game;
use crate::games::{
    black_hole::BlackHoleGame, bluff_card::BluffCardGame, checkers::CheckersGame,
    code_guess::CodeGuessGame, dice_grid::DiceGridGame, drop_four::DropFourGame,
    higher_lower::HigherLowerGame, memory_flip::MemoryFlipGame, row_call::RowCallGame,
    shut_the_box::ShutTheBoxGame, stop_clock::StopClockGame, tic_tac_toe::TicTacToeGame,
    trappex::TrappexGame, trivia_battle::TriviaBattleGame, dr_eureka::DrEurekaGame,
    smart_four::SmartFourGame, ultimate_tic_tac_toe::UltimateTicTacToeGame,
    giiker_bolt::GiikerBoltGame, triple_cross::TripleCrossGame,
    dot_matrix::DotMatrixGame, sos_dot::SosDotGame, line_crosser::LineCrosserGame,
    uno_matrix::UnoMatrixGame, connect_numbers::ConnectNumbersGame, knarr_placement::KnarrPlacementGame,
    scrabble_slam::ScrabbleSlamGame, hand_hunt::HandHuntGame, pengoloo::PengolooGame,
    battle_flips::BattleFlipsGame, bowtie_matrix::BowtieMatrixGame,
    stick_dice_race::StickDiceRaceGame, s_curve_race::SCurveRaceGame,
    qomet::QometGame, in_a_nutshell::InANutshellGame,
    vortex::VortexGame, tabletop_pinball::TabletopPinballGame,
};

/// Factory function signature: takes an optional variant string,
/// returns a boxed Game trait object.
type GameFactory = fn(variant: Option<&str>) -> Box<dyn Game>;

/// Central registry mapping `game_type` strings to factory functions.
///
/// Adding a new game = implement `Game` trait + register one factory here.
/// No other files need to change.
pub struct GameRegistry {
    factories: HashMap<&'static str, GameFactory>,
}

impl GameRegistry {
    /// Build the registry with all known games registered.
    pub fn new() -> Self {
        let mut registry = GameRegistry {
            factories: HashMap::new(),
        };

        registry.register("tic_tac_toe", |variant| {
            if let Some(v) = variant {
                Box::new(TicTacToeGame::new_variant(v))
            } else {
                Box::new(TicTacToeGame::new())
            }
        });

        registry.register("shut_the_box", |_| Box::new(ShutTheBoxGame::new()));

        registry.register("code_guess", |_| Box::new(CodeGuessGame::new()));

        registry.register("memory_flip", |_| Box::new(MemoryFlipGame::new()));

        registry.register("higher_lower", |variant| {
            Box::new(HigherLowerGame::new_variant(variant.unwrap_or("classic")))
        });

        registry.register("stop_clock", |_| Box::new(StopClockGame::new()));

        registry.register("bluff_card", |_| Box::new(BluffCardGame::new()));

        registry.register("checkers", |variant| {
            Box::new(CheckersGame::new_variant(variant.unwrap_or("classic")))
        });

        registry.register("drop_four", |variant| {
            Box::new(DropFourGame::new_variant(variant.unwrap_or("classic")))
        });

        registry.register("trivia_battle", |_| Box::new(TriviaBattleGame::new()));

        registry.register("row_call", |_| Box::new(RowCallGame::new()));

        registry.register("dice_grid", |variant| {
            Box::new(DiceGridGame::new_variant(variant.unwrap_or("classic")))
        });

        registry.register("black_hole", |variant| {
            Box::new(BlackHoleGame::new_variant(variant.unwrap_or("classic")))
        });

        registry.register("trappex", |variant| {
            Box::new(TrappexGame::new_variant(variant.unwrap_or("classic")))
        });

        registry.register("dr_eureka", |variant| {
            Box::new(DrEurekaGame::new_variant(variant.unwrap_or("classic")))
        });

        registry.register("smart_four", |variant| {
            Box::new(SmartFourGame::new_variant(variant.unwrap_or("classic")))
        });

        registry.register("ultimate_tic_tac_toe", |_| {
            Box::new(UltimateTicTacToeGame::new())
        });

        registry.register("giiker_bolt", |_| {
            Box::new(GiikerBoltGame::new())
        });

        registry.register("triple_cross", |_| {
            Box::new(TripleCrossGame::new())
        });

        registry.register("dot_matrix", |_| {
            Box::new(DotMatrixGame::new())
        });

        registry.register("sos_dot", |_| {
            Box::new(SosDotGame::new())
        });

        registry.register("line_crosser", |_| {
            Box::new(LineCrosserGame::new())
        });

        registry.register("uno_matrix", |_| {
            Box::new(UnoMatrixGame::new())
        });

        registry.register("connect_numbers", |_| {
            Box::new(ConnectNumbersGame::new())
        });

        registry.register("knarr_placement", |_| {
            Box::new(KnarrPlacementGame::new())
        });

        registry.register("scrabble_slam", |_| {
            Box::new(ScrabbleSlamGame::new())
        });

        registry.register("hand_hunt", |_| {
            Box::new(HandHuntGame::new())
        });

        registry.register("pengoloo", |_| {
            Box::new(PengolooGame::new())
        });

        registry.register("battle_flips", |_| {
            Box::new(BattleFlipsGame::new())
        });

        registry.register("bowtie_matrix", |_| {
            Box::new(BowtieMatrixGame::new())
        });

        registry.register("stick_dice_race", |_| {
            Box::new(StickDiceRaceGame::new())
        });

        registry.register("s_curve_race", |_| {
            Box::new(SCurveRaceGame::new())
        });

        registry.register("qomet", |_| {
            Box::new(QometGame::new())
        });

        registry.register("in_a_nutshell", |_| {
            Box::new(InANutshellGame::new())
        });

        registry.register("vortex", |variant| {
            Box::new(VortexGame::new_variant(variant.unwrap_or("classic")))
        });

        registry.register("tabletop_pinball", |variant| {
            Box::new(TabletopPinballGame::new_variant(variant.unwrap_or("classic")))
        });

        registry
    }

    /// Register a game factory under a game_type key.
    pub fn register(&mut self, game_type: &'static str, factory: GameFactory) {
        self.factories.insert(game_type, factory);
    }

    /// Create a new game instance by type and optional variant.
    pub fn create(&self, game_type: &str, variant: Option<&str>) -> Option<Box<dyn Game>> {
        self.factories
            .get(game_type)
            .map(|factory| factory(variant))
    }
}

#[cfg(test)]
mod tests {
    use super::GameRegistry;

    #[test]
    fn registry_creates_all_known_game_types() {
        let registry = GameRegistry::new();

        let game_types = [
            "tic_tac_toe",
            "shut_the_box",
            "code_guess",
            "memory_flip",
            "higher_lower",
            "stop_clock",
            "bluff_card",
            "checkers",
            "drop_four",
            "trivia_battle",
            "row_call",
            "dice_grid",
            "black_hole",
            "trappex",
            "dr_eureka",
            "smart_four",
            "ultimate_tic_tac_toe",
            "giiker_bolt",
            "triple_cross",
            "dot_matrix",
            "sos_dot",
            "line_crosser",
            "uno_matrix",
            "connect_numbers",
            "knarr_placement",
            "scrabble_slam",
            "hand_hunt",
            "pengoloo",
            "battle_flips",
            "bowtie_matrix",
            "stick_dice_race",
            "s_curve_race",
            "qomet",
            "in_a_nutshell",
            "vortex",
            "tabletop_pinball",
        ];

        for game_type in game_types {
            let game = registry.create(game_type, None);
            assert!(game.is_some(), "failed to create game: {}", game_type);
            assert_eq!(game.unwrap().game_type(), game_type);
        }
    }

    #[test]
    fn registry_returns_none_for_unknown_type() {
        let registry = GameRegistry::new();
        assert!(registry.create("nonexistent", None).is_none());
    }

    #[test]
    fn registry_passes_variant_to_tic_tac_toe() {
        let registry = GameRegistry::new();
        let game = registry.create("tic_tac_toe", Some("joker")).unwrap();
        assert_eq!(game.game_type(), "tic_tac_toe");
    }

    #[test]
    fn registry_passes_variant_to_higher_lower() {
        let registry = GameRegistry::new();
        let game = registry.create("higher_lower", Some("sprint")).unwrap();
        assert_eq!(game.game_type(), "higher_lower");
    }
}
