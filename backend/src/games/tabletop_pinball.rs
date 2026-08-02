/* backend/src/games/tabletop_pinball.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;
use rand::Rng;

#[derive(Debug, Clone, Serialize)]
pub struct TabletopPinballGame {
    pub variant: String,                         // "classic", "tumblin_dice", "watermelon_knife", "nokkenhole", "tzaar_cup"
    pub scores: Vec<u32>,                        // Cumulative scores [P1, P2]
    pub turns_remaining: Vec<u8>,                // Launches left [P1, P2] (0 = unlimited for nokkenhole)
    pub board: Vec<Option<u8>>,                  // occupied cells (tumblin_dice slots: 0..12, or watermelon_knife segment occupancy)
    pub dice_faces: Vec<u8>,                     // die face values for slots (tumblin_dice)
    pub wheel_angle: u32,                        // active spinning segment index (watermelon_knife)
    pub positions: Vec<usize>,                   // cup node positions (tzaar_cup): [P1_node, P2_node]
    pub round_wins: Vec<u32>,                    // round wins per player (tzaar_cup)
    pub target_score: u32,                       // target score for nokkenhole (21) or target wins for tzaar_cup (3)
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl TabletopPinballGame {
    pub fn new_variant(variant: &str) -> Self {
        let mut game = TabletopPinballGame {
            variant: variant.to_string(),
            scores: vec![0, 0],
            turns_remaining: vec![4, 4],          // 4 launches/turns each
            board: vec![None; 12],
            dice_faces: vec![0; 12],
            wheel_angle: 0,
            positions: vec![0, 2],                // default: nodes 0 and 2 for tzaar_cup
            round_wins: vec![0, 0],
            target_score: 0,
            current_player: 0,
            winner: None,
            game_over: false,
            last_event: None,
        };

        game.setup_board();
        game
    }

    pub fn setup_board(&mut self) {
        match self.variant.as_str() {
            "tumblin_dice" => {
                self.board = vec![None; 12];     // 12 slots (3 per shelf x1, x2, x3, x4)
                self.dice_faces = vec![0; 12];
                self.last_event = Some("Tumblin' Dice started! Adjust tension to launch your dice down the tiered ramp.".to_string());
            }
            "watermelon_knife" => {
                self.board = vec![None; 8];      // 8 wheel segments (0..7, None = empty, Some(p) = occupied by player p)
                self.wheel_angle = 0;
                self.last_event = Some("Watermelon Knife Hit started! Throw knives into the spinning target without hitting existing ones.".to_string());
            }
            "nokkenhole" => {
                // Unlimited turns, first to 21 wins
                self.turns_remaining = vec![0, 0]; // 0 = unlimited
                self.target_score = 21;
                self.board = vec![];
                self.last_event = Some("Nokkenhole started! Roll the ball up the board to land in scoring zones. First to 21 wins!".to_string());
            }
            "tzaar_cup" => {
                // 6 nodes: 0-4 are outer, 5 is center hub
                // P1 starts on node 0, P2 starts on node 2
                self.positions = vec![0, 2];
                self.round_wins = vec![0, 0];
                self.target_score = 3; // first to 3 round wins
                self.turns_remaining = vec![0, 0]; // unlimited
                self.board = vec![];
                self.last_event = Some("Tzaar Cup Slam started! Move your cup to catch your opponent. First to 3 captures wins!".to_string());
            }
            _ => {
                // Classic Pinball
                self.last_event = Some("Tabletop Pinball started! Adjust plunger tension to target the high-value rings and center dinger.".to_string());
            }
        }
    }

    pub fn launch_ball(&mut self, player: u8, tension: u32) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if tension < 1 || tension > 100 {
            return Err("Tension must be between 1 and 100".into());
        }

        let p_idx = player as usize;
        if self.turns_remaining[p_idx] == 0 {
            return Err("No launches remaining".into());
        }

        let mut rng = rand::thread_rng();
        // Add random bounce variance to simulation
        let variance = rng.gen_range(0..21) as i32 - 10; // -10 to +10
        let final_tension = (tension as i32 + variance).max(1).min(100) as u32;

        let (zone, pts) = match final_tension {
            40..=60 => ("Outer Ring", 50),
            61..=75 => ("Middle Ring", 100),
            76..=88 => ("Inner Ring", 200),
            89..=96 => ("CENTER DINGER!!", 300),
            _ => ("Dead Zone (Miss)", 0),
        };

        self.scores[p_idx] += pts;
        self.turns_remaining[p_idx] -= 1;

        self.last_event = Some(format!(
            "Player {} launched with tension {} (actual: {}), landing in the {}. (+{} points)",
            player + 1, tension, final_tension, zone, pts
        ));

        self.post_turn_check(player);
        Ok(())
    }

    pub fn roll_die(&mut self, player: u8, tension: u32) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        let p_idx = player as usize;
        if self.turns_remaining[p_idx] == 0 {
            return Err("No dice remaining to roll".into());
        }

        let mut rng = rand::thread_rng();
        let variance = rng.gen_range(0..21) as i32 - 10;
        let final_tension = (tension as i32 + variance).max(1).min(100) as u32;

        let multiplier = match final_tension {
            10..=32 => 1,
            33..=58 => 2,
            59..=79 => 3,
            80..=92 => 4,
            _ => 0, // falls off
        };

        self.turns_remaining[p_idx] -= 1;

        if multiplier == 0 {
            self.last_event = Some(format!(
                "Player {} launched a die with tension {} (actual: {}), but it tumbled off the board! (0 points)",
                player + 1, tension, final_tension
            ));
        } else {
            let die_face = rng.gen_range(1..=6);
            let score = (die_face * multiplier) as u32;

            // Find slot on target shelf: x1 (0..=2), x2 (3..=5), x3 (6..=8), x4 (9..=11)
            let shelf_start = (multiplier - 1) as usize * 3;
            let mut placed_idx = None;

            // Try to find empty slot
            for i in 0..3 {
                let slot = shelf_start + i;
                if slot < 12 && self.board[slot].is_none() {
                    placed_idx = Some(slot);
                    break;
                }
            }

            // If shelf is full, attempt knockoff
            if placed_idx.is_none() {
                for i in 0..3 {
                    let slot = shelf_start + i;
                    if slot < 12 && self.board[slot] == Some(1 - player) {
                        // 50% chance to knock off
                        if rng.gen_bool(0.5) {
                            let opp_score = (self.dice_faces[slot] * multiplier) as u32;
                            self.scores[1 - p_idx] = self.scores[1 - p_idx].saturating_sub(opp_score);
                            placed_idx = Some(slot);
                            self.board[slot] = None; // clear first
                            break;
                        }
                    }
                }
            }

            if let Some(slot) = placed_idx {
                self.board[slot] = Some(player);
                self.dice_faces[slot] = die_face;
                self.scores[p_idx] += score;

                self.last_event = Some(format!(
                    "Player {} rolled a {} on shelf x{} (Slot {}). (+{} points)",
                    player + 1, die_face, multiplier, slot + 1, score
                ));
            } else {
                // Shelf full and knockoff failed, falls off
                self.last_event = Some(format!(
                    "Player {} rolled a {} on shelf x{}, but the shelf was full! It bounced off the ramp. (0 points)",
                    player + 1, die_face, multiplier
                ));
            }
        }

        self.post_turn_check(player);
        Ok(())
    }

    pub fn throw_knife(&mut self, player: u8, target_segment: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if target_segment >= 8 {
            return Err("Invalid wheel segment".into());
        }
        let p_idx = player as usize;
        if self.turns_remaining[p_idx] == 0 {
            return Err("No knives remaining".into());
        }

        // Increment spinning angle to simulate rotation
        let mut rng = rand::thread_rng();
        self.wheel_angle = (self.wheel_angle + rng.gen_range(2..5)) % 8;

        self.turns_remaining[p_idx] -= 1;

        if self.board[target_segment].is_some() {
            // Crash! Hit existing knife
            let hit_owner = self.board[target_segment].unwrap();
            self.last_event = Some(format!(
                "Player {} threw a knife at segment {} but HIT Player {}'s knife! CRASH! (0 points)",
                player + 1, target_segment + 1, hit_owner + 1
            ));
        } else {
            // Hit empty segment
            self.board[target_segment] = Some(player);
            self.scores[p_idx] += 100;
            self.last_event = Some(format!(
                "Player {} landed a knife in segment {}! (+100 points)",
                player + 1, target_segment + 1
            ));
        }

        self.post_turn_check(player);
        Ok(())
    }

    /// Nokkenhole: Roll the ball with a given force (1-100)
    pub fn roll_nokken(&mut self, player: u8, force: u32) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if force < 1 || force > 100 {
            return Err("Force must be between 1 and 100".into());
        }

        let p_idx = player as usize;
        let mut rng = rand::thread_rng();
        let variance = rng.gen_range(0..21) as i32 - 10;
        let effective = (force as i32 + variance).max(1).min(100) as u32;

        // Scoring zones:
        // 0 pts: too weak (1-19) or too strong (91-100) — misses the board
        // 1 pt: Zone 1 (20-39) or Zone 3 (76-90) — outer zones
        // 2 pts: Zone 2 (40-59) — mid zone
        // 3 pts: THE HOLE (60-75) — sweet spot
        let (zone, pts) = match effective {
            20..=39 => ("Zone 1 (outer)", 1),
            40..=59 => ("Zone 2 (mid)", 2),
            60..=75 => ("THE HOLE!", 3),
            76..=90 => ("Zone 3 (outer)", 1),
            _ => ("Off the board!", 0),
        };

        self.scores[p_idx] += pts;

        self.last_event = Some(format!(
            "Player {} rolled with force {} (effective: {}). {} +{} pts. (Total: {} / {})",
            player + 1, force, effective, zone, pts, self.scores[p_idx], self.target_score
        ));

        // Check for winner (first to target_score)
        if self.scores[p_idx] >= self.target_score {
            self.game_over = true;
            self.winner = Some(player);
            self.last_event = Some(format!(
                "Player {} reached {} points and wins Nokkenhole!",
                player + 1, self.scores[p_idx]
            ));
        } else {
            self.current_player = 1 - player;
        }

        Ok(())
    }

    /// Tzaar Cup Slam: Move cup to an adjacent node
    /// Node adjacency: 5 outer nodes (0-4) all connect to center (5). Outer nodes do NOT connect to each other.
    pub fn move_cup(&mut self, player: u8, target_node: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if target_node > 5 {
            return Err("Invalid node (0-5)".into());
        }

        let p_idx = player as usize;
        let current_node = self.positions[p_idx];

        // Check adjacency: outer(0-4) <-> center(5)
        let is_adjacent = if current_node == 5 {
            target_node <= 4 // center connects to all outer nodes
        } else if target_node == 5 {
            current_node <= 4 // any outer node connects to center
        } else {
            false // outer nodes don't connect to each other
        };

        if !is_adjacent {
            return Err("Target node is not adjacent to your current position".into());
        }

        // Move the cup
        self.positions[p_idx] = target_node;

        // Check if capture occurred (both cups on same node)
        let opp_idx = 1 - p_idx;
        if self.positions[p_idx] == self.positions[opp_idx] {
            // Capture! Player wins this round
            self.round_wins[p_idx] += 1;
            
            if self.round_wins[p_idx] >= self.target_score {
                self.game_over = true;
                self.winner = Some(player);
                self.last_event = Some(format!(
                    "Player {} captured the opponent's cup and reaches {} wins! Player {} wins the match!",
                    player + 1, self.round_wins[p_idx], player + 1
                ));
            } else {
                // Reset positions for next round
                self.positions = vec![0, 2];
                self.last_event = Some(format!(
                    "Player {} captured the opponent's cup! Round win! (Score: P1 {} - P2 {}). New round starting.",
                    player + 1, self.round_wins[0], self.round_wins[1]
                ));
                // Loser goes first in next round
                self.current_player = 1 - player;
            }
        } else {
            let node_name = if target_node == 5 { "Center Hub".to_string() } else { format!("Node {}", target_node + 1) };
            self.last_event = Some(format!(
                "Player {} moved their cup to {}.",
                player + 1, node_name
            ));
            self.current_player = 1 - player;
        }

        Ok(())
    }

    fn post_turn_check(&mut self, player: u8) {
        let p1_left = self.turns_remaining[0];
        let p2_left = self.turns_remaining[1];

        if p1_left == 0 && p2_left == 0 {
            self.game_over = true;
            if self.scores[0] > self.scores[1] {
                self.winner = Some(0);
                self.last_event = Some(format!("Match completed! Player 1 wins with {} points!", self.scores[0]));
            } else if self.scores[1] > self.scores[0] {
                self.winner = Some(1);
                self.last_event = Some(format!("Match completed! Player 2 wins with {} points!", self.scores[1]));
            } else {
                self.winner = None;
                self.last_event = Some(format!("Match completed! It's a draw at {} points!", self.scores[0]));
            }
        } else {
            // Swap turns if next player has remaining turns, otherwise active player keeps launching
            let next_player = 1 - player;
            if self.turns_remaining[next_player as usize] > 0 {
                self.current_player = next_player;
            }
        }
    }
}

impl Game for TabletopPinballGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("LaunchBall") => {
                let tension = action
                    .get("tension")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'tension'".to_string())? as u32;
                self.launch_ball(player, tension)?;
            }
            Some("RollDice") => {
                let tension = action
                    .get("tension")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'tension'".to_string())? as u32;
                self.roll_die(player, tension)?;
            }
            Some("ThrowKnife") => {
                let target_segment = action
                    .get("target_segment")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'target_segment'".to_string())? as usize;
                self.throw_knife(player, target_segment)?;
            }
            Some("RollNokken") => {
                let force = action
                    .get("force")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'force'".to_string())? as u32;
                self.roll_nokken(player, force)?;
            }
            Some("MoveCup") => {
                let target_node = action
                    .get("target_node")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'target_node'".to_string())? as usize;
                self.move_cup(player, target_node)?;
            }
            _ => return Err("Unknown action for Tabletop Pinball".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "Pinball contest complete! Winner: {}",
                    self.winner.map_or("Draw".to_string(), |w| format!("Player {}", w + 1))
                ),
            })
        } else {
            None
        }
    }

    fn state_for_player(&self, _player: Option<u8>) -> serde_json::Value {
        let mut val = serde_json::to_value(self).unwrap();
        if let serde_json::Value::Object(ref mut map) = val {
            map.insert("currentPlayer".to_string(), serde_json::json!(self.current_player));
            if let Some(p_idx) = _player {
                map.insert("localPlayerIdx".to_string(), serde_json::json!(p_idx));
            }
        }
        val
    }

    fn reset(&mut self) {
        *self = TabletopPinballGame::new_variant(&self.variant.clone());
    }

    fn game_type(&self) -> &str {
        "tabletop_pinball"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classic_launch() {
        let mut game = TabletopPinballGame::new_variant("classic");
        assert_eq!(game.scores, vec![0, 0]);
        assert_eq!(game.turns_remaining, vec![4, 4]);

        // Launch ball with tension 50 (groups around Outer Ring)
        game.launch_ball(0, 50).unwrap();
        assert_eq!(game.turns_remaining[0], 3);
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn test_tumblin_dice() {
        let mut game = TabletopPinballGame::new_variant("tumblin_dice");
        assert_eq!(game.board.len(), 12);
        
        // Roll dice with tension 20 (lands around shelf x1)
        game.roll_die(0, 20).unwrap();
        assert_eq!(game.turns_remaining[0], 3);
    }

    #[test]
    fn test_nokkenhole_setup() {
        let game = TabletopPinballGame::new_variant("nokkenhole");
        assert_eq!(game.target_score, 21);
        assert_eq!(game.scores, vec![0, 0]);
        assert_eq!(game.variant, "nokkenhole");
    }

    #[test]
    fn test_nokkenhole_roll() {
        let mut game = TabletopPinballGame::new_variant("nokkenhole");
        game.roll_nokken(0, 50).unwrap();
        // Score should be >= 0 (depends on randomness)
        assert_eq!(game.current_player, 1);
        assert!(!game.game_over);
    }

    #[test]
    fn test_tzaar_cup_setup() {
        let game = TabletopPinballGame::new_variant("tzaar_cup");
        assert_eq!(game.positions, vec![0, 2]);
        assert_eq!(game.round_wins, vec![0, 0]);
        assert_eq!(game.target_score, 3);
    }

    #[test]
    fn test_tzaar_cup_move() {
        let mut game = TabletopPinballGame::new_variant("tzaar_cup");
        // P1 is at node 0, can move to center (5)
        game.move_cup(0, 5).unwrap();
        assert_eq!(game.positions[0], 5);
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn test_tzaar_cup_capture() {
        let mut game = TabletopPinballGame::new_variant("tzaar_cup");
        // P1 at node 0, P2 at node 2
        // P1 moves to center (5)
        game.move_cup(0, 5).unwrap();
        // P2 moves to center (5) — capture!
        game.move_cup(1, 5).unwrap();
        assert_eq!(game.round_wins[1], 1);
        // Positions should be reset
        assert_eq!(game.positions, vec![0, 2]);
    }

    #[test]
    fn test_tzaar_cup_invalid_move() {
        let mut game = TabletopPinballGame::new_variant("tzaar_cup");
        // P1 at node 0, try to move to node 1 (not adjacent, outer-to-outer)
        let result = game.move_cup(0, 1);
        assert!(result.is_err());
    }
}
