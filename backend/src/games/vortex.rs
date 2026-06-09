/* backend/src/games/vortex.rs */
use crate::game_trait::{self, Game};
use crate::protocol::ServerMessage;
use serde::Serialize;
use rand::Rng;

#[derive(Debug, Clone, Serialize)]
pub struct VortexGame {
    pub variant: String,                         // "classic", "stay_alive", "shift_puzzle", "marble_slide", "roll_a_ball", "twizzle"
    pub grid_size: usize,                        // 4 for classic/stay_alive/shift_puzzle, 6 for marble_slide
    pub board: Vec<Option<u8>>,                  // grid representation
    pub target_board: Vec<Option<u8>>,           // target pattern for shift_puzzle
    pub row_levers: Vec<u8>,                     // lever states (stay_alive)
    pub col_levers: Vec<u8>,                     // lever states (stay_alive)
    pub perimeter: Vec<Option<u8>>,              // perimeter marble slots (marble_slide): top/right/bottom/left edges
    pub scores: Vec<u32>,                        // cumulative scores (roll_a_ball, twizzle)
    pub turns_remaining: Vec<u8>,                // launches left (roll_a_ball, twizzle)
    pub gates: Vec<Option<u8>>,                  // scoring gates ownership (twizzle): None=unclaimed, Some(player)
    pub gate_values: Vec<u32>,                   // point value per gate (twizzle)
    pub current_player: u8,
    pub winner: Option<u8>,
    pub game_over: bool,
    pub last_event: Option<String>,
}

impl VortexGame {
    pub fn new_variant(variant: &str) -> Self {
        let grid_size = if variant == "marble_slide" { 6 } else { 4 };
        let board_len = grid_size * grid_size;
        let mut game = VortexGame {
            variant: variant.to_string(),
            grid_size,
            board: vec![None; board_len],
            target_board: vec![None; board_len],
            row_levers: vec![0; 4],
            col_levers: vec![0; 4],
            perimeter: vec![],
            scores: vec![0, 0],
            turns_remaining: vec![5, 5],
            gates: vec![],
            gate_values: vec![],
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
            "stay_alive" => {
                // P1 marbles at top row, P2 marbles at bottom row
                for i in 0..4 {
                    self.board[i] = Some(0);     // P1
                    self.board[12 + i] = Some(1); // P2
                }
                self.row_levers = vec![0; 4];
                self.col_levers = vec![0; 4];
                self.last_event = Some("Stay Alive! started. Toggle side levers to drop opponent marbles!".to_string());
            }
            "shift_puzzle" => {
                // Color cells (represented by Some(0) to Some(3))
                // 4 Red (0), 4 Blue (1), 4 Green (2), 4 Yellow (3)
                let mut colors = vec![
                    Some(0), Some(0), Some(0), Some(0),
                    Some(1), Some(1), Some(1), Some(1),
                    Some(2), Some(2), Some(2), Some(2),
                    Some(3), Some(3), Some(3), Some(3),
                ];
                // Shuffle for target pattern
                use rand::seq::SliceRandom;
                let mut rng = rand::thread_rng();
                colors.shuffle(&mut rng);
                self.target_board = colors.clone();
                
                // Shuffle again for start board
                colors.shuffle(&mut rng);
                self.board = colors;
                self.last_event = Some("Shift Puzzle started! Rotate dials to match the target pattern.".to_string());
            }
            "marble_slide" => {
                // 6x6 inner grid starts empty
                // Perimeter: 24 slots around the edge
                // Layout: Top 6 (indices 0..5), Right 6 (6..11), Bottom 6 (12..17), Left 6 (18..23)
                // P1 gets top + left = 12 marbles, P2 gets right + bottom = 12 marbles
                let mut perim = vec![None; 24];
                // Top 6 = P1
                for i in 0..6 { perim[i] = Some(0); }
                // Right 6 = P2
                for i in 6..12 { perim[i] = Some(1); }
                // Bottom 6 = P2
                for i in 12..18 { perim[i] = Some(1); }
                // Left 6 = P1
                for i in 18..24 { perim[i] = Some(0); }
                self.perimeter = perim;
                self.board = vec![None; 36]; // 6x6 inner grid
                self.last_event = Some("Marble Slide started! Push your perimeter marbles inward to form the longest line.".to_string());
            }
            "roll_a_ball" => {
                self.turns_remaining = vec![5, 5];
                self.scores = vec![0, 0];
                self.last_event = Some("Roll-A-Ball started! Adjust tilt and force to land in scoring holes.".to_string());
            }
            "twizzle" => {
                // 8 scoring gates with point values
                self.gates = vec![None; 8];
                self.gate_values = vec![5, 10, 10, 25, 25, 50, 5, 10];
                self.turns_remaining = vec![5, 5];
                self.scores = vec![0, 0];
                self.last_event = Some("Twizzle started! Rotate the cone and launch marbles at scoring gates.".to_string());
            }
            _ => {
                // Classic Vortex
                // P1 pieces at top row (0..=2), P2 pieces at bottom row (13..=15)
                self.board[0] = Some(0);
                self.board[1] = Some(0);
                self.board[2] = Some(0);

                self.board[12] = Some(1);
                self.board[13] = Some(1);
                self.board[14] = Some(1);
                self.last_event = Some("Classic Vortex started! Rotate the 6 dials to navigate your triangles across.".to_string());
            }
        }
    }

