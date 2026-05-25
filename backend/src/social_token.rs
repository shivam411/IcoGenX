use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::Deserialize;

const DEFAULT_DEV_SOCIAL_SECRET: &str = "online-multi-games-dev-social-secret";

#[derive(Debug, Clone, Deserialize)]
pub struct IdentityClaims {
    pub kind: String,
    pub sub: String,
    pub name: String,
    pub image: Option<String>,
    pub exp: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct InviteGrantClaims {
    pub kind: String,
    pub from_user_id: String,
    pub to_user_id: String,
    pub game_type: String,
    pub variant: Option<String>,
    pub exp: usize,
}

fn social_secret() -> String {
    std::env::var("SOCIAL_TOKEN_SECRET")
        .or_else(|_| std::env::var("AUTH_SECRET"))
        .or_else(|_| std::env::var("NEXTAUTH_SECRET"))
        .unwrap_or_else(|_| DEFAULT_DEV_SOCIAL_SECRET.to_string())
}

pub fn verify_identity_token(token: &str) -> Result<IdentityClaims, String> {
    let claims = decode::<IdentityClaims>(
        token,
        &DecodingKey::from_secret(social_secret().as_bytes()),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|_| "Invalid identity token".to_string())?
    .claims;

    if claims.kind != "identity" || claims.sub.trim().is_empty() {
        return Err("Invalid identity token".to_string());
    }

    Ok(claims)
}

pub fn verify_invite_grant(token: &str) -> Result<InviteGrantClaims, String> {
    let claims = decode::<InviteGrantClaims>(
        token,
        &DecodingKey::from_secret(social_secret().as_bytes()),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|_| "Invalid invite grant".to_string())?
    .claims;

    if claims.kind != "invite"
        || claims.from_user_id.trim().is_empty()
        || claims.to_user_id.trim().is_empty()
        || claims.game_type.trim().is_empty()
    {
        return Err("Invalid invite grant".to_string());
    }

    Ok(claims)
}

#[cfg(test)]
mod tests {
    use super::{verify_identity_token, verify_invite_grant};
    use jsonwebtoken::{encode, EncodingKey, Header};
    use serde::Serialize;
    use std::time::{SystemTime, UNIX_EPOCH};

    const TEST_SECRET: &str = "online-multi-games-dev-social-secret";

    #[derive(Serialize)]
    struct IdentityTestClaims<'a> {
        kind: &'a str,
        sub: &'a str,
        name: &'a str,
        image: Option<&'a str>,
        exp: usize,
    }

    #[derive(Serialize)]
    struct InviteTestClaims<'a> {
        kind: &'a str,
        from_user_id: &'a str,
        to_user_id: &'a str,
        game_type: &'a str,
        variant: Option<&'a str>,
        exp: usize,
    }

    fn exp() -> usize {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as usize
            + 60
    }

    #[test]
    fn verifies_identity_tokens() {
        let token = encode(
            &Header::default(),
            &IdentityTestClaims {
                kind: "identity",
                sub: "user_a",
                name: "Alex",
                image: None,
                exp: exp(),
            },
            &EncodingKey::from_secret(TEST_SECRET.as_bytes()),
        )
        .unwrap();

        let claims = verify_identity_token(&token).unwrap();

        assert_eq!(claims.sub, "user_a");
        assert_eq!(claims.name, "Alex");
    }

    #[test]
    fn rejects_wrong_identity_kind() {
        let token = encode(
            &Header::default(),
            &IdentityTestClaims {
                kind: "invite",
                sub: "user_a",
                name: "Alex",
                image: None,
                exp: exp(),
            },
            &EncodingKey::from_secret(TEST_SECRET.as_bytes()),
        )
        .unwrap();

        assert_eq!(
            verify_identity_token(&token).unwrap_err(),
            "Invalid identity token"
        );
    }

    #[test]
    fn verifies_invite_grants() {
        let token = encode(
            &Header::default(),
            &InviteTestClaims {
                kind: "invite",
                from_user_id: "user_a",
                to_user_id: "user_b",
                game_type: "tic_tac_toe",
                variant: Some("classic"),
                exp: exp(),
            },
            &EncodingKey::from_secret(TEST_SECRET.as_bytes()),
        )
        .unwrap();

        let claims = verify_invite_grant(&token).unwrap();

        assert_eq!(claims.from_user_id, "user_a");
        assert_eq!(claims.to_user_id, "user_b");
        assert_eq!(claims.game_type, "tic_tac_toe");
        assert_eq!(claims.variant.as_deref(), Some("classic"));
    }
}
