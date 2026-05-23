use crate::protocol::ServerMessage;

/// Common interface for all game implementations.
///
/// Each game struct implements this trait so the lobby can interact
/// with any game through a uniform API — no more match arms per game.
pub trait Game: Send + Sync {
    /// Process a player action encoded as a generic JSON value.
    ///
    /// The game is responsible for parsing the action payload itself.
    /// Returns a list of `(player_id, ServerMessage)` tuples to send.
    fn process_action(
        &mut self,
        player: u8,
        action: serde_json::Value,
        players: &[String],
    ) -> Result<Vec<(String, ServerMessage)>, String>;

    /// Check whether the game has ended.
    ///
    /// Returns `Some(GameOver { .. })` when the game is finished,
    /// or `None` if still in progress.
    fn check_game_over(&self) -> Option<ServerMessage>;

    /// Serialize the game state for a specific player.
    ///
    /// Hidden-info games (e.g. Bluff Card, Code Guess) use `player`
    /// to decide what to reveal. `None` means spectator / default view.
    fn state_for_player(&self, player: Option<u8>) -> serde_json::Value;

    /// Reset the game for a new round (play-again / next match in series).
    fn reset(&mut self);

    /// The game type identifier (e.g. `"tic_tac_toe"`).
    fn game_type(&self) -> &str;

    /// How many players this game requires. Defaults to 2.
    fn player_count(&self) -> u8 {
        2
    }
}

/// Helper: broadcast the same game state to all players.
pub fn broadcast_same(players: &[String], state: serde_json::Value) -> Vec<(String, ServerMessage)> {
    players
        .iter()
        .map(|pid| {
            (
                pid.clone(),
                ServerMessage::GameUpdate {
                    game_state: state.clone(),
                },
            )
        })
        .collect()
}

/// Helper: send per-player views (for hidden-info games).
pub fn broadcast_per_player<F>(players: &[String], state_fn: F) -> Vec<(String, ServerMessage)>
where
    F: Fn(u8) -> serde_json::Value,
{
    players
        .iter()
        .enumerate()
        .map(|(idx, pid)| {
            (
                pid.clone(),
                ServerMessage::GameUpdate {
                    game_state: state_fn(idx as u8),
                },
            )
        })
        .collect()
}
