/* backend/src/games/scrabble_slam.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;
use rand::seq::SliceRandom;
use std::time::{SystemTime, UNIX_EPOCH};

// Embed a solid dictionary of common 4-letter English words
const DICTIONARY: &[&str] = &[
    "GAME", "PLAY", "TAME", "TALE", "BALE", "SALE", "KALE", "VALE", "LAKE", "LAME", "LATE", "RATE",
    "DATE", "GATE", "MATE", "FATE", "HATE", "LINE", "FINE", "MINE", "PINE", "DINE", "WINE", "WIND",
    "MIND", "FIND", "BIND", "KIND", "RIND", "BAND", "SAND", "LAND", "HAND", "WAND", "BOND", "FOND",
    "POND", "WENT", "SENT", "BENT", "LENT", "PENT", "RENT", "DENT", "VENT", "TENT", "MELT", "BELT",
    "FELT", "WELT", "BOLT", "COLT", "DOLT", "JOLT", "TOOL", "FOOL", "COOL", "POOL", "WOOL", "BOOK",
    "LOOK", "COOK", "HOOK", "NOOK", "ROOK", "TOOK", "DOOR", "POOR", "MOOT", "BOOT", "ROOT", "HOOT",
    "LOOT", "FOOT", "GOOD", "WOOD", "FOOD", "MOOD", "HOOD", "ROAD", "TOAD", "LOAD", "LEAD", "READ",
    "DEAD", "HEAD", "BEAD", "BEAR", "DEAR", "FEAR", "HEAR", "NEAR", "PEAR", "REAR", "TEAR", "WEAR",
    "YEAR", "BEAT", "HEAT", "MEAT", "NEAT", "PEAT", "SEAT", "EAST", "WEST", "BEST", "LEST", "NEST",
    "PEST", "REST", "VEST", "ZEST", "TEST", "DUST", "RUST", "MUST", "BUST", "GUST", "JUST", "LUST",
    "POST", "MOST", "LOST", "COST", "HOST", "SOFT", "LOFT", "LEFT", "RAFT", "GIFT", "LIFT", "SIFT",
    "WORD", "CARD", "YARD", "HARD", "WARD", "CORD", "LORD", "FORT", "PORT", "SORT", "PART", "DART",
    "HART", "TART", "CART", "MARK", "DARK", "LARK", "BARK", "PARK", "WORK", "FORK", "CORK", "PORK",
    "TALK", "WALK", "BALK", "MILK", "SILK", "BULK", "HULK", "TASK", "MASK", "CASK", "BASK", "DESK",
    "RISK", "DISK", "TUSK", "DUSK", "CLAY", "SLAY", "TRAY", "PRAY", "GRAY", "STAY", "AWAY", "TIME",
    "LIME", "MIME", "DIME", "RIME", "COME", "SOME", "HOME", "DOME", "ROME", "CURE", "PURE", "SURE",
    "LURE", "RUDE", "RIDE", "SIDE", "WIDE", "TIDE", "HIDE", "BIDE", "PIPE", "RIPE", "WIPE", "HOPE",
    "COPE", "ROPE", "POPE", "SOAP", "SHOP", "STOP", "DROP", "CROP", "PROP", "GOLD", "SOLD", "BOLD",
    "COLD", "FOLD", "HOLD", "TOLD", "WOLD", "MOLD", "SOIL", "FOIL", "COIL", "BOIL", "TOIL", "ROIL",
    "FILE", "TILE", "PILE", "MILE", "VILE", "NILE", "RILE", "WIND", "FIND", "WILD", "MILD", "BITE",
    "KITE", "SITE", "LITE", "MITE", "BULL", "DULL", "FULL", "GULL", "MULL", "PULL", "BALL", "CALL",
    "FALL", "HALL", "MALL", "TALL", "WALL", "BELL", "CELL", "DELL", "FELL", "SELL", "TELL", "WELL",
    "HILL", "FILL", "GILL", "MILL", "PILL", "TILL", "WILL", "DOLL", "POLL", "TOLL", "ROLL", "BOLL",
    "MALE", "SALE", "PALE", "HALE", "WALE", "RULE", "MULE", "YULE", "SOUL", "COAL", "GOAL", "FOAL",
    "REAL", "DEAL", "MEAL", "PEAL", "SEAL", "ZEAL", "CASE", "BASE", "VASE", "EASE", "RISE", "WISE",
    "NOSE", "ROSE", "POSE", "LOSE", "DOSE", "HOSE", "MUSE", "FUSE", "USED", "USER", "LOCK", "ROCK",
    "DOCK", "MOCK", "SOCK", "COCK", "TOCK", "PACK", "BACK", "SACK", "RACK", "TACK", "LACK", "JACK",
    "NECK", "DECK", "PECK", "KICK", "LICK", "SICK", "PICK", "TICK", "WICK", "DUCK", "LUCK", "MUCK",
    "TUCK", "BUCK", "SUCK", "SKEW", "GROW", "BLOW", "FLOW", "GLOW", "SLOW", "SHOW", "KNOW", "SNOW",
    "CROW", "BROW", "BOAT", "COAT", "GOAT", "MOAT", "SHOE", "SHOP", "SINK", "LINK", "PINK", "WINK",
    "MINK", "FINK", "RANK", "BANK", "TANK", "SANK", "LANK", "YANK", "JUNK", "BUNK", "SUNK", "DUNK",
    "GUNK", "HAWK", "CROW", "SWAN", "SEAL", "DEER", "HARE", "WOLF", "LION", "TOAD", "FROG", "FISH",
    "TUNA", "CRAB", "CLAM", "ACID", "BASE", "ATOM", "WAVE", "HEAT", "FLOW", "ROCK", "STAR", "MOON",
    "SUNS", "RAIN", "SNOW", "WIND", "GALE", "MIST", "FOGS", "HAZE", "DUST", "CLAY", "DIRT", "SOIL",
    "SAND", "LAVA", "COAL", "IRON", "GOLD", "LEAD", "ZINC", "TINS", "MINT", "SAGE", "ROSE", "LILY",
    "IRIS", "FERN", "MOSS", "OAKS", "PINES", "ELMS", "ASHS", "ACOR", "LEAF", "WOOD", "BARK", "ROOT",
];

const START_WORDS: &[&str] = &[
    "GAME", "PLAY", "BALE", "WENT", "POST", "ROAD", "DARK", "TEST", "GOLD", "WIND", "LAKE", "TAME",
];

#[derive(Debug, Clone, Serialize)]
pub struct ScrabbleSlamGame {
    pub active_word: String,
    pub player_hands: Vec<Vec<char>>,              // Letters held by each player
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
    #[serde(skip)]
    pub cooldowns: Vec<u64>,                       // Cooldown timestamp per player (millis)
}

impl ScrabbleSlamGame {
    pub fn new() -> Self {
        let mut rng = rand::thread_rng();
        let active = START_WORDS.choose(&mut rng).unwrap().to_string();

        // Standard letter distribution pool (weighted to make spelling words easier)
        let mut letter_pool = Vec::new();
        let dist = [
            ('A', 9), ('B', 2), ('C', 2), ('D', 4), ('E', 12), ('F', 2), ('G', 3), ('H', 2),
            ('I', 9), ('J', 1), ('K', 2), ('L', 4), ('M', 2), ('N', 6), ('O', 8), ('P', 2),
            ('R', 6), ('S', 6), ('T', 6), ('U', 4), ('V', 2), ('W', 2), ('Y', 2),
        ];
        for &(ch, count) in &dist {
            for _ in 0..count {
                letter_pool.push(ch);
            }
        }
        letter_pool.shuffle(&mut rng);

        // Deal 12 letters to each player
        let p1_hand: Vec<char> = letter_pool.drain(0..12).collect();
        let p2_hand: Vec<char> = letter_pool.drain(0..12).collect();

        ScrabbleSlamGame {
            active_word: active,
            player_hands: vec![p1_hand, p2_hand],
            winner: None,
            game_over: false,
            last_event: Some("Scrabble Slam started! Slam cards simultaneously!".to_string()),
            cooldowns: vec![0, 0],
        }
    }

    pub fn slam_letter(&mut self, player: u8, letter: char, pos: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if pos >= 4 {
            return Err("Position must be 0..3".into());
        }

        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        if current_time < self.cooldowns[player as usize] {
            return Err("You are on submit cooldown".into());
        }

        let p_idx = player as usize;
        let upper_letter = letter.to_ascii_uppercase();

        // 1. Verify player has the card
        let letter_idx = self.player_hands[p_idx]
            .iter()
            .position(|&c| c == upper_letter);

        let card_idx = match letter_idx {
            Some(idx) => idx,
            None => return Err(format!("Letter '{}' is not in your hand", upper_letter)),
        };

        // 2. Draft the proposed word
        let mut chars: Vec<char> = self.active_word.chars().collect();
        if chars[pos] == upper_letter {
            return Err("Proposed letter matches existing letter".into());
        }
        chars[pos] = upper_letter;
        let proposed_word: String = chars.iter().collect();

        // 3. Validate against dictionary
        let is_valid = DICTIONARY.contains(&proposed_word.as_str());

        if is_valid {
            // Apply play
            self.active_word = proposed_word.clone();
            self.player_hands[p_idx].remove(card_idx);

            // Check victory
            if self.player_hands[p_idx].is_empty() {
                self.game_over = true;
                self.winner = Some(player);
                self.last_event = Some(format!(
                    "Player {} changed the word to {} and finished their hand! Player {} wins!",
                    player + 1, self.active_word, player + 1
                ));
            } else {
                self.last_event = Some(format!(
                    "Player {} changed the word to {}!",
                    player + 1, self.active_word
                ));
            }
        } else {
            // Invalid attempt penalty: 1.2s cooldown
            self.cooldowns[p_idx] = current_time + 1200;
            self.last_event = Some(format!(
                "Player {} tried to slam '{}' at pos {}, making '{}' (Invalid Word! 1.2s penalty)",
                player + 1, upper_letter, pos + 1, proposed_word
            ));
        }

        Ok(())
    }
}

impl Game for ScrabbleSlamGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("SlamLetter") => {
                let letter_str = action
                    .get("letter")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| "Missing 'letter'".to_string())?;
                let letter = letter_str.chars().next().ok_or("Letter empty")?;
                let pos = action
                    .get("position")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'position'".to_string())? as usize;

                self.slam_letter(player, letter, pos)?;
            }
            _ => return Err("Unknown action for Scrabble Slam".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "Hand completed! Winner: {}",
                    self.winner.map_or("Draw".to_string(), |w| format!("Player {}", w + 1))
                ),
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, _player: Option<u8>) -> serde_json::Value {
        // Since play is simultaneous and cards in hand are private, in real play we would hide other hands.
        // However, players need to see their own hand, and we can keep hand card counts visible.
        // Let's implement card masking for the opponent's hand:
        let mut val = serde_json::to_value(self).unwrap();
        if let Some(p_idx) = _player {
            let opp_idx = 1 - p_idx as usize;
            if let serde_json::Value::Object(ref mut map) = val {
                if let Some(serde_json::Value::Array(ref mut hands)) = map.get_mut("player_hands") {
                    if hands.len() > opp_idx {
                        let opp_hand = &mut hands[opp_idx];
                        if let serde_json::Value::Array(ref mut cards) = opp_hand {
                            // Replace characters with a wildcard marker to hide the actual letters
                            for card in cards.iter_mut() {
                                *card = serde_json::json!("?");
                            }
                        }
                    }
                }
            }
        }
        val
    }

    fn reset(&mut self) {
        *self = ScrabbleSlamGame::new();
    }

    fn game_type(&self) -> &str {
        "scrabble_slam"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = ScrabbleSlamGame::new();
        assert_eq!(game.player_hands[0].len(), 12);
        assert_eq!(game.player_hands[1].len(), 12);
        assert_eq!(game.active_word.len(), 4);
        assert!(!game.game_over);
    }

    #[test]
    fn test_slam_letter_valid_and_invalid() {
        let mut game = ScrabbleSlamGame::new();
        game.active_word = "GAME".to_string();
        game.player_hands[0] = vec!['T', 'A', 'L', 'E'];

        // Try invalid word: "ZAME"
        game.player_hands[0].push('Z');
        let _ = game.slam_letter(0, 'Z', 0); // G -> Z: ZAME
        assert_eq!(game.active_word, "GAME"); // word unchanged
        assert_eq!(game.player_hands[0].len(), 5); // card not consumed

        // Clear cooldown to bypass lockout in test
        game.cooldowns[0] = 0;

        // Try valid word: "TAME" (G -> T)
        game.slam_letter(0, 'T', 0).unwrap();
        assert_eq!(game.active_word, "TAME");
        assert_eq!(game.player_hands[0].len(), 4); // 'T' removed
    }

    #[test]
    fn test_win_condition() {
        let mut game = ScrabbleSlamGame::new();
        game.active_word = "GAME".to_string();
        game.player_hands[0] = vec!['T']; // 1 card remaining

        game.slam_letter(0, 'T', 0).unwrap();
        assert!(game.game_over);
        assert_eq!(game.winner, Some(0));
    }
}