    // Rotates a 2x2 dial clockwise (true) or counter-clockwise (false)
    // Overlapping dials mapping:
    // Dial 0: Top-Left (0, 1, 5, 4)
    // Dial 1: Top-Right (1, 2, 6, 5)
    // Dial 2: Bottom-Left (8, 9, 13, 12)
    // Dial 3: Bottom-Right (9, 10, 14, 13)
    // Dial 4: Middle-Left (4, 5, 9, 8)
    // Dial 5: Middle-Right (5, 6, 10, 9)
    pub fn rotate_dial(&mut self, player: u8, dial_idx: usize, clockwise: bool) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if dial_idx >= 6 {
            return Err("Invalid dial index".into());
        }

        let cells = match dial_idx {
            0 => vec![0, 1, 5, 4],
            1 => vec![1, 2, 6, 5],
            2 => vec![8, 9, 13, 12],
            3 => vec![9, 10, 14, 13],
            4 => vec![4, 5, 9, 8],
            _ => vec![5, 6, 10, 9], // Dial 5
        };

        // Perform rotation (0 -> 1 -> 2 -> 3 -> 0 in cells index order)
        let mut vals = vec![];
        for &idx in &cells {
            vals.push(self.board[idx]);
        }

        if clockwise {
            self.board[cells[1]] = vals[0];
            self.board[cells[2]] = vals[1];
            self.board[cells[3]] = vals[2];
            self.board[cells[0]] = vals[3];
        } else {
            self.board[cells[3]] = vals[0];
            self.board[cells[0]] = vals[1];
            self.board[cells[1]] = vals[2];
            self.board[cells[2]] = vals[3];
        }

        self.last_event = Some(format!(
            "Player {} rotated Dial {} {}.",
            player + 1, dial_idx + 1, if clockwise { "Clockwise" } else { "Counter-Clockwise" }
        ));

