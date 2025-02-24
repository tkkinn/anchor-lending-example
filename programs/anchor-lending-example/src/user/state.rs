use anchor_lang::prelude::*;
use std::mem::size_of;

use super::UserError;

/// Type of balance for a token position
#[derive(Default, Clone, Copy, PartialEq, Debug, AnchorSerialize, AnchorDeserialize)]
#[repr(u8)]
pub enum BalanceType {
    #[default]
    /// Balance represents collateral position
    Collateral = 0,
    /// Balance represents liability position
    Liability = 1,
}

/// Direction of balance update operation
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Direction {
    /// Deposit adds to balance as collateral
    Deposit,
    /// Withdrawal reduces balance, may convert to liability
    Withdrawal,
}

/// Represents a single token balance entry
#[zero_copy]
#[derive(Default)]
pub struct TokenBalance {
    /// Balance amount in token's native units
    /// Always positive - use balance_type to determine if liability
    pub balance: u64,
    /// Bank identifier for the token
    pub bank_id: u8,
    /// Type of balance (collateral or liability)
    pub balance_type: u8,
    /// Padding for memory alignment
    pub padding: [u8; 6],
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
    /// Returns the signed balance if found, or 0 if not found
    /// Liability balances are returned as negative values
    pub fn find_balance_by_bank_id(&self, bank_id: u8) -> i64 {
        for token in self.token_balances.iter() {
            if token.bank_id == bank_id {
                // Convert u64 to i64 and make negative for liabilities
                if token.balance > i64::MAX as u64 {
                    return 0; // Balance too large for i64
                }

                let balance = token.balance as i64;
                return if token.balance_type == BalanceType::Liability as u8 {
                    -balance
                } else {
                    balance
                };
            }
        }
        0
    }

    /// Gets the balance type for a specific bank ID
    /// Returns Collateral as default if bank ID is not found
    pub fn get_balance_type_by_bank_id(&self, bank_id: u8) -> BalanceType {
        for token in self.token_balances.iter() {
            if token.bank_id == bank_id {
                return if token.balance_type == BalanceType::Liability as u8 {
                    BalanceType::Liability
                } else {
                    BalanceType::Collateral
                };
            }
        }
        BalanceType::Collateral
    }

    /// Updates the balance for a specific bank ID based on direction
    /// Creates a new entry if bank ID doesn't exist
    /// Handles balance type conversion based on direction and amounts
    ///
    /// # Arguments
    /// * `bank_id` - The bank ID to update balance for
    /// * `delta` - The amount to add/subtract (always positive)
    /// * `direction` - Whether this is a deposit or withdrawal
    ///
    /// # Returns
    /// * `Result<()>` - Success or error if:
    ///    - Math overflow in balance calculation
    ///    - No empty slots available for new balance
    ///
    /// # Examples
    /// ```ignore
    /// // Deposit 100 tokens
    /// user.update_balance(1, 100, Direction::Deposit)?;
    ///
    /// // Withdraw 50 tokens
    /// user.update_balance(1, 50, Direction::Withdrawal)?;
    /// ```
    pub fn update_balance(&mut self, bank_id: u8, delta: u64, direction: Direction) -> Result<()> {
        // Search for an existing entry with the matching bank_id
        let mut found = false;
        for token in self.token_balances.iter_mut() {
            if token.bank_id == bank_id {
                match direction {
                    Direction::Deposit => {
                        if token.balance_type == BalanceType::Liability as u8 {
                            // Handle liability repayment
                            if token.balance <= delta {
                                // Deposit amount exceeds liability - convert to collateral
                                let remaining_deposit = delta
                                    .checked_sub(token.balance)
                                    .ok_or(error!(UserError::BalanceUpdateOverflow))?;

                                // Convert to collateral and set remaining as positive balance
                                token.balance = remaining_deposit;
                                token.balance_type = BalanceType::Collateral as u8;

                                msg!(
                                    "Converted liability to collateral. New collateral balance: {}",
                                    remaining_deposit
                                );
                            } else {
                                // Reduce liability amount
                                token.balance = token
                                    .balance
                                    .checked_sub(delta)
                                    .ok_or(error!(UserError::BalanceUpdateOverflow))?;

                                msg!("Reduced liability balance to: {}", token.balance);
                            }
                        } else {
                            // Normal collateral deposit
                            token.balance = token
                                .balance
                                .checked_add(delta)
                                .ok_or(error!(UserError::BalanceUpdateOverflow))?;
                            token.balance_type = BalanceType::Collateral as u8;

                            msg!(
                                "Added to collateral balance. New balance: {}",
                                token.balance
                            );
                        }
                    }
                    Direction::Withdrawal => {
                        // For withdrawals, we need to handle potential conversion
                        if token.balance >= delta {
                            // Simple withdrawal, stays as collateral
                            token.balance = token
                                .balance
                                .checked_sub(delta)
                                .ok_or(error!(UserError::BalanceUpdateOverflow))?;
                            // Keep existing balance type

                            msg!(
                                "Withdrew from collateral. Remaining balance: {}",
                                token.balance
                            );
                        } else {
                            // Withdrawal exceeds balance, becomes/adds to liability
                            if token.balance_type == BalanceType::Collateral as u8 {
                                // Converting from collateral to liability
                                // First subtract full collateral
                                let remaining_delta = delta
                                    .checked_sub(token.balance)
                                    .ok_or(error!(UserError::BalanceUpdateOverflow))?;
                                // Then set as liability
                                token.balance = remaining_delta;
                                token.balance_type = BalanceType::Liability as u8;

                                msg!(
                                    "Converted collateral to liability. New liability: {}",
                                    remaining_delta
                                );
                            } else {
                                // Already liability, just add to it
                                let additional_liability = delta
                                    .checked_sub(token.balance)
                                    .ok_or(error!(UserError::BalanceUpdateOverflow))?;
                                token.balance = token
                                    .balance
                                    .checked_add(additional_liability)
                                    .ok_or(error!(UserError::BalanceUpdateOverflow))?;

                                msg!(
                                    "Added to liability balance. New liability: {}",
                                    token.balance
                                );
                            }
                        }
                    }
                }
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
                    token.balance_type = match direction {
                        Direction::Deposit => BalanceType::Collateral as u8,
                        Direction::Withdrawal => BalanceType::Liability as u8,
                    };

                    msg!(
                        "Created new {} position with balance: {}",
                        if direction == Direction::Deposit {
                            "collateral"
                        } else {
                            "liability"
                        },
                        delta
                    );

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
            // Case 1: a has non-zero balance and bank_id == 0, put it at the beginning
            if a.bank_id == 0 && a.balance != 0 && (b.bank_id != 0 || b.balance == 0) {
                std::cmp::Ordering::Less
            }
            // Case 2: b has non-zero balance and bank_id == 0, put it at the beginning
            else if b.bank_id == 0 && b.balance != 0 && (a.bank_id != 0 || a.balance == 0) {
                std::cmp::Ordering::Greater
            }
            // Case 3: Both have bank_id == 0 and zero balance, treat them as equal
            else if a.bank_id == 0 && b.bank_id == 0 {
                std::cmp::Ordering::Equal
            }
            // Case 4: a has bank_id == 0, put it at the end
            else if a.bank_id == 0 {
                std::cmp::Ordering::Greater
            }
            // Case 5: b has bank_id == 0, put it at the end
            else if b.bank_id == 0 {
                std::cmp::Ordering::Less
            }
            // Default case: sort by bank_id in ascending order
            else {
                a.bank_id.cmp(&b.bank_id)
            }
        });
    }
}
