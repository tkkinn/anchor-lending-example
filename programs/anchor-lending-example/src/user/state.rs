use crate::user::UserError;
use anchor_lang::prelude::*;
use std::mem::size_of;

/// Represents a single token balance entry
#[zero_copy]
#[derive(Default)]
pub struct TokenBalance {
    /// Balance amount (can be negative)
    pub balance: i64,
    /// Bank identifier for the token
    pub bank_id: u8,
    /// Padding for memory alignment
    pub padding: [u8; 7],
}

/// Represents a user account in the lending protocol
#[account(zero_copy)]
#[derive(Default)]
pub struct User {
    /// The user's authority (usually their wallet address)
    pub authority: Pubkey,
    /// Unique identifier for the user
    pub id: u16,
    /// Pool identifier
    pub pool_id: u8,
    /// Bump seed for PDA validation
    pub bump: u8,
    /// Padding for memory alignment
    pub padding: [u8; 4],
    /// Token balances stored as array of TokenBalance
    /// Maximum 16 different tokens per user
    pub token_balances: [TokenBalance; 16],
}

impl User {
    pub const LEN: usize = 8 + size_of::<User>();

    /// Gets the token balance for a specific bank ID
    /// Returns the balance if found, or 0 if not found
    pub fn find_balance_by_bank_id(&self, bank_id: u8) -> i64 {
        for token in self.token_balances.iter() {
            if token.bank_id == bank_id {
                return token.balance;
            }
        }
        0
    }

    /// Updates the balance for a specific bank ID
    /// Creates a new entry if bank ID doesn't exist
    /// Returns Result with the updated balance array
    pub fn update_balance(&mut self, bank_id: u8, delta: i64) -> Result<()> {
        // Search for an existing entry with the matching bank_id
        let mut found = false;
        for token in self.token_balances.iter_mut() {
            if token.bank_id == bank_id {
                token.balance = token
                    .balance
                    .checked_add(delta)
                    .ok_or(UserError::BalanceUpdateOverflow)?;
                found = true;
                break;
            }
        }

        // If not found, try to insert in the first available default slot
        if !found {
            let mut inserted = false;
            for token in self.token_balances.iter_mut() {
                if token.bank_id == 0 && token.balance == 0 {
                    token.bank_id = bank_id;
                    token.balance = delta;
                    inserted = true;
                    break;
                }
            }
            require_eq!(inserted, true, UserError::MaxTokenTypes);

            // Sort the array after successful insertion
            self.sort_token_balances();
        }

        Ok(())
    }

    /// Sorts the token balances array by bank_id in ascending order
    /// This ensures all non-zero balances are at the front of the array
    fn sort_token_balances(&mut self) {
        self.token_balances.sort_by(|a, b| {
            if a.bank_id == 0 && b.bank_id == 0 {
                std::cmp::Ordering::Equal
            } else if a.bank_id == 0 {
                std::cmp::Ordering::Greater
            } else if b.bank_id == 0 {
                std::cmp::Ordering::Less
            } else {
                a.bank_id.cmp(&b.bank_id)
            }
        });
    }
}