        self.post_move_checks(player);
        Ok(())
    }

    pub fn toggle_lever(&mut self, player: u8, is_row: bool, idx: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if idx >= 4 {
            return Err("Invalid lever index".into());
        }

        if is_row {
            self.row_levers[idx] = 1 - self.row_levers[idx];
        } else {
            self.col_levers[idx] = 1 - self.col_levers[idx];
        }

        // Apply marble drops: cell (r, c) falls if row_levers[r] == 1 && col_levers[c] == 1
        let mut drops_occurred = vec![];
        for r in 0..4 {
            for c in 0..4 {
                let cell_idx = r * 4 + c;
                if self.board[cell_idx].is_some() && self.row_levers[r] == 1 && self.col_levers[c] == 1 {
                    let owner = self.board[cell_idx].unwrap();
                    self.board[cell_idx] = None;
                    drops_occurred.push(format!("Player {}'s marble", owner + 1));
                }
            }
        }

        let drop_log = if drops_occurred.is_empty() {
            "".to_string()
        } else {
            format!(" Dropped: {}.", drops_occurred.join(", "))
        };

        self.last_event = Some(format!(
            "Player {} toggled {} Lever {}.{}",
            player + 1, if is_row { "Row" } else { "Column" }, idx + 1, drop_log
        ));

        self.post_move_checks(player);
        Ok(())
    }

    /// Marble Slide: Push a perimeter marble into the 6x6 grid
    /// from_idx: index into self.perimeter (0..23)
    pub fn push_marble(&mut self, player: u8, from_idx: usize) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        if from_idx >= self.perimeter.len() {
            return Err("Invalid perimeter index".into());
        }
        match self.perimeter[from_idx] {
            Some(owner) if owner == player => {}
            _ => return Err("No marble of yours at that perimeter position".into()),
        }

        // Determine entry point and direction on the 6x6 grid
        // Top (0..5): enters at (row=0, col=from_idx), direction=Down
        // Right (6..11): enters at (row=from_idx-6, col=5), direction=Left
        // Bottom (12..17): enters at (row=5, col=17-from_idx), direction=Up
        // Left (18..23): enters at (row=23-from_idx, col=0), direction=Right
        let (mut r, mut c, dr, dc): (i32, i32, i32, i32) = if from_idx < 6 {
            (0, from_idx as i32, 1, 0) // Top edge, push down
        } else if from_idx < 12 {
            ((from_idx - 6) as i32, 5, 0, -1) // Right edge, push left
        } else if from_idx < 18 {
            (5, (17 - from_idx) as i32, -1, 0) // Bottom edge, push up
        } else {
            ((23 - from_idx) as i32, 0, 0, 1) // Left edge, push right
        };

        // Slide until hitting another marble or opposite boundary
        let mut final_r = r;
        let mut final_c = c;
        loop {
            let idx = (r as usize) * 6 + (c as usize);
            if self.board[idx].is_some() {
                // Hit an existing marble; stop at previous position
                break;
            }
            final_r = r;
            final_c = c;
            r += dr;
            c += dc;
            if r < 0 || r >= 6 || c < 0 || c >= 6 {
                break; // Hit the opposite wall
            }
        }

        let final_idx = (final_r as usize) * 6 + (final_c as usize);
        if self.board[final_idx].is_some() {
            return Err("Entry cell is blocked; cannot push marble".into());
        }

        self.board[final_idx] = Some(player);
        self.perimeter[from_idx] = None; // Remove from perimeter

        let side = if from_idx < 6 { "Top" }
            else if from_idx < 12 { "Right" }
            else if from_idx < 18 { "Bottom" }
            else { "Left" };
        self.last_event = Some(format!(
            "Player {} pushed a marble from {} slot {} → landed at ({}, {}).",
            player + 1, side, from_idx, final_r, final_c
        ));

        self.post_move_checks(player);
        Ok(())
    }

    /// Roll-A-Ball: roll a ball with given tilt (0-360) and force (1-100)
    pub fn roll_ball(&mut self, player: u8, tilt: u32, force: u32) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        let p_idx = player as usize;
        if self.turns_remaining[p_idx] == 0 {
            return Err("No rolls remaining".into());
        }
        if force < 1 || force > 100 {
            return Err("Force must be between 1 and 100".into());
        }

        let mut rng = rand::thread_rng();
        let variance = rng.gen_range(0..21) as i32 - 10;
        let effective = (force as i32 + variance).max(1).min(100) as u32;
        // Tilt affects a secondary variance
        let tilt_bonus: i32 = if tilt >= 160 && tilt <= 200 { 5 } else if tilt >= 80 && tilt <= 280 { 0 } else { -5 };
        let final_val = (effective as i32 + tilt_bonus).max(1).min(100) as u32;

        // Hole mapping by final_val ranges
        // 10 pts: 15-30, 70-85 (two zones)
        // 40 pts: 31-45
        // 50 pts: 46-55
        // 60 pts: 56-65
        // 100 pts: 66-69 (tiny sweet spot)
        // Miss: everything else
        let (hole, pts) = match final_val {
            15..=30 => ("Side Hole (10)", 10),
            70..=85 => ("Side Hole (10)", 10),
            31..=45 => ("Mid Hole (40)", 40),
            46..=55 => ("Deep Hole (50)", 50),
            56..=65 => ("Back Hole (60)", 60),
            66..=69 => ("CENTER HOLE! (100)", 100),
            _ => ("Missed all holes", 0),
        };

        self.scores[p_idx] += pts;
        self.turns_remaining[p_idx] -= 1;

        self.last_event = Some(format!(
            "Player {} rolled with tilt {}° force {} (effective: {}). {} +{} pts. (Total: {})",
            player + 1, tilt, force, final_val, hole, pts, self.scores[p_idx]
        ));

        self.post_turn_check_scored(player);
        Ok(())
    }

    /// Twizzle: launch a marble with a given cone angle (0-359)
    pub fn launch_twizzle(&mut self, player: u8, cone_angle: u32) -> Result<(), String> {
        if self.game_over {
            return Err("Game is over".into());
        }
        if player != self.current_player {
            return Err("Not your turn".into());
        }
        let p_idx = player as usize;
        if self.turns_remaining[p_idx] == 0 {
            return Err("No marbles remaining".into());
        }

        let mut rng = rand::thread_rng();
        // Determine which gate (0..7) the marble exits toward based on cone_angle
        // Each gate covers a 45-degree arc
        let variance = rng.gen_range(0..30) as i32 - 15; // ±15 degrees
        let effective_angle = ((cone_angle as i32 + variance) % 360 + 360) % 360;
        let target_gate = (effective_angle / 45) as usize;

        self.turns_remaining[p_idx] -= 1;

        // Check if gate is already claimed
        if let Some(gate_owner) = self.gates[target_gate] {
            if gate_owner == player {
                // Hit own gate; no effect
                self.last_event = Some(format!(
                    "Player {} launched at {}° (effective: {}°) and hit their own Gate {} ({}pts). No change.",
                    player + 1, cone_angle, effective_angle, target_gate + 1, self.gate_values[target_gate]
                ));
            } else {
                // Hit opponent's gate — un-claim it and remove their points
                let gate_pts = self.gate_values[target_gate];
                self.scores[1 - p_idx] = self.scores[1 - p_idx].saturating_sub(gate_pts);
                self.gates[target_gate] = None;
                self.last_event = Some(format!(
                    "Player {} launched at {}° (effective: {}°) and KNOCKED OUT Player {}'s Gate {} (-{} pts from P{})!",
                    player + 1, cone_angle, effective_angle, 2 - player, target_gate + 1, gate_pts, 2 - player
                ));
            }
        } else {
            // Claim the gate
            let gate_pts = self.gate_values[target_gate];
            self.gates[target_gate] = Some(player);
            self.scores[p_idx] += gate_pts;
            self.last_event = Some(format!(
                "Player {} launched at {}° (effective: {}°) and claimed Gate {} for {} pts! (Total: {})",
                player + 1, cone_angle, effective_angle, target_gate + 1, gate_pts, self.scores[p_idx]
            ));
        }

        self.post_turn_check_scored(player);
        Ok(())
    }

    /// Post-turn check for scored variants (roll_a_ball, twizzle)
    fn post_turn_check_scored(&mut self, player: u8) {
        let p1_left = self.turns_remaining[0];
        let p2_left = self.turns_remaining[1];

        if p1_left == 0 && p2_left == 0 {
            self.game_over = true;
            if self.scores[0] > self.scores[1] {
                self.winner = Some(0);
            } else if self.scores[1] > self.scores[0] {
                self.winner = Some(1);
            } else {
                self.winner = None;
            }
            let winner_str = self.winner.map_or("It's a draw!".to_string(), |w| format!("Player {} wins!", w + 1));
            self.last_event = Some(format!(
                "Game over! P1: {} pts, P2: {} pts. {}",
                self.scores[0], self.scores[1], winner_str
            ));
        } else {
            let next = 1 - player;
            if self.turns_remaining[next as usize] > 0 {
                self.current_player = next;
            }
        }
    }

    fn post_move_checks(&mut self, player: u8) {
        match self.variant.as_str() {
            "stay_alive" => {
                // Count remaining marbles for both players
                let p1_count = self.board.iter().filter(|&&c| c == Some(0)).count();
                let p2_count = self.board.iter().filter(|&&c| c == Some(1)).count();

                if p1_count == 0 && p2_count == 0 {
                    self.game_over = true;
                    self.winner = None; // Draw
                    self.last_event = Some("All marbles fell! It's a draw!".to_string());
                } else if p1_count == 0 {
                    self.game_over = true;
                    self.winner = Some(1); // P2 wins
                    self.last_event = Some("Player 1 has no marbles left! Player 2 wins!".to_string());
                } else if p2_count == 0 {
                    self.game_over = true;
                    self.winner = Some(0); // P1 wins
                    self.last_event = Some("Player 2 has no marbles left! Player 1 wins!".to_string());
                } else {
                    self.current_player = 1 - player;
                }
            }
            "shift_puzzle" => {
                // Check if current board matches target board
                if self.board == self.target_board {
                    self.game_over = true;
                    self.winner = Some(player);
                    self.last_event = Some(format!("Match achieved! Player {} wins the puzzle!", player + 1));
                } else {
                    self.current_player = 1 - player;
                }
            }
            "marble_slide" => {
                // Check if all perimeter marbles have been pushed
                let remaining = self.perimeter.iter().filter(|p| p.is_some()).count();
                if remaining == 0 {
                    // Game over — count longest contiguous line for each player
                    let p1_line = self.longest_line(0);
                    let p2_line = self.longest_line(1);
                    self.game_over = true;
                    if p1_line > p2_line {
                        self.winner = Some(0);
                    } else if p2_line > p1_line {
                        self.winner = Some(1);
                    } else {
                        self.winner = None;
                    }
                    self.last_event = Some(format!(
                        "All marbles placed! P1 longest line: {}, P2 longest line: {}. {}",
                        p1_line, p2_line,
                        self.winner.map_or("It's a draw!".to_string(), |w| format!("Player {} wins!", w + 1))
                    ));
                } else {
                    // Check if current player has any perimeter marbles left; if not, skip
                    let current_has = self.perimeter.iter().any(|p| *p == Some(1 - player));
                    if current_has {
                        self.current_player = 1 - player;
                    }
                    // else current player continues (opponent has no marbles left to push)
                }
            }
            _ => {
                // Classic Vortex: Check if all pieces of a player have crossed over
                // P1 starts at row 0 (cells 0,1,2,3). Wins if all their pieces are in row 3 (cells 12,13,14,15).
                // P2 starts at row 3 (cells 12,13,14,15). Wins if all their pieces are in row 0 (cells 0,1,2,3).
                let p1_remaining_in_non_goal: usize = self.board
                    .iter()
                    .enumerate()
                    .filter(|&(idx, &c)| c == Some(0) && idx < 12)
                    .count();

                let p2_remaining_in_non_goal: usize = self.board
                    .iter()
                    .enumerate()
                    .filter(|&(idx, &c)| c == Some(1) && idx >= 4)
                    .count();

                // Make sure they have at least one piece on the board to avoid instant win
                let p1_total = self.board.iter().filter(|&&c| c == Some(0)).count();
                let p2_total = self.board.iter().filter(|&&c| c == Some(1)).count();

                if p1_total > 0 && p1_remaining_in_non_goal == 0 {
                    self.game_over = true;
                    self.winner = Some(0);
                    self.last_event = Some("Player 1 navigated all pieces to the opposite side and wins!".to_string());
                } else if p2_total > 0 && p2_remaining_in_non_goal == 0 {
                    self.game_over = true;
                    self.winner = Some(1);
                    self.last_event = Some("Player 2 navigated all pieces to the opposite side and wins!".to_string());
                } else {
                    self.current_player = 1 - player;
                }
            }
        }
    }

    /// Calculate the longest contiguous line of a player's marbles on the 6x6 grid
    fn longest_line(&self, player: u8) -> usize {
        let n = self.grid_size;
        let mut max_len = 0;
        let directions = [(0i32, 1i32), (1, 0), (1, 1), (1, -1)]; // horizontal, vertical, diag-down-right, diag-down-left

        for r in 0..n {
            for c in 0..n {
                for &(dr, dc) in &directions {
                    let mut len = 0;
                    let mut rr = r as i32;
                    let mut cc = c as i32;
                    while rr >= 0 && rr < n as i32 && cc >= 0 && cc < n as i32 {
                        let idx = (rr as usize) * n + (cc as usize);
                        if self.board[idx] == Some(player) {
                            len += 1;
                        } else {
                            break;
                        }
                        rr += dr;
                        cc += dc;
                    }
                    if len > max_len {
                        max_len = len;
                    }
                }
            }
        }
        max_len
    }
}

