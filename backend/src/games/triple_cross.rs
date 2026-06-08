/* backend/src/games/triple_cross.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct TripleCrossGame {
    pub board: Vec<Vec<Option<u8>>>,          // 8 rows, each having 3 columns (None, Some(0), Some(1))
    pub blockers: Vec<Option<u8>>,           // 8 rows, each None or Some(owner)
    pub disc_inventory: Vec<u32>,            // Remaining discs per player, starts at 12
    pub blocker_inventory: Vec<u32>,         // Remaining blockers per player, starts at 4
    pub scores: Vec<u32>,                    // P1 and P2 scores
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl TripleCrossGame {
    pub fn new() -> Self {
        TripleCrossGame {
            board: vec![vec![None; 3]; 8],
            blockers: vec![None; 8],
            disc_inventory: vec![12, 12],
            blocker_inventory: vec![4, 4],
            scores: vec![0, 0],
            current_player: 0,
            winner: None,
            game_over: false,
            last_event: Some("Triple Cross started! Player 1's turn.".to_string()),
        }
    }

    fn count_unbroken_lines(&self, player: u8) -> u32 {
        let mut count = 0;

        // Check vertical lines of 3: (r, c), (r+1, c), (r+2, c)
        for c in 0..3 {
            for r in 0..6 {
                if self.board[r][c] == Some(player)
                    && self.board[r + 1][c] == Some(player)
                    && self.board[r + 2][c] == Some(player)
                {
                    count += 1;
                }
            }
        }

        // Check diagonal right leaning lines: (r, c), (r+1, c+1), (r+2, c+2)
        for c in 0..1 {
            for r in 0..6 {
                if self.board[r][c] == Some(player)
                    && self.board[r + 1][c + 1] == Some(player)
                    && self.board[r + 2][c + 2] == Some(player)
                {
                    count += 1;
                }
            }
        }

        // Check diagonal left leaning lines: (r, c), (r+1, c-1), (r+2, c-2)
        for c in 2..3 {
            for r in 0..6 {
                if self.board[r][c] == Some(player)
                    && self.board[r + 1][c - 1] == Some(player)
                    && self.board[r + 2][c - 2] == Some(player)
                {
                    count += 1;
                }
            }
        }

        count
    }

    pub fn push_disc(
        &mut self,
        player: u8,
        row: usize,
        direction: &str,
        block_row: Option<usize>,
    ) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if row >= 8 {
            return Err("Row index out of bounds".into());
        }
        if self.blockers[row].is_some() {
            return Err("Row is blocked by a blocker".into());
        }
        if self.disc_inventory[player as usize] == 0 {
            return Err("No discs left in hand".into());
        }

        let mut event_msg = String::new();

        // Perform shift
        let old_row_state = self.board[row].clone();
        if direction == "left" {
            // Push from left: goes to col 0, shifts right, col 2 is ejected
            let ejected = old_row_state[2];
            self.board[row][0] = Some(player);
            self.board[row][1] = old_row_state[0];
            self.board[row][2] = old_row_state[1];

            if let Some(p) = ejected {
                self.disc_inventory[p as usize] += 1;
                event_msg = format!("ejected Player {}'s disc on the right", p + 1);
            }
        } else if direction == "right" {
            // Push from right: goes to col 2, shifts left, col 0 is ejected
            let ejected = old_row_state[0];
            self.board[row][2] = Some(player);
            self.board[row][1] = old_row_state[2];
            self.board[row][0] = old_row_state[1];

            if let Some(p) = ejected {
                self.disc_inventory[p as usize] += 1;
                event_msg = format!("ejected Player {}'s disc on the left", p + 1);
            }
        } else {
            return Err("Invalid direction".into());
        }

        self.disc_inventory[player as usize] -= 1;

        let mut blocker_msg = String::new();

        // Handle optional blocker placement
        if let Some(b_row) = block_row {
            if b_row >= 8 {
                return Err("Blocker row out of bounds".into());
            }
            if self.blockers[b_row].is_some() {
                return Err("Blocker target row is already blocked".into());
            }
            if self.blocker_inventory[player as usize] == 0 {
                return Err("No blockers left in hand".into());
            }
            
            // Blocker can only be placed on a full row (3 pieces)
            let is_full = self.board[b_row].iter().all(|c| c.is_some());
            if !is_full {
                return Err("Blocker can only be placed on a full row".into());
            }

            self.blockers[b_row] = Some(player);
            self.blocker_inventory[player as usize] -= 1;
            blocker_msg = format!(" and placed a blocker on Row {}", b_row + 1);
        }

        // Update scores
        self.scores[0] = self.count_unbroken_lines(0);
        self.scores[1] = self.count_unbroken_lines(1);

        // Check game over conditions
        let all_blocked = self.blockers.iter().all(|b| b.is_some());
        let no_discs = self.disc_inventory[0] == 0 && self.disc_inventory[1] == 0;

        if all_blocked || no_discs {
            self.game_over = true;
            if self.scores[0] > self.scores[1] {
                self.winner = Some(0);
            } else if self.scores[1] > self.scores[0] {
                self.winner = Some(1);
            } else {
                self.winner = None; // Draw
            }
            self.last_event = Some(format!(
                "Game Over! Final Scores - P1: {}, P2: {}. Winner: {}",
                self.scores[0],
                self.scores[1],
                self.winner.map_or("Draw".to_string(), |w| format!("Player {}", w + 1))
            ));
            return Ok(());
        }

        // Turn transition: swap player. If next player has no moves, swap back or end game
        let next_player = 1 - self.current_player;
        if self.disc_inventory[next_player as usize] > 0 {
            self.current_player = next_player;
        } else {
            // Next player has no discs, stays on current player if they have discs
            if self.disc_inventory[self.current_player as usize] == 0 {
                // Both have no discs left
                self.game_over = true;
                if self.scores[0] > self.scores[1] {
                    self.winner = Some(0);
                } else if self.scores[1] > self.scores[0] {
                    self.winner = Some(1);
                } else {
                    self.winner = None;
                }
                self.last_event = Some("Game Over! Neither player has discs left.".into());
                return Ok(());
            }
            // Otherwise current_player keeps their turn
        }

        self.last_event = Some(format!(
            "Player {} pushed {} from {} {}{}. Player {}'s turn.",
            player + 1,
            if direction == "left" { "left" } else { "right" },
            row + 1,
            if event_msg.is_empty() { "without ejection" } else { &event_msg },
            blocker_msg,
            self.current_player + 1
        ));

        Ok(())
    }
}

impl Game for TripleCrossGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("TripleCrossPush") => {
                let row = action
                    .get("row")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'row'".to_string())? as usize;
                let direction = action
                    .get("direction")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| "Missing 'direction'".to_string())?;
                let block_row = action
                    .get("block_row")
                    .and_then(|v| v.as_u64())
                    .map(|v| v as usize);

                self.push_disc(player, row, direction, block_row)?;
            }
            _ => return Err("Unknown action for Triple Cross".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "End of matching discs! Final scores - Player 1: {} points, Player 2: {} points",
                    self.scores[0], self.scores[1]
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
        }
        val
    }

    fn reset(&mut self) {
        *self = TripleCrossGame::new();
    }

    fn game_type(&self) -> &str {
        "triple_cross"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state() {
        let game = TripleCrossGame::new();
        assert_eq!(game.disc_inventory, vec![12, 12]);
        assert_eq!(game.blocker_inventory, vec![4, 4]);
        assert_eq!(game.scores, vec![0, 0]);
        assert_eq!(game.current_player, 0);
    }

    #[test]
    fn test_push_mechanic_left() {
        let mut game = TripleCrossGame::new();
        game.push_disc(0, 0, "left", None).unwrap();
        
        assert_eq!(game.board[0][0], Some(0));
        assert_eq!(game.board[0][1], None);
        assert_eq!(game.disc_inventory[0], 11);
    }

    #[test]
    fn test_push_displacement_and_ejection() {
        let mut game = TripleCrossGame::new();
        
        // Fill row 0 with [P1, P2, P1]
        game.board[0][0] = Some(0);
        game.board[0][1] = Some(1);
        game.board[0][2] = Some(0);
        
        // P0 has 12 discs. Pushing P0 from left should eject P0 from right
        game.push_disc(0, 0, "left", None).unwrap();
        assert_eq!(game.board[0][0], Some(0)); // new P0 pushed in
        assert_eq!(game.board[0][1], Some(0)); // old c0 shifted
        assert_eq!(game.board[0][2], Some(1)); // old c1 shifted
        // old c2 (P0) ejected, inventory stays at 12 (12 - 1 placement + 1 eject)
        assert_eq!(game.disc_inventory[0], 12);
    }

    #[test]
    fn test_blocker_mechanic() {
        let mut game = TripleCrossGame::new();
        
        // Make row 0 full
        game.board[0][0] = Some(0);
        game.board[0][1] = Some(1);
        game.board[0][2] = Some(0);

        // P0 plays on row 1, blocks row 0
        game.push_disc(0, 1, "left", Some(0)).unwrap();
        
        assert_eq!(game.blockers[0], Some(0));
        assert_eq!(game.blocker_inventory[0], 3);

        // Attempting to push row 0 now should fail
        assert!(game.push_disc(1, 0, "left", None).is_err());
    }

    #[test]
    fn test_vertical_and_diagonal_scoring() {
        let mut game = TripleCrossGame::new();
        
        // Set up vertical line of 3 for P0 at column 0, rows 0, 1, 2
        game.board[0][0] = Some(0);
        game.board[1][0] = Some(0);
        game.board[2][0] = Some(0);

        // Set up diagonal line of 3 for P0 at (0,0), (1,1), (2,2)
        game.board[1][1] = Some(0);
        game.board[2][2] = Some(0);

        game.push_disc(0, 3, "left", None).unwrap(); // trigger recalculation
        
        assert_eq!(game.scores[0], 3); // 2 vertical + 1 diagonal
    }
}