impl Game for VortexGame {
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String> {
        match action.get("action").and_then(|v| v.as_str()) {
            Some("RotateDial") => {
                let dial_idx = action
                    .get("dial_idx")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'dial_idx'".to_string())? as usize;
                let clockwise = action
                    .get("clockwise")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(true);
                self.rotate_dial(player, dial_idx, clockwise)?;
            }
            Some("ToggleLever") => {
                let is_row = action
                    .get("is_row")
                    .and_then(|v| v.as_bool())
                    .ok_or_else(|| "Missing 'is_row'".to_string())?;
                let idx = action
                    .get("idx")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'idx'".to_string())? as usize;
                self.toggle_lever(player, is_row, idx)?;
            }
            Some("PushMarble") => {
                let from_idx = action
                    .get("from_idx")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'from_idx'".to_string())? as usize;
                self.push_marble(player, from_idx)?;
            }
            Some("RollBall") => {
                let tilt = action
                    .get("tilt")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'tilt'".to_string())? as u32;
                let force = action
                    .get("force")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'force'".to_string())? as u32;
                self.roll_ball(player, tilt, force)?;
            }
            Some("LaunchMarble") => {
                let cone_angle = action
                    .get("cone_angle")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Missing 'cone_angle'".to_string())? as u32;
                self.launch_twizzle(player, cone_angle)?;
            }
            _ => return Err("Unknown action for Vortex".into()),
        }

        Ok(game_trait::broadcast_same(players, serde_json::to_value(self).unwrap()))
    }

    fn check_game_over(&self) -> Option<ServerMessage> {
        if self.game_over {
            Some(ServerMessage::GameOver {
                winner: self.winner.map(|w| format!("Player {}", w + 1)),
                reason: format!(
                    "Vortex complete! Winner: {}",
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
        *self = VortexGame::new_variant(&self.variant.clone());
    }

    fn game_type(&self) -> &str {
        "vortex"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classic_setup_and_rotation() {
        let mut game = VortexGame::new_variant("classic");
        assert_eq!(game.board[0], Some(0)); // P1
        assert_eq!(game.board[13], Some(1)); // P2
        
        // Rotate Dial 0 clockwise. Top row indices 0,1 shift to 1,5
        game.rotate_dial(0, 0, true).unwrap();
        assert_eq!(game.board[0], None);
        assert_eq!(game.board[1], Some(0));
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn test_stay_alive_levers() {
        let mut game = VortexGame::new_variant("stay_alive");
        assert_eq!(game.board[0], Some(0)); // P1 marble at (0,0)
        
        // Toggle Row 0 to 1
        game.toggle_lever(0, true, 0).unwrap();
        assert_eq!(game.row_levers[0], 1);
        
        // Toggle Col 0 to 1 -> drops marble at (0,0)
        game.toggle_lever(1, false, 0).unwrap();
        assert_eq!(game.board[0], None);
    }

    #[test]
    fn test_marble_slide_setup() {
        let game = VortexGame::new_variant("marble_slide");
        assert_eq!(game.grid_size, 6);
        assert_eq!(game.board.len(), 36);
        assert_eq!(game.perimeter.len(), 24);
        // P1 has top (0..5) + left (18..23) = 12 marbles
        let p1_count = game.perimeter.iter().filter(|&&p| p == Some(0)).count();
        assert_eq!(p1_count, 12);
        let p2_count = game.perimeter.iter().filter(|&&p| p == Some(1)).count();
        assert_eq!(p2_count, 12);
    }

    #[test]
    fn test_marble_slide_push() {
        let mut game = VortexGame::new_variant("marble_slide");
        // Push P1 marble from top slot 0 (enters at row=0, col=0, slides down)
        game.push_marble(0, 0).unwrap();
        // Should land at (5, 0) since board is empty — slides all the way down
        assert_eq!(game.board[5 * 6 + 0], Some(0));
        assert_eq!(game.perimeter[0], None);
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn test_roll_a_ball_setup() {
        let game = VortexGame::new_variant("roll_a_ball");
        assert_eq!(game.turns_remaining, vec![5, 5]);
        assert_eq!(game.scores, vec![0, 0]);
    }

    #[test]
    fn test_roll_a_ball_action() {
        let mut game = VortexGame::new_variant("roll_a_ball");
        game.roll_ball(0, 180, 50).unwrap();
        assert_eq!(game.turns_remaining[0], 4);
        assert_eq!(game.current_player, 1);
    }

    #[test]
    fn test_twizzle_setup() {
        let game = VortexGame::new_variant("twizzle");
        assert_eq!(game.gates.len(), 8);
        assert_eq!(game.gate_values.len(), 8);
        assert_eq!(game.turns_remaining, vec![5, 5]);
    }

    #[test]
    fn test_twizzle_launch() {
        let mut game = VortexGame::new_variant("twizzle");
        game.launch_twizzle(0, 90).unwrap();
        assert_eq!(game.turns_remaining[0], 4);
        assert_eq!(game.current_player, 1);
    }
}
